// File: src/components/TripCard.tsx

import type { Trip } from "../services/apiService.ts";

interface TripCardProps {
  trip: Trip;
}

// A simple helper to format dates nicely
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const TripCard = ({ trip }: TripCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between
                    transition-transform hover:scale-105 hover:shadow-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{trip.destination}</h2>
        <p className="text-gray-600">
          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
        </p>
        <p className="text-gray-800 font-semibold mt-4">
          Budget: <span className="text-green-600">${trip.budget.toLocaleString()}</span>
        </p>
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <button className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
        <button className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          View Details
        </button>
      </div>
    </div>
  );
};