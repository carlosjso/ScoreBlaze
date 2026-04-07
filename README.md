# ScoreBlaze Boilerplate

Plantilla mínima basada en el proyecto de referencia para iniciar un backend en Python/FastAPI y un frontend en React.

## Estructura
- `backend/`: API FastAPI + soporte para DB/Postgres, migraciones con Alembic.
- `frontend/`: base para React (Vite). Añade tu propio scaffolding o copia el del proyecto de referencia.

## Puesta en marcha rápida
```bash
docker-compose up --build
```
La API queda en `http://localhost:8000`.

Para desarrollo sin Docker:
```bash
cd backend
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Variables de entorno: copia `backend/.env.example` a `.env.development` y ajusta. Secretos sensibles en `backend/.secrets` (no se versiona).
