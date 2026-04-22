import httpx
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_uber():
    client_id = os.getenv("UBER_CLIENT_ID")
    client_secret = os.getenv("UBER_CLIENT_SECRET")
    
    auth_url = "https://auth.uber.com/oauth/v2/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(auth_url, data=payload)
            print("Token Status:", resp.status_code)
            data = resp.json()
            print("Token Response:", data)
            
            token = data.get("access_token")
            if token:
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept-Language": "en_US"
                }
                api_url = "https://api.uber.com/v1.2/estimates/price"
                params = {
                    "start_latitude": 28.6139,
                    "start_longitude": 77.2090,
                    "end_latitude": 28.5355,
                    "end_longitude": 77.3910
                }
                price_resp = await client.get(api_url, headers=headers, params=params)
                print("Price Status:", price_resp.status_code)
                print("Price Response:", price_resp.text[:500])
                
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_uber())
