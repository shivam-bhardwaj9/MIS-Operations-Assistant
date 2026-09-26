from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.mis_routes import router as mis_router

app = FastAPI(
    title="MIS Operations Assistant API",
    description="Deterministic Excel/CSV validation, data cleaning, reconciliation, and openpyxl reporting service.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mis_router)
