# Task Manager Workspace

- Frontend: React 19 + Vite in `frontend/`; use `npm run lint` and `npm run build` there.
- Backend: Django REST Framework in `backend/`; run checks and tests with the workspace `.venv` and `backend/pytest.ini`.
- Keep task and category querysets scoped to `request.user`; never trust a client-provided owner.
- Keep API response fields aligned with `frontend/src/pages/Workspace.jsx` and document endpoint changes in `README.md`.
- Store secrets in local environment files only; do not commit `.env` files.