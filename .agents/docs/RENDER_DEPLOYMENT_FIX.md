# 🚀 Render Deployment Fix Guide (Exit Status 127)

### Problem
Render build failed for `wanderlust-voyage-ai-1` with:
`Reason: "Exited with status 127"`

### Why It Happens
Exit status 127 means "command not found". In a monorepo structure with `/backend` and `/frontend`, Render's root directory is at the repository root. If the start command is `uvicorn app.main:app` without `cd backend` or without installing `uvicorn` in the root environment, Linux cannot find `uvicorn`.

### Solution
In Render Dashboard:
1. **Root Directory:** leave blank or set to `backend`.
2. **If Root Directory is blank:**
   - **Build Command:** `pip install --upgrade pip && pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **If Root Directory is `backend`:**
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Using `python -m uvicorn` guarantees Python invokes the installed module even if PATH is not updated.
