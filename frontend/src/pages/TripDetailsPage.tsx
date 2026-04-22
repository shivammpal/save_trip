// File: src/pages/TripDetailsPage.tsx (Updated)

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import confetti from "canvas-confetti";
import { getTrip, getTripRecommendations, addItineraryItem, updateItineraryItem, deleteItineraryItem, searchDestinations, updateTrip, completeTrip, addExpense, type Trip, type ItineraryItem, type RecommendationsResponse, type Destination, type Expense } from "../services/apiService";
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
    transport_mode: "",
  });
  const [costData, setCostData] = useState({ travel: 0, food: 0 });
  const [isUpdatingCosts, setIsUpdatingCosts] = useState(false);
  const { currency, formatCurrency, convertToBase, convertFromBase } = useCurrency();
  const [locationSuggestions, setLocationSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Expense State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({
    description: "",
    amount: "",
    category: "general",
    paid_by: "",
    split_with: [] as string[]
  });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  
  // Calculate who owes whom
  const getSettlements = () => {
    if (!trip || !trip.expenses || trip.expenses.length === 0) return [];
    
    // Calculate net balances for each user
    const balances: Record<string, number> = {};
    
    // Add all collaborators to tracking to ensure everyone shows up
    if (trip.collaborators) {
       trip.collaborators.forEach(collab => {
           if (!balances[collab]) balances[collab] = 0;
       });
    }
    
    trip.expenses.forEach(exp => {
      const payer = exp.paid_by || "Unknown";
      const amount = Number(exp.amount) || 0;
      const splitters = (exp.split_with && exp.split_with.length > 0) ? exp.split_with : [payer];
      
      if (!balances[payer]) balances[payer] = 0;
      balances[payer] += amount; // Payer is owed money (+)
      
      const splitAmount = amount / splitters.length;
      splitters.forEach(split => {
         if (!balances[split]) balances[split] = 0;
         balances[split] -= splitAmount; // Splitters owe money (-)
      });
    });

    // Determine who owes whom
    const debtors: {user: string, amount: number}[] = Object.entries(balances)
       .filter(([_, bal]) => bal < -0.01)
       .map(([user, bal]) => ({user, amount: Math.abs(bal)}))
       .sort((a,b) => b.amount - a.amount);
       
    const creditors: {user: string, amount: number}[] = Object.entries(balances)
       .filter(([_, bal]) => bal > 0.01)
       .map(([user, bal]) => ({user, amount: bal}))
       .sort((a,b) => b.amount - a.amount);
       
    const settlements: {from: string, to: string, amount: number}[] = [];
    
    let d = 0;
    let c = 0;
    
    while(d < debtors.length && c < creditors.length) {
       const debtor = debtors[d];
       const creditor = creditors[c];
       
       const settleAmount = Math.min(debtor.amount, creditor.amount);
       
       settlements.push({
          from: debtor.user,
          to: creditor.user,
          amount: settleAmount
       });
       
       debtor.amount -= settleAmount;
       creditor.amount -= settleAmount;
       
       if (debtor.amount < 0.01) d++;
       if (creditor.amount < 0.01) c++;
    }
    
    return settlements;
  };
  
  const handleAddExpense = async () => {
    if (!tripId) return;
    if (!expenseData.description.trim() || !expenseData.amount || !expenseData.paid_by) {
      alert("Description, amount, and 'Paid By' fields are required.");
      return;
    }
    
    setIsAddingExpense(true);
    try {
      const payload: Expense = {
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        date: new Date().toISOString(),
        paid_by: expenseData.paid_by,
        split_with: expenseData.split_with.length > 0 ? expenseData.split_with : [expenseData.paid_by]
      };
      
      await addExpense(tripId, payload);
      
      // Refresh
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
      
      setExpenseData({
        description: "",
        amount: "",
        category: "general",
        paid_by: "",
        split_with: []
      });
      setShowExpenseForm(false);
    } catch(err) {
      alert((err as Error).message);
    } finally {
      setIsAddingExpense(false);
    }
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripId) return;
      try {
        setIsLoading(true);
        const data = await getTrip(tripId);
        setTrip(data);
        setCostData({ travel: data.travel_cost || 0, food: data.food_cost || 0 });
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
        transport_mode: formData.transport_mode || undefined,
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
        transport_mode: formData.transport_mode || undefined,
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
        transport_mode: item.transport_mode,
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
      transport_mode: "",
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
      transport_mode: item.transport_mode || "",
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

  const handleUpdateCosts = async () => {
    if(!tripId) return;
    setIsUpdatingCosts(true);
    try {
      await updateTrip(tripId, { travel_cost: costData.travel, food_cost: costData.food });
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
      alert("Costs updated successfully!");
    } catch(err) {
      alert((err as Error).message);
    } finally {
      setIsUpdatingCosts(false);
    }
  };

  const handleCompleteTrip = async () => {
    if(!tripId) return;
    if(!confirm("Are you sure you want to complete this trip? You will earn profile points!")) return;
    try {
      const res = await completeTrip(tripId);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        zIndex: 9999
      });
      alert(res.message);
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
    } catch(err) {
      alert((err as Error).message);
    }
  };

  const handleCancelTrip = async () => {
    if(!tripId) return;
    if(!confirm("Are you sure you want to cancel this trip?")) return;
    try {
      await updateTrip(tripId, { status: "cancelled" });
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
      alert("Trip cancelled.");
    } catch(err) {
      alert((err as Error).message);
    }
  };

  const handleTogglePublic = async () => {
    if(!tripId || !trip) return;
    try {
      await updateTrip(tripId, { is_public: !trip.is_public });
      const updatedTrip = await getTrip(tripId);
      setTrip(updatedTrip);
    } catch(err) {
      alert((err as Error).message);
    }
  };



  if (isLoading) return <div className="text-center p-10 text-gray-300">Loading trip details...</div>;
  if (error) return <div className="text-center p-10 text-red-400">Error: {error}</div>;
  if (!trip) return <div className="text-center p-10 text-gray-300">Trip not found.</div>;

  const isCompletelyVisited = trip.itinerary && trip.itinerary.length > 0 && trip.itinerary.every(item => item.visited);
  
  const itineraryCost = trip.itinerary?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
  const computedTotal = (trip.travel_cost || 0) + (trip.food_cost || 0) + itineraryCost;

  const now = new Date();
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  now.setHours(0,0,0,0);
  startDate.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);

  const isPast = now > endDate;
  const inProgress = now >= startDate && now <= endDate;
  const isFuture = now < startDate;

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
              <span className="font-medium text-gray-200">Budget:</span> <span className="text-green-400">{formatCurrency(trip.budget)}</span>
            </p>
            {isCompletelyVisited && (
              <span className="inline-block mt-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                ✅ Completely Visited
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 relative z-10 items-end min-w-[180px]">
            <button
               onClick={handleTogglePublic}
               className={`text-center font-bold px-4 py-2 rounded-md w-full transition-colors shadow-lg border ${trip.is_public ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500 hover:bg-emerald-600/40' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
               title={trip.is_public ? "This trip is visible on the WanderFeed." : "This trip is private."}
            >
               {trip.is_public ? "🌍 Public" : "🔒 Private"}
            </button>
            <Link
              to={`/trips/${trip.id}/documents`}
              className="bg-blue-600 text-center text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 w-full transition-colors"
            >
              Manage Documents
            </Link>
            
            {trip.status === 'cancelled' && (
               <div className="bg-red-900/40 text-center text-red-300 font-semibold px-4 py-2 rounded-md border border-red-700 w-full">
                 ❌ Cancelled
               </div>
            )}

            {trip.status === 'completed' && (
              <div className="bg-gray-700 text-center text-gray-300 font-semibold px-4 py-2 rounded-md border border-gray-600 w-full">
                ⭐ Completed
              </div>
            )}

            {trip.status !== 'completed' && trip.status !== 'cancelled' && (
              <>
                {isPast && (
                  <button
                    onClick={handleCompleteTrip}
                    className="bg-green-600 text-center text-white font-semibold px-4 py-2 rounded-md hover:bg-green-500 w-full transition-colors shadow-lg"
                    title="Earn points for finishing your adventure!"
                  >
                    ✓ Complete Trip
                  </button>
                )}
                {inProgress && (
                  <div className="bg-indigo-900/40 text-center text-indigo-300 font-semibold px-4 py-2 rounded-md border border-indigo-700 w-full">
                     🚙 In Progress
                  </div>
                )}
                {isFuture && (
                  <div className="bg-emerald-900/40 text-center text-emerald-300 font-semibold px-4 py-2 rounded-md border border-emerald-700 w-full">
                     📅 Upcoming
                  </div>
                )}
                
                <button
                  onClick={handleCancelTrip}
                  className="text-red-400 text-sm font-semibold mt-1 hover:text-red-300 underline"
                >
                  Cancel Trip
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cost Tracking Block */}
        <div className="mt-4 pt-4 border-t border-gray-700">
             <h3 className="text-lg font-semibold text-white mb-3">Cost Breakdown</h3>
             <div className="grid gap-4 md:grid-cols-4 items-end">
               <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Travel Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={costData.travel === 0 ? "" : Number(convertFromBase(costData.travel).toFixed(2))}
                    onChange={(e) => setCostData({...costData, travel: convertToBase(parseFloat(e.target.value) || 0)})}
                    className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Food Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={costData.food === 0 ? "" : Number(convertFromBase(costData.food).toFixed(2))}
                    onChange={(e) => setCostData({...costData, food: convertToBase(parseFloat(e.target.value) || 0)})}
                    className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                  />
               </div>
               <div>
                  <button 
                    onClick={handleUpdateCosts}
                    disabled={isUpdatingCosts}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-2 rounded-md disabled:bg-gray-600 transition-colors"
                  >
                    {isUpdatingCosts ? 'Saving...' : 'Update Costs'}
                  </button>
               </div>
               <div className="text-right">
                 <p className="text-sm text-gray-300">Total Expenses</p>
                 <p className={`text-2xl font-bold ${computedTotal > trip.budget ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(computedTotal)}
                 </p>
               </div>
             </div>
        </div>
      </div>

      {/* Group Expenses Section */}
      {trip.trip_type !== 'solo' && (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">💰 Group Expenses</h2>
            <button
               onClick={() => setShowExpenseForm(!showExpenseForm)}
               className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
               {showExpenseForm ? "Cancel" : "Add Expense"}
            </button>
         </div>

         {/* Expense Form */}
         {showExpenseForm && (
            <div className="bg-gray-700 p-5 rounded-md mb-6 border border-gray-600">
               <h3 className="font-semibold mb-3 text-white">Log a New Expense</h3>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                     <label className="block text-sm font-medium mb-1 text-gray-200">Description</label>
                     <input
                        type="text"
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                        className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                        placeholder="e.g. Dinner, Taxi"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1 text-gray-200">Amount ({currency})</label>
                     <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expenseData.amount === "" || parseFloat(expenseData.amount) === 0 ? "" : Number(convertFromBase(parseFloat(expenseData.amount) || 0).toFixed(2))}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : convertToBase(parseFloat(e.target.value) || 0).toString();
                          setExpenseData({ ...expenseData, amount: val });
                        }}
                        className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                        placeholder="0.00"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1 text-gray-200">Category</label>
                     <select
                        value={expenseData.category}
                        onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                        className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                     >
                        <option value="general">General</option>
                        <option value="food">Food & Dining</option>
                        <option value="transportation">Transportation</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="activities">Activities</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1 text-gray-200">Who Paid?</label>
                     <input
                        type="text"
                        value={expenseData.paid_by}
                        onChange={(e) => setExpenseData({...expenseData, paid_by: e.target.value})}
                        className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                        placeholder="Name/Email"
                     />
                     <p className="text-xs text-gray-400 mt-1">Hint: You can type a friend's e-mail</p>
                  </div>
                  <div className="md:col-span-2 lg:col-span-2">
                     <label className="block text-sm font-medium mb-1 text-gray-200">Split With (Comma separated)</label>
                     <input
                        type="text"
                        value={expenseData.split_with.join(", ")}
                        onChange={(e) => {
                           const splits = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                           setExpenseData({...expenseData, split_with: splits});
                        }}
                        className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                        placeholder="e.g. Alice, Bob, Charlie"
                     />
                     <p className="text-xs text-gray-400 mt-1">Leave empty to only assign the cost to the payer.</p>
                  </div>
               </div>
               <div className="mt-4 flex justify-end">
                  <button
                     onClick={handleAddExpense}
                     disabled={isAddingExpense}
                     className="bg-green-600 text-white font-medium px-6 py-2 rounded-md hover:bg-green-500 disabled:bg-gray-600 transition-colors shadow-lg"
                  >
                     {isAddingExpense ? "Adding..." : "Save Expense"}
                  </button>
               </div>
            </div>
         )}
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Expense List */}
            <div>
               <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">Recent Expenses</h3>
               {!trip.expenses || trip.expenses.length === 0 ? (
                  <p className="text-gray-500 italic text-sm py-4">No expenses logged yet. Start splitting!</p>
               ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                     {[...trip.expenses].reverse().map((exp, idx) => (
                        <div key={idx} className="bg-gray-700 border border-gray-600 p-3 rounded-lg shadow-sm flex justify-between items-center group hover:bg-gray-700/80 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-900/40 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/20">
                                 {exp.category === 'food' ? '🍔' : exp.category === 'transportation' ? '🚕' : exp.category === 'accommodation' ? '🏨' : exp.category === 'activities' ? '🏂' : '💸'}
                              </div>
                              <div>
                                 <p className="text-white font-medium text-sm">{exp.description}</p>
                                 <p className="text-xs text-gray-400">
                                    Paid by <span className="font-semibold text-blue-300">{exp.paid_by}</span>
                                    {exp.split_with && exp.split_with.length > 0 && ` for ${exp.split_with.length} ppl`}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-green-400 font-bold">{formatCurrency(exp.amount)}</p>
                              <p className="text-[10px] text-gray-500">{new Date(exp.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            {/* Settlements (Who owes Who) */}
            <div>
               <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">Balances</h3>
               {getSettlements().length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center py-6">
                     <div className="text-4xl mb-3 opacity-30">⚖️</div>
                     <p className="text-gray-500 text-sm">Everyone is settled up!</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {getSettlements().map((settlement, idx) => (
                        <div key={idx} className="bg-gray-800 border border-emerald-900/50 p-4 rounded-lg flex items-center justify-between shadow-md relative overflow-hidden">
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                           <div className="flex items-center gap-2 max-w-[60%]">
                              <span className="font-bold text-red-300 truncate" title={settlement.from}>{settlement.from.split('@')[0]}</span>
                              <span className="text-xs text-gray-400 font-medium">owes</span>
                              <span className="font-bold text-green-300 truncate" title={settlement.to}>{settlement.to.split('@')[0]}</span>
                           </div>
                           <div className="text-xl font-extrabold text-white bg-gray-900 px-3 py-1 rounded shadow-inner">
                              {formatCurrency(settlement.amount)}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
      )}

      {/* Transport Options Section (if selected during trip creation) */}
      {/* Transport Options Section (if selected during trip creation) */}
      {trip.transport_mode && trip.transport_mode !== "none" && trip.transport_details && (
        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 mb-8 border border-gray-700/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
              {trip.transport_mode === 'flight' ? <span className="bg-blue-500/20 text-blue-400 p-2 rounded-lg">✈️</span> : <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">🚂</span>} 
              {trip.transport_mode === 'flight' ? 'Flight Recommendations' : 'Train Recommendations'}
            </h2>
            <div className="text-sm font-medium text-gray-400 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
              Budget Limit: <span className="text-white font-bold">{formatCurrency((trip.travel_cost && trip.travel_cost > 0) ? trip.travel_cost : trip.budget)}</span>
            </div>
          </div>
          {(() => {
            const limit = (trip.travel_cost && trip.travel_cost > 0) ? trip.travel_cost : trip.budget;
            const validOptions = trip.transport_details.filter((t: any) => t.price <= limit);
            
            if (validOptions.length === 0) {
              return (
                <div className="text-center py-16 bg-gray-800/40 rounded-xl border border-gray-700/50 border-dashed">
                   <div className="text-5xl mb-4 opacity-40">{trip.transport_mode === 'flight' ? '✈️' : '🚂'}</div>
                   <p className="text-gray-300 text-xl font-bold">No options fit your budget</p>
                   <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">We couldn't naturally find {trip.transport_mode}s under {formatCurrency(limit)}. Try increasing your Travel Cost budget!</p>
                </div>
              );
            }
            
            return (
              <div className="space-y-4">
                {trip.transport_mode === 'flight' ? (
                  validOptions.map((flight: any, idx: number) => (
                    <div key={idx} className="bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl p-0 transition-all shadow-md group overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {/* Flight Segments (Left Side) */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                          {flight.segments.map((seg: any, sIdx: number) => {
                            // Calculate duration estimate (mock formatting)
                            const t1 = new Date(seg.departure_time);
                            const t2 = new Date(seg.arrival_time);
                            const diffMs = t2.getTime() - t1.getTime();
                            const hrs = Math.floor(diffMs / 3600000);
                            const mins = Math.floor((diffMs % 3600000) / 60000);
                            const durationStr = `${hrs}h ${mins}m`;

                            return (
                              <div key={sIdx} className="w-full flex items-center justify-between mb-4 last:mb-0">
                                {/* Airline & Departure */}
                                <div className="flex items-center gap-6 w-1/3">
                                  <div className="w-10 h-10 rounded-full bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                                    {seg.carrier.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-2xl font-bold text-white">{t1.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{seg.departure_airport}</p>
                                  </div>
                                </div>
                                
                                {/* Center - Duration & Stops */}
                                <div className="flex-1 flex flex-col items-center justify-center px-4">
                                  <span className="text-xs text-gray-400 font-medium pb-1">{durationStr}</span>
                                  <div className="w-full relative flex items-center justify-center py-1">
                                    <div className="absolute w-full h-px border-t border-dashed border-gray-600"></div>
                                    <span className="relative z-10 bg-gray-800 px-2.5 py-0.5 text-[10px] font-bold text-gray-400 border border-gray-700 rounded-full uppercase tracking-wider shadow-sm">Non-stop</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-bold pt-1 uppercase tracking-widest text-center">{seg.carrier}</span>
                                </div>
                                
                                {/* Arrival */}
                                <div className="w-1/3 text-right">
                                  <p className="text-2xl font-bold text-white">{t2.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{seg.arrival_airport}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Price & Action (Right Side) */}
                        <div className="border-t md:border-t-0 md:border-l border-gray-700/50 bg-gray-800/40 p-6 flex flex-col items-center justify-center md:w-64">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 items-center gap-1 flex"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> IN BUDGET</p>
                          <span className="text-white font-extrabold text-3xl mb-4">{formatCurrency(flight.price)}</span>
                          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all transform active:scale-95">
                            Select Flight
                          </button>
                          <p className="text-gray-500 text-[10px] mt-3 uppercase tracking-wider text-center">Taxes & fees included</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  validOptions.map((train: any, idx: number) => (
                    <div key={idx} className="bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-emerald-500/50 rounded-xl p-0 transition-all shadow-md group overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {/* Train Details (Left) */}
                        <div className="flex-1 p-6">
                           <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-lg bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl">
                                 🚂
                               </div>
                               <div>
                                 <h3 className="text-lg font-bold text-white">{train.train_name}</h3>
                                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Train #{train.train_number}</p>
                               </div>
                             </div>
                             {train.available_classes && train.available_classes.length > 0 && (
                               <div className="flex gap-1">
                                 {train.available_classes.map((cls: string, cIdx: number) => (
                                    <span key={cIdx} className="bg-gray-700 text-gray-300 border border-gray-600 text-[10px] font-bold px-2 py-1 rounded shadow-inner">
                                      {cls}
                                    </span>
                                 ))}
                               </div>
                             )}
                           </div>
                           
                           {/* Route info */}
                           <div className="flex items-center justify-between w-full relative">
                              <div className="text-left z-10 bg-gray-800 pr-4">
                                <p className="text-3xl font-extrabold text-white">{train.departure_time}</p>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{trip.source}</p>
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center absolute left-0 right-0 z-0">
                                <span className="text-xs text-emerald-400 font-bold bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/20 mb-1 z-10">{train.duration}</span>
                                <div className="w-full h-px bg-gray-600 border-dashed absolute top-1/2"></div>
                              </div>
                              <div className="text-right z-10 bg-gray-800 pl-4">
                                <p className="text-3xl font-extrabold text-white">{train.arrival_time}</p>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{trip.destination}</p>
                              </div>
                           </div>
                        </div>
                        
                        {/* Train Price (Right) */}
                        <div className="border-t md:border-t-0 md:border-l border-gray-700/50 bg-gray-800/40 p-6 flex flex-col items-center justify-center md:w-64">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 items-center gap-1 flex"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> IN BUDGET</p>
                          <span className="text-white font-extrabold text-3xl mb-4">{formatCurrency(train.price)}</span>
                          <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95">
                            Select Train
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}
        </div>
      )}

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
                  <p className="text-green-400 font-medium">Estimated Cost: {formatCurrency(rec.estimated_cost)}</p>
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
                <label className="block text-sm font-medium mb-1 text-gray-200">Cost ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost === "" || parseFloat(formData.cost) === 0 ? "" : Number(convertFromBase(parseFloat(formData.cost) || 0).toFixed(2))}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : convertToBase(parseFloat(e.target.value) || 0).toString();
                    setFormData({ ...formData, cost: val });
                  }}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Transport Mode</label>
                <select 
                  value={formData.transport_mode}
                  onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
                  className="w-full p-2 border border-gray-500 rounded-md bg-gray-600 text-white"
                >
                  <option value="">None / Walk</option>
                  <option value="flight">Flight ✈️</option>
                  <option value="train">Train 🚂</option>
                  <option value="car">Car 🚗</option>
                  <option value="bus">Bus 🚌</option>
                </select>
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
                                          {item.transport_mode && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 capitalize bg-gray-600 px-2 py-0.5 rounded text-xs">
                                                {item.transport_mode}
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">💰</span>
                                            <span className="text-green-400 font-medium">{formatCurrency(item.cost)}</span>
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
                                          {item.transport_mode && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 capitalize bg-gray-600 px-2 py-0.5 rounded text-xs">
                                                {item.transport_mode}
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">💰</span>
                                            <span className="text-green-400 font-medium">{formatCurrency(item.cost)}</span>
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
