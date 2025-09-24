# File: app/services/ai_service.py

import google.generativeai as genai
import json
from fastapi import HTTPException

from app.core.config import settings
from app.models.trip import TripInDB

# Configure the Gemini API with your key
genai.configure(api_key=settings.GEMINI_API_KEY)

async def get_recommendations_for_trip(trip: TripInDB) -> dict:
    """
    Generates travel recommendations for a given trip using the Gemini API.
    """
    model = genai.GenerativeModel('gemini-pro')

    # Construct a detailed prompt for the AI
    prompt = f"""
    You are an expert travel planner. Given the following trip details, suggest 3 to 5
    unique and budget-friendly activities.

    Trip Details:
    - Destination: {trip.destination}
    - Start Date: {trip.start_date.strftime('%B %d, %Y')}
    - End Date: {trip.end_date.strftime('%B %d, %Y')}
    - Budget: ${trip.budget}

    Your response MUST be a valid JSON object, with no additional text or markdown formatting
    before or after it. The JSON object should have a single key "recommendations", which is
    a list of objects. Each object in the list should have the following keys: "name", "description",
    and "estimated_cost".

    Example format:
    {{
      "recommendations": [
        {{
          "name": "Visit the Louvre Museum",
          "description": "Explore one of the world's largest art museums. Tip: Go on a weekday to avoid crowds.",
          "estimated_cost": 20
        }},
        {{
          "name": "Picnic at Champ de Mars",
          "description": "Enjoy a beautiful view of the Eiffel Tower with a budget-friendly picnic of local cheeses and bread.",
          "estimated_cost": 15
        }}
      ]
    }}
    """

    try:
        response = await model.generate_content_async(prompt)
        
        # Clean up the response to ensure it's valid JSON
        response_text = response.text.strip().replace("```json", "").replace("```", "")
        
        # Parse the JSON string into a Python dictionary
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Error calling Gemini API or parsing JSON: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations from AI service.")