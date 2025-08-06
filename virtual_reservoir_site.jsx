import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";

// Use environment variables in Vercel / GitHub deployment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function VirtualReservoir() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [litres, setLitres] = useState("");
  const [postcode, setPostcode] = useState("");
  const [photo, setPhoto] = useState(null);
  const [totalLitres, setTotalLitres] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const goalLitres = 43000030;

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("water_butts")
      .select("id, litres, postcode, photo_url, approved, created_at");

    if (!error && data) {
      const approvedEntries = data.filter((entry) => entry.approved);
      const pendingEntries = data.filter((entry) => !entry.approved);
      approvedEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setApproved(approvedEntries);
      setPending(pendingEntries);
      setTotalLitres(approvedEntries.reduce((sum, entry) => sum + (entry.litres || 0), 0));
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleAdd = async () => {
    const litresNum = parseInt(litres, 10);
    if (!litresNum || !postcode || !photo) {
      alert("Please fill in all fields and upload a photo.");
      return;
    }

    const hasPendingSubmission = pending.some(
      (p) => p.postcode === postcode.trim().toUpperCase()
    );
    if (hasPendingSubmission) {
      alert("You already have a pending submission.");
      return;
    }

    setLoading(true);
    const fileExt = photo.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `waterbutt_photos/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, photo);

    if (uploadError) {
      alert("Photo upload failed. Please try again.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("water_butts").insert([
      {
        litres: litresNum,
        postcode: postcode.trim().toUpperCase(),
        photo_url: filePath,
        approved: false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (!insertError) {
      setSuccessMessage("Submission received! Awaiting moderation.");
      setLitres("");
      setPostcode("");
      setPhoto(null);
      fetchSubmissions();
      setTimeout(() => setSuccessMessage(""), 5000);
    } else {
      alert("There was an error saving your entry.");
    }

    setLoading(false);
  };

  const fillPercentage = Math.min((totalLitres / goalLitres) * 100, 100);

  const handleApproval = async (id) => {
    await supabase.from("water_butts").update({ approved: true }).eq("id", id);
    fetchSubmissions();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gradient-to-b from-blue-50 to-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-3 text-center">
        Virtual Reservoir
      </h1>
      <p className="text-center text-blue-700 mb-6 text-lg">
        The UK hasn't built a new reservoir since 1992 — but we're changing that. Not with concrete and billions of pounds, but with simple action from thousands of people.
        <br /><br />
        By installing a water butt and logging it here with your postcode, you're contributing to a virtual reservoir that shows the real power of collective effort.
        <br /><br />
        It's free, it's easy, and it's impactful. Join the movement.
      </p>

      <Card className="mb-4 border-blue-200">
        <CardContent className="p-4">
          <p className="mb-2 font-medium text-blue-900">Add Your Water Butt (litres):</p>
          <div className="flex flex-col gap-3">
            <Input
              type="number"
              value={litres}
              onChange={(e) => setLitres(e.target.value)}
              placeholder="Water butt size in litres"
              className="border-blue-300"
            />
            <Input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Your postcode"
              className="border-blue-300"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="border-blue-300"
            />
            {photo && (
              <img
                src={URL.createObjectURL(photo)}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-md mt-2 border"
              />
            )}
            <Button className="bg-blue-600 text-white" onClick={handleAdd} disabled={loading}>
              {loading ? "Submitting..." : "Add"}
            </Button>
            {successMessage && (
              <p className="text-green-700 font-medium text-sm mt-2">{successMessage}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Community Reservoir</h2>
          <p className="mb-2">Total Rainwater Captured: <strong>{totalLitres}</strong> litres</p>
          <div className="relative w-full h-40 border border-blue-300 rounded-full overflow-hidden bg-gradient-to-b from-sky-100 to-sky-300 shadow-inner">
            <div
              className="absolute bottom-0 left-0 w-full bg-blue-600 transition-all duration-700 ease-out rounded-b-full"
              style={{ height: `${fillPercentage}%` }}
            />
            <div className="absolute top-0 left-0 w-full text-center text-white font-semibold pt-2">
              {fillPercentage.toFixed(0)}% Full
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Goal: {goalLitres.toLocaleString()} litres — enough to beat the UK’s smallest real reservoir!
          </p>
          <div className="relative w-full aspect-[3/1] bg-no-repeat bg-bottom bg-cover overflow-hidden rounded-md -mt-2" style={{ backgroundImage: "url('/lake-outline.png')" }}>
            <div
              className="absolute bottom-0 left-0 w-full bg-blue-500 opacity-70 transition-all duration-700 ease-out"
              style={{ height: `${fillPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-green-200">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-green-700 mb-2">Support This Project</h3>
          <p className="mb-3 text-green-800">
            Help us grow the reservoir and awareness. This project relies on small donations to cover website hosting, data storage, and the time spent verifying submissions to maintain the integrity of the virtual reservoir.
            <br /><br />
            You can support us in two ways:
          </p>
          <ul className="list-disc list-inside text-green-900 mb-4">
            <li>
              <a href="https://amzn.to/4ldbLji" target="_blank" className="text-blue-600 underline">
                Buy a Water Butt via Amazon
              </a> – we earn a small commission.
            </li>
            <li>
              <a href="https://buymeacoffee.com/Arete2024" target="_blank" className="text-blue-600 underline">
                Make a Donation
              </a> – every bit helps keep this project going.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6 border-gray-200">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Share This Project</h3>
          <div className="flex gap-6">
            <a
              href="https://www.facebook.com/sharer/sharer.php?u=https://yourdomain.com"
              target="_blank"
              className="text-blue-700 underline"
            >
              Share on Facebook
            </a>
            <a
              href="https://www.reddit.com/submit?url=https://yourdomain.com&title=Join%20the%20Virtual%20Reservoir%20Movement"
              target="_blank"
              className="text-orange-600 underline"
            >
              Share on Reddit
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 border-gray-300">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Moderation Panel</h3>
          {pending.length === 0 ? (
            <p className="text-gray-600">No pending submissions.</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((item) => (
                <li key={item.id} className="border border-gray-200 p-4 rounded-md">
                  <p><strong>Postcode:</strong> {item.postcode}</p>
                  <p><strong>Litres:</strong> {item.litres}</p>
                  <p><strong>Submitted:</strong> {new Date(item.created_at).toLocaleDateString()}</p>
                  <Button className="mt-3 bg-green-600 text-white" onClick={() => handleApproval(item.id)}>
                    Approve
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

