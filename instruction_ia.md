# Backend base (Python + FastAPI)

- Variables de entorno en `backend/.env.development` (copia desde `.env.example`).
- Secretos sensibles en `backend/.secrets` (no versionar, ya está en `.gitignore`).
- Correr local con Docker: `docker-compose up --build`.
- Ejecutar sin Docker: `cd backend && python -m venv .venv && .\.venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload`.

# Frontend base (React)

- Inicializa Vite/React en `frontend/` y ejecuta `npm install && npm run dev`.
- Ajusta rutas/servicios en `frontend/src` según tu API.
