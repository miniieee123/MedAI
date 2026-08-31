from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import create_tables
from app.routes.hcps import router as hcps_router, seed_hcps_if_empty
from app.routes.interactions import router as interactions_router
from app.routes.agent import router as agent_router

app = FastAPI(title="CRM HCP Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3030",
        "http://127.0.0.1:3030",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hcps_router, prefix="/api/hcps", tags=["HCPs"])
app.include_router(interactions_router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])


@app.on_event("startup")
def startup():
    create_tables()
    seed_hcps_if_empty()


@app.get("/")
def root():
    return {"message": "CRM HCP Module API is running"}
