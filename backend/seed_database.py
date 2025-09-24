# File: seed_database.py

import asyncio
from app.core.database import packing_list_templates_collection

# --- Template Data ---
TEMPLATES = [
    {
        "name": "Beach Holiday",
        "items": [
            {"item_name": "Swimsuit", "category": "Clothing"},
            {"item_name": "Sunscreen", "category": "Toiletries"},
            {"item_name": "Beach Towel", "category": "Essentials"},
            {"item_name": "Sunglasses", "category": "Accessories"},
            {"item_name": "Sandals / Flip-flops", "category": "Clothing"},
            {"item_name": "Book or Magazine", "category": "Entertainment"},
            {"item_name": "Water Bottle", "category": "Essentials"},
        ]
    },
    {
        "name": "Winter City Break",
        "items": [
            {"item_name": "Warm Jacket / Coat", "category": "Clothing"},
            {"item_name": "Sweaters", "category": "Clothing"},
            {"item_name": "Scarf, Hat, and Gloves", "category": "Accessories"},
            {"item_name": "Thermal Underwear", "category": "Clothing"},
            {"item_name": "Waterproof Boots", "category": "Clothing"},
            {"item_name": "Portable Charger", "category": "Electronics"},
            {"item_name": "Lip Balm", "category": "Toiletries"},
        ]
    }
]

async def seed_data():
    print("Starting to seed database...")
    for template in TEMPLATES:
        # Using update_one with upsert=True is a safe way to add data.
        # It will insert if the name doesn't exist, or update if it does.
        # This makes the script runnable multiple times without creating duplicates.
        await packing_list_templates_collection.update_one(
            {"name": template["name"]},
            {"$set": template},
            upsert=True
        )
        print(f"Upserted template: {template['name']}")
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_data())