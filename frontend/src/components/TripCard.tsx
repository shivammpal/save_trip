// File: src/components/TripCard.tsx

import { useNavigate } from "react-router-dom";
import { deleteTrip } from "../services/apiService";
import type { Trip } from "../services/apiService.ts";

interface TripCardProps {
  trip: Trip;
  onDelete: (tripId: string) => void;
}

// A simple helper to format dates nicely
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const TripCard = ({ trip, onDelete }: TripCardProps) => {
  const navigate = useNavigate();

  const handleDelete = async () => {
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
    console.log("Navigating with trip object:", trip);
    navigate(`/trips/${trip.id}`);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between
                    transition-transform hover:scale-105 hover:shadow-xl border border-gray-700">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">{trip.destination}</h2>
        <p className="text-gray-300">
          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
        </p>
        <p className="text-white font-semibold mt-4">
          Budget: <span className="text-green-400">${trip.budget.toLocaleString()}</span>
        </p>
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <button onClick={handleDelete} className="text-sm font-medium text-red-400 hover:text-red-300">Delete</button>
        <button onClick={handleViewDetails} className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          View Details
        </button>
      </div>
    </div>
  );
};