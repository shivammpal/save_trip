import google.generativeai as genai
import json
import re
from fastapi import HTTPException

from app.core.config import settings
from app.models.trip import TripInDB

# Configure the Gemini API with your key
genai.configure(api_key=settings.GEMINI_API_KEY)


async def get_recommendations_for_trip(trip: TripInDB) -> dict:
    """
    Generates travel recommendations for a given trip using the Gemini API.
    Validates budget and ensures AI output is clean JSON.
    """
    trip_duration = (trip.end_date - trip.start_date).days + 1

    model = genai.GenerativeModel("gemini-2.5-flash")

    # Construct the AI prompt
    prompt = f"""
    You are an expert travel planner. Based on the trip details below, suggest 3–5
    unique and budget-friendly activities that fit within the total budget.
    Considering the trip starts in {trip.start_date.strftime('%B')}, strongly factor in season-appropriate suggestions and weather for this time of the year.

    Trip Details:
    - Destination: {trip.destination}
    - Source: {trip.source or 'Not specified'}
    - Start Date: {trip.start_date.strftime('%B %d, %Y')}
    - End Date: {trip.end_date.strftime('%B %d, %Y')}
    - Budget: ${trip.budget}
    - Duration: {trip_duration} days

    Output format:
    Return a **valid JSON object only**, no markdown, text, or commentary.
    Format:
    {{
      "recommendations": [
        {{
          "name": "Activity Name",
          "description": "Short description and any useful tip.",
          "estimated_cost": <integer>
        }}
      ]
    }}
    Make sure total estimated costs fit within the given budget.
    """

    try:
        # Generate response from Gemini
        response = await model.generate_content_async(prompt)

        # Gemini SDK may return text in different attributes
        if hasattr(response, "text"):
            response_text = response.text
        else:
            response_text = response.candidates[0].content.parts[0].text

        # Clean response to extract JSON only
        response_text = re.sub(r"```(json)?", "", response_text).strip()

        # Try to parse JSON safely
        data = json.loads(response_text)

        if not isinstance(data, dict) or "recommendations" not in data:
            raise ValueError("Invalid JSON structure from AI")

        return data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse JSON from AI response. Try again."
        )
    except Exception as e:
        print(f"[AI ERROR] {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service failed: {str(e)}"
        )


async def generate_itinerary_for_trip(trip: TripInDB) -> list:
    """
    Generates a complete day-by-day itinerary for a given trip using the Gemini API.
    Returns a list of itinerary items structured for the database.
    """
    trip_duration = (trip.end_date - trip.start_date).days + 1

    model = genai.GenerativeModel("gemini-2.5-flash")

    # Construct the AI prompt for full itinerary
    prompt = f"""
    You are an expert travel planner. Create a complete day-by-day itinerary for the trip below.
    Distribute activities across all days, ensuring the total cost fits within the budget.

    Trip Details:
    - Destination: {trip.destination}
    - Source: {trip.source or 'Not specified'}
    - Start Date: {trip.start_date.strftime('%B %d, %Y')}
    - End Date: {trip.end_date.strftime('%B %d, %Y')}
    - Budget: ${trip.budget}
    - Duration: {trip_duration} days

    Requirements:
    - Create 2-4 activities per day.
    - Each activity must have a realistic cost that fits the budget.
    - Include explicitly in the itinerary activities like meals (breakfast, lunch, dinner) and traveling (transit between locations or from anywhere to anywhere) with estimated costs.
    - Include a mix of sightseeing, food, culture, and relaxation.
    - Provide specific location names for each activity.
    - Total costs should not exceed the budget.

    Output format:
    Return a **valid JSON array only**, no markdown, text, or commentary.
    Format:
    [
      {{
        "day": 1,
        "description": "Visit Eiffel Tower and enjoy the view",
        "cost": 25.0,
        "location_name": "Eiffel Tower, Paris"
      }},
      {{
        "day": 1,
        "description": "Lunch at a local bistro",
        "cost": 15.0,
        "location_name": "Le Comptoir, Paris"
      }},
      ... (continue for all days)
    ]

    Ensure the JSON is valid and the array contains items for each day.
    """

    try:
        # Generate response from Gemini
        response = await model.generate_content_async(prompt)

        # Extract text
        if hasattr(response, "text"):
            response_text = response.text
        else:
            response_text = response.candidates[0].content.parts[0].text

        # Clean response
        response_text = re.sub(r"```(json)?", "", response_text).strip()

        # Parse JSON
        itinerary_data = json.loads(response_text)

        if not isinstance(itinerary_data, list):
            raise ValueError("Invalid JSON structure from AI - expected array")

        # Validate each item has required fields
        validated_itinerary = []
        for item in itinerary_data:
            if not all(key in item for key in ["day", "description", "cost", "location_name"]):
                continue  # Skip invalid items
            validated_itinerary.append({
                "day": int(item["day"]),
                "description": str(item["description"]),
                "cost": float(item["cost"]),
                "location_name": str(item["location_name"])
            })

        return validated_itinerary

    except json.JSONDecodeError as e:
        print(f"[AI ITINERARY ERROR] JSON decode failed: {e}")
        return []
    except Exception as e:
        print(f"[AI ITINERARY ERROR] {e}")
        return []
