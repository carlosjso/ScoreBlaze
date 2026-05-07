# ScoreBlaze - Guia Rapida

Esta guia es para levantar **PostgreSQL y Redis en Docker**, correr el **backend local** y levantar el **frontend**.

## 1) Requisitos
- Docker Desktop corriendo.
- Python 3.12 instalado.
- PowerShell.

## 2) Configurar Docker
Desde la raiz del proyecto:

```powershell
cd D:\ScoreBlaze
docker compose up -d db redis
```

La base queda publicada en:
- Host: `localhost`
- Puerto: `5435`
- DB: `scoreblaze`
- User: `postgres`
- Password: `postgres`

Redis queda publicado en:
- Host: `localhost`
- Puerto: `6379`

## 3) Configurar variables de entorno
Archivo: `D:\ScoreBlaze\backend\.env`

```env
DB_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/scoreblaze
REDIS_URL=redis://localhost:6379/0
SEED_SUPERADMIN_EMAIL=superadmin@scoreblaze.local
SEED_SUPERADMIN_PASSWORD=ScoreBlaze123!
```

El resto de opciones avanzadas ya tienen valor por defecto en [backend/config.py](/C:/Users/dell/Documents/GitHub/ScoreBlaze/backend/config.py:17), asi que para local no necesitas llenar todo el archivo.

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

## 6.1) Crear superadmin inicial
```powershell
cd D:\ScoreBlaze\backend
.\.venv\Scripts\Activate.ps1
python seed_superadmin.py
```

Credenciales por defecto:
- Email: `superadmin@scoreblaze.local`
- Password: `ScoreBlaze123!`

## 7) Levantar frontend
```powershell
cd D:\ScoreBlaze\frontend
npm install
npm run dev
```

Abrir la interfaz en:
- `http://localhost:5173/`


