from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db, Interaction, HCP
from app.models.schemas import InteractionCreate, InteractionUpdate, InteractionResponse
from datetime import datetime, timezone

router = APIRouter()


def sentiment_to_score(label: str) -> float:
    """Convert a sentiment label to a numeric score."""
    sent_lower = (label or "").lower()
    if "pos" in sent_lower:
        return 0.9
    elif "neg" in sent_lower:
        return 0.1
    return 0.5


def serialize_interaction(i: Interaction) -> dict:
    return {
        "id": i.id,
        "hcp_id": i.hcp_id,
        "hcp_name": i.hcp_name,
        "interaction_type": i.interaction_type,
        "date": i.date,
        "time": i.time,
        "attendees": i.attendees,
        "topic": i.topic,
        "materials": i.materials,
        "samples": i.samples,
        "sentiment": i.sentiment,
        "outcomes": i.outcomes,
        "follow_up": i.follow_up,
        "duration_minutes": i.duration_minutes,
        "location": i.location,
        "products_discussed": i.products_discussed,
        "objectives": i.objectives,
        "notes": i.notes,
        "summary": i.summary,
        "sentiment_score": i.sentiment_score,
        "outcome": i.outcome,
        "follow_up_date": i.follow_up_date.isoformat() if i.follow_up_date else None,
        "follow_up_notes": i.follow_up_notes,
        "samples_provided": i.samples_provided,
        "materials_shared": i.materials_shared,
        "ai_insights": i.ai_insights,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }


@router.get("/", response_model=list[dict])
def list_interactions(
    hcp_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Interaction)
    if hcp_id:
        query = query.filter(Interaction.hcp_id == hcp_id)
    interactions = query.order_by(Interaction.id.desc()).limit(limit).all()
    return [serialize_interaction(i) for i in interactions]


@router.get("/{interaction_id}", response_model=dict)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return serialize_interaction(interaction)


@router.post("/", response_model=dict)
def create_interaction(interaction: InteractionCreate, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == interaction.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    date_str = interaction.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    time_str = interaction.time or datetime.now(timezone.utc).strftime("%H:%M")

    db_interaction = Interaction(
        hcp_id=interaction.hcp_id,
        hcp_name=hcp.name,
        interaction_type=interaction.interaction_type,
        date=date_str,
        time=time_str,
        attendees=interaction.attendees,
        topic=interaction.topic or interaction.products_discussed,
        materials=interaction.materials or interaction.materials_shared,
        samples=interaction.samples or interaction.samples_provided,
        sentiment=interaction.sentiment or ("Positive" if interaction.outcome == "positive" else "Negative" if interaction.outcome == "negative" else "Neutral"),
        outcomes=interaction.outcomes or interaction.outcome,
        follow_up=interaction.follow_up or interaction.follow_up_notes,
        
        # Compatibility fields
        duration_minutes=interaction.duration_minutes,
        location=interaction.location,
        products_discussed=interaction.products_discussed or interaction.topic,
        objectives=interaction.objectives,
        notes=interaction.notes or f"Discussed {interaction.topic or ''}. Outcomes: {interaction.outcomes or ''}.",
        outcome=interaction.outcome or (interaction.outcomes.lower() if (interaction.outcomes and interaction.outcomes.lower() in ["positive", "neutral", "negative", "follow_up_required"]) else "neutral"),
        follow_up_notes=interaction.follow_up_notes or interaction.follow_up,
        samples_provided=interaction.samples_provided or interaction.samples,
        materials_shared=interaction.materials_shared or interaction.materials,
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return {"id": db_interaction.id, "message": "Interaction created", "hcp_name": hcp.name}


@router.put("/{interaction_id}", response_model=dict)
def update_interaction(interaction_id: int, update: InteractionUpdate, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(interaction, key, value)
        
        # Keep legacy and new fields in sync during updates
        if key == "topic":
            interaction.products_discussed = value
        elif key == "products_discussed":
            interaction.topic = value
        elif key == "materials":
            interaction.materials_shared = value
        elif key == "materials_shared":
            interaction.materials = value
        elif key == "samples":
            interaction.samples_provided = value
        elif key == "samples_provided":
            interaction.samples = value
        elif key == "sentiment":
            interaction.sentiment_score = sentiment_to_score(value)
        elif key == "outcomes":
            interaction.outcome = value.lower() if (value and value.lower() in ["positive", "neutral", "negative", "follow_up_required"]) else "neutral"
        elif key == "outcome":
            interaction.outcomes = value
        elif key == "follow_up":
            interaction.follow_up_notes = value
        elif key == "follow_up_notes":
            interaction.follow_up = value

    interaction.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": interaction_id, "message": "Interaction updated"}


@router.delete("/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
    return {"message": "Interaction deleted"}


@router.get("/hcp-history/{hcp_id}")
def get_hcp_history_endpoint(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    interactions = db.query(Interaction).filter(Interaction.hcp_id == hcp_id).order_by(Interaction.id.desc()).all()
    return {
        "hcp": {
            "id": hcp.id,
            "name": hcp.name,
            "specialization": hcp.specialization or hcp.specialty,
            "hospital": hcp.hospital or hcp.institution,
            "contact": hcp.contact or f"{hcp.email or ''} {hcp.phone or ''}".strip(),
            "specialty": hcp.specialty,
            "institution": hcp.institution,
            "email": hcp.email,
            "phone": hcp.phone,
            "territory": hcp.territory,
            "tier": hcp.tier
        },
        "interactions": [serialize_interaction(i) for i in interactions]
    }
