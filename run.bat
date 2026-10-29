@echo off
chcp 65001 > nul
echo ========================================================
echo  KHOI CHAY HE THONG QUAN LY THUE CAN HO (DWELL LIVING)
echo ========================================================
echo.
echo [1/2] Dang khoi chay Backend FastAPI (Port 8000, Host 0.0.0.0)...
start "Backend - Dwell Living (FastAPI)" cmd /k "cd /d %~dp0backend && py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Dang khoi chay Frontend Vite (Port 5173)...
start "Frontend - Dwell Living (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  DA KHOI CHAY THANH CONG!
echo  - Frontend:     http://localhost:5173 (hoac http://169.254.81.70:5173)
echo  - Backend Docs: http://localhost:8000/docs (hoac http://169.254.81.70:8000/docs)
echo ========================================================
pause
