from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


class JarConfigUpdate(BaseModel):
    jar_type: str = Field(..., pattern="^(NEC|FFA|LTSS|EDU|PLAY|GIVE)$")
    percentage: float = Field(..., ge=0, le=100)


class JarConfigBulkUpdate(BaseModel):
    jars: List[JarConfigUpdate]

    @field_validator("jars")
    @classmethod
    def validate_jars(cls, v):
        if len(v) != 6:
            raise ValueError("Exactly 6 jar configurations required")
        types = {j.jar_type for j in v}
        required = {"NEC", "FFA", "LTSS", "EDU", "PLAY", "GIVE"}
        if types != required:
            raise ValueError(f"Must include all jar types: {required}")
        total = sum(j.percentage for j in v)
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"Percentages must sum to 100, got {total}")
        return v


class JarConfigResponse(BaseModel):
    id: str
    jar_type: str
    percentage: float
    is_active: bool
    name: str
    icon: str
    color: str

    model_config = {"from_attributes": True}


class JarAllocationResponse(BaseModel):
    id: str
    transaction_id: str
    jar_type: str
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class JarBalanceResponse(BaseModel):
    jar_type: str
    name: str
    icon: str
    color: str
    percentage: float
    total_allocated: float
    balance: float
    is_active: bool


class JarSummaryResponse(BaseModel):
    jars: List[JarBalanceResponse]
    total_allocated: float
    is_configured: bool


class AllocationPreviewItem(BaseModel):
    jar_type: str
    name: str
    icon: str
    color: str
    percentage: float
    amount: float


class AllocationPreviewResponse(BaseModel):
    income_amount: float
    allocations: List[AllocationPreviewItem]
