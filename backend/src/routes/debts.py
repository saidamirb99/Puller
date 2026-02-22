from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from config.database import get_db
from src.models.user import User
from src.models.debt import Debt
from src.models.debt_payment import DebtPayment
from src.models.account import Account
from src.schemas.debt import DebtCreate, DebtUpdate, DebtResponse
from src.schemas.debt_payment import DebtPaymentCreate, DebtPaymentResponse
from src.routes.auth import get_current_user_dependency

router = APIRouter()

EAGER = [joinedload(Debt.account), joinedload(Debt.payments)]


def _get_debt(db: Session, debt_id: str, user_id: str) -> Debt:
    debt = db.query(Debt).options(*EAGER).filter(
        Debt.id == debt_id, Debt.user_id == user_id
    ).first()
    if not debt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
    return debt


def _apply_payment_balance(db: Session, debt_type: str, account_id: Optional[str], amount: float, reverse: bool = False):
    """Apply or reverse a single payment's balance effect."""
    if not account_id:
        return
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return
    if debt_type == "DEBT":
        # I owe → payment means money leaves my account
        account.balance += amount if reverse else -amount
    else:
        # Receivable → payment means money enters my account
        account.balance += -amount if reverse else amount


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    debt_data: DebtCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    if debt_data.account_id:
        account = db.query(Account).filter(
            Account.id == debt_data.account_id,
            Account.user_id == current_user.id,
            Account.is_active == True
        ).first()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    new_debt = Debt(
        user_id=current_user.id,
        account_id=debt_data.account_id,
        person_name=debt_data.person_name,
        amount=debt_data.amount,
        debt_type=debt_data.debt_type,
        category=debt_data.category,
        description=debt_data.description,
        personal_note=debt_data.personal_note,
        due_date=debt_data.due_date,
        reminder_at=debt_data.reminder_at,
        is_paid=False,
    )
    db.add(new_debt)
    db.commit()
    db.refresh(new_debt)
    return db.query(Debt).options(*EAGER).filter(Debt.id == new_debt.id).first()


@router.get("", response_model=List[DebtResponse])
async def get_debts(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
    debt_type: Optional[str] = None,
    is_paid: Optional[bool] = None,
    account_id: Optional[str] = None,
):
    query = db.query(Debt).options(*EAGER).filter(Debt.user_id == current_user.id)
    if debt_type:
        query = query.filter(Debt.debt_type == debt_type)
    if is_paid is not None:
        query = query.filter(Debt.is_paid == is_paid)
    if account_id:
        query = query.filter(Debt.account_id == account_id)
    return query.order_by(Debt.created_at.desc()).all()


@router.get("/{debt_id}", response_model=DebtResponse)
async def get_debt(
    debt_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    return _get_debt(db, debt_id, current_user.id)


@router.put("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: str,
    debt_data: DebtUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    debt = _get_debt(db, debt_id, current_user.id)
    update_data = debt_data.model_dump(exclude_unset=True)

    # Validate new account if changed
    new_account_id = update_data.get('account_id')
    if new_account_id is not None and new_account_id != debt.account_id:
        acc = db.query(Account).filter(
            Account.id == new_account_id,
            Account.user_id == current_user.id,
            Account.is_active == True
        ).first()
        if not acc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Handle is_paid toggle → settle remaining via a final payment
    new_is_paid = update_data.get('is_paid')
    if new_is_paid is not None and new_is_paid != debt.is_paid:
        acct_id = new_account_id if new_account_id is not None else debt.account_id
        if new_is_paid:
            # Mark as paid: create final payment for remaining amount
            remaining = debt.amount - debt.paid_amount
            if remaining > 0:
                final = DebtPayment(
                    debt_id=debt.id,
                    account_id=acct_id,
                    amount=remaining,
                    note="Final settlement",
                )
                db.add(final)
                _apply_payment_balance(db, debt.debt_type, acct_id, remaining)
        else:
            # Un-paying: reverse the full amount of all payments
            for p in debt.payments:
                _apply_payment_balance(db, debt.debt_type, p.account_id, p.amount, reverse=True)
            # Delete all payment records
            for p in list(debt.payments):
                db.delete(p)

    for field, value in update_data.items():
        setattr(debt, field, value)

    db.commit()
    return db.query(Debt).options(*EAGER).filter(Debt.id == debt_id).first()


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    debt = db.query(Debt).options(joinedload(Debt.payments)).filter(
        Debt.id == debt_id, Debt.user_id == current_user.id
    ).first()
    if not debt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")

    # Reverse balance for every payment that touched an account
    for p in debt.payments:
        _apply_payment_balance(db, debt.debt_type, p.account_id, p.amount, reverse=True)

    db.delete(debt)
    db.commit()
    return None


# ─── Partial Payments ────────────────────────────────────────────────────────

@router.post("/{debt_id}/payments", response_model=DebtPaymentResponse, status_code=status.HTTP_201_CREATED)
async def add_payment(
    debt_id: str,
    payment_data: DebtPaymentCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Record a partial payment toward a debt."""
    debt = _get_debt(db, debt_id, current_user.id)

    if debt.is_paid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debt is already fully paid")

    remaining = debt.amount - debt.paid_amount
    if payment_data.amount > remaining + 0.01:  # small tolerance for float
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment exceeds remaining balance ({remaining:.2f})"
        )

    # Validate account
    acct_id = payment_data.account_id or debt.account_id
    if acct_id:
        acc = db.query(Account).filter(
            Account.id == acct_id, Account.user_id == current_user.id
        ).first()
        if not acc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    payment = DebtPayment(
        debt_id=debt.id,
        account_id=acct_id,
        amount=payment_data.amount,
        note=payment_data.note,
        paid_at=payment_data.paid_at,
    )
    db.add(payment)

    # Update account balance
    _apply_payment_balance(db, debt.debt_type, acct_id, payment_data.amount)

    # Auto-mark as paid if fully settled
    new_paid = debt.paid_amount + payment_data.amount
    if new_paid >= debt.amount - 0.01:
        debt.is_paid = True

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{debt_id}/payments", response_model=List[DebtPaymentResponse])
async def get_payments(
    debt_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    debt = _get_debt(db, debt_id, current_user.id)
    return debt.payments


@router.delete("/{debt_id}/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    debt_id: str,
    payment_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete a payment and reverse its balance effect."""
    debt = _get_debt(db, debt_id, current_user.id)
    payment = db.query(DebtPayment).filter(
        DebtPayment.id == payment_id, DebtPayment.debt_id == debt.id
    ).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    # Reverse balance
    _apply_payment_balance(db, debt.debt_type, payment.account_id, payment.amount, reverse=True)

    # If debt was marked paid, re-open it
    if debt.is_paid:
        debt.is_paid = False

    db.delete(payment)
    db.commit()
    return None
