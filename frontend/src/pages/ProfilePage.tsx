import { useState, useEffect, type ChangeEvent } from "react";
import axios from "axios";
import { getProfile, updateProfile, getUploadSignature, claimUserId } from "../services/apiService";
import type { UserProfile } from "../services/apiService";
import { Badge } from "../components/ui/Badge";

export const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<"profile_picture" | "banner_picture" | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: "", 
    age: "", 
    bio: "",
    location: "",
    profile_picture: "",
    banner_picture: "",
    twitter_url: "",
    instagram_url: ""
  });
  
  const [claimIdInput, setClaimIdInput] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();
      setProfile(data);
      setFormData({ 
        name: data.name || "", 
        age: data.age?.toString() || "",
        bio: data.bio || "",
        location: data.location || "",
        profile_picture: data.profile_picture || "",
        banner_picture: data.banner_picture || "",
        twitter_url: data.twitter_url || "",
        instagram_url: data.instagram_url || ""
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, field: "profile_picture" | "banner_picture") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(field);
    setError(null);

    try {
      const { signature, timestamp, api_key } = await getUploadSignature();
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('api_key', api_key);
      cloudinaryFormData.append('timestamp', timestamp.toString());
      cloudinaryFormData.append('signature', signature);

      const cloudinaryResponse = await axios.post(uploadUrl, cloudinaryFormData);
      const { secure_url } = cloudinaryResponse.data;

      setFormData(prev => ({ ...prev, [field]: secure_url }));
    } catch (err) {
      setError("Image upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        bio: formData.bio,
        location: formData.location,
        profile_picture: formData.profile_picture,
        banner_picture: formData.banner_picture,
        twitter_url: formData.twitter_url,
        instagram_url: formData.instagram_url
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

  const handleClaimId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimIdInput.trim()) return;
    setIsClaiming(true);
    setError(null);
    try {
      await claimUserId(claimIdInput.trim());
      await fetchProfile();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsClaiming(false);
    }
  };

  const defaultBanner = "https://images.unsplash.com/photo-1506744626753-1fa44df31c2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
  const defaultAvatar = "https://ui-avatars.com/api/?name=" + (profile.name || profile.email) + "&background=6366f1&color=fff&size=200";

  return (
    <div className="min-h-screen pt-8 pb-12 px-4" style={{ backgroundColor: "#1B2233" }}>
      <div className="max-w-4xl mx-auto bg-[#0f1524] shadow-[0_0_25px_rgba(80,80,255,0.05)] rounded-2xl overflow-hidden border border-[#2a3247]">
        
        {/* Banner Section */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
          <img 
            src={profile.banner_picture || defaultBanner} 
            alt="Profile Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1524] to-transparent opacity-80" />
        </div>

        {/* Profile Info Overlayed */}
        <div className="relative px-6 sm:px-10 pb-10">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 sm:-mt-20 mb-6 relative z-10">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#0f1524] shadow-xl overflow-hidden bg-[#151c2e]">
                <img 
                  src={profile.profile_picture || defaultAvatar} 
                  alt={profile.name || "User Avatar"} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="mt-4 sm:mt-0 mb-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {profile.name || "Adventurer"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-indigo-400 font-medium">
                    {profile.location ? `📍 ${profile.location}` : "Global Explorer"}
                  </p>
                  {profile.user_id && (
                    <span 
                      onClick={() => { navigator.clipboard.writeText(profile.user_id!); alert("Copied ID!"); }}
                      className="cursor-pointer ml-3 px-3 py-1 bg-gradient-to-r from-blue-600/30 to-teal-500/30 text-blue-300 rounded-full text-xs font-bold font-mono border border-blue-500/30 hover:bg-blue-600/50 transition-colors"
                      title="Click to copy Chat ID"
                    >
                      @{profile.user_id}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">{profile.email}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 sm:mt-0 w-full sm:w-auto flex justify-center">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-sm border border-white/10 transition-all shadow-md flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Social Stats/Bio Section */}
          {!profile.user_id ? (
             <div className="mt-8 bg-[#151c2e] p-8 rounded-2xl border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] max-w-2xl mx-auto flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl mb-4">💬</div>
               <h2 className="text-2xl font-bold text-white mb-2 text-center">Claim Your Unique ID</h2>
               <p className="text-gray-400 text-center mb-6 max-w-md">To use Pocket Yatra's completely private real-time chat, you must claim a unique User ID. This acts as your Friend Code.</p>
               
               <form onSubmit={handleClaimId} className="w-full flex-col sm:flex-row flex gap-3">
                 <div className="flex-1 relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                   <input
                     type="text"
                     value={claimIdInput}
                     onChange={(e) => setClaimIdInput(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
                     placeholder="your_unique_id"
                     className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0f1524] border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                     maxLength={20}
                     required
                   />
                 </div>
                 <button
                   type="submit"
                   disabled={isClaiming || claimIdInput.length < 3}
                   className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all whitespace-nowrap"
                 >
                   {isClaiming ? "Checking..." : "Claim ID"}
                 </button>
               </form>
               <p className="text-xs text-gray-500 mt-4 text-center">3 to 20 characters. Alphanumeric and underscores only. Permanent.</p>
             </div>
          ) : !isEditing ? (
            <div className="space-y-8 mt-8">
              {/* Bio block */}
              <div className="bg-[#151c2e] p-6 rounded-2xl border border-gray-800/50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-indigo-500/10 text-9xl leading-none font-serif">"</div>
                <h3 className="text-lg font-semibold text-gray-200 mb-3 ml-1 relative z-10">Bio</h3>
                <p className="text-gray-300 leading-relaxed max-w-2xl relative z-10 font-medium whitespace-pre-wrap">
                  {profile.bio || "No bio yet. Tell the world about your travel aspirations and favorite destinations!"}
                </p>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stats */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-[#151c2e] rounded-2xl p-6 border border-gray-800/50 shadow-inner">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Travel Stats</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shadow-lg">✨</div>
                        <div>
                          <p className="text-2xl font-bold text-white">{profile.points}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Points</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xl shadow-lg">🏆</div>
                        <div>
                          <p className="text-2xl font-bold text-white">{profile.badges.length}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Badges</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shadow-lg">🎂</div>
                        <div>
                          <p className="text-2xl font-bold text-white">{profile.age || "--"}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Age</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="bg-[#151c2e] rounded-2xl p-6 border border-gray-800/50 shadow-inner">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Social Links</h3>
                    <div className="flex gap-4 flex-wrap">
                      {profile.twitter_url ? (
                        <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 rounded-full hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] text-gray-400 transition-colors shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                        </a>
                      ) : <span className="p-3 bg-gray-800/40 rounded-full text-gray-600 cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg></span>}
                      
                      {profile.instagram_url ? (
                        <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 rounded-full hover:bg-pink-500/20 hover:text-pink-500 text-gray-400 transition-colors shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                        </a>
                      ) : <span className="p-3 bg-gray-800/40 rounded-full text-gray-600 cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg></span>}
                    </div>
                  </div>
                </div>

                {/* Badges / Achievements */}
                <div className="md:col-span-2">
                  <div className="bg-[#151c2e] rounded-2xl p-6 border border-gray-800/50 min-h-full">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       Achievements
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {profile.badges.length > 0 ? (
                        profile.badges.map((badge) => (
                          <Badge
                            key={badge}
                            className="bg-gradient-to-r from-indigo-600/60 to-violet-600/60 hover:from-indigo-500 hover:to-violet-500 backdrop-blur-md text-white border border-indigo-400/50 shadow-lg px-4 py-2 text-sm rounded-xl font-medium"
                          >
                            🏅 {badge}
                          </Badge>
                        ))
                      ) : (
                        <div className="w-full text-center py-10 bg-[#1B2233]/50 rounded-xl border border-dashed border-gray-700">
                          <p className="text-gray-400 text-sm">
                            No badges earned yet. Create trips and explore to unlock achievements!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* EDIT FORM */
            <form onSubmit={handleSave} className="mt-8 bg-[#151c2e] p-8 rounded-2xl border border-gray-800 shadow-xl max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Edit Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-[#0f1524] border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-[#0f1524] border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. 28"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1524] border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. New York, USA"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1524] border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-lg font-medium text-gray-300 mb-4">Media & Links</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Avatar Image</label>
                    <div className="flex gap-2">
                       <input
                        type="text"
                        name="profile_picture"
                        value={formData.profile_picture}
                        onChange={handleInputChange}
                        className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-[#0f1524] border border-gray-700 text-gray-300 text-sm focus:border-indigo-500"
                        placeholder="https://..."
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'profile_picture')}
                        className="hidden"
                        id="upload-avatar"
                        disabled={uploadingImage !== null}
                      />
                      <label htmlFor="upload-avatar" className={`px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors flex items-center justify-center whitespace-nowrap ${uploadingImage !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {uploadingImage === 'profile_picture' ? '...' : 'Upload'}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-1">Banner Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="banner_picture"
                        value={formData.banner_picture}
                        onChange={handleInputChange}
                        className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-[#0f1524] border border-gray-700 text-gray-300 text-sm focus:border-indigo-500"
                        placeholder="https://..."
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'banner_picture')}
                        className="hidden"
                        id="upload-banner"
                        disabled={uploadingImage !== null}
                      />
                      <label htmlFor="upload-banner" className={`px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors flex items-center justify-center whitespace-nowrap ${uploadingImage !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {uploadingImage === 'banner_picture' ? '...' : 'Upload'}
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-500 mb-1">X (Twitter) URL</label>
                      <input
                        type="text"
                        name="twitter_url"
                        value={formData.twitter_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg bg-[#0f1524] border border-gray-700 text-gray-300 text-sm focus:border-[#1DA1F2]"
                        placeholder="https://x.com/username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-500 mb-1">Instagram URL</label>
                      <input
                        type="text"
                        name="instagram_url"
                        value={formData.instagram_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg bg-[#0f1524] border border-gray-700 text-gray-300 text-sm focus:border-pink-500"
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all"
                >
                  {isLoading ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
