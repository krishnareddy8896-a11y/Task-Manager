# Momentum Task Manager

A personal task manager with a React dashboard and a Django REST API. Each account sees only its own tasks and categories.

## Features

- Account registration, JWT sign-in, token refresh, profile, and client-side sign-out
- Task create, read, update, and delete with status, priority, due date, description, and optional category
- Search, status and priority filters, due-today/overdue/this-week filters, and sort order
- Drag-and-drop Kanban board with To do, In progress, and Done lanes
- Dashboard completion and priority charts
- Persistent light/dark theme, responsive layout, loading states, and notifications
- Swagger UI at `/api/docs/`

Email reminders, subtasks, and recurring tasks are not included in this first version.

## Requirements

- Python 3.12 or newer
- Node.js 20.19+ or 22.12+ and npm

## Run on Windows

From the project root, create and activate a virtual environment, then install the API packages:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Start the API in one PowerShell terminal:

```powershell
Set-Location backend
python manage.py migrate
python manage.py runserver
```

Start the React app in another terminal:

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed by npm (normally `http://localhost:5173`). The API defaults to `http://localhost:8000/api`; override it with `VITE_API_URL` in `frontend/.env`.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register/` | Create an account |
| `POST` | `/api/auth/login/` | Obtain access and refresh tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh an access token |
| `GET` | `/api/auth/me/` | Read the signed-in profile |
| `GET, POST` | `/api/tasks/` | List or create owned tasks |
| `GET, PATCH, DELETE` | `/api/tasks/{id}/` | Read or modify an owned task |
| `GET` | `/api/tasks/stats/` | Task totals by status and priority |
| `GET, POST` | `/api/categories/` | List or create owned categories |

Task list filters include `status`, `priority`, `due_date`, `due=today|overdue|this_week`, `search`, and `ordering`. Send `Authorization: Bearer <access-token>` for protected routes.

## SQL

The API uses Django's ORM, which issues SQL against SQLite locally or PostgreSQL when `DATABASE_URL` is configured. Django migrations are the source of truth for schema creation. To inspect the SQL for the task tables, run `python manage.py sqlmigrate tasks 0001` from `backend/`. PostgreSQL reporting-query examples are in `backend/sql/task_queries.sql`; bind `$1` to the authenticated user's ID on the server, not a client-provided owner value.

## Checks

```powershell
Push-Location backend
python manage.py check
python -m pytest
Pop-Location

Push-Location frontend
npm run lint
npm run build
Pop-Location
```

## Production notes

Set a unique `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, and a PostgreSQL `DATABASE_URL` in the deployment environment. Vercel hosts and preview origins under `*.vercel.app` are allowed by default. Production startup fails clearly when `DATABASE_URL` is missing because Vercel's filesystem is ephemeral. Run `python manage.py migrate` and `python manage.py collectstatic --noinput`, then serve `config.wsgi:application` with Gunicorn. The frontend should be built with `npm run build` and hosted as static files; set `VITE_API_URL` to the deployed API before building.