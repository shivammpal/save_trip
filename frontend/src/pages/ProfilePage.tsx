// File: src/pages/ProfilePage.tsx (Updated)

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

  // State for managing edit mode
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
      await fetchProfile(); // Re-fetch data to show the latest updates
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profile) return <div className="text-center mt-10">Loading profile...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!profile) return <div className="text-center mt-10">Could not load profile data.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Your Profile</h1>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          // EDITING VIEW
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-black border border-indigo-500 text-white focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Age</label>
              <Input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="bg-black border border-indigo-500 text-white focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-4">
              <Button type="submit" isLoading={isLoading}>Save Changes</Button>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          // DISPLAY VIEW
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
              <label className="block text-sm font-medium text-white">Email</label>
              <p className="text-lg text-white">{profile.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Name</label>
              <p className="text-lg text-white">{profile.name || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Age</label>
              <p className="text-lg text-white">{profile.age || "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Points</label>
              <p className="text-lg font-bold text-indigo-300">{profile.points}</p>
            </div>
            </div>
            <div className="mt-8">
              <label className="block text-sm font-medium text-white mb-2">Badges</label>
              <div>
                {profile.badges.length > 0 ? (
                  profile.badges.map((badge) => <Badge key={badge}>{badge}</Badge>)
                ) : (
                  <p className="text-indigo-300">No badges earned yet. Create a trip to get your first one!</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};