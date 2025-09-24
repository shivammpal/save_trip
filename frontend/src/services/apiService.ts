// File: src/services/apiService.ts

import axios from "axios";

export interface UserProfile {
  email: string;
  name?: string;
  age?: number;
  travel_preferences?: string[];
  points: number;
  badges: string[];
  role: string;
}

// Define the shape of the data we send for an update
interface UpdateProfilePayload {
  name?: string;
  age?: number;
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
  start_date: string;
  end_date: string;
  budget: number;
  total_spent: number;
  itinerary: any[];
  expenses: any[];
  collaborators: string[];
  destination_coords?: {
    latitude: number;
    longitude: number;
  };
  documents: any[];
  packing_list: any[];
}

interface TripCreatePayload {
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
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

export const updateProfile = async (data: UpdateProfilePayload): Promise<UserProfile> => {
  try {
    const response = await apiClient.put<UserProfile>("/profile/me", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to update profile.");
    }
    throw new Error("An unexpected error occurred while updating the profile.");
  }
};

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const response = await apiClient.get<Trip[]>("/trips");
    return response.data;
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

export const searchDestinations = async (query: string): Promise<Destination[]> => {
  if (query.length < 3) return []; // Don't search for less than 3 characters
  try {
    const response = await apiClient.get<Destination[]>("/destinations/search", {
      params: { query },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search destinations:", error);
    return []; // Return empty array on error
  }
};

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
    // Use the test endpoint temporarily to avoid authentication issues
    const response = await apiClient.get<FlightOffer[]>("/transport/flights/search", {
      params: { origin, destination, departure_date, max_price },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to search flights:", error);

    // Handle specific error cases
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data.detail || error.message;

      if (status === 400) {
        // Handle validation errors (like past dates)
        throw new Error(`Flight search error: ${errorMessage}`);
      } else if (status === 500) {
        // Handle server errors
        throw new Error("Flight search service is temporarily unavailable. Please try again later.");
      }
    }

    throw error;
  }
};

export const searchTrains = async (
  origin: string,
  destination: string,
  departure_date: string
): Promise<TrainOffer[]> => {
  try {
    const response = await apiClient.get<TrainOffer[]>("/transport/trains/search", {
      params: { origin, destination, departure_date },
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
