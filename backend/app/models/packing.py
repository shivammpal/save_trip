# File: app/models/packing.py

from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from typing import Optional,List

class PackingListItemCreate(BaseModel):
    item_name: str = Field(..., min_length=1)
    category: Optional[str] = None

class PackingListItem(PackingListItemCreate):
    id: UUID = Field(default_factory=uuid4)
    is_packed: bool = False
    
class PackingListItemUpdate(BaseModel):
    is_packed: bool
    
class TemplateItem(BaseModel):
    item_name: str
    category: Optional[str] = None

class PackingListTemplate(BaseModel):
    name: str
    items: List[TemplateItem]

class ApplyTemplateRequest(BaseModel):
    template_name: str