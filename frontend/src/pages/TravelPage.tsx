// File: src/pages/TravelPage.tsx

import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
  type Destination,
  searchDestinations,
} from "../services/apiService";

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
  train_number_date: string;
  train_number_name: string;
  city: string;
}

export const TravelPage = () => {
  const [activeTab, setActiveTab] = useState<SearchType>("flights");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<SearchFormData>({
    origin: "",
    destination: "",
    departure_date: "",
    adults: 1,
    train_number_date: "",
    train_number_name: "",
    city: "",
  });
  const [originResults, setOriginResults] = useState<Destination[]>([]);
  const [destinationResults, setDestinationResults] = useState<Destination[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hideRecommendations, setHideRecommendations] = useState(false);

  // Reset search data when switching tabs
  useEffect(() => {
    setSearchData({
      origin: "",
      destination: "",
      departure_date: "",
      adults: 1,
      train_number_date: "",
      train_number_name: "",
      city: "",
    });
    setResults([]);
    setError(null);
  }, [activeTab]);

  // --- FILTER FUNCTION ---
  const filterLocations = (locations: Destination[], query: string): Destination[] => {
    if (locations.length === 0) return [];
    const seen = new Set<string>();
    const filtered: Destination[] = [];
    for (const location of locations) {
      const normalizedName = location.name.toLowerCase().trim();
      const normalizedQuery = query.toLowerCase().trim();
      if (seen.has(normalizedName)) continue;
      seen.add(normalizedName);
      if (normalizedName.startsWith(normalizedQuery)) {
        filtered.unshift(location);
      } else if (normalizedName.includes(normalizedQuery)) {
        filtered.push(location);
      }
    }
    return filtered.slice(0, 8);
  };

  // --- HANDLE INPUT CHANGE ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSearchData({
      ...searchData,
      [name]: type === "number" ? parseFloat(value) : value,
    });

    if (name === "origin" || name === "destination") {
      if (searchTimeout) clearTimeout(searchTimeout);

      if (value.length > 2 && !hideRecommendations) {
        const isOrigin = name === "origin";
        if (isOrigin) setIsSearchingOrigin(true);
        else setIsSearchingDestination(true);

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
        if (name === "origin") setOriginResults([]);
        else setDestinationResults([]);
      }
    }
  };

  const handleLocationSelect = (location: Destination, isOrigin: boolean) => {
    setSearchData({
      ...searchData,
      [isOrigin ? "origin" : "destination"]: location.name,
    });
    if (isOrigin) setOriginResults([]);
    else setDestinationResults([]);
  };

  // --- HANDLE SEARCH ---
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
            searchData.train_number_date,
            searchData.train_number_name,
            searchData.max_price
          );
          break;
        case "rides":
          searchResults = await searchRides(28.6139, 77.2090, 19.0760, 72.8777);
          break;
        case "hotels":
          searchResults = await searchHotels(
            searchData.city,
            searchData.check_in_date || searchData.departure_date,
            searchData.check_out_date ||
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  // --- RESULTS RENDERER ---
  const renderResults = () => {
    if (isLoading)
      return <div className="text-center p-10 text-blue-300 animate-pulse">🔍 Searching...</div>;
    if (error)
      return <div className="text-center p-10 text-red-400 font-semibold">❌ Error: {error}</div>;
    if (results.length === 0)
      return <div className="text-center p-10 text-gray-400 italic">No results found</div>;

    const resultCardStyle =
      "p-6 rounded-2xl shadow-xl border border-blue-900/60 bg-gradient-to-br from-[#0b1120] to-[#1e3a8a]/50 hover:shadow-blue-900/40 transition-all duration-300 text-gray-100 backdrop-blur-md";
    const buttonStyle =
      "ml-6 bg-blue-700 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200";

    const commonRender = (title: string, content: JSX.Element) => (
      <div className={resultCardStyle}>
        <div className="flex justify-between items-start">
          <div className="flex-1">{content}</div>
          <Button className={buttonStyle}>Book Now</Button>
        </div>
      </div>
    );

    switch (activeTab) {
      case "flights":
        return (
          <div className="space-y-6">
            {results.map((f: FlightOffer, index) =>
              commonRender("Flight", (
                <div key={index}>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="font-bold text-2xl text-blue-300">${f.price}</span>
                    <Badge variant="outline" className="border-blue-400 text-blue-200">
                      {f.currency}
                    </Badge>
                  </div>
                  {f.segments.map((s, i) => (
                    <div
                      key={i}
                      className="text-sm mb-3 p-3 rounded-lg bg-[#0f172a]/60 border border-blue-900/30"
                    >
                      <div className="flex justify-between font-medium">
                        <span>
                          {s.departure_airport} → {s.arrival_airport}
                        </span>
                        <span className="text-blue-400">{s.carrier}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>🕐 Dep: {new Date(s.departure_time).toLocaleTimeString()}</span>
                        <span>🛬 Arr: {new Date(s.arrival_time).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        );

      case "rides":
        return (
          <div className="space-y-6">
            {results.map((r: RideEstimate, index) =>
              commonRender("Ride", (
                <div key={index}>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="font-bold text-2xl text-blue-300">
                      {r.currency} {r.estimated_price_min} - {r.estimated_price_max}
                    </span>
                    <Badge variant="outline" className="border-blue-400 text-blue-200">
                      {r.provider}
                    </Badge>
                  </div>
                  <div className="text-sm mb-3 p-3 rounded-lg bg-[#0f172a]/60 border border-blue-900/30">
                    <div className="flex justify-between font-medium">
                      <span>{r.vehicle_type}</span>
                      <span className="text-blue-400">{r.provider}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>⏱️ Duration: {Math.floor(r.estimated_duration_seconds / 60)} min</span>
                      <span>💰 Est. Price: {r.currency} {r.estimated_price_min}-{r.estimated_price_max}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e3a8a] text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-transparent">
              🌍 Travel Services
            </h1>
            <p className="text-gray-400 text-sm">
              Book <span className="text-blue-300 font-medium">flights</span>,{" "}
              <span className="text-blue-300 font-medium">trains</span>,{" "}
              <span className="text-blue-300 font-medium">rides</span>, and{" "}
              <span className="text-blue-300 font-medium">hotels</span> — all in one place.
            </p>
          </div>

          {/* Hide Suggestions Toggle */}
          <Button
            onClick={() => setHideRecommendations(!hideRecommendations)}
            className="mt-4 md:mt-0 bg-blue-700 hover:bg-blue-600 px-5 py-2 rounded-lg text-white shadow-lg hover:shadow-blue-800/50 transition-all duration-200"
          >
            {hideRecommendations ? "Show Suggestions" : "Hide Suggestions"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-[#1e293b]/60 p-1 rounded-xl shadow-inner border border-blue-900/40 backdrop-blur-md">
          {[
            { key: "flights", label: "✈️ Flights" },
            { key: "trains", label: "🚂 Trains" },
            { key: "rides", label: "🚗 Rides" },
            { key: "hotels", label: "🏨 Hotels" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SearchType)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-md scale-105"
                  : "text-gray-300 hover:bg-blue-900/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <div className="bg-[#0f172a]/70 rounded-2xl shadow-xl p-6 mb-8 border border-blue-900/50 backdrop-blur-md">
          <form onSubmit={handleSearch} className="space-y-4">
            {activeTab === "hotels" && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">City</label>
                <Input
                  name="city"
                  value={searchData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  autoComplete="off"
                />
              </div>
            )}

            {activeTab !== "hotels" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Origin</label>
                  <Input
                    name="origin"
                    value={searchData.origin}
                    onChange={handleInputChange}
                    placeholder="Enter origin"
                    autoComplete="off"
                  />
                  {!hideRecommendations && originResults.length > 0 && (
                    <ul className="bg-[#1e3a8a]/80 rounded-md mt-2 p-2 border border-blue-800/40 shadow-inner">
                      {originResults.map((loc, i) => (
                        <li
                          key={i}
                          className="py-1 px-2 hover:bg-blue-700/70 cursor-pointer rounded-md transition-all duration-150"
                          onClick={() => handleLocationSelect(loc, true)}
                        >
                          {loc.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Destination</label>
                  <Input
                    name="destination"
                    value={searchData.destination}
                    onChange={handleInputChange}
                    placeholder="Enter destination"
                    autoComplete="off"
                  />
                  {!hideRecommendations && destinationResults.length > 0 && (
                    <ul className="bg-[#1e3a8a]/80 rounded-md mt-2 p-2 border border-blue-800/40 shadow-inner">
                      {destinationResults.map((loc, i) => (
                        <li
                          key={i}
                          className="py-1 px-2 hover:bg-blue-700/70 cursor-pointer rounded-md transition-all duration-150"
                          onClick={() => handleLocationSelect(loc, false)}
                        >
                          {loc.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === "trains" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Train Number and Date (e.g., 12345 2023-10-01)
                  </label>
                  <Input
                    name="train_number_date"
                    value={searchData.train_number_date}
                    onChange={handleInputChange}
                    placeholder="Enter train number and date"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Train Number or Name (e.g., 12345 or Rajdhani Express)
                  </label>
                  <Input
                    name="train_number_name"
                    value={searchData.train_number_name}
                    onChange={handleInputChange}
                    placeholder="Enter train number or name"
                  />
                </div>
              </div>
            )}

            {activeTab !== "trains" && activeTab !== "hotels" && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Departure Date</label>
                <Input type="date" name="departure_date" value={searchData.departure_date} onChange={handleInputChange} />
              </div>
            )}

            {activeTab === "hotels" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Check-in</label>
                  <Input type="date" name="check_in_date" value={searchData.check_in_date || ""} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Check-out</label>
                  <Input type="date" name="check_out_date" value={searchData.check_out_date || ""} onChange={handleInputChange} />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full md:w-auto bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-blue-700/50 transition-all duration-200 font-semibold"
            >
              🔎 Search
            </Button>
          </form>
        </div>

        {/* Results */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-blue-300">
            {activeTab === "flights" && "✈️ Flight Results"}
            {activeTab === "trains" && "🚂 Train Results"}
            {activeTab === "rides" && "🚗 Ride Options"}
            {activeTab === "hotels" && "🏨 Hotel Options"}
          </h2>
          {renderResults()}
        </div>
      </div>
    </div>
  );
};
