import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import {
  searchFlights,
  searchTrains,
  searchRides,
  searchHotels,
  type FlightOffer,
  type TrainOffer,
  type RideEstimate,
  type HotelOffer,
  type Destination
} from "../services/apiService";
import { searchDestinations } from "../services/apiService";


type SearchType = "flights" | "trains" | "rides" | "hotels";

interface SearchFormData {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  max_price?: number;
  adults: number;
  start_lat?: number;
  start_lon?: number;
  end_lat?: number;
  end_lon?: number;
  check_in_date?: string;
  check_out_date?: string;
}

export const TravelPage = () => {
  const [activeTab, setActiveTab] = useState<SearchType>("flights");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search form state
  const [searchData, setSearchData] = useState<SearchFormData>({
    origin: "",
    destination: "",
    departure_date: "",
    adults: 1,
  });

  // Location search state
  const [originResults, setOriginResults] = useState<Destination[]>([]);
  const [destinationResults, setDestinationResults] = useState<Destination[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // New state for hiding recommendations
  const [hideRecommendations, setHideRecommendations] = useState(false);

  // Function to filter and deduplicate location results
  const filterLocations = (locations: Destination[], query: string): Destination[] => {
    if (locations.length === 0) return [];

    // Remove duplicates based on normalized name
    const seen = new Set<string>();
    const filtered: Destination[] = [];

    for (const location of locations) {
      const normalizedName = location.name.toLowerCase().trim();
      const normalizedQuery = query.toLowerCase().trim();

      // Skip if we've seen this location name before
      if (seen.has(normalizedName)) continue;
      seen.add(normalizedName);

      // Prioritize results that start with the query
      if (normalizedName.startsWith(normalizedQuery)) {
        filtered.unshift(location); // Add to beginning
      } else if (normalizedName.includes(normalizedQuery)) {
        filtered.push(location); // Add to end
      }
    }

    // Limit results to prevent overwhelming dropdown (max 8)
    return filtered.slice(0, 8);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSearchData({
      ...searchData,
      [name]: type === 'number' ? parseFloat(value) : value
    });

    // Handle location search with debouncing
    if (name === 'origin' || name === 'destination') {
      if (searchTimeout) clearTimeout(searchTimeout);

      if (value.length > 2 && !hideRecommendations) {
        const isOrigin = name === 'origin';
        if (isOrigin) {
          setIsSearchingOrigin(true);
        } else {
          setIsSearchingDestination(true);
        }

        setSearchTimeout(
          setTimeout(async () => {
            const results = await searchDestinations(value);
            const filteredResults = filterLocations(results, value);
            if (isOrigin) {
              setOriginResults(filteredResults);
              setIsSearchingOrigin(false);
            } else {
              setDestinationResults(filteredResults);
              setIsSearchingDestination(false);
            }
          }, 500)
        );
      } else {
        if (name === 'origin') {
          setOriginResults([]);
        } else {
          setDestinationResults([]);
        }
      }
    }
  };

  const handleLocationSelect = (location: Destination, isOrigin: boolean) => {
    setSearchData({
      ...searchData,
      [isOrigin ? 'origin' : 'destination']: location.name
    });

    if (isOrigin) {
      setOriginResults([]);
    } else {
      setDestinationResults([]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      let searchResults: any[] = [];

      switch (activeTab) {
        case "flights":
          searchResults = await searchFlights(
            searchData.origin,
            searchData.destination,
            searchData.departure_date,
            searchData.max_price
          );
          break;
        case "trains":
          searchResults = await searchTrains(
            searchData.origin,
            searchData.destination,
            searchData.departure_date
          );
          break;
        case "rides":
          // For rides, we need coordinates - in a real app, you'd geocode the addresses
          // For now, we'll use mock coordinates
          searchResults = await searchRides(
            28.6139, // Delhi lat
            77.2090, // Delhi lon
            19.0760, // Mumbai lat
            72.8777  // Mumbai lon
          );
          break;
        case "hotels":
          searchResults = await searchHotels(
            searchData.destination,
            searchData.check_in_date || searchData.departure_date,
            searchData.check_out_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            searchData.adults
          );
          break;
      }

      setResults(searchResults);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFlightResults = (flights: FlightOffer[]) => (
    <div className="space-y-4">
      {flights.map((flight) => (
        <div key={flight.id} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <span className="font-semibold text-lg">${flight.price}</span>
                <Badge>{flight.currency}</Badge>
              </div>
              {flight.segments.map((segment, idx) => (
                <div key={idx} className="text-sm text-gray-600 mb-1">
                  <div className="flex justify-between">
                    <span>{segment.departure_airport} → {segment.arrival_airport}</span>
                    <span>{segment.carrier}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Dep: {new Date(segment.departure_time).toLocaleTimeString()}</span>
                    <span>Arr: {new Date(segment.arrival_time).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button className="ml-4">Book Now</Button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTrainResults = (trains: TrainOffer[]) => (
    <div className="space-y-4">
      {trains.map((train, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <span className="font-semibold">{train.train_number}</span>
                <span className="text-gray-600">{train.train_name}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Dep: {train.departure_time}</span>
                <span>Arr: {train.arrival_time}</span>
                <span>Duration: {train.duration}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {train.available_classes.map((cls) => (
                  <Badge key={cls}>{cls}</Badge>
                ))}
              </div>
            </div>
            <Button className="ml-4">Book Now</Button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRideResults = (rides: RideEstimate[]) => (
    <div className="space-y-4">
      {rides.map((ride, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <span className="font-semibold text-lg">{ride.provider}</span>
                <Badge>{ride.vehicle_type}</Badge>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  ${ride.estimated_price_min} - ${ride.estimated_price_max} {ride.currency}
                </span>
                <span>{Math.round(ride.estimated_duration_seconds / 60)} min</span>
              </div>
            </div>
            <Button className="ml-4">Book Ride</Button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderHotelResults = (hotels: HotelOffer[]) => (
    <div className="space-y-4">
      {hotels.map((hotel) => (
        <div key={hotel.id} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <span className="font-semibold text-lg">{hotel.name}</span>
                <div className="flex items-center">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1">{hotel.rating}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span className="font-semibold">${hotel.price} {hotel.currency}</span>
                <span>per night</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {hotel.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity}>{amenity}</Badge>
                ))}
              </div>
            </div>
            <Button className="ml-4">Book Now</Button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderResults = () => {
    if (isLoading) return <div className="text-center p-10">Searching...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;
    if (results.length === 0) return <div className="text-center p-10 text-gray-500">No results found</div>;

    switch (activeTab) {
      case "flights":
        return renderFlightResults(results as FlightOffer[]);
      case "trains":
        return renderTrainResults(results as TrainOffer[]);
      case "rides":
        return renderRideResults(results as RideEstimate[]);
      case "hotels":
        return renderHotelResults(results as HotelOffer[]);
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Services</h1>
        <p className="text-gray-600">Book flights, trains, rides, and hotels all in one place</p>
      </div>

      {/* Search Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: "flights", label: "✈️ Flights", icon: "✈️" },
          { key: "trains", label: "🚂 Trains", icon: "🚂" },
          { key: "rides", label: "🚗 Rides", icon: "🚗" },
          { key: "hotels", label: "🏨 Hotels", icon: "🏨" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as SearchType)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Origin */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === "rides" ? "Pickup Location" : "From"}
              </label>
              <Input
                name="origin"
                type="text"
                value={searchData.origin}
                onChange={handleInputChange}
                placeholder={activeTab === "rides" ? "Enter pickup location" : "Origin city"}
                required={activeTab !== "hotels"}
              />
              {isSearchingOrigin && !hideRecommendations && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg z-10">
                  <div className="p-2 text-gray-500">Searching...</div>
                </div>
              )}
              {originResults.length > 0 && !hideRecommendations && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {originResults.map((result, index) => (
                    <div
                      key={`${result.name}-${index}`}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleLocationSelect(result, true)}
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.country && (
                        <div className="text-xs text-gray-500">{result.country}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === "rides" ? "Drop Location" : "To"}
              </label>
              <Input
                name="destination"
                type="text"
                value={searchData.destination}
                onChange={handleInputChange}
                placeholder={activeTab === "rides" ? "Enter drop location" : "Destination city"}
                required={activeTab !== "hotels"}
              />
              {isSearchingDestination && !hideRecommendations && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg z-10">
                  <div className="p-2 text-gray-500">Searching...</div>
                </div>
              )}
              {destinationResults.length > 0 && !hideRecommendations && (
                <div className="absolute w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {destinationResults.map((result, index) => (
                    <div
                      key={`${result.name}-${index}`}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleLocationSelect(result, false)}
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.country && (
                        <div className="text-xs text-gray-500">{result.country}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Departure/Check-in Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === "hotels" ? "Check-in Date" : "Departure Date"}
              </label>
              <Input
                name={activeTab === "hotels" ? "check_in_date" : "departure_date"}
                type="date"
                value={activeTab === "hotels" ? searchData.check_in_date || searchData.departure_date : searchData.departure_date}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Return/Check-out Date or Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === "hotels" ? "Check-out Date" : "Max Price (Optional)"}
              </label>
              {activeTab === "hotels" ? (
                <Input
                  name="check_out_date"
                  type="date"
                  value={searchData.check_out_date || ""}
                  onChange={handleInputChange}
                  required
                />
              ) : (
                <Input
                  name="max_price"
                  type="number"
                  value={searchData.max_price || ""}
                  onChange={handleInputChange}
                  placeholder="Max price"
                />
              )}
            </div>
          </div>

          {/* Additional options for hotels */}
          {activeTab === "hotels" && (
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                <Input
                  name="adults"
                  type="number"
                  min="1"
                  value={searchData.adults}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          )}

          {/* Hide Recommendations Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hideRecommendations"
                checked={hideRecommendations}
                onChange={(e) => {
                  setHideRecommendations(e.target.checked);
                  if (e.target.checked) {
                    setOriginResults([]);
                    setDestinationResults([]);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hideRecommendations" className="text-sm text-gray-700">
                Hide location suggestions while typing
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-32">
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Results List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === "flights" && "Flight Results"}
            {activeTab === "trains" && "Train Results"}
            {activeTab === "rides" && "Ride Options"}
            {activeTab === "hotels" && "Hotel Options"}
          </h2>
          {renderResults()}
        </div>
      </div>
    </div>
  );
};
