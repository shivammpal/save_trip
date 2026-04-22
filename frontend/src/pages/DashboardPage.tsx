// File: src/pages/DashboardPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { getTrips, createTrip, searchDestinations, getProfile } from "../services/apiService";
import type { Trip, Destination, UserProfile } from "../services/apiService";
import { TripCard } from "../components/TripCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useCurrency } from "../context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";

const SeasonalRecommendationsWidget = ({ onSelectDestination }: { onSelectDestination: (place: any) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -320 : 320;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getSeasonData = () => {
    const month = new Date().getMonth(); 
    if (month >= 2 && month <= 4) {
      return {
        title: "Spring Discoveries", icon: "🌸", desc: "India blooms. Perfect weather for these vibrant destinations.",
        places: [
          { name: "Munnar, Kerala", tag: "Tea Gardens", budget: 15000, img: "https://images.unsplash.com/photo-1542051812871-7575116338b2?q=80&w=800&auto=format&fit=crop" },
          { name: "Meghalaya", tag: "Living Root Bridges", budget: 18000, img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop" },
          { name: "Coorg, Karnataka", tag: "Coffee Estates", budget: 12000, img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop" },
          { name: "Valley of Flowers", tag: "Himalayan Bloom", budget: 20000, img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop" },
          { name: "Sikkim", tag: "Mountain Monasteries", budget: 22000, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop" },
          { name: "Kaziranga, Assam", tag: "Wildlife Safari", budget: 16000, img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop" },
          { name: "Kodaikanal, TN", tag: "Princess of Hills", budget: 14000, img: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop" },
          { name: "Pachmarhi, MP", tag: "Satpura Retreat", budget: 11000, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop" }
        ]
      };
    } else if (month >= 5 && month <= 7) {
      return {
        title: "Summer Retreats", icon: "☀️", desc: "Escape the heat in India's majestic high altitudes and islands.",
        places: [
          { name: "Ladakh", tag: "High-Altitude Desert", budget: 25000, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop" },
          { name: "Spiti Valley", tag: "Rugged Mountains", budget: 18000, img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop" },
          { name: "Andaman Islands", tag: "Crystal Waters", budget: 30000, img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop" },
          { name: "Manali, HP", tag: "Pine Valleys", budget: 15000, img: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop" },
          { name: "Ooty, TN", tag: "Nilgiri Hills", budget: 13000, img: "https://images.unsplash.com/photo-1598977123118-4e50b80d0b10?q=80&w=800&auto=format&fit=crop" },
          { name: "Mahabaleshwar", tag: "Strawberry Farms", budget: 12000, img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=800&auto=format&fit=crop" },
          { name: "Dalhousie", tag: "Colonial Charm", budget: 14000, img: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop" },
          { name: "Tawang, AP", tag: "Hidden Paradise", budget: 22000, img: "https://images.unsplash.com/photo-1520769945061-0a448c463865?q=80&w=800&auto=format&fit=crop" }
        ]
      };
    } else if (month >= 8 && month <= 10) {
      return {
        title: "Autumn Escapes", icon: "🍂", desc: "Experience the festive season and pleasant travels across India.",
        places: [
          { name: "Udaipur, Rajasthan", tag: "City of Lakes", budget: 18000, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop" },
          { name: "Varanasi, UP", tag: "Spiritual Core", budget: 12000, img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop" },
          { name: "Rishikesh, UK", tag: "Yoga Capital", budget: 10000, img: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop" },
          { name: "Wayanad, Kerala", tag: "Mist Covered Slopes", budget: 12000, img: "https://images.unsplash.com/photo-1598977123118-4e50b80d0b10?q=80&w=800&auto=format&fit=crop" },
          { name: "Mysore, Karnataka", tag: "Royal Heritage", budget: 11000, img: "https://images.unsplash.com/photo-1542051812871-7575116338b2?q=80&w=800&auto=format&fit=crop" },
          { name: "Hampi, Karnataka", tag: "Historic Ruins", budget: 13000, img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop" },
          { name: "Pushkar, Rajasthan", tag: "Desert Culture", budget: 10000, img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop" },
          { name: "Gokarna, Karnataka", tag: "Pristine Beaches", budget: 12000, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop" }
        ]
      };
    } else {
      return {
        title: "Winter Wonders", icon: "❄️", desc: "From snowy peaks to sun-kissed beaches, India has it all.",
        places: [
          { name: "Gulmarg, Kashmir", tag: "Winter Sports", budget: 25000, img: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop" },
          { name: "Goa", tag: "Beach Parties", budget: 20000, img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop" },
          { name: "Alleppey, Kerala", tag: "Serene Canals", budget: 16000, img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop" },
          { name: "Auli, Uttarakhand", tag: "Snow Slopes", budget: 18000, img: "https://images.unsplash.com/photo-1520769945061-0a448c463865?q=80&w=800&auto=format&fit=crop" },
          { name: "Rann of Kutch", tag: "White Desert", budget: 15000, img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop" },
          { name: "Jaisalmer", tag: "Golden City", budget: 14000, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop" },
          { name: "Pondicherry", tag: "French Riviera", budget: 13000, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop" },
          { name: "Shimla, HP", tag: "Snow-Clad Capital", budget: 14000, img: "https://images.unsplash.com/photo-1542051812871-7575116338b2?q=80&w=800&auto=format&fit=crop" }
        ]
      };
    }
  };

  const season = getSeasonData();

  return (
    <div className="mb-12 bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6 backdrop-blur-sm shadow-xl relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span className="text-3xl drop-shadow-md">{season.icon}</span> 
            {season.title}
          </h2>
          <p className="text-gray-400 mt-1 text-sm font-medium">{season.desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 text-blue-300 px-4 py-2 rounded-full text-xs font-bold border border-blue-500/30">
            Curated for {new Date().toLocaleString('default', { month: 'long' })}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 border border-gray-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 border border-gray-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-4 px-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {season.places.map((place, idx) => (
          <div 
            key={idx} 
            className="group relative h-48 min-w-[260px] md:min-w-[280px] snap-start rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] border border-gray-700/50 flex-shrink-0"
            onClick={() => onSelectDestination(place)}
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${place.img})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 p-5 flex flex-col justify-end transform transition-transform duration-300 group-hover:-translate-y-1">
              <span className="bg-indigo-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block w-max mb-2 shadow-sm border border-indigo-400/30 backdrop-blur-sm">{place.tag}</span>
              <h3 className="text-xl font-bold text-white drop-shadow-md leading-tight mb-1">{place.name}</h3>
              <p className="text-blue-300 text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                Plan this trip 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency, convertToBase, convertFromBase } = useCurrency();

  // User Location State
  const [userLocation, setUserLocation] = useState<string>("New Delhi, India");

  // Tab Filtering
  const [filterType, setFilterType] = useState<'all'|'upcoming'|'active'|'completed'>('all');

  // Modal + form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTripData, setNewTripData] = useState({
    destination: "",
    source: "",
    start_date: "",
    end_date: "",
    budget: 150,
    trip_type: "solo",
    transport_mode: "none"
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);

  // Search state for destination
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search state for source
  const [sourceSearchTimeout, setSourceSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [sourceSearchResults, setSourceSearchResults] = useState<Destination[]>([]);
  const [isSourceSearching, setIsSourceSearching] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [fetchedTrips, fetchedProfile] = await Promise.all([
        getTrips(),
        getProfile()
      ]);
      setTrips(fetchedTrips);
      setUserProfile(fetchedProfile);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Secure Request for Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await res.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.state_district || "";
              const country = data.address.country || "";
              if (city && country) {
                 setUserLocation(`${city}, ${country}`);
              } else if (country) {
                 setUserLocation(country);
              }
            }
          } catch (error) {
            console.error("Location lookup failed behind security walls:", error);
          }
        },
        (error) => {
          console.warn("Secure Geolocation access denied or unavailable:", error.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const handlePreFillTrip = (place: any) => {
    const today = new Date();
    // Start date tomorrow, end date 6 days after
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    setNewTripData({
      ...newTripData,
      destination: place.name,
      source: userLocation, // Dynamically sourced securely
      budget: Math.max(place.budget || 1000, 150),
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      trip_type: "solo",
      transport_mode: "flight"
    });
    setIsModalOpen(true);
  };

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

    // Debounced source search
    if (name === 'source') {
      if (sourceSearchTimeout) clearTimeout(sourceSearchTimeout);
      if (value.length > 2) {
        setIsSourceSearching(true);
        setSourceSearchTimeout(
          setTimeout(async () => {
            const results = await searchDestinations(value);
            setSourceSearchResults(results);
            setIsSourceSearching(false);
          }, 500)
        );
      } else {
        setSourceSearchResults([]);
      }
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    setNewTripData({ ...newTripData, destination: destination.name });
    setSearchResults([]);
  };

  const handleSelectSource = (destination: Destination) => {
    setNewTripData({ ...newTripData, source: destination.name });
    setSourceSearchResults([]);
  };

  const handleSubmitNewTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTripData.budget < 150) {
      setFormError(`The minimum budget to book a trip is ${formatCurrency(150)}.`);
      return;
    }
    setFormError(null);
    setIsModalOpen(false); // Optimistically close modal
    setIsGeneratingTrip(true); // Show generating card

    try {
      await createTrip(newTripData);
      setNewTripData({ destination: "", source: "", start_date: "", end_date: "", budget: 150, trip_type: "solo", transport_mode: "none" });
      await fetchData();
    } catch (err) {
      alert(`Failed to create trip: ${(err as Error).message}`);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const handleDeleteTrip = (deletedTripId: string) => {
    setTrips(trips.filter((trip) => trip.id !== deletedTripId));
  };

  const handleOpenNewTripModal = () => {
    setNewTripData({
      destination: "",
      source: userLocation,
      start_date: "",
      end_date: "",
      budget: 150,
      trip_type: "solo",
      transport_mode: "none"
    });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="text-center p-10 text-gray-400 animate-pulse">Loading your trips...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  // Global Analytics
  const totalBudget = trips.reduce((acc, t) => acc + (t.budget || 0), 0);
  const completedTripsCount = trips.filter(t => t.status === 'completed').length;
  
  // Filtering Logic
  const filteredTrips = trips.filter(t => {
    if (filterType === 'all') return true;
    const now = new Date();
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    
    if (filterType === 'completed') return t.status === 'completed';
    // Hide cancelled from active and upcoming, but allow in 'all'
    if (t.status === 'cancelled') return false; 
    
    if (filterType === 'active') return now >= start && now <= end && t.status !== 'completed';
    if (filterType === 'upcoming') return now < start && t.status !== 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-gray-800/60 backdrop-blur-lg px-8 py-6 rounded-2xl border border-gray-700/50 shadow-xl">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Adventure Dashboard
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base font-medium">Welcome back! Here's an overview of your travels.</p>
        </div>
        <Button
          onClick={handleOpenNewTripModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-900/40 transition-transform transform hover:scale-105 border border-blue-500/50"
        >
          + Create New Trip
        </Button>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 flex flex-col justify-center items-center backdrop-blur-md shadow-lg">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Budget Planned</span>
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-500">
              {formatCurrency(totalBudget)}
            </span>
         </div>
         <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 flex flex-col justify-center items-center backdrop-blur-md shadow-lg">
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Trips</span>
            <span className="text-3xl font-extrabold text-blue-400">
              {trips.length}
            </span>
         </div>
         <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 flex flex-col justify-center items-center backdrop-blur-md shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 text-8xl">⭐</div>
            <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2 z-10">Total Points</span>
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 z-10">
              {userProfile?.points || 0}
            </span>
         </div>
      </div>

      {/* Seasonal Recommendations Widget */}
      <SeasonalRecommendationsWidget onSelectDestination={handlePreFillTrip} />

      {/* Filter Tabs */}
      <div className="flex space-x-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'upcoming', 'active', 'completed'] as const).map(type => (
          <button 
            key={type}
            onClick={() => setFilterType(type)} 
            className={`px-5 py-2.5 capitalize font-bold rounded-full text-sm transition-all whitespace-nowrap border ${
              filterType === type 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {type} {type === 'all' ? `(${trips.length})` : type === 'completed' ? `(${completedTripsCount})` : ''}
          </button>
        ))}
      </div>

      {/* Trips Section */}
      {filteredTrips.length > 0 || isGeneratingTrip ? (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          initial="hidden"
          animate="visible"
        >
          {/* Optimistic UI Placeholder */}
          {isGeneratingTrip && (
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="relative overflow-hidden rounded-2xl bg-gray-800 border border-blue-500/30 shadow-2xl backdrop-blur-md transition-all h-[350px] flex flex-col justify-center items-center animate-pulse">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Generating Trip...
              </h3>
              <p className="text-gray-400 mt-2 text-sm text-center px-4 font-medium">
                Our AI is weaving together your perfect itinerary. Hang tight!
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="text-center py-20 px-8 bg-gray-800/30 border border-gray-700/50 rounded-3xl shadow-lg backdrop-blur-md flex flex-col items-center">
          <div className="text-6xl mb-4 opacity-80">🌍</div>
          <h2 className="text-2xl font-bold text-gray-200">No {filterType !== 'all' ? filterType : ''} trips found</h2>
          <p className="text-gray-400 mt-2 max-w-sm font-medium">
            {filterType === 'all' ? 'Your dashboard is empty. Time to start planning your next grand adventure!' : `You don't have any ${filterType} trips right now.`}
          </p>
          {filterType !== 'all' && (
            <button onClick={() => setFilterType('all')} className="mt-6 text-sm font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-lg transition-colors">
              View All Trips
            </button>
          )}
        </div>
      )}

      {/* Create Trip Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="✨ Plan Your Next Adventure">
        <div className="bg-gray-900 border border-gray-700 shadow-2xl p-6 rounded-2xl">
          <form onSubmit={handleSubmitNewTrip} className="space-y-5">
            {formError && (
              <p className="text-red-400 bg-red-900/30 border border-red-700 rounded-md p-3 text-sm font-medium">
                {formError}
              </p>
            )}

            {/* Source */}
            <div className="relative">
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Source {["flight", "train"].includes(newTripData.transport_mode) ? <span className="text-blue-400">*</span> : "(Optional)"}
              </label>
              <div className="relative">
                <Input
                  name="source"
                  type="text"
                  value={newTripData.source}
                  onChange={handleInputChange}
                  required={["flight", "train"].includes(newTripData.transport_mode)}
                  placeholder="e.g., Mumbai, India"
                  autoComplete="off"
                  className="w-full pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-blue-500 h-11"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  📍
                </div>
              </div>
              {(isSourceSearching || sourceSearchResults.length > 0) && (
                <div className="absolute w-full bg-gray-800 border border-gray-600 rounded-lg mt-2 shadow-2xl z-30 max-h-48 overflow-y-auto overflow-hidden">
                  {isSourceSearching && <div className="p-3 text-gray-400 text-sm font-medium bg-gray-800/50">🔎 Searching sources...</div>}
                  {sourceSearchResults.map((result) => (
                    <div
                      key={`${result.lat}-${result.lon}`}
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition-colors"
                      onClick={() => handleSelectSource(result)}
                    >
                      <div className="font-bold text-gray-200">{result.name}</div>
                      {result.country && <div className="text-xs text-blue-400 font-semibold">{result.country}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transport Mode */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Transport Preference</label>
              <select
                name="transport_mode"
                value={newTripData.transport_mode}
                onChange={(e) => setNewTripData({ ...newTripData, transport_mode: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white h-11 px-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow font-medium"
              >
                <option value="none">I'll figure it out myself</option>
                <option value="flight">Find Flights ✈️</option>
                <option value="train">Find Trains 🚂</option>
              </select>
            </div>

            {/* Trip Type */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Trip Type</label>
              <select
                name="trip_type"
                value={newTripData.trip_type}
                onChange={(e) => setNewTripData({ ...newTripData, trip_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white h-11 px-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow font-medium"
              >
                <option value="solo">Solo</option>
                <option value="solo_joining_group">Solo joining a Group</option>
                <option value="group">Group</option>
              </select>
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-sm font-bold text-gray-300 mb-2">Destination <span className="text-blue-400">*</span></label>
              <div className="relative">
                <Input
                  name="destination"
                  type="text"
                  value={newTripData.destination}
                  onChange={handleInputChange}
                  placeholder="e.g., Paris, Tokyo, Bali"
                  required
                  autoComplete="off"
                  className="w-full pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 h-11 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  📍
                </div>
              </div>
              {(isSearching || searchResults.length > 0) && (
                <div className="absolute w-full bg-gray-800 border border-gray-600 rounded-lg mt-2 shadow-2xl z-20 max-h-48 overflow-y-auto overflow-hidden">
                  {isSearching && <div className="p-3 text-gray-400 text-sm font-medium bg-gray-800/50">🔎 Searching destinations...</div>}
                  {searchResults.map((result) => (
                    <div
                      key={`${result.lat}-${result.lon}`}
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition-colors"
                      onClick={() => handleSelectDestination(result)}
                    >
                      <div className="font-bold text-gray-200">{result.name}</div>
                      {result.country && <div className="text-xs text-blue-400 font-semibold">{result.country}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Start Date <span className="text-blue-400">*</span></label>
                <Input
                  name="start_date"
                  type="date"
                  value={newTripData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg text-gray-200 h-11 focus:ring-blue-500 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">End Date <span className="text-blue-400">*</span></label>
                <Input
                  name="end_date"
                  type="date"
                  value={newTripData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg text-gray-200 h-11 focus:ring-blue-500 px-3"
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Budget <span className="text-blue-400">*</span></label>
              <div className="relative">
                <Input
                  name="budget"
                  type="number"
                  value={newTripData.budget === 0 ? "" : Number(convertFromBase(newTripData.budget).toFixed(2))}
                  onChange={(e) => setNewTripData({...newTripData, budget: convertToBase(parseFloat(e.target.value) || 0)})}
                  placeholder={`Min. ${Math.round(convertFromBase(150))}`}
                  min={Math.round(convertFromBase(150))}
                  step="0.01"
                  required
                  className="w-full pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 h-11 focus:ring-blue-500"
                />
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold max-w-sm pointer-events-none">
                  {formatCurrency(0).replace(/[0-9.,\s]/g, '') || '$'}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-indigo-500/50"
            >
              🚀 Finalize Masterplan
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
};
