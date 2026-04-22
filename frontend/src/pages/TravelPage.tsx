// File: src/pages/TravelPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
  type Destination,
  searchDestinations,
  getTrips,
  addItineraryItem,
  type Trip,
} from "../services/apiService";
import { useCurrency } from "../context/CurrencyContext";
import { airports } from "../data/airports";

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
  const { currency, formatCurrency } = useCurrency();
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
  const [originResults, setOriginResults] = useState<any[]>([]);
  const [destinationResults, setDestinationResults] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [_isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hideRecommendations, setHideRecommendations] = useState(false);

  // Save to trip state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedItemToSave, setSelectedItemToSave] = useState<any | null>(null);
  const [itemTypeToSave, setItemTypeToSave] = useState<string>("");
  const [showSaveModal, setShowSaveModal] = useState(false);

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
            if (activeTab === "flights") {
              const query = value.toLowerCase().trim();
              const filteredAirports = airports.filter(
                (a) =>
                  a.city.toLowerCase().includes(query) ||
                  a.code.toLowerCase().includes(query) ||
                  a.name.toLowerCase().includes(query) ||
                  a.country.toLowerCase().includes(query)
              ).slice(0, 8);
              if (isOrigin) {
                setOriginResults(filteredAirports);
                setIsSearchingOrigin(false);
              } else {
                setDestinationResults(filteredAirports);
                setIsSearchingDestination(false);
              }
            } else {
              const results = await searchDestinations(value);
              const filteredResults = filterLocations(results, value);
              if (isOrigin) {
                setOriginResults(filteredResults);
                setIsSearchingOrigin(false);
              } else {
                setDestinationResults(filteredResults);
                setIsSearchingDestination(false);
              }
            }
          }, 500)
        );
      } else {
        if (name === "origin") setOriginResults([]);
        else setDestinationResults([]);
      }
    }
  };

  const handleLocationSelect = (location: any, isOrigin: boolean) => {
    const valueToSet = location.code ? location.code : location.name;
    setSearchData({
      ...searchData,
      [isOrigin ? "origin" : "destination"]: valueToSet,
    });
    if (isOrigin) setOriginResults([]);
    else setDestinationResults([]);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsSearchingOrigin(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
        const data = await res.json();
        const city = data.address.city || data.address.town || data.address.village || "";
        setSearchData(prev => ({ 
          ...prev, 
          origin: city || "Unknown Location", 
          start_lat: position.coords.latitude, 
          start_lon: position.coords.longitude 
        }));
      } catch (err) {
        console.error("Error fetching location", err);
        setSearchData(prev => ({ 
          ...prev, 
          start_lat: position.coords.latitude, 
          start_lon: position.coords.longitude 
        }));
        alert("Failed to auto-detect city. Location coords saved.");
      } finally {
        setIsSearchingOrigin(false);
      }
    }, () => {
      alert("Unable to retrieve your location");
      setIsSearchingOrigin(false);
    });
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
            searchData.origin,
            searchData.destination,
            searchData.departure_date,
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
      return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-indigo-300 animate-pulse">Scanning the globe...</p>
        </div>
      );
    if (error)
      return (
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl text-center shadow-lg">
           <span className="text-4xl block mb-2">⚠️</span>
           <p className="text-xl text-red-400 font-semibold">{error}</p>
        </div>
      );
    if (results.length === 0)
      return (
        <div className="bg-[#151c2e] border border-gray-800 p-16 rounded-3xl text-center shadow-inner flex flex-col items-center">
           <span className="text-6xl block mb-4 grayscale opacity-50">🛸</span>
           <h3 className="text-2xl font-bold text-gray-400">No results found</h3>
           <p className="text-gray-500 mt-2 max-w-md">Try adjusting your search parameters, dates, or exploring different destinations to find available options.</p>
        </div>
      );

    const handleOpenSaveModal = async (item: any, type: string) => {
      setSelectedItemToSave(item);
      setItemTypeToSave(type);
      try {
        const allTrips = await getTrips();
        setTrips(allTrips);
        setShowSaveModal(true);
      } catch (err) {
        alert("Failed to load your trips.");
      }
    };

    const TicketCard = ({ item, type, icon, headerComponent, detailsComponent, priceInfo }: any) => (
      <div className="relative bg-[#0b1120]/80 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-800/60 overflow-hidden flex flex-col md:flex-row group hover:border-indigo-500/30 transition-all duration-500 hover:-translate-y-1">
        {/* Decorative Ticket Stub edge (Left) */}
        <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#020617] rounded-r-2xl border-r border-gray-800/60 z-20"></div>
        {/* Decorative Ticket Stub edge (Right) */}
        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#020617] rounded-l-2xl border-l border-gray-800/60 z-20"></div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 relative">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800/50 pb-4">
             <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl border border-indigo-500/20">{icon}</div>
             {headerComponent}
          </div>
          <div className="space-y-4 relative z-10">
             {detailsComponent}
          </div>
        </div>

        {/* Divider (Dashed) */}
        <div className="md:w-[2px] md:h-auto h-[2px] w-full bg-gradient-to-b from-transparent via-gray-700 to-transparent flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMiIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiM0YjU1NjMiLz48L3N2Zz4=')] opacity-50 bg-repeat-y"></div>
        </div>

        {/* Action / Price Area */}
        <div className="w-full md:w-72 bg-gradient-to-br from-[#151c2e] to-[#0f1524] p-8 flex flex-col justify-center items-center text-center relative z-10">
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mb-1">Total Price</p>
          <div className="flex items-center gap-2 mb-6">
             <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">{priceInfo.amount}</span>
             <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">{priceInfo.currency}</Badge>
          </div>
          
          <div className="w-full space-y-3">
            <Button className="w-full h-12 bg-white text-indigo-950 hover:bg-gray-100 rounded-xl font-extrabold shadow-lg transition-transform transform active:scale-95">Book Now</Button>
            <Button className="w-full h-12 bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 border border-indigo-500/30 rounded-xl font-bold transition-transform transform active:scale-95 flex items-center justify-center gap-2" onClick={() => handleOpenSaveModal(item, type)}>
               <span>🔖</span> Save to Trip
            </Button>
          </div>
        </div>
      </div>
    );

    switch (activeTab) {
      case "flights":
        return (
          <div className="space-y-8 mt-6">
            {results.map((f: FlightOffer, index) => (
              <TicketCard 
                key={index}
                item={f}
                type="flight"
                icon="✈️"
                priceInfo={{ amount: formatCurrency(f.price, f.currency).replace(/[^0-9.,]/g, ''), currency: currency }}
                headerComponent={<h3 className="text-xl font-bold text-gray-200 tracking-wide">Flight Offer</h3>}
                detailsComponent={
                  f.segments.map((s, i) => {
                    const durationMs = new Date(s.arrival_time).getTime() - new Date(s.departure_time).getTime();
                    const hours = Math.floor(durationMs / 3600000);
                    const minutes = Math.floor((durationMs % 3600000) / 60000);
                    const durationStr = `${hours}h ${minutes}m`;
                    
                    let carrierName = s.carrier;
                    let flightCode = "";
                    const match = s.carrier.match(/(.*)\s\((.*)\)/);
                    if (match) {
                      carrierName = match[1];
                      flightCode = match[2];
                    }

                    return (
                    <div key={i} className="flex flex-col md:flex-row items-center justify-between bg-[#151c2e]/50 p-4 rounded-xl border border-gray-800/60 group-hover:bg-[#151c2e] transition-colors relative">
                      {/* Timeline Line */}
                      <div className="hidden md:block absolute top-1/2 left-32 right-32 h-0.5 bg-gray-700/50 -translate-y-1/2 pointer-events-none"></div>
                      
                      <div className="flex flex-col items-center md:items-start z-10 bg-[#151c2e] px-2 md:px-0 md:bg-transparent">
                         <span className="text-3xl font-black text-white mb-1 drop-shadow-md">{s.departure_airport}</span>
                         <span className="text-sm font-semibold text-indigo-300">Dep: {new Date(s.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      
                      <div className="flex flex-col items-center my-4 md:my-0 z-10 bg-[#0f1524] px-6 py-2 rounded-2xl border border-indigo-500/30 shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                         <span className="text-xs font-black text-white tracking-widest uppercase">{carrierName}</span>
                         {flightCode && <span className="text-[10px] font-bold text-indigo-400 mt-0.5 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{flightCode}</span>}
                         <div className="flex items-center gap-2 mt-2">
                           <span className="w-6 h-[1px] bg-gray-600"></span>
                           <span className="text-xs font-bold text-gray-400">{durationStr}</span>
                           <span className="w-6 h-[1px] bg-gray-600"></span>
                         </div>
                      </div>

                      <div className="flex flex-col items-center md:items-end z-10 bg-[#151c2e] px-2 md:px-0 md:bg-transparent">
                         <span className="text-3xl font-black text-white mb-1 drop-shadow-md">{s.arrival_airport}</span>
                         <span className="text-sm font-semibold text-indigo-300">Arr: {new Date(s.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  )})
                }
              />
            ))}
          </div>
        );

      case "trains":
        return (
          <div className="space-y-8 mt-6">
            {results.map((t: TrainOffer, index) => (
              <TicketCard 
                key={index}
                item={t}
                type="train"
                icon="🚂"
                priceInfo={{ amount: formatCurrency(t.price, t.currency).replace(/[^0-9.,]/g, ''), currency: currency }}
                headerComponent={
                  <div>
                    <h3 className="text-xl font-bold text-gray-200 tracking-wide">{t.train_name}</h3>
                    <p className="text-xs text-indigo-400 font-mono tracking-widest mt-1">Train #{t.train_number}</p>
                  </div>
                }
                detailsComponent={
                  <div className="flex flex-col md:flex-row items-center justify-between bg-[#151c2e]/50 p-6 rounded-xl border border-gray-800/60 group-hover:bg-[#151c2e] transition-colors">
                     <div className="text-center md:text-left">
                       <p className="text-gray-400 text-xs font-bold uppercase mb-1">Departure</p>
                       <p className="text-2xl font-black text-white">{t.departure_time}</p>
                     </div>
                     <div className="text-center my-4 md:my-0 flex flex-col items-center">
                        <span className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">Duration</span>
                        <div className="px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-indigo-300 font-bold">{t.duration}</div>
                        <div className="flex gap-1 mt-3">
                           {t.available_classes.map(c => <span key={c} className="text-[10px] font-bold bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">{c}</span>)}
                        </div>
                     </div>
                     <div className="text-center md:text-right">
                       <p className="text-gray-400 text-xs font-bold uppercase mb-1">Arrival</p>
                       <p className="text-2xl font-black text-white">{t.arrival_time}</p>
                     </div>
                  </div>
                }
              />
            ))}
          </div>
        );

      case "rides":
        return (
          <div className="space-y-8 mt-6">
            {results.map((r: RideEstimate, index) => (
              <TicketCard 
                key={index}
                item={r}
                type="ride"
                icon="🚗"
                priceInfo={{ amount: `${formatCurrency(r.estimated_price_min, r.currency).replace(/[^0-9.,]/g, '')}`, currency: currency }}
                headerComponent={
                  <div>
                    <h3 className="text-xl font-bold text-gray-200 tracking-wide">{r.provider}</h3>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">{r.vehicle_type}</p>
                  </div>
                }
                detailsComponent={
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-1 bg-[#151c2e]/70 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                       <div className="p-3 bg-gray-800 rounded-lg text-xl">💰</div>
                       <div>
                         <p className="text-xs text-gray-500 font-bold uppercase">Price Range</p>
                         <p className="text-lg font-bold text-white whitespace-nowrap">{formatCurrency(r.estimated_price_min, r.currency)} - {formatCurrency(r.estimated_price_max, r.currency)}</p>
                       </div>
                     </div>
                  </div>
                }
              />
            ))}
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
        <div className="flex justify-center mb-10 relative z-20">
          <div className="inline-flex space-x-2 bg-[#1e293b]/80 p-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-indigo-500/30 backdrop-blur-xl">
            {[
              { key: "flights", label: "✈️ Flights" },
              { key: "trains", label: "🚂 Trains" },
              { key: "rides", label: "🚗 Rides" },
              { key: "hotels", label: "🏨 Hotels" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SearchType)}
                className={`py-3 px-8 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-[0_4px_15px_rgba(99,102,241,0.5)] transform scale-105"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-[#0f1524]/90 rounded-3xl shadow-2xl p-8 mb-12 border border-blue-900/50 backdrop-blur-xl relative overflow-visible z-10 w-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <form onSubmit={handleSearch} className="space-y-6 relative z-10">
            {activeTab === "hotels" && (
              <div className="w-full">
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">City Destination</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🏨</span>
                  <Input
                    name="city"
                    value={searchData.city}
                    onChange={handleInputChange}
                    placeholder="Where are you going?"
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white h-14"
                  />
                </div>
              </div>
            )}

            {activeTab !== "hotels" && (
              <div className="flex flex-col md:flex-row gap-6 relative">
                {/* Visual Connector for Desktop */}
                <div className="hidden md:flex absolute items-center justify-center inset-y-0 left-1/2 -ml-4 z-20 pointer-events-none">
                  <div className="bg-gray-800 rounded-full p-2 border border-gray-700 shadow-md">
                    <span className="text-gray-400">➡️</span>
                  </div>
                </div>

                <div className="flex-1 relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest">Origin</label>
                    <button type="button" onClick={handleUseMyLocation} className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded transition-colors">
                      📍 Use My Location {isSearchingOrigin && "..."}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🛫</span>
                    <Input
                      name="origin"
                      value={searchData.origin}
                      onChange={handleInputChange}
                      placeholder="Leaving from..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 transition-all text-white h-14"
                    />
                  </div>
                  {!hideRecommendations && originResults.length > 0 && (
                    <ul className="absolute z-50 w-full bg-[#151c2e] rounded-xl mt-2 p-2 border border-indigo-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto">
                      {originResults.map((loc, i) => (
                         <li
                          key={i}
                          className="py-2.5 px-3 hover:bg-gray-800 cursor-pointer rounded-lg transition-all duration-150 flex flex-col"
                          onClick={() => handleLocationSelect(loc, true)}
                        >
                          {loc.code ? 
                            <><span className="font-bold text-indigo-300 flex items-center gap-2"><span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-sm">{loc.code}</span> {loc.city}</span> <span className="text-xs text-gray-400 mt-1">{loc.name}</span></> : 
                            <span className="font-medium text-gray-200">{loc.name}</span>
                          }
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex-1 relative">
                  <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Destination</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🛬</span>
                    <Input
                      name="destination"
                      value={searchData.destination}
                      onChange={handleInputChange}
                      placeholder="Going to..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 transition-all text-white h-14"
                    />
                  </div>
                  {!hideRecommendations && destinationResults.length > 0 && (
                    <ul className="absolute z-50 w-full bg-[#151c2e] rounded-xl mt-2 p-2 border border-indigo-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto">
                      {destinationResults.map((loc, i) => (
                        <li
                          key={i}
                          className="py-2.5 px-3 hover:bg-gray-800 cursor-pointer rounded-lg transition-all duration-150 flex flex-col"
                          onClick={() => handleLocationSelect(loc, false)}
                        >
                          {loc.code ? 
                            <><span className="font-bold text-indigo-300 flex items-center gap-2"><span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-sm">{loc.code}</span> {loc.city}</span> <span className="text-xs text-gray-400 mt-1">{loc.name}</span></> : 
                            <span className="font-medium text-gray-200">{loc.name}</span>
                          }
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(activeTab === "flights" || activeTab === "trains") && (
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Departure Date</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📅</span>
                    <Input type="date" name="departure_date" value={searchData.departure_date} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 h-14 text-white" />
                  </div>
                </div>
              )}

              {activeTab === "trains" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Train Number (Opt)</label>
                  <Input name="train_number_date" value={searchData.train_number_date} onChange={handleInputChange} placeholder="e.g. 12004" className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 h-14 text-white" />
                </div>
              )}

              {activeTab === "hotels" && (
                <>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Check-In</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">⬇️</span>
                      <Input type="date" name="check_in_date" value={searchData.check_in_date || ""} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 h-14 text-white" />
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Check-Out</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">⬆️</span>
                      <Input type="date" name="check_out_date" value={searchData.check_out_date || ""} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-indigo-500 h-14 text-white" />
                    </div>
                  </div>
                </>
              )}

              <div className={`md:col-span-${activeTab === 'flights' ? '2' : '1'} flex items-end justify-end mt-4 md:mt-0`}>
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-8 rounded-xl shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all duration-300 font-extrabold text-lg flex items-center justify-center gap-2 transform hover:-translate-y-1"
                >
                  <span className="text-xl">🔍</span> Search Options
                </Button>
              </div>
            </div>
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

        {/* Modal for Saving to Trip */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-xl max-w-sm w-full border border-gray-600">
              <h2 className="text-xl font-bold mb-4 text-white">Select Trip</h2>
              {trips.length === 0 ? (
                <p className="text-gray-400 mb-4">You have no active trips.</p>
              ) : (
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                  {trips.map(t => (
                    <button
                      key={t.id}
                      onClick={async () => {
                        try {
                           let cost = 0;
                           let desc = "";
                           let pMode = "";
                           if (itemTypeToSave === "flight") {
                              cost = selectedItemToSave.price;
                              desc = `Flight with ${selectedItemToSave.segments?.[0]?.carrier}`;
                              pMode = "flight";
                           } else if (itemTypeToSave === "train") {
                              cost = selectedItemToSave.price;
                              desc = `Train: ${selectedItemToSave.train_name}`;
                              pMode = "train";
                           } else if (itemTypeToSave === "ride") {
                              cost = selectedItemToSave.estimated_price_max;
                              desc = `Ride with ${selectedItemToSave.provider}`;
                              pMode = "car";
                           } else if (itemTypeToSave === "hotel") {
                              cost = selectedItemToSave.price;
                              desc = `Hotel: ${selectedItemToSave.name}`;
                           }
                           
                           await addItineraryItem(t.id, {
                             day: 1, 
                             cost: cost,
                             description: desc,
                             location_name: searchData.destination || "Saved from Travel",
                             transport_mode: pMode
                           });
                           alert("Saved to trip!");
                           setShowSaveModal(false);
                        } catch (err) {
                           alert("Failed to save to trip");
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium"
                    >
                      {t.destination} ({new Date(t.start_date).toLocaleDateString()})
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
