"""/balance, /recent, /accounts, /help commands."""

from telegram import Update
from telegram.ext import ContextTypes

from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    get_user_accounts,
    get_recent_transactions,
    get_account_balance_display,
)


def _get_lang(update: Update, tg_user) -> str:
    if tg_user:
        return tg_user.language
    code = (update.effective_user.language_code or "en")[:2]
    return "ru" if code == "ru" else "en"


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help text."""
    db = get_db()
    try:
        tg_user = get_telegram_user(db, update.effective_chat.id)
        lang = _get_lang(update, tg_user)
    finally:
        db.close()

    await update.message.reply_text(
        get_text(lang, "help"), parse_mode="Markdown",
    )


async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show all account balances."""
    db = get_db()
    try:
        tg_user = get_telegram_user(db, update.effective_chat.id)
        if not tg_user:
            lang = _get_lang(update, None)
            await update.message.reply_text(
                get_text(lang, "not_linked"), parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        accounts = get_user_accounts(db, tg_user.user_id)
        if not accounts:
            await update.message.reply_text(
                get_text(lang, "no_accounts"), parse_mode="Markdown",
            )
            return

        text = get_text(lang, "balance_header")
        total = 0.0
        for acc in accounts:
            if not acc.exclude_from_total:
                total += acc.balance
            text += get_text(
                lang, "balance_row",
                icon=acc.icon or "💳",
                name=acc.name,
                balance=get_account_balance_display(acc),
            )

        # Total in default currency of first account
        symbol = {"USD": "$", "RUB": "₽", "EUR": "€", "UZS": "сум"}.get(
            accounts[0].currency, accounts[0].currency,
        )
        text += get_text(lang, "balance_total", total=f"{symbol}{total:,.2f}")

        await update.message.reply_text(text, parse_mode="Markdown")
    finally:
        db.close()


async def recent_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show last 5 transactions."""
    db = get_db()
    try:
        tg_user = get_telegram_user(db, update.effective_chat.id)
        if not tg_user:
            lang = _get_lang(update, None)
            await update.message.reply_text(
                get_text(lang, "not_linked"), parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        txns = get_recent_transactions(db, tg_user.user_id, limit=5)
        if not txns:
            await update.message.reply_text(
                get_text(lang, "no_transactions"), parse_mode="Markdown",
            )
            return

        text = get_text(lang, "recent_header")
        for txn in txns:
            emoji = "💰" if txn.transaction_type.value == "INCOME" else "💸"
            symbol = "+"  if txn.transaction_type.value == "INCOME" else "-"
            date_str = txn.transaction_date.strftime("%m/%d") if txn.transaction_date else ""
            text += get_text(
                lang, "recent_row",
                emoji=emoji,
                desc=txn.description[:30],
                amount=f"{symbol}${txn.amount:,.2f}",
                date=date_str,
            )

        await update.message.reply_text(text, parse_mode="Markdown")
    finally:
        db.close()


async def accounts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """List user accounts."""
    db = get_db()
    try:
        tg_user = get_telegram_user(db, update.effective_chat.id)
        if not tg_user:
            lang = _get_lang(update, None)
            await update.message.reply_text(
                get_text(lang, "not_linked"), parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        accounts = get_user_accounts(db, tg_user.user_id)
        if not accounts:
            await update.message.reply_text(
                get_text(lang, "no_accounts"), parse_mode="Markdown",
            )
            return

        text = get_text(lang, "accounts_header")
        for acc in accounts:
            text += get_text(
                lang, "accounts_row",
                icon=acc.icon or "💳",
                name=acc.name,
                type=acc.account_type.value if acc.account_type else "—",
                balance=get_account_balance_display(acc),
            )

        await update.message.reply_text(text, parse_mode="Markdown")
    finally:
        db.close()
