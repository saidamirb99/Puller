from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from src.models.user import User
from src.models.category import Category, DEFAULT_CATEGORIES
from src.routes.auth import get_current_user_dependency

router = APIRouter()


@router.get("", response_model=List[dict])
async def get_categories(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """
    Get all categories for the user (system + custom categories).
    If user has no categories, create default system categories.
    """
    # Get user's custom categories
    user_categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.is_active == True
    ).all()

    # Get system categories (user_id is None)
    system_categories = db.query(Category).filter(
        Category.user_id == None,
        Category.is_system == True,
        Category.is_active == True
    ).all()

    # If no system categories exist, create them
    if not system_categories:
        for cat_data in DEFAULT_CATEGORIES:
            new_category = Category(
                user_id=None,
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                is_system=cat_data["is_system"]
            )
            db.add(new_category)
        db.commit()

        # Re-fetch system categories
        system_categories = db.query(Category).filter(
            Category.user_id == None,
            Category.is_system == True,
            Category.is_active == True
        ).all()

    # Combine and return
    all_categories = system_categories + user_categories

    return [
        {
            "id": cat.id,
            "name": cat.name,
            "icon": cat.icon,
            "color": cat.color,
            "is_system": cat.is_system
        }
        for cat in all_categories
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_custom_category(
    name: str,
    icon: str = "📁",
    color: str = "#6b7280",
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a custom category for the user"""
    new_category = Category(
        user_id=current_user.id,
        name=name,
        icon=icon,
        color=color,
        is_system=False
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return {
        "id": new_category.id,
        "name": new_category.name,
        "icon": new_category.icon,
        "color": new_category.color,
        "is_system": new_category.is_system
    }
