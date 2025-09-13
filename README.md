# White Safe Estate — Telegram WebApp (Local Test)

Это локальный демо-проект: **API + WebApp + Bot** в Docker. Работает без домена.  
Для открытия WebApp **в браузере** достаточно `http://localhost:8080`.  
Чтобы открыть WebApp **внутри Telegram**, нужен HTTPS (ngrok / Cloudflare Tunnel). Для локального теста это не требуется.

---

## 🚀 Быстрый старт

1. Установи Docker Desktop.
2. Создай `.env` из `.env.example` и укажи:
   - `TELEGRAM_BOT_TOKEN` (если хочешь запускать бота)  
   - `OWNER_TG_ID` — свой Telegram ID
3. Запусти:
   ```bash
   docker compose up -d --build
