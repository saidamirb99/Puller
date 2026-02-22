from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from config.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Category details
    name = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True, default="folder")
    color = Column(String(7), nullable=True, default="#6b7280")

    # System vs custom categories
    is_system = Column(Boolean, default=False)  # System categories can't be deleted
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="categories")

    def __repr__(self):
        return f"<Category {self.name}>"


# Default system categories (icons use Material Symbols Outlined names)
DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "icon": "restaurant", "color": "#ef4444", "is_system": True},
    {"name": "Groceries", "icon": "shopping_cart", "color": "#f97316", "is_system": True},
    {"name": "Transportation", "icon": "directions_car", "color": "#3b82f6", "is_system": True},
    {"name": "Shopping", "icon": "shopping_bag", "color": "#ec4899", "is_system": True},
    {"name": "Entertainment", "icon": "theater_comedy", "color": "#8b5cf6", "is_system": True},
    {"name": "Bills & Utilities", "icon": "bolt", "color": "#eab308", "is_system": True},
    {"name": "Healthcare", "icon": "monitor_heart", "color": "#10b981", "is_system": True},
    {"name": "Education", "icon": "school", "color": "#6366f1", "is_system": True},
    {"name": "Travel", "icon": "flight", "color": "#14b8a6", "is_system": True},
    {"name": "Salary", "icon": "monetization_on", "color": "#22c55e", "is_system": True},
    {"name": "Investment Income", "icon": "trending_up", "color": "#059669", "is_system": True},
    {"name": "Other Income", "icon": "attach_money", "color": "#84cc16", "is_system": True},
    {"name": "Other Expense", "icon": "receipt_long", "color": "#64748b", "is_system": True},
    {"name": "Initial Balance", "icon": "account_balance", "color": "#0ea5e9", "is_system": True},
]
