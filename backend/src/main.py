from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings
from config.database import engine, Base

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Puller Finance API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs"
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    # Create database tables (use Alembic migrations in production)
    Base.metadata.create_all(bind=engine)
    # Add new columns added after initial schema creation (SQLite-compatible)
    from sqlalchemy import text
    with engine.connect() as conn:
        existing = [row[1] for row in conn.execute(text("PRAGMA table_info(debts)")).fetchall()]
        for col_name, col_type in [
            ('category', 'VARCHAR(50)'),
            ('personal_note', 'VARCHAR(1000)'),
            ('reminder_at', 'DATETIME'),
        ]:
            if col_name not in existing:
                conn.execute(text(f"ALTER TABLE debts ADD COLUMN {col_name} {col_type}"))
                conn.commit()
        # Migrate category icons from emoji to Material Symbols names
        _migrate_category_icons(conn)

    print(f"🚀 {settings.APP_NAME} started successfully!")
    print(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/api/docs")


def _migrate_category_icons(conn):
    """One-time migration: update system category icons from emoji to Material Symbols."""
    from sqlalchemy import text
    emoji_to_material = {
        "🍔": "restaurant",
        "🛒": "shopping_cart",
        "🚗": "directions_car",
        "🛍️": "shopping_bag",
        "🛍": "shopping_bag",
        "🎬": "theater_comedy",
        "💡": "bolt",
        "⚕️": "monitor_heart",
        "⚕": "monitor_heart",
        "📚": "school",
        "✈️": "flight",
        "✈": "flight",
        "💰": "monetization_on",
        "📈": "trending_up",
        "💵": "attach_money",
        "📝": "receipt_long",
        "🏦": "account_balance",
        "📁": "folder",
    }
    for emoji, material_name in emoji_to_material.items():
        conn.execute(
            text("UPDATE categories SET icon = :new WHERE icon = :old"),
            {"new": material_name, "old": emoji},
        )
    conn.commit()


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    print(f"👋 {settings.APP_NAME} shutting down...")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Import and register routers
import src.models.debt_payment  # noqa: ensure table is registered
import src.models.jar  # noqa: ensure jar tables are registered
import src.models.investment  # noqa: ensure investment tables are registered
from src.routes import auth, accounts, transactions, categories, debts, jars, voice, insights, investments

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(debts.router, prefix="/api/v1/debts", tags=["Debts"])
app.include_router(jars.router, prefix="/api/v1/jars", tags=["Jars"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["Voice Input"])
app.include_router(insights.router, prefix="/api/v1/insights", tags=["Insights"])
app.include_router(investments.router, prefix="/api/v1/investments", tags=["Investments"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
