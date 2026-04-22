import { useState, useEffect } from "react";
import { getWanderFeed, cloneTrip } from "../services/apiService";
import type { Trip } from "../services/apiService";
import { TripCard } from "../components/TripCard";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const WanderFeedPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const navigate = useNavigate();

  const handleClone = async (tripId: string) => {
    if (isCloning) return;
    if (window.confirm("Do you want to clone this trip to your dashboard?")) {
      setIsCloning(true);
      try {
        const newTrip = await cloneTrip(tripId);
        alert("Trip cloned successfully! Redirecting...");
        navigate(`/trips/${newTrip.id}`);
      } catch (err) {
        alert("Failed to clone trip. " + (err as Error).message);
      } finally {
        setIsCloning(false);
      }
    }
  };

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const feed = await getWanderFeed();
        setTrips(feed);
      } catch (err) {
        setError("Failed to load WanderFeed. Please try later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center flex-col gap-4">
        <p className="text-red-400 text-xl font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 px-4 py-2 rounded-lg text-white font-semibold">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 p-8">
      <div className="flex flex-col mb-10 bg-gray-800/60 backdrop-blur-lg px-8 py-6 rounded-2xl border border-gray-700/50 shadow-xl">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
          🌍 WanderFeed
        </h1>
        <p className="text-gray-400 mt-3 text-base md:text-lg font-medium max-w-2xl">
          Explore public itineraries shared by travelers around the globe. Get inspired by their adventures, budgets, and secrets!
        </p>
      </div>

      {trips.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onClone={handleClone} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="text-center py-20 px-8 bg-gray-800/30 border border-gray-700/50 rounded-3xl shadow-lg backdrop-blur-md flex flex-col items-center">
          <div className="text-6xl mb-4 opacity-80">🗺️</div>
          <h2 className="text-2xl font-bold text-gray-200">The feed is empty</h2>
          <p className="text-gray-400 mt-2 max-w-sm font-medium">
            No public trips have been shared yet. Be the first to publish your adventure!
          </p>
        </div>
      )}
    </div>
  );
};
