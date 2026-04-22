import uuid
from pydantic import BaseModel
from bson.binary import Binary, STANDARD, UuidRepresentation

class MyItem(BaseModel):
    id: uuid.UUID

try:
    uid = uuid.uuid4()
    # MongoDB saves UUIDs as Binary data usually
    b = Binary.from_uuid(uid)
    
    # Let's try to validate it with pydantic
    item = MyItem.model_validate({"id": b})
    print("Success:", item.id)
except Exception as e:
    print("Error:", e.__class__.__name__, e)
