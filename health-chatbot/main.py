"""
Elyx Health Concierge API - Main application file
This is now a modular FastAPI application with organized route structure.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, uploads, plans, analytics

# Initialize FastAPI app
app = FastAPI(title="Elyx Health Concierge API", version="1.0.0")

# CORS middleware for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Add your React app URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all route modules
app.include_router(chat.router, tags=["chat"])
app.include_router(uploads.router, tags=["uploads"])
app.include_router(plans.router, tags=["plans"])
app.include_router(analytics.router, tags=["analytics"])


@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {"message": "Elyx Health Concierge API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)