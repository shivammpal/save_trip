export const airlines: Record<string, string> = {
  "6E": "IndiGo",
  "AI": "Air India",
  "UK": "Vistara",
  "SG": "SpiceJet",
  "I5": "AIX Connect (AirAsia India)",
  "IX": "Air India Express",
  "QP": "Akasa Air",
  "2T": "TruJet",
  "9I": "Alliance Air",
  "EK": "Emirates",
  "EY": "Etihad Airways",
  "QR": "Qatar Airways",
  "SQ": "Singapore Airlines",
  "BA": "British Airways",
  "LH": "Lufthansa",
  "AF": "Air France",
  "KL": "KLM Royal Dutch Airlines",
  "UA": "United Airlines",
  "AA": "American Airlines",
  "DL": "Delta Air Lines",
  "AC": "Air Canada",
  "QF": "Qantas",
  "CX": "Cathay Pacific",
  "JL": "Japan Airlines",
  "NH": "All Nippon Airways",
  "TG": "Thai Airways",
  "MH": "Malaysia Airlines",
  "VS": "Virgin Atlantic",
  "TK": "Turkish Airlines",
  "WY": "Oman Air"
};

export const getAirlineName = (code: string): string => {
  return airlines[code] || code;
};
