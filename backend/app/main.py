from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, health, users
from app.config import settings

app = FastAPI(title="Ustaz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
