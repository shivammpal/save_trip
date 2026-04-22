from dotenv import load_dotenv
import os
from amadeus import Client

load_dotenv(".env")

amadeus_client = Client(
    client_id=os.getenv("AMADEUS_API_KEY"),
    client_secret=os.getenv("AMADEUS_API_SECRET")
)

def test_city(keyword):
    try:
        response = amadeus_client.reference_data.locations.get(
            keyword=keyword,
            subType='CITY,AIRPORT'
        )
        print(f"'{keyword}' results:", len(response.data))
        if response.data:
            print("First result:", response.data[0]['iataCode'], response.data[0].get('name'))
    except Exception as e:
        print(f"'{keyword}' Error:", str(e))

test_city("New Delhi")
test_city("Delhi")
test_city("Navi Mumbai")
test_city("Mumbai")
test_city("San Francisco")
test_city("Francisco")
