@echo off
REM Chay dong thoi backend (server) va client trong 2 cua so rieng
echo ============================================
echo   UMC Quan Ly Du An - Khoi dong he thong
echo ============================================
echo.
echo Dang mo Backend (cong 5000)...
start "UMC Backend" cmd /k "cd /d %~dp0server && npm run server"

echo Dang mo Client (cong 5173)...
start "UMC Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Da khoi dong xong!
echo   - Backend: http://localhost:5000
echo   - Client : http://localhost:5173
echo.
echo Mo trinh duyet tai: http://localhost:5173
echo (Dong cac cua so cmd de tat server)
pause
