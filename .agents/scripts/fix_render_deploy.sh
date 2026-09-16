#!/usr/bin/env bash
set -e

echo "🔧 Generating Render Blueprint for Wanderlust Voyage AI..."
cat << 'RENDER_EOF' > render.yaml
services:
  - type: web
    name: wanderlust-voyage-ai-backend
    env: python
    region: frankfurt
    plan: free
    buildCommand: "pip install --upgrade pip && pip install -r backend/requirements.txt"
    startCommand: "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.8
      - key: ENVIRONMENT
        value: production
RENDER_EOF
echo "✅ render.yaml successfully written."
