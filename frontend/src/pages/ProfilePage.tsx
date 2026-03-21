// File: src/pages/ProfilePage.tsx (Dark Navy Background Version)

import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "../services/apiService";
import type { UserProfile } from "../services/apiService";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", age: "" });

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();
      setProfile(data);
      setFormData({ name: data.name || "", age: data.age?.toString() || "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
      };
      await updateProfile(payload);
      setIsEditing(false);
      await fetchProfile();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profile)
    return <div className="text-center mt-10 text-gray-400">Loading profile...</div>;
  if (error)
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!profile)
    return <div className="text-center mt-10 text-gray-400">Could not load profile data.</div>;

  return (
    <div
      className="min-h-screen flex justify-center items-center px-6 py-12"
      style={{ backgroundColor: "#1B2233" }} // 🎨 Dark navy tone from your image
    >
      <div className="max-w-3xl w-full bg-[#0f1524]/90 backdrop-blur-xl border border-[#2a3247] shadow-[0_0_25px_rgba(80,80,255,0.1)] rounded-3xl p-10 transition-all">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-5">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">
            Your Profile
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-white hover:bg-indigo-600/30 transition-all"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl bg-[#151c2e]/90 border border-transparent text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/60 transition-all"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl bg-[#151c2e]/90 border border-transparent text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/60 transition-all"
                placeholder="Enter your age"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold shadow-md transition-all"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-xl bg-gray-700/60 hover:bg-gray-600 text-white font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">
                  Email
                </label>
                <p className="text-lg text-white">{profile.email}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">
                  Name
                </label>
                <p className="text-lg text-white">{profile.name || "Not set"}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">
                  Age
                </label>
                <p className="text-lg text-white">{profile.age || "Not set"}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">
                  Points
                </label>
                <p className="text-2xl font-bold text-indigo-400">{profile.points}</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-6">
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Badges
              </label>
              <div className="flex flex-wrap gap-3">
                {profile.badges.length > 0 ? (
                  profile.badges.map((badge) => (
                    <Badge
                      key={badge}
                      className="bg-gradient-to-r from-indigo-600/80 to-violet-600/80 text-white border border-indigo-400 rounded-full shadow-sm px-3 py-1"
                    >
                      {badge}
                    </Badge>
                  ))
                ) : (
                  <p className="text-indigo-300 text-sm">
                    No badges earned yet. Create a trip to get your first one!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
