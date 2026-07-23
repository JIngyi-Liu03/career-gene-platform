@echo off
setlocal
cd /d "%~dp0"

REM --- 后端 :3000 ---
netstat -ano | findstr /r ":3000 " >nul
if errorlevel 1 (
  echo Starting backend (node backend/dist/main.js)...
  start "career-backend" /min cmd /c "node backend\dist\main.js > backend\backend.out.log 2>&1"
) else (
  echo Backend already running on :3000
)

REM --- 管理后台 :8081 ---
netstat -ano | findstr /r ":8081 " >nul
if errorlevel 1 (
  echo Starting admin server (serve-admin.cjs)...
  start "career-admin" /min cmd /c "node serve-admin.cjs > admin.out.log 2>&1"
) else (
  echo Admin already running on :8081
)

timeout /t 5 >nul
echo.
echo Done. Open:  http://localhost:8081
echo Login:  admin / admin123
echo.
pause
