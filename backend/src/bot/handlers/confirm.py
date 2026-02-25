"""Inline keyboard confirmation flow for transactions."""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler

from src.schemas.voice import VoiceParseResponse
from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    get_default_account,
    get_account_by_id,
    get_category_by_id,
    get_user_accounts,
    get_user_categories,
    create_transaction,
    get_account_balance_display,
)


def _build_confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Build the inline keyboard for transaction confirmation."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("Confirm" if lang == "en" else "Подтвердить", callback_data="tx_confirm"),
            InlineKeyboardButton("Cancel" if lang == "en" else "Отмена", callback_data="tx_cancel"),
        ],
        [
            InlineKeyboardButton("Amount" if lang == "en" else "Сумма", callback_data="tx_amt_edit"),
            InlineKeyboardButton("Type" if lang == "en" else "Тип", callback_data="tx_type_toggle"),
        ],
        [
            InlineKeyboardButton("Category" if lang == "en" else "Категория", callback_data="tx_cat_pick"),
            InlineKeyboardButton("Account" if lang == "en" else "Счёт", callback_data="tx_acc_pick"),
        ],
    ])


async def send_confirmation(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    parsed: VoiceParseResponse,
    chat_id: int,
    lang: str,
):
    """Send the confirmation card with inline keyboard."""
    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if not tg_user:
            return

        account = get_default_account(db, tg_user)
        account_name = f"{account.name} ({account.currency})" if account else "—"
        account_id = account.id if account else None

        type_emoji = "💰" if parsed.transaction_type == "INCOME" else "💸"
        type_label = parsed.transaction_type or "EXPENSE"
        amount_str = f"${parsed.amount:,.2f}" if parsed.amount else "—"
        category_name = parsed.category_name or "—"
        merchant = parsed.merchant or "—"
        description = parsed.description or parsed.transcript or "—"

        text = get_text(
            lang, "confirm_card",
            type_emoji=type_emoji,
            type=type_label,
            amount=amount_str,
            category=category_name,
            merchant=merchant,
            account=account_name,
            description=description,
        )

        # Store pending transaction in user_data
        context.user_data["pending_tx"] = {
            "amount": parsed.amount,
            "transaction_type": parsed.transaction_type or "EXPENSE",
            "category_id": parsed.category_id,
            "category_name": parsed.category_name,
            "merchant": parsed.merchant,
            "description": parsed.description or parsed.transcript,
            "account_id": account_id,
            "account_name": account_name,
        }

        keyboard = _build_confirm_keyboard(lang)

        if update.callback_query:
            await update.callback_query.edit_message_text(
                text, parse_mode="Markdown", reply_markup=keyboard,
            )
        else:
            await context.bot.send_message(
                chat_id=chat_id, text=text,
                parse_mode="Markdown", reply_markup=keyboard,
            )
    finally:
        db.close()


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all tx_ callback queries."""
    query = update.callback_query
    await query.answer()
    data = query.data
    chat_id = update.effective_chat.id

    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if not tg_user:
            return
        lang = tg_user.language

        pending = context.user_data.get("pending_tx")
        if not pending:
            await query.edit_message_text(get_text(lang, "cancelled"))
            return

        # ── Confirm ──────────────────────────────────────────
        if data == "tx_confirm":
            if not pending.get("account_id"):
                await query.edit_message_text(get_text(lang, "no_default_account"))
                return

            txn = create_transaction(
                db,
                user_id=tg_user.user_id,
                account_id=pending["account_id"],
                category_id=pending.get("category_id"),
                transaction_type=pending["transaction_type"],
                amount=pending.get("amount") or 0,
                description=pending.get("description") or "Telegram transaction",
                merchant=pending.get("merchant"),
            )

            account = get_account_by_id(db, pending["account_id"])
            balance_str = get_account_balance_display(account) if account else "—"

            await query.edit_message_text(
                get_text(lang, "confirmed", balance=balance_str),
                parse_mode="Markdown",
            )
            context.user_data.pop("pending_tx", None)

        # ── Cancel ───────────────────────────────────────────
        elif data == "tx_cancel":
            await query.edit_message_text(get_text(lang, "cancelled"))
            context.user_data.pop("pending_tx", None)

        # ── Toggle type ──────────────────────────────────────
        elif data == "tx_type_toggle":
            current = pending.get("transaction_type", "EXPENSE")
            new_type = "INCOME" if current == "EXPENSE" else "EXPENSE"
            pending["transaction_type"] = new_type
            # Re-render the card
            from src.schemas.voice import VoiceParseResponse as VPR
            parsed = VPR(
                transcript="",
                amount=pending.get("amount"),
                transaction_type=new_type,
                category_name=pending.get("category_name"),
                category_id=pending.get("category_id"),
                merchant=pending.get("merchant"),
                description=pending.get("description"),
            )
            await send_confirmation(update, context, parsed, chat_id, lang)

        # ── Edit amount ──────────────────────────────────────
        elif data == "tx_amt_edit":
            context.user_data["awaiting_amount_edit"] = True
            await query.edit_message_text(
                get_text(lang, "edit_amount_prompt"),
                parse_mode="Markdown",
            )

        # ── Category picker ──────────────────────────────────
        elif data == "tx_cat_pick":
            categories = get_user_categories(db, tg_user.user_id)
            buttons = []
            row = []
            for cat in categories:
                row.append(InlineKeyboardButton(
                    cat["name"], callback_data=f"tx_cat_{cat['id']}",
                ))
                if len(row) == 2:
                    buttons.append(row)
                    row = []
            if row:
                buttons.append(row)
            buttons.append([InlineKeyboardButton(
                "Back" if lang == "en" else "Назад",
                callback_data="tx_cat_back",
            )])
            await query.edit_message_text(
                "Pick a category:" if lang == "en" else "Выберите категорию:",
                reply_markup=InlineKeyboardMarkup(buttons),
            )

        elif data.startswith("tx_cat_"):
            cat_id = data[len("tx_cat_"):]
            if cat_id == "back":
                # Re-show confirmation card
                from src.schemas.voice import VoiceParseResponse as VPR
                parsed = VPR(
                    transcript="",
                    amount=pending.get("amount"),
                    transaction_type=pending.get("transaction_type"),
                    category_name=pending.get("category_name"),
                    category_id=pending.get("category_id"),
                    merchant=pending.get("merchant"),
                    description=pending.get("description"),
                )
                await send_confirmation(update, context, parsed, chat_id, lang)
            else:
                cat = get_category_by_id(db, cat_id)
                if cat:
                    pending["category_id"] = cat.id
                    pending["category_name"] = cat.name
                from src.schemas.voice import VoiceParseResponse as VPR
                parsed = VPR(
                    transcript="",
                    amount=pending.get("amount"),
                    transaction_type=pending.get("transaction_type"),
                    category_name=pending.get("category_name"),
                    category_id=pending.get("category_id"),
                    merchant=pending.get("merchant"),
                    description=pending.get("description"),
                )
                await send_confirmation(update, context, parsed, chat_id, lang)

        # ── Account picker ───────────────────────────────────
        elif data == "tx_acc_pick":
            accounts = get_user_accounts(db, tg_user.user_id)
            buttons = []
            for acc in accounts:
                buttons.append([InlineKeyboardButton(
                    f"{acc.icon} {acc.name} ({acc.currency})",
                    callback_data=f"tx_acc_{acc.id}",
                )])
            buttons.append([InlineKeyboardButton(
                "Back" if lang == "en" else "Назад",
                callback_data="tx_acc_back",
            )])
            await query.edit_message_text(
                "Pick an account:" if lang == "en" else "Выберите счёт:",
                reply_markup=InlineKeyboardMarkup(buttons),
            )

        elif data.startswith("tx_acc_"):
            acc_id = data[len("tx_acc_"):]
            if acc_id == "back":
                from src.schemas.voice import VoiceParseResponse as VPR
                parsed = VPR(
                    transcript="",
                    amount=pending.get("amount"),
                    transaction_type=pending.get("transaction_type"),
                    category_name=pending.get("category_name"),
                    category_id=pending.get("category_id"),
                    merchant=pending.get("merchant"),
                    description=pending.get("description"),
                )
                await send_confirmation(update, context, parsed, chat_id, lang)
            else:
                acc = get_account_by_id(db, acc_id)
                if acc:
                    pending["account_id"] = acc.id
                    pending["account_name"] = f"{acc.name} ({acc.currency})"
                from src.schemas.voice import VoiceParseResponse as VPR
                parsed = VPR(
                    transcript="",
                    amount=pending.get("amount"),
                    transaction_type=pending.get("transaction_type"),
                    category_name=pending.get("category_name"),
                    category_id=pending.get("category_id"),
                    merchant=pending.get("merchant"),
                    description=pending.get("description"),
                )
                await send_confirmation(update, context, parsed, chat_id, lang)

    finally:
        db.close()


def get_confirm_handler() -> CallbackQueryHandler:
    """Return the callback query handler for tx_ prefixed data."""
    return CallbackQueryHandler(handle_callback, pattern=r"^tx_")
