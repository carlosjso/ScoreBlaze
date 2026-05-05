# ScoreBlaze - Guia Rapida

Esta guia es para levantar **PostgreSQL en Docker**, correr el **backend local** y levantar el **frontend**.

## 1) Requisitos
- Docker Desktop corriendo.
- Python 3.12 instalado.
- PowerShell.

## 2) Configurar Docker (solo BD)
Desde la raiz del proyecto:

```powershell
cd D:\ScoreBlaze
docker compose up -d db
```

La base queda publicada en:
- Host: `localhost`
- Puerto: `5435`
- DB: `scoreblaze`
- User: `postgres`
- Password: `postgres`

## 3) Configurar variables de entorno
Archivo: `D:\ScoreBlaze\backend\.env`

```env
APP_ENV=development
APP_PORT=8000
DB_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/scoreblaze
SECRET_KEY=change-me
LOG_LEVEL=info
```

## 4) Crear y usar entorno virtual (local del proyecto)
```powershell
cd D:\ScoreBlaze\backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

> Si `python` no se reconoce, ejecuta con la ruta completa de tu `python.exe`.

## 5) Ejecutar migraciones
```powershell
cd D:\ScoreBlaze\backend
.\.venv\Scripts\Activate.ps1
$env:ENV_FILE = ".env"
python -m alembic upgrade head
```

## 6) Levantar API local
```powershell
cd D:\ScoreBlaze\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Abrir en navegador:
- `http://localhost:8000/`
- `http://localhost:8000/docs`

## 7) Levantar frontend
```powershell
cd D:\ScoreBlaze\frontend
npm install
npm run dev
```

Abrir la interfaz en:
- `http://localhost:5173/`

Importante:
- `http://localhost:8000/` es el backend.
- `http://localhost:5173/` es el frontend.
- Si abres la app en `8000`, al entrar a rutas como `teams` o `players` puedes terminar viendo JSON de la API en lugar de la interfaz.

