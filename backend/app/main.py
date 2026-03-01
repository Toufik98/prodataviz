"""
ProDataViz — FastAPI Application

API pour l'analyse de l'insertion professionnelle des diplômés de Master.
Données : data.gouv.fr (19 600+ enregistrements, 2010-2020)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import academies, statistiques, analytics, sql_lab

app = FastAPI(
    title="ProDataViz API",
    description=(
        "API d'analyse de l'insertion professionnelle des diplômés de Master "
        "en France (2010-2020). Source : data.gouv.fr."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend (dev + production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://84.235.235.15",
        "http://84.235.235.15:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(academies.router)
app.include_router(statistiques.router)
app.include_router(analytics.router)
app.include_router(sql_lab.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "name": "ProDataViz API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "academies": "/api/academies",
            "etablissements": "/api/etablissements",
            "domaines": "/api/domaines",
            "disciplines": "/api/disciplines",
            "statistiques": "/api/statistiques",
            "analytics": "/api/analytics/*",
            "sql_lab": "/api/sql/*",
        },
    }
