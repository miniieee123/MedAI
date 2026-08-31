from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db, HCP, SessionLocal
from app.models.schemas import HCPCreate, HCPResponse

router = APIRouter()


def seed_hcps_if_empty():
    """Seed sample HCPs if the database is empty. Called once at startup."""
    db = SessionLocal()
    try:
        if db.query(HCP).count() == 0:
            seed_data = [
                HCP(name="Dr. Sarah Chen", specialty="Oncology", institution="St. Mary's Medical Center", email="s.chen@stmarys.com", territory="North", tier="A"),
                HCP(name="Dr. James Patel", specialty="Cardiology", institution="Heart & Vascular Institute", email="j.patel@hvi.org", territory="South", tier="A"),
                HCP(name="Dr. Emily Rodriguez", specialty="Neurology", institution="NeuroHealth Clinic", email="e.rodriguez@neurohc.com", territory="East", tier="B"),
                HCP(name="Dr. Michael Thompson", specialty="Internal Medicine", institution="City General Hospital", email="m.thompson@cgh.net", territory="West", tier="B"),
                HCP(name="Dr. Aisha Okafor", specialty="Rheumatology", institution="Joint Care Center", email="a.okafor@jcc.org", territory="North", tier="C"),
            ]
            db.add_all(seed_data)
            db.commit()
    finally:
        db.close()


@router.get("/", response_model=list[HCPResponse])
def list_hcps(db: Session = Depends(get_db)):
    return db.query(HCP).all()


@router.get("/{hcp_id}", response_model=HCPResponse)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.post("/", response_model=HCPResponse)
def create_hcp(hcp: HCPCreate, db: Session = Depends(get_db)):
    db_hcp = HCP(**hcp.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp
