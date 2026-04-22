// File: src/services/apiService.ts (Updated)
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import axios from "axios";

export interface UserProfile {
  email: string;
  name?: string;
  age?: number;
  travel_preferences?: string[];
  points: number;
  badges: string[];
  role: string;
  bio?: string;
  profile_picture?: string;
  banner_picture?: string;
  location?: string;
  twitter_url?: string;
  instagram_url?: string;
  user_id?: string;
  contacts?: string[];
  visited_locations?: string[];
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}
export interface Destination {
  name: string;
  country: string;
  lat: number;
  lon: number;
}
export interface Trip {
  id: string;
  destination: string;
  source?: string;
  start_date: string;
  end_date: string;
  budget: number;
  total_spent: number;
  travel_cost?: number;
  food_cost?: number;
  trip_type?: string;
  status?: string;
  itinerary: any[];
  expenses: Expense[];
  collaborators: string[];
  is_public?: boolean;
  destination_coords?: {
    latitude: number;
    longitude: number;
  };
  documents: Document[]; // Changed from any[] to Document[] for better type safety
  packing_list: any[];
  transport_mode?: string;
  transport_details?: any[];
}

interface TripCreatePayload {
  destination: string;
  source?: string;
  start_date: string;
  end_date: string;
  budget: number;
  trip_type?: string;
  transport_mode?: string;
}
export interface Document {
  public_id: string;
  secure_url: string;
  original_filename: string;
  resource_type: string;
  created_at: string;
  verification_status?: string;
}
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Add a request interceptor to include the Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const registerUser = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/auth/register", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Registration failed.");
    }
    throw new Error("An unexpected error occurred during registration.");
  }
};

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  try {
    const response = await apiClient.post<LoginResponse>("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Login failed.");
    }
    throw new Error("An unexpected error occurred during login.");
  }
};

export const loginWithFirebaseGoogle = async (idToken: string): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>("/auth/google", {
      token: idToken,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Google Login failed.");
    }
    throw new Error("An unexpected error occurred during Google login.");
  }
};

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const response = await apiClient.get<UserProfile>("/profile/me");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch profile.");
    }
    throw new Error("An unexpected error occurred while fetching the profile.");
  }
};

export const updateProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const response = await apiClient.put<UserProfile>('/profile/me', profileData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to update profile.");
    }
    throw new Error("An unexpected error occurred while updating profile.");
  }
};

export const claimUserId = async (userId: string): Promise<UserProfile> => {
  try {
    const response = await apiClient.post<UserProfile>('/profile/userid', { user_id: userId });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to claim User ID.");
    }
    throw new Error("An unexpected error occurred while claiming User ID.");
  }
};

export const getWanderFeed = async (): Promise<Trip[]> => {
  try {
    const response = await apiClient.get<any[]>("/trips/feed");
    const trips: Trip[] = response.data.map((tripData) => {
      if (tripData._id && !tripData.id) tripData.id = tripData._id;
      if (!tripData.documents) tripData.documents = [];
      return tripData as Trip;
    });
    return trips;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch feed.");
    }
    throw new Error("An unexpected error occurred while fetching the WanderFeed.");
  }
};

// --- CORRECTED FUNCTION ---
export const getTrips = async (): Promise<Trip[]> => {
  try {
    const response = await apiClient.get<any[]>("/trips");

    const trips: Trip[] = response.data.map((tripData) => {
      // Ensure the ID exists
      if (tripData._id && !tripData.id) {
        tripData.id = tripData._id;
      }
      
      // **THE FIX**: Ensure the documents array always exists to prevent render errors.
      if (!tripData.documents) {
        tripData.documents = [];
      }
      
      return tripData as Trip;
    });
    return trips;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch trips.");
    }
    throw new Error("An unexpected error occurred while fetching trips.");
  }
};

export const createTrip = async (data: TripCreatePayload): Promise<Trip> => {
  try {
    const response = await apiClient.post<Trip>("/trips", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create trip.");
    }
    throw new Error("An unexpected error occurred while creating the trip.");
  }
};

export const updateTrip = async (tripId: string, data: Partial<TripCreatePayload> & { travel_cost?: number, food_cost?: number, status?: string, is_public?: boolean }): Promise<Trip> => {
  try {
    const response = await apiClient.put<Trip>(`/trips/${tripId}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to update trip.");
    }
    throw new Error("An unexpected error occurred while updating the trip.");
  }
};

export const completeTrip = async (tripId: string): Promise<{message: string}> => {
  try {
    const response = await apiClient.post<{message: string}>(`/trips/${tripId}/complete`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to complete trip.");
    }
    throw new Error("An unexpected error occurred while completing the trip.");
  }
};

export const cloneTrip = async (tripId: string): Promise<Trip> => {
  try {
    const response = await apiClient.post<Trip>(`/trips/${tripId}/clone`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to clone trip.");
    }
    throw new Error("An unexpected error occurred while cloning the trip.");
  }
};

export const searchDestinationsSimple = async (query: string): Promise<any[]> => {
  return await searchDestinations(query);
};

export const addExpense = async (tripId: string, expense: Expense): Promise<Expense> => {
  try {
    const response = await apiClient.post<Expense>(`/trips/${tripId}/expenses`, expense);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to add expense.");
    }
    throw new Error("An unexpected error occurred while adding the expense.");
  }
};

export const searchDestinations = async (query: string): Promise<Destination[]> => {
  if (query.length < 3) return [];
  try {
    const response = await apiClient.get<Destination[]>("/destinations/search", {
      params: { query },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search destinations:", error);
    return [];
  }
};

// --- CORRECTED FUNCTION ---
export const getTrip = async (tripId: string): Promise<Trip> => {
  try {
    const response = await apiClient.get<any>(`/trips/${tripId}`);
    const tripData = response.data;

    // Ensure the `id` field exists
    if (tripData._id && !tripData.id) {
      tripData.id = tripData._id;
    }

    // **THE FIX**: Also apply the fix here for consistency on the details page.
    if (!tripData.documents) {
      tripData.documents = [];
    }

    return tripData as Trip;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch trip details.");
    }
    throw new Error("An unexpected error occurred while fetching trip details.");
  }
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    await apiClient.delete(`/trips/${tripId}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to delete trip.");
    }
    throw new Error("An unexpected error occurred while deleting the trip.");
  }
};

// ... (Rest of the file is unchanged) ...

// Transport service interfaces
export interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  carrier: string;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  segments: FlightSegment[];
}

export interface TrainOffer {
  train_number: string;
  train_name: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  available_classes: string[];
  price: number;
  currency: string;
}

export interface RideEstimate {
  provider: string;
  vehicle_type: string;
  estimated_price_min: number;
  estimated_price_max: number;
  currency: string;
  estimated_duration_seconds: number;
}

export interface HotelOffer {
  id: string;
  name: string;
  rating: number;
  price: number;
  currency: string;
  amenities: string[];
  image_url?: string;
}

// Transport API functions
export const searchFlights = async (
  origin: string,
  destination: string,
  departure_date: string,
  max_price?: number
): Promise<FlightOffer[]> => {
  try {
    const response = await apiClient.get<FlightOffer[]>("/transport/flights/search", {
      params: { origin, destination, departure_date, max_price },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search flights:", error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.detail ?? error.message ?? "Unknown error";
      if (status === 400) {
        throw new Error(`Flight search error: ${errorMessage}`);
      } else if (status === 500) {
        throw new Error("Flight search service is temporarily unavailable. Please try again later.");
      } else {
        throw new Error(errorMessage);
      }
    }
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred during flight search.");
  }
};

export const searchTrains = async (
  origin?: string,
  destination?: string,
  departure_date?: string,
  train_number_date?: string,
  train_number_name?: string,
  max_price?: number
): Promise<TrainOffer[]> => {
  try {
    const response = await apiClient.get<TrainOffer[]>("/transport/trains/search", {
      params: { origin, destination, departure_date, train_number_date, train_number_name, max_price },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search trains:", error);
    throw error;
  }
};

export const searchRides = async (
  start_lat: number,
  start_lon: number,
  end_lat: number,
  end_lon: number
): Promise<RideEstimate[]> => {
  try {
    const response = await apiClient.get<RideEstimate[]>("/transport/rides/search", {
      params: { start_lat, start_lon, end_lat, end_lon },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search rides:", error);
    throw error;
  }
};

export const searchHotels = async (
  city: string,
  check_in_date: string,
  check_out_date: string,
  adults: number = 1
): Promise<HotelOffer[]> => {
  try {
    const response = await apiClient.get<HotelOffer[]>("/transport/hotels/search", {
      params: { city, check_in_date, check_out_date, adults },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search hotels:", error);
    throw error;
  }
};

export const getUploadSignature = async (): Promise<{ signature: string; timestamp: number; api_key: string }> => {
  const response = await apiClient.post("/documents/signature");
  return response.data;
};

export const addDocumentToTrip = async (tripId: string, docData: Omit<Document, 'created_at'>): Promise<Document> => {
  const response = await apiClient.post<Document>(`/documents/trips/${tripId}`, docData);
  return response.data;
};

export const deleteDocument = async (tripId: string, publicId: string): Promise<void> => {
    await apiClient.delete(`/documents/trips/${tripId}/${publicId}`);
};

export const verifyDocumentAI = async (tripId: string, publicId: string): Promise<{message: string}> => {
  const response = await apiClient.post(`/documents/trips/${tripId}/${publicId}/verify/ai`);
  return response.data;
};

export const verifyDocumentLeader = async (tripId: string, publicId: string): Promise<{message: string}> => {
  const response = await apiClient.post(`/documents/trips/${tripId}/${publicId}/verify/leader`);
  return response.data;
};

// Itinerary interfaces
export interface ItineraryItemCreate {
  day: number;
  time?: string;
  description: string;
  cost: number;
  location_name: string;
  visited?: boolean;
  transport_mode?: string;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paid_by?: string;
  split_with?: string[];
}

export interface ItineraryItem extends ItineraryItemCreate {
  id: string;
  location_coords?: {
    latitude: number;
    longitude: number;
  };
}

// Itinerary API functions
export const addItineraryItem = async (tripId: string, item: ItineraryItemCreate): Promise<ItineraryItem> => {
  try {
    const response = await apiClient.post<ItineraryItem>(`/trips/${tripId}/itinerary`, item);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to add itinerary item.");
    }
    throw new Error("An unexpected error occurred while adding itinerary item.");
  }
};

export const updateItineraryItem = async (tripId: string, itemId: string, item: ItineraryItemCreate): Promise<ItineraryItem> => {
  try {
    const response = await apiClient.put<ItineraryItem>(`/trips/${tripId}/itinerary/${itemId}`, item);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to update itinerary item.");
    }
    throw new Error("An unexpected error occurred while updating itinerary item.");
  }
};

export const deleteItineraryItem = async (tripId: string, itemId: string): Promise<void> => {
  try {
    await apiClient.delete(`/trips/${tripId}/itinerary/${itemId}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to delete itinerary item.");
    }
    throw new Error("An unexpected error occurred while deleting itinerary item.");
  }
};

// Recommendations interface
export interface Recommendation {
  name: string;
  description: string;
  estimated_cost: number;
}

export interface RecommendationsResponse {
  recommendations?: Recommendation[];
  message?: string;
}

// Recommendations API function
export const getTripRecommendations = async (tripId: string): Promise<RecommendationsResponse> => {
  try {
    const response = await apiClient.get<RecommendationsResponse>(`/trips/${tripId}/recommendations`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch recommendations.");
    }
    throw new Error("An unexpected error occurred while fetching recommendations.");
  }
};

// ==========================
// Chat API
// ==========================

export interface ChatUser {
  name: string;
  email: string;
  is_online?: boolean;
  is_blocked?: boolean;
  location?: string;
  status?: string;
  profile_picture?: string;
  last_message_preview?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface ChatMessage {
  id?: string;
  _id?: string;
  text?: string;
  message_type?: string;
  file_url?: string;
  sender_email: string;
  receiver_email: string;
  timestamp?: string;
}

export const getChatUsers = async (): Promise<ChatUser[]> => {
  const response = await apiClient.get<ChatUser[]>('/chat/users');
  return response.data;
};

export const getChatHistory = async (otherEmail: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get<ChatMessage[]>(`/chat/history/${otherEmail}`);
  return response.data;
};

export const sendChatMessage = async (
  receiverEmail: string, 
  text: string,
  messageType: string = "text",
  fileUrl?: string
): Promise<ChatMessage> => {
  const payload = {
    receiver_email: receiverEmail,
    text,
    message_type: messageType,
    file_url: fileUrl
  };
  const response = await apiClient.post<ChatMessage>('/chat/send', payload);
  return response.data;
};

export const blockUser = async (email: string): Promise<{status: string}> => {
  const response = await apiClient.post<{status: string}>(`/chat/block/${email}`);
  return response.data;
};

export const unblockUser = async (email: string): Promise<{status: string}> => {
  const response = await apiClient.post<{status: string}>(`/chat/unblock/${email}`);
  return response.data;
};

export const addChatContact = async (userId: string): Promise<ChatUser> => {
  const response = await apiClient.post<ChatUser>('/chat/contacts/add', { user_id: userId });
  return response.data;
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  await apiClient.delete(`/chat/message/${messageId}`);
};

export interface PublicProfile {
  email: string;
  name?: string;
  age?: number;
  travel_preferences?: string[];
  points: number;
  badges: string[];
  bio?: string;
  profile_picture?: string;
  banner_picture?: string;
  location?: string;
  twitter_url?: string;
  instagram_url?: string;
  user_id?: string;
  visited_locations?: string[];
}

export const getPublicProfile = async (email: string): Promise<PublicProfile> => {
  const response = await apiClient.get<PublicProfile>(`/profile/public/${email}`);
  return response.data;
};

