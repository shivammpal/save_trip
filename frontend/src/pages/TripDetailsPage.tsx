// File: src/pages/TripDetailsPage.tsx (Updated)

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getTrip, getTripRecommendations, addItineraryItem, updateItineraryItem, deleteItineraryItem, searchDestinations, type Trip, type ItineraryItem, type RecommendationsResponse, type Destination } from "../services/apiService";

export const TripDetailsPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [formData, setFormData] = useState({
    day: "",
    description: "",
    cost: "",
    location_name: "",
  });
  const [locationSuggestions, setLocationSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);


  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripId) return;
      try {
        setIsLoading(true);
        const data = await getTrip(tripId);
        setTrip(data);
        // Fetch recommendations
        const recs = await getTripRecommendations(tripId);
        setRecommendations(recs);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId]);

  const handleAddItem = async () => {
    if (!tripId) return;
    if (!formData.location_name.trim()) {
      alert("Location is required.");
      return;
    }
    try {
      const dataToSend = {
        ...formData,
        day: parseInt(formData.day) || 1,
        cost: parseFloat(formData.cost) || 0,
      };
      await addItineraryItem(tripId, dataToSend);
      // Refresh trip data
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUpdateItem = async () => {
    if (!tripId || !editingItem) return;
    if (!formData.location_name.trim()) {
      alert("Location is required.");
      return;
    }
    try {
      const dataToSend = {
        ...formData,
        day: parseInt(formData.day) || 1,
        cost: parseFloat(formData.cost) || 0,
      };
      await updateItineraryItem(tripId, editingItem.id, dataToSend);
      // Refresh trip data
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
      setEditingItem(null);
      resetForm();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!tripId) return;
    if (!confirm("Are you sure you want to delete this itinerary item?")) return;
    try {
      await deleteItineraryItem(tripId, itemId);
      // Refresh trip data
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleToggleVisited = async (item: ItineraryItem) => {
    if (!tripId) return;
    try {
      const dataToSend = {
        day: item.day,
        description: item.description,
        cost: item.cost,
        location_name: item.location_name || "",
        visited: !item.visited,
      };
      await updateItineraryItem(tripId, item.id, dataToSend);
      // Refresh trip data
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      day: "",
      description: "",
      cost: "",
      location_name: "",
    });
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const startEdit = (item: ItineraryItem) => {
    setEditingItem(item);
    setFormData({
      day: item.day.toString(),
      description: item.description,
      cost: item.cost.toString(),
      location_name: item.location_name || "",
    });
  };

  const handleLocationChange = async (value: string) => {
    setFormData({ ...formData, location_name: value });
    if (value.length >= 3) {
      try {
        const suggestions = await searchDestinations(value);
        setLocationSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to fetch location suggestions:", error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectLocation = (location: Destination) => {
    setFormData({ ...formData, location_name: location.name });
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };



  if (isLoading) return <div className="text-center p-10 text-gray-300">Loading trip details...</div>;
  if (error) return <div className="text-center p-10 text-red-400">Error: {error}</div>;
  if (!trip) return <div className="text-center p-10 text-gray-300">Trip not found.</div>;

  const isCompletelyVisited = trip.itinerary && trip.itinerary.length > 0 && trip.itinerary.every(item => item.visited);

  return (
    <div className="container mx-auto p-6 max-w-4xl bg-gray-900 min-h-screen text-gray-100">
      {/* Trip Info Section */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{trip.destination}</h1>
            <p className="text-gray-300 mb-1">
              <span className="font-medium text-gray-200">Dates:</span> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
            </p>
            {trip.source && (
              <p className="text-gray-300 mb-1">
                <span className="font-medium text-gray-200">From:</span> {trip.source}
              </p>
            )}
            <p className="text-gray-300 mb-1">
              <span className="font-medium text-gray-200">To:</span> {trip.destination}
            </p>
            <p className="text-white font-semibold">
              <span className="font-medium text-gray-200">Budget:</span> <span className="text-green-400">${trip.budget.toLocaleString()}</span>
            </p>
            {isCompletelyVisited && (
              <span className="inline-block mt-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                ✅ Completely Visited
              </span>
            )}
          </div>
          <Link
            to={`/trips/${trip.id}/documents`}
            className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Documents
          </Link>
        </div>
      </div>

      {/* AI Recommendations Section */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">AI-Powered Suggestions</h2>
        {recommendations?.message ? (
          <div className="bg-red-900 border border-red-700 rounded-md p-4">
            <p className="text-red-300 font-medium">{recommendations.message}</p>
          </div>
        ) : recommendations?.recommendations ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {recommendations.recommendations.map((rec, index) => (
                <div key={index} className="border border-gray-600 rounded-md p-4 bg-gray-700">
                  <h3 className="font-semibold text-lg mb-2 text-white">{rec.name}</h3>
                  <p className="text-gray-300 mb-2">{rec.description}</p>
                  <p className="text-green-400 font-medium">Estimated Cost: ${rec.estimated_cost}</p>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <p className="text-gray-400">Loading recommendations...</p>
        )}
      </div>

      {/* Itinerary Management Section */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Itinerary</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Item
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="bg-gray-700 p-4 rounded-md mb-4 border border-gray-600">
            <h3 className="font-semibold mb-3 text-white">{editingItem ? "Edit Item" : "Add New Item"}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Day</label>
                <input
                  type="number"
                  min="1"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-200">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-gray-200">Location</label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onBlur={() => {
                    setTimeout(() => {
                      setLocationSuggestions([]);
                      setShowSuggestions(false);
                    }, 150);
                  }}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                  placeholder="e.g., Eiffel Tower, Paris"
                  required
                />
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-gray-700 border border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto">
                    {locationSuggestions.map((location, index) => (
                      <div
                        key={index}
                        onMouseDown={() => selectLocation(location)}
                        className="p-2 hover:bg-gray-600 cursor-pointer text-white"
                      >
                        {location.name}, {location.country}
                      </div>
                    ))}
                    <div
                      onMouseDown={() => {
                        setLocationSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="p-2 hover:bg-gray-600 cursor-pointer text-gray-400 text-sm border-t border-gray-600"
                    >
                      Hide suggestions
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {editingItem ? "Update" : "Add"} Item
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Itinerary Timeline */}
        {trip.itinerary && trip.itinerary.length > 0 ? (
          (() => {
            // Group itinerary by day
            const groupedItinerary = trip.itinerary.reduce((acc, item) => {
              if (!acc[item.day]) acc[item.day] = [];
              acc[item.day].push(item);
              return acc;
            }, {} as Record<number, ItineraryItem[]>);

            // Sort days
            const sortedDays = Object.keys(groupedItinerary).map(Number).sort((a, b) => a - b);

            // Function to get date for day
            const getDateForDay = (day: number) => {
              const start = new Date(trip.start_date);
              const date = new Date(start);
              date.setDate(start.getDate() + day - 1);
              return date.toLocaleDateString();
            };

            return (
              <div className="relative flex flex-col items-center">
                <div className="w-full max-w-4xl">
                  {sortedDays.map((day) => (
                    <div key={day} className="relative w-full mb-12">
                      {/* Date on center line */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
                        {getDateForDay(day)}
                      </div>

                      {/* Line segment */}
                      <div className="absolute left-1/2 transform -translate-x-0.5 w-0.5 bg-blue-600 h-full top-0"></div>

                      {/* Activities for this day */}
                      <div className="mt-16 space-y-4">
                        {groupedItinerary[day]
                          .sort((a: ItineraryItem, b: ItineraryItem) => (a.time || "").localeCompare(b.time || ""))
                          .map((item: ItineraryItem, itemIndex: number) => (
                            <div key={item.id} className="relative w-full flex">
                              {itemIndex % 2 === 0 ? (
                                <>
                                  <div className="flex-1 text-right pr-4">
                                    <div className="inline-block bg-gray-700 rounded-lg p-4 border border-gray-600 max-w-md">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                          {item.time && (
                                            <span className="text-gray-300 text-sm">{item.time}</span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleToggleVisited(item)}
                                            className={`px-3 py-1 rounded text-sm text-white ${item.visited ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 hover:bg-gray-400'}`}
                                          >
                                            {item.visited ? "Visited" : "Mark Visited"}
                                          </button>
                                          <button
                                            onClick={() => startEdit(item)}
                                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-500"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <p className="text-white text-lg font-medium">{item.description}</p>
                                        <div className="flex items-center gap-6 text-sm">
                                          {item.location_name && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">📍</span>
                                              <span className="text-gray-300">{item.location_name}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">💰</span>
                                            <span className="text-green-400 font-medium">${item.cost}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex-1"></div>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1"></div>
                                  <div className="flex-1 pl-4">
                                    <div className="inline-block bg-gray-700 rounded-lg p-4 border border-gray-600 max-w-md">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                          {item.time && (
                                            <span className="text-gray-300 text-sm">{item.time}</span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleToggleVisited(item)}
                                            className={`px-3 py-1 rounded text-sm text-white ${item.visited ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 hover:bg-gray-400'}`}
                                          >
                                            {item.visited ? "Visited" : "Mark Visited"}
                                          </button>
                                          <button
                                            onClick={() => startEdit(item)}
                                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-500"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <p className="text-white text-lg font-medium">{item.description}</p>
                                        <div className="flex items-center gap-6 text-sm">
                                          {item.location_name && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">📍</span>
                                              <span className="text-gray-300">{item.location_name}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">💰</span>
                                            <span className="text-green-400 font-medium">${item.cost}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Timeline dot */}
                              <div className="absolute left-1/2 transform -translate-x-2 w-4 h-4 bg-blue-600 rounded-full border-4 border-gray-800"></div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-gray-400 text-center py-8">No itinerary items yet. Add your first activity!</p>
        )}
      </div>
    </div>
  );
};
