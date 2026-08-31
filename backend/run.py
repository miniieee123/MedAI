#!/usr/bin/env python3
"""
Run the CRM HCP FastAPI backend.
Make sure to set GROQ_API_KEY in .env before running.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
