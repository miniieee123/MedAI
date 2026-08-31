#This file defines  API input structure , Api output structure , validation rule , serialization rules , Data contracts

# communication Layer between , Frontend <> Fastapi Backend , Backend <> AI agent , backend <> Database

#API Contract -> 

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class InteractionCreate(BaseModel):
    hcp_id: int
    hcp_name: Optional[str] = None
    interaction_type: str = "visit"
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topic: Optional[str] = None
    materials: Optional[str] = None
    samples: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up: Optional[str] = None
    
    # Legacy/compatibility fields
    duration_minutes: int = 30
    location: Optional[str] = None
    products_discussed: Optional[str] = None
    objectives: Optional[str] = None
    notes: Optional[str] = None
    outcome: str = "neutral"
    follow_up_date: Optional[str] = None
    follow_up_notes: Optional[str] = None
    samples_provided: Optional[str] = None
    materials_shared: Optional[str] = None


class InteractionUpdate(BaseModel):
    hcp_id: Optional[int] = None
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topic: Optional[str] = None
    materials: Optional[str] = None
    samples: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up: Optional[str] = None
    
    # Legacy/compatibility fields
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    products_discussed: Optional[str] = None
    objectives: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    follow_up_date: Optional[str] = None
    follow_up_notes: Optional[str] = None
    samples_provided: Optional[str] = None
    materials_shared: Optional[str] = None
    summary: Optional[str] = None
    ai_insights: Optional[str] = None


class InteractionResponse(BaseModel):
    id: int
    hcp_id: int
    hcp_name: Optional[str] = None
    interaction_type: str
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topic: Optional[str] = None
    materials: Optional[str] = None
    samples: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up: Optional[str] = None
    
    # Legacy/compatibility fields
    duration_minutes: int
    location: Optional[str] = None
    products_discussed: Optional[str] = None
    objectives: Optional[str] = None
    notes: Optional[str] = None
    summary: Optional[str] = None
    sentiment_score: Optional[float] = None
    outcome: str
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    samples_provided: Optional[str] = None
    materials_shared: Optional[str] = None
    ai_insights: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HCPCreate(BaseModel):
    name: str
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    contact: Optional[str] = None
    specialty: Optional[str] = None
    institution: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    territory: Optional[str] = None
    tier: str = "B"


class HCPResponse(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    contact: Optional[str] = None
    specialty: Optional[str] = None
    institution: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    territory: Optional[str] = None
    tier: str

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    conversation_history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    response: str
    session_id: str
    action_taken: Optional[str] = None
    interaction_id: Optional[int] = None
    data: Optional[Any] = None


class AgentToolRequest(BaseModel):
    tool_name: str
    parameters: dict


# Incoming Json -> pydandtic Schema -> validation ->python Object -> businesss Logic -> database -> Response Schema -> Serialized Json