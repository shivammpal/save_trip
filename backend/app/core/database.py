# File: app/core/database.py

from motor.motor_asyncio import AsyncIOMotorClient
from bson.codec_options import CodecOptions
from bson.binary import UuidRepresentation
from .config import settings

# Create a client to connect to your MongoDB instance
client = AsyncIOMotorClient(settings.DATABASE_URL)

# Configure codec options for UUID handling
codec_options = CodecOptions(uuid_representation=UuidRepresentation.STANDARD)

# Get a reference to your database (e.g., BudgetTripPlannerDB)
# The database name is taken from your DATABASE_URL string
db = client.get_database(codec_options=codec_options)

# Get a reference to the 'users' collection where user data will be stored
users_collection = db.get_collection("users")
# NEW: Trips collection
trips_collection = db.get_collection("trips")

packing_list_templates_collection = db.get_collection("packing_list_templates")
messages_collection = db.get_collection("messages")
