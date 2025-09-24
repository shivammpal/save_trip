// File: src/pages/DashboardPage.tsx (Updated with Globe and Search)

import { useState, useEffect } from "react";
import { getTrips, createTrip, searchDestinations } from "../services/apiService";
import type { Trip, Destination } from "../services/apiService.ts";
import { TripCard } from "../components/TripCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Globe } from "../components/Globe"; // Import the Globe component

export const DashboardPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the modal and form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTripData, setNewTripData] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    budget: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // State for destination search and globe pin
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
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
    fetchTrips();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewTripData({ ...newTripData, [name]: type === 'number' ? parseFloat(value) : value });

    // Handle destination search with debouncing
    if (name === 'destination') {
      if (searchTimeout) clearTimeout(searchTimeout);
      setPinCoords(null); // Clear pin when typing
      
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
    setPinCoords({ lat: destination.lat, lon: destination.lon });
  };

  const handleSubmitNewTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const createdTrip = await createTrip(newTripData);
      setTrips([...trips, createdTrip]);
      setIsModalOpen(false);
      setNewTripData({ destination: "", start_date: "", end_date: "", budget: 0 });
      setPinCoords(null);
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  if (isLoading) return <div className="text-center p-10">Loading your trips...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Trips</h1>
        <Button onClick={() => setIsModalOpen(true)} className="w-auto">
          + Create New Trip
        </Button>
      </div>

      {trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (<TripCard key={trip.id} trip={trip} />))}
        </div>
      ) : (
        <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">No Trips Yet!</h2>
          <p className="text-gray-500 mt-2">Click "Create New Trip" to start planning your next adventure.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a New Trip">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Form on the left */}
          <form onSubmit={handleSubmitNewTrip} className="space-y-4">
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <Input name="destination" type="text" value={newTripData.destination} onChange={handleInputChange} required autoComplete="off" />
              {(isSearching || searchResults.length > 0) && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {isSearching && <div className="p-2 text-gray-500">Searching...</div>}
                  {searchResults.map((result) => (
                    <div key={result.name} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectDestination(result)}>
                      {result.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <Input name="start_date" type="date" value={newTripData.start_date} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <Input name="end_date" type="date" value={newTripData.end_date} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
              <Input name="budget" type="number" value={newTripData.budget} onChange={handleInputChange} required />
            </div>
            <div className="pt-4">
              <Button type="submit">Create Trip</Button>
            </div>
          </form>

          {/* Globe on the right */}
          <div className="w-full h-[300px] md:h-full bg-black rounded-lg mt-4 md:mt-0">
            <Globe pinCoords={pinCoords} />
          </div>
        </div>
      </Modal>
    </div>
  );
};