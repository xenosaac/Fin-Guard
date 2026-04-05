"""Fin-Guard — Read-Only AI Financial Guardian.

A zero-trust AI agent that monitors your financial accounts across
multiple services and alerts you to unusual spending — but can NEVER
modify your financial data.

Built with Auth0 Token Vault for secure, audited, read-only access.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers.api import router as api_router
from app.routers.auth_routes import router as auth_router

app = FastAPI(
    title="Fin-Guard",
    description=(
        "Read-only AI financial guardian. "
        "Monitors spending, detects anomalies, sends alerts — "
        "but can NEVER modify your financial data."
    ),
    version="0.1.0",
)

# Session middleware for Auth0 login state
app.add_middleware(SessionMiddleware, secret_key=settings.app_secret_key)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "name": "Fin-Guard",
        "tagline": "Your read-only AI financial guardian",
        "security_model": "ZERO-TRUST: Read-only access to financial data. "
        "Write operations are permanently disabled.",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
