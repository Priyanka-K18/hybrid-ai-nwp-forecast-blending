"""
FastAPI Main Application Entry Point.
HYBRID AI–NWP MULTI-MODEL FORECAST BLENDING SYSTEM
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.database.session import engine, Base

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hybrid-blend-system")

# Create database tables if any
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified.")
except Exception as e:
    logger.warning(f"Database initialization fallback: {e}")

app = FastAPI(
    title="Hybrid AI-NWP Multi-Model Forecast Blending System",
    description="Intelligent Meteorological Decision-Support Platform dynamically combining Physical NWP, Ensemble Predictions, and Deep AI/ML Weather Models.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "system": "Hybrid AI-NWP Multi-Model Forecast Blending System",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "documentation": "/docs",
        "mode": "DEMO DATA ACTIVE",
        "disclaimer": "Prototype for meteorological decision support. Demo/synthetic values are explicitly marked."
    }


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "database": "SQLite / In-Memory Session Ready",
        "active_models": ["NWP", "Ensemble", "AI_ML", "Blended"],
        "operational_cycle": "ACTIVE"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
