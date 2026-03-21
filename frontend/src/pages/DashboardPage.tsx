import { useState, useEffect } from "react";
import { getTrips, createTrip, searchDestinations } from "../services/apiService";
import type { Trip, Destination } from "../services/apiService.ts";
import { TripCard } from "../components/TripCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

export const DashboardPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal + form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTripData, setNewTripData] = useState({
    destination: "",
    source: "",
    start_date: "",
    end_date: "",
    budget: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Search state
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const data = await getTrips();
      setTrips(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewTripData({ ...newTripData, [name]: type === 'number' ? parseFloat(value) : value });

    // Debounced destination search
    if (name === 'destination') {
      if (searchTimeout) clearTimeout(searchTimeout);
      if (value.length > 2) {
        setIsSearching(true);
        setSearchTimeout(
          setTimeout(async () => {
            const results = await searchDestinations(value);
            setSearchResults(results);
            setIsSearching(false);
          }, 500)
        );
      } else {
        setSearchResults([]);
      }
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    setNewTripData({ ...newTripData, destination: destination.name });
    setSearchResults([]);
  };

  const handleSubmitNewTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createTrip(newTripData);
      setIsModalOpen(false);
      setNewTripData({ destination: "", source: "", start_date: "", end_date: "", budget: 0 });
      await fetchTrips();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleDeleteTrip = (deletedTripId: string) => {
    setTrips(trips.filter((trip) => trip.id !== deletedTripId));
  };

  if (isLoading) return <div className="text-center p-10 text-gray-400 animate-pulse">Loading your trips...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-gray-800/40 backdrop-blur-lg px-6 py-4 rounded-xl border border-gray-700 shadow-md">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          ✈️ Your Adventure Dashboard
        </h1>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-blue-700/50 transition-transform transform hover:scale-105"
        >
          + Create New Trip
        </Button>
      </div>

      {/* Trips Section */}
      {trips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map((trip) => (
            <div key={trip.id} className="transition-transform transform hover:scale-[1.02] hover:shadow-2xl">
              <TripCard trip={trip} onDelete={handleDeleteTrip} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-8 bg-gray-800/40 border border-gray-700 rounded-2xl shadow-lg backdrop-blur-md">
          <h2 className="text-2xl font-semibold text-white">🌍 No Trips Yet</h2>
          <p className="text-gray-400 mt-3">
            Start your journey by clicking <span className="text-blue-400 font-semibold">“Create New Trip”</span>
          </p>
        </div>
      )}

      {/* Create Trip Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="✨ Plan Your Next Adventure">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmitNewTrip} className="space-y-6">
            {formError && (
              <p className="text-red-400 bg-red-900/30 border border-red-700 rounded-md p-3">
                {formError}
              </p>
            )}

            {/* Source */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Source (Optional)</label>
              <Input
                name="source"
                type="text"
                value={newTripData.source}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, India"
                className="w-full py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              />
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Destination <span className="text-red-400">*</span></label>
              <div className="relative">
                <Input
                  name="destination"
                  type="text"
                  value={newTripData.destination}
                  onChange={handleInputChange}
                  placeholder="Search destination (e.g., Paris, Tokyo, Bali)"
                  required
                  autoComplete="off"
                  className="pl-10 pr-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {(isSearching || searchResults.length > 0) && (
                <div className="absolute w-full bg-gray-800/90 border border-gray-600 rounded-md mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {isSearching && <div className="p-3 text-gray-400">🔎 Searching destinations...</div>}
                  {searchResults.map((result) => (
                    <div
                      key={`${result.lat}-${result.lon}`}
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 text-white transition"
                      onClick={() => handleSelectDestination(result)}
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.country && <div className="text-sm text-gray-400">{result.country}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">Start Date *</label>
                <Input
                  name="start_date"
                  type="date"
                  value={newTripData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">End Date *</label>
                <Input
                  name="end_date"
                  type="date"
                  value={newTripData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Budget *</label>
              <div className="relative">
                <Input
                  name="budget"
                  type="number"
                  value={newTripData.budget}
                  onChange={handleInputChange}
                  placeholder="e.g., 2500"
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-medium">$</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/50"
            >
              🚀 Plan My Trip
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
};
