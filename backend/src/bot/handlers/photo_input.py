"""Handle photo messages — receipt parsing via Gemini vision."""

from telegram import Update
from telegram.ext import ContextTypes

from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    get_user_categories,
)
from src.bot.services.receipt_parse_service import parse_receipt_image
from src.bot.handlers.confirm import send_confirmation


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Download highest-res photo, parse receipt, show confirmation."""
    chat_id = update.effective_chat.id

    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if not tg_user or not tg_user.is_active:
            lang = "en"
            await update.message.reply_text(
                get_text(lang, "not_linked"), parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        categories = get_user_categories(db, tg_user.user_id)
    finally:
        db.close()

    processing_msg = await update.message.reply_text(
        "📸 Analyzing receipt..." if lang == "en" else "📸 Анализирую чек...",
    )

    try:
        # Get highest resolution photo (last in the list)
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        image_bytes = await file.download_as_bytearray()

        parsed = await parse_receipt_image(
            image_bytes=bytes(image_bytes),
            categories=categories,
        )
    except Exception as e:
        print(f"Receipt parse error: {e}")
        await processing_msg.edit_text(
            get_text(lang, "generic_error"), parse_mode="Markdown",
        )
        return

    try:
        await processing_msg.delete()
    except Exception:
        pass

    if not parsed.amount:
        await update.message.reply_text(
            get_text(lang, "parse_error"), parse_mode="Markdown",
        )
        return

    await send_confirmation(update, context, parsed, chat_id, lang)
