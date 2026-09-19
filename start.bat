@echo off
chcp 65001 >nul
title Wanderlust Voyage AI Launcher
cd /d "%~dp0"

echo ========================================================
echo   🌍 Wanderlust Voyage AI - הפעלת השרת והאתר יחד
echo ========================================================
echo.
echo בחר את אופן ההרצה:
echo   [1] הפעלה באמצעות Docker (מומלץ - מריץ PostgreSQL, Backend ו-Frontend)
echo   [2] הפעלה מקומית ישירה (FastAPI + Next.js בחלונות נפרדים)
echo.
set /p choice="הזן בחירה [1 או 2] (ברירת מחדל 1): "

if "%choice%"=="2" goto LOCAL
goto DOCKER

:DOCKER
echo.
echo [1/2] מפעיל שירותים דרך Docker Compose...
docker compose up -d
echo [2/2] ממתין 3 שניות לפתיחת הדפדפן...
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo.
echo ========================================================
echo   השרת והאתר רצים בהצלחה!
echo   - ממשק המשתמש: http://localhost:3000
echo   - תיעוד ה-API: http://localhost:8000/docs
echo ========================================================
goto END

:LOCAL
echo.
echo [1/3] מפעיל שרת FastAPI Backend (פורט 8000)...
start "Wanderlust AI - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo [2/3] מפעיל שרת Next.js Frontend (פורט 3000)...
start "Wanderlust AI - Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] ממתין 5 שניות לטעינה...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo   שני החלונות נפתחו והאתר נפתח בדפדפן!
echo ========================================================
goto END

:END
echo.
pause
