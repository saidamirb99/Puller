from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import List, Optional
from config.database import get_db
from src.models.user import User
from src.models.jar import JarConfig, JarAllocation, JarType, DEFAULT_JAR_PERCENTAGES, JAR_METADATA
from src.schemas.jar import (
    JarConfigBulkUpdate,
    JarConfigResponse,
    JarAllocationResponse,
    JarBalanceResponse,
    JarSummaryResponse,
    AllocationPreviewResponse,
    AllocationPreviewItem,
)
from src.routes.auth import get_current_user_dependency

router = APIRouter()


def _ensure_jar_configs(db: Session, user_id: str) -> List[JarConfig]:
    """Create default jar configs for user if they don't exist."""
    configs = db.query(JarConfig).filter(JarConfig.user_id == user_id).all()
    existing_types = {c.jar_type for c in configs}
    if len(existing_types) == 6:
        return configs
    for jar_type, pct in DEFAULT_JAR_PERCENTAGES.items():
        if jar_type.value not in existing_types:
            config = JarConfig(
                user_id=user_id,
                jar_type=jar_type.value,
                percentage=pct,
            )
            db.add(config)
    db.commit()
    return db.query(JarConfig).filter(JarConfig.user_id == user_id).all()


def _config_to_response(config: JarConfig) -> JarConfigResponse:
    meta = JAR_METADATA.get(JarType(config.jar_type), {})
    return JarConfigResponse(
        id=config.id,
        jar_type=config.jar_type,
        percentage=config.percentage,
        is_active=config.is_active,
        name=meta.get("name", config.jar_type),
        icon=meta.get("icon", "🏺"),
        color=meta.get("color", "#6b7280"),
    )


# ─── Configuration ────────────────────────────────────────────────────────────

@router.get("/config", response_model=List[JarConfigResponse])
async def get_jar_configs(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    configs = _ensure_jar_configs(db, current_user.id)
    return [_config_to_response(c) for c in configs]


@router.put("/config", response_model=List[JarConfigResponse])
async def update_jar_configs(
    data: JarConfigBulkUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    configs = _ensure_jar_configs(db, current_user.id)
    config_map = {c.jar_type: c for c in configs}
    for jar_update in data.jars:
        config = config_map.get(jar_update.jar_type)
        if config:
            config.percentage = jar_update.percentage
    db.commit()
    updated = db.query(JarConfig).filter(JarConfig.user_id == current_user.id).all()
    return [_config_to_response(c) for c in updated]


# ─── Summary / Balances ──────────────────────────────────────────────────────

@router.get("/summary", response_model=JarSummaryResponse)
async def get_jar_summary(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    configs = _ensure_jar_configs(db, current_user.id)
    config_map = {c.jar_type: c for c in configs}

    allocation_sums = dict(
        db.query(JarAllocation.jar_type, sqlfunc.sum(JarAllocation.amount))
        .filter(JarAllocation.user_id == current_user.id)
        .group_by(JarAllocation.jar_type)
        .all()
    )

    jars = []
    total = 0.0
    for jar_type_enum in JarType:
        jt = jar_type_enum.value
        config = config_map.get(jt)
        allocated = allocation_sums.get(jt, 0.0) or 0.0
        total += allocated
        meta = JAR_METADATA.get(jar_type_enum, {})
        jars.append(JarBalanceResponse(
            jar_type=jt,
            name=meta.get("name", jt),
            icon=meta.get("icon", "🏺"),
            color=meta.get("color", "#6b7280"),
            percentage=config.percentage if config else DEFAULT_JAR_PERCENTAGES.get(jar_type_enum, 0),
            total_allocated=round(allocated, 2),
            balance=round(allocated, 2),
            is_active=config.is_active if config else True,
        ))

    return JarSummaryResponse(
        jars=jars,
        total_allocated=round(total, 2),
        is_configured=len(configs) == 6,
    )


# ─── Allocations ─────────────────────────────────────────────────────────────

@router.get("/allocations", response_model=List[JarAllocationResponse])
async def get_jar_allocations(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
    jar_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    query = db.query(JarAllocation).filter(JarAllocation.user_id == current_user.id)
    if jar_type:
        query = query.filter(JarAllocation.jar_type == jar_type)
    return query.order_by(JarAllocation.created_at.desc()).offset(offset).limit(limit).all()


# ─── Preview ─────────────────────────────────────────────────────────────────

@router.get("/preview", response_model=AllocationPreviewResponse)
async def preview_allocation(
    amount: float = Query(..., gt=0),
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    configs = _ensure_jar_configs(db, current_user.id)
    allocations = []
    for config in configs:
        meta = JAR_METADATA.get(JarType(config.jar_type), {})
        jar_amount = round(amount * config.percentage / 100.0, 2)
        allocations.append(AllocationPreviewItem(
            jar_type=config.jar_type,
            name=meta.get("name", config.jar_type),
            icon=meta.get("icon", "🏺"),
            color=meta.get("color", "#6b7280"),
            percentage=config.percentage,
            amount=jar_amount,
        ))
    return AllocationPreviewResponse(income_amount=amount, allocations=allocations)
