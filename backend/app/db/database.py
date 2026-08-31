from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum
#SQLAlchemy ->is the ORM library,  its help python to communicate with databases.
# create_engine this creates DataBase Connection Engines
#column->define database columns(name=Column(String(255)), mean in SQL -> name Varchar(255))
# ForeignKey-> hcp_id=Column(interger, ForeignKey("hcps_id")) interaction belongs to an HCP
#Enum -> used for fixed choices
from sqlalchemy.ext.declarative import declarative_base
# base class for all Database Models , Like a parent class Every tables inherits from it
#SQLALchemy uses Base to : track models , generate tables, Map Python classes to DB Tables, Base ->(HCP, Interaction, ChatMessages)
from sqlalchemy.orm import sessionmaker, Session
#session -> a session is temporary converstation with database (Open session, Insert data , query data m commit, Close Session)
#sessionmaker-> Creates Session Factory (Creates DB session when needed )
from datetime import datetime, timezone
import enum # Enums -> Fixed Choices
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crm_hcp.db")
#Read Database_url from environment if not found -> use SQLite Locally



#Engine Creation
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
#SQLite has thread restrictions.  but FastAPI  uses multiple threads, so check_same_thread =False

#SESSION FACTORY
# This create  session Factory, whenever backend needs DB access  creates Session ( db= Sessionlocal()) create session    , autocommit=False -> changes are not automatically saved, autoflush-false -> prevents automatic syncing
#bind =Engine -> connect this session factor to db engine.

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
#All tables inherit from this 


#model definition
#Enum ->Restricted Choices -> prevent invalid valuse, instead of random ,string < only allow -> visit , call , email,
# why inherit from str -> makes enum behave like string


class InteractionType(str, enum.Enum):
    VISIT = "visit"
    CALL = "call"
    EMAIL = "email"
    CONFERENCE = "conference"
    WEBINAR = "webinar"
    OTHER = "other"


class InteractionOutcome(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FOLLOW_UP_REQUIRED = "follow_up_required"


class HCP(Base): # This creates Database Tables
    #this class maps to hcps Table
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True) #unique id for each HCP , index=ture "speeeds up searches"
    name = Column(String(255), nullable=False) # nullable = false "Required field", line mean (VARCHAR(255), CANNOT BE EMPTY)
    specialization = Column(String(255)) # assignment field
    hospital = Column(String(255))       # assignment field
    contact = Column(String(255))        # assignment field
    specialty = Column(String(255))
    institution = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    territory = Column(String(100))
    tier = Column(String(20), default="B")  # A, B, C
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)) #Automatically store creation time


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False) #for id interaction belongs to HCP
    hcp_name = Column(String(255))
    interaction_type = Column(String(50), default=InteractionType.VISIT)
    
    # Assignment columns
    date = Column(String(50))           # Date of interaction as string (e.g. "2026-07-12")
    time = Column(String(50))           # Time as string (e.g. "10:00")
    attendees = Column(Text)            # Names of attendees
    topic = Column(Text)                # Topics discussed / drugs discussed
    materials = Column(Text)            # Materials shared
    samples = Column(Text)              # Samples distributed
    sentiment = Column(String(50))      # Doctor sentiment (e.g. "Positive")
    outcomes = Column(Text)             # Outcomes
    follow_up = Column(Text)            # Follow-up actions
    
    # Legacy/compatibility columns
    duration_minutes = Column(Integer, default=30)
    location = Column(String(500))
    products_discussed = Column(Text)       # JSON array string
    objectives = Column(Text)
    notes = Column(Text)
    summary = Column(Text)                  # AI-generated
    sentiment_score = Column(Float)         # AI-generated 0-1
    outcome = Column(String(50), default=InteractionOutcome.NEUTRAL)
    follow_up_date = Column(DateTime)
    follow_up_notes = Column(Text)
    samples_provided = Column(Text)         # JSON array string
    materials_shared = Column(Text)         # JSON array string
    ai_insights = Column(Text)              # AI-generated JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)) # Automatically updates timestamp when row changes
    created_by = Column(String(100), default="rep_001")


class ChatMessage(Base): # Store Ai chat history 
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True) 
    session_id = Column(String(100), nullable=False)
    role = Column(String(20))  # user / assistant
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    interaction_id = Column(Integer, ForeignKey("interactions.id"), nullable=True)
#Links chat with interactions

def create_tables():
    Base.metadata.create_all(bind=engine)
#table creation 

def get_db(): # This creates DB Dependency
    db = SessionLocal() #create  Session
    try:
        yield db #provides DB Session Temporarily
    finally: # Always Executes
        db.close() 
#closes DB connection

#fastApi request -> get_db_ ->create session  -> route uses session -> SQLALchemy ORM ->Database Query -> response Returned-> Session Closed 