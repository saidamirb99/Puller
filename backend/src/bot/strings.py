"""EN/RU message templates for the Telegram bot."""

STRINGS = {
    "en": {
        # Start / linking
        "welcome": (
            "Welcome to *Puller Finance Bot*!\n\n"
            "Link your account to add transactions via text, voice, or receipt photo.\n\n"
            "Please enter your *email*:"
        ),
        "ask_password": "Got it! Now enter your *password*:",
        "link_success": (
            "Account linked successfully!\n"
            "Default account: *{account}*\n\n"
            "You can now:\n"
            "- Type a transaction: `spent 500 on groceries`\n"
            "- Send a voice message\n"
            "- Send a receipt photo\n\n"
            "Type /help for all commands."
        ),
        "link_fail": "Invalid email or password. Please try again with /start",
        "already_linked": "Your account is already linked! Send a transaction or type /help",

        # Confirmation card
        "confirm_card": (
            "{type_emoji} *New Transaction:*\n"
            "  Type: {type}\n"
            "  Amount: {amount}\n"
            "  Category: {category}\n"
            "  Merchant: {merchant}\n"
            "  Account: {account}\n"
            "  Description: {description}"
        ),
        "confirmed": "Transaction saved! Balance: *{balance}*",
        "cancelled": "Transaction cancelled.",
        "edit_amount_prompt": "Enter new amount:",
        "amount_updated": "Amount updated to *{amount}*. Confirm?",
        "invalid_amount": "Invalid amount. Please enter a number.",

        # Commands
        "help": (
            "*Puller Finance Bot*\n\n"
            "*Add transactions:*\n"
            "- Type: `spent 500 on groceries at Walmart`\n"
            "- Send a voice message describing the transaction\n"
            "- Send a receipt photo\n\n"
            "*Commands:*\n"
            "/balance - Show account balances\n"
            "/recent - Last 5 transactions\n"
            "/accounts - List your accounts\n"
            "/help - This message"
        ),
        "balance_header": "*Your Balances:*\n",
        "balance_row": "  {icon} {name}: *{balance}*\n",
        "balance_total": "\n*Total: {total}*",
        "no_accounts": "No accounts found. Create one in the web app first.",
        "recent_header": "*Recent Transactions:*\n",
        "recent_row": "{emoji} {desc} — *{amount}* ({date})\n",
        "no_transactions": "No transactions yet.",
        "accounts_header": "*Your Accounts:*\n",
        "accounts_row": "  {icon} *{name}* ({type}) — {balance}\n",

        # Errors
        "not_linked": "Please link your account first with /start",
        "parse_error": "Couldn't understand that. Try: `spent 500 on groceries`",
        "generic_error": "Something went wrong. Please try again.",
        "no_default_account": "No default account set. Use /accounts to see your accounts.",
    },
    "ru": {
        "welcome": (
            "Добро пожаловать в *Puller Finance Bot*!\n\n"
            "Привяжите аккаунт, чтобы добавлять транзакции текстом, голосом или фото чека.\n\n"
            "Введите ваш *email*:"
        ),
        "ask_password": "Принято! Теперь введите *пароль*:",
        "link_success": (
            "Аккаунт успешно привязан!\n"
            "Счёт по умолчанию: *{account}*\n\n"
            "Теперь вы можете:\n"
            "- Написать транзакцию: `потратил 500 на продукты`\n"
            "- Отправить голосовое сообщение\n"
            "- Отправить фото чека\n\n"
            "Введите /help для списка команд."
        ),
        "link_fail": "Неверный email или пароль. Попробуйте снова с /start",
        "already_linked": "Ваш аккаунт уже привязан! Отправьте транзакцию или введите /help",

        "confirm_card": (
            "{type_emoji} *Новая транзакция:*\n"
            "  Тип: {type}\n"
            "  Сумма: {amount}\n"
            "  Категория: {category}\n"
            "  Продавец: {merchant}\n"
            "  Счёт: {account}\n"
            "  Описание: {description}"
        ),
        "confirmed": "Транзакция сохранена! Баланс: *{balance}*",
        "cancelled": "Транзакция отменена.",
        "edit_amount_prompt": "Введите новую сумму:",
        "amount_updated": "Сумма изменена на *{amount}*. Подтвердить?",
        "invalid_amount": "Неверная сумма. Введите число.",

        "help": (
            "*Puller Finance Bot*\n\n"
            "*Добавить транзакцию:*\n"
            "- Текст: `потратил 500 на продукты в Магните`\n"
            "- Отправьте голосовое сообщение\n"
            "- Отправьте фото чека\n\n"
            "*Команды:*\n"
            "/balance - Баланс счетов\n"
            "/recent - Последние 5 транзакций\n"
            "/accounts - Список счетов\n"
            "/help - Эта справка"
        ),
        "balance_header": "*Ваши балансы:*\n",
        "balance_row": "  {icon} {name}: *{balance}*\n",
        "balance_total": "\n*Итого: {total}*",
        "no_accounts": "Счета не найдены. Создайте счёт в веб-приложении.",
        "recent_header": "*Последние транзакции:*\n",
        "recent_row": "{emoji} {desc} — *{amount}* ({date})\n",
        "no_transactions": "Транзакций пока нет.",
        "accounts_header": "*Ваши счета:*\n",
        "accounts_row": "  {icon} *{name}* ({type}) — {balance}\n",

        "not_linked": "Сначала привяжите аккаунт командой /start",
        "parse_error": "Не удалось понять. Попробуйте: `потратил 500 на продукты`",
        "generic_error": "Что-то пошло не так. Попробуйте ещё раз.",
        "no_default_account": "Счёт по умолчанию не задан. Используйте /accounts.",
    },
}


def get_text(lang: str, key: str, **kwargs) -> str:
    """Get a localized string, falling back to English."""
    template = STRINGS.get(lang, STRINGS["en"]).get(key, STRINGS["en"].get(key, key))
    if kwargs:
        return template.format(**kwargs)
    return template
