from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Puller Finance API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./puller.db"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — accepts a comma-separated string from env vars or a JSON list
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://192.168.0.107:5173",
        "http://192.168.0.107:5174",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Email (for notifications)
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_PORT: int = 587
    MAIL_SERVER: Optional[str] = None
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

    # Currency Exchange API (forex-python uses European Central Bank)
    EXCHANGE_RATE_CACHE_TTL: int = 86400  # 24 hours

    # ML Model
    ML_MODEL_PATH: str = "backend/src/ml/models"
    ML_RETRAIN_THRESHOLD: int = 100  # Retrain after 100 new transactions

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds

    # Voice Input / AI Transcription
    GOOGLE_GEMINI_API_KEY: str = ""
    VOICE_TRANSCRIPTION_PROVIDER: str = "gemini"
    VOICE_MAX_AUDIO_SIZE_MB: int = 10

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
