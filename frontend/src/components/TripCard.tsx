import { useNavigate } from "react-router-dom";
import { deleteTrip } from "../services/apiService";
import type { Trip } from "../services/apiService.ts";
import { useCurrency } from "../context/CurrencyContext";
import { motion } from "framer-motion";

interface TripCardProps {
  trip: Trip;
  onDelete?: (tripId: string) => void;
  onClone?: (tripId: string) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getBackgroundGradient = (str: string) => {
  const gradients = [
    "from-blue-600 to-cyan-500",
    "from-purple-600 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-rose-500",
    "from-indigo-600 to-violet-500",
    "from-red-500 to-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

export const TripCard = ({ trip, onDelete, onClone }: TripCardProps) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        await deleteTrip(trip.id);
        onDelete(trip.id);
      } catch (error) {
        console.error("Failed to delete trip:", error);
        alert("Failed to delete trip. Please try again.");
      }
    }
  };

  const handleViewDetails = () => {
    navigate(`/trips/${trip.id}`);
  };

  // Determine status and countdowns
  const now = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  
  let statusBadge = null;
  let countdownText = "";

  if (trip.status === "cancelled") {
    statusBadge = <span className="bg-red-800 text-red-100 text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md">Cancelled</span>;
    countdownText = "Trip Cancelled";
  } else if (trip.status === "completed") {
    statusBadge = <span className="bg-green-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md">Completed</span>;
    countdownText = "Trip Finished";
  } else if (now < start) {
    statusBadge = <span className="bg-yellow-500 text-yellow-900 text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md">Upcoming</span>;
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 3600 * 24));
    countdownText = `Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (now >= start && now <= end) {
    statusBadge = <span className="bg-blue-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md animate-pulse">In Progress</span>;
    countdownText = "Bon Voyage!";
  } else {
    statusBadge = <span className="bg-gray-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md">Past Trip</span>;
    countdownText = "Trip Ended";
  }

  const gradientClass = `bg-gradient-to-br ${getBackgroundGradient(trip.destination)}`;

  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 }
      }}
      whileHover={{ scale: 1.03, rotateZ: 0.5 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleViewDetails}
      className={`group relative rounded-2xl shadow-xl overflow-hidden cursor-pointer border border-gray-700 bg-gray-900 flex flex-col h-full`}
    >
      {/* Top Banner (Color Gradient) */}
      <div className={`h-28 ${gradientClass} relative p-4 flex flex-col justify-between`}>
        <div className="flex justify-between items-start">
          {statusBadge}
          {onClone ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onClone(trip.id); }} 
              className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 rounded-lg text-white text-xs font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-300 shadow-lg flex items-center gap-1"
              title="Clone to Dashboard"
            >
              <span>📋</span> Clone
            </button>
          ) : onDelete ? (
            <button 
              onClick={handleDelete} 
              className="p-1.5 bg-black/30 hover:bg-red-500/80 rounded-full text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-300"
              title="Delete Trip"
            >
              🗑️
            </button>
          ) : null}
        </div>
        <h2 className="text-2xl font-extrabold text-white drop-shadow-lg truncate">{trip.destination}</h2>
      </div>

      {/* Details Section */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-center text-gray-300 text-sm mb-3">
            <span className="mr-2">📅</span>
            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
          </div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Budget Limit</span>
            <span className="text-sm font-medium text-blue-400">{countdownText}</span>
          </div>
          <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
            {formatCurrency(trip.budget)}
          </p>
        </div>

        <div className="mt-6">
          <button className="w-full text-center text-sm font-semibold bg-gray-800 text-gray-300 py-2.5 rounded-xl border border-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
            View Itinerary →
          </button>
        </div>
      </div>
    </motion.div>
  );
};