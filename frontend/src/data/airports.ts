export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const airports: Airport[] = [
  // --- India Domestic (Major & Regional) ---
  { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "India" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", country: "India" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India" },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India" },
  { code: "CCU", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India" },
  { code: "PNQ", name: "Pune Airport", city: "Pune", country: "India" },
  { code: "COK", name: "Cochin International Airport", city: "Kochi", country: "India" },
  { code: "GOX", name: "Manohar International Airport", city: "Goa (Mopa)", country: "India" },
  { code: "GOI", name: "Dabolim Airport", city: "Goa (Dabolim)", country: "India" },
  { code: "TRV", name: "Trivandrum International Airport", city: "Thiruvananthapuram", country: "India" },
  { code: "JAI", name: "Jaipur International Airport", city: "Jaipur", country: "India" },
  { code: "LKO", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", country: "India" },
  { code: "GAU", name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", country: "India" },
  { code: "SXR", name: "Sheikh ul-Alam International Airport", city: "Srinagar", country: "India" },
  { code: "BBI", name: "Biju Patnaik Airport", city: "Bhubaneswar", country: "India" },
  { code: "PAT", name: "Jay Prakash Narayan Airport", city: "Patna", country: "India" },
  { code: "IDR", name: "Devi Ahilya Bai Holkar Airport", city: "Indore", country: "India" },
  { code: "IXC", name: "Chandigarh International Airport", city: "Chandigarh", country: "India" },
  { code: "ATQ", name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", country: "India" },
  { code: "IXE", name: "Mangalore International Airport", city: "Mangaluru", country: "India" },
  { code: "CJB", name: "Coimbatore International Airport", city: "Coimbatore", country: "India" },
  { code: "NAG", name: "Dr. Babasaheb Ambedkar International Airport", city: "Nagpur", country: "India" },
  { code: "VTZ", name: "Visakhapatnam Airport", city: "Visakhapatnam", country: "India" },
  { code: "BHO", name: "Raja Bhoj Airport", city: "Bhopal", country: "India" },
  { code: "VNS", name: "Lal Bahadur Shastri International Airport", city: "Varanasi", country: "India" },
  { code: "IXB", name: "Bagdogra Airport", city: "Siliguri", country: "India" },
  
  // --- International (Major Hubs & Popular Destinations) ---
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
  { code: "EWR", name: "Newark Liberty International Airport", city: "New York", country: "United States" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States" },
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "United States" },
  { code: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom" },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates" },
  { code: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates" },
  { code: "SIN", name: "Changi Airport", city: "Singapore", country: "Singapore" },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },
  { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia" },
  { code: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
  { code: "HND", name: "Haneda Airport", city: "Tokyo", country: "Japan" },
  { code: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada" },
];
