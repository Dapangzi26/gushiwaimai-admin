@echo off
title Gushi Admin Dashboard
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please install Node.js and add it to PATH.
    pause
    exit /b 1
)

set "APP_URL=http://localhost:5190/"

rem If the dev server is already running, just open the browser.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5190); if ($client.Connected) { exit 0 } else { exit 1 } } catch { exit 1 } finally { if ($client) { $client.Dispose() } }"
if not errorlevel 1 (
    echo Detected existing server on %APP_URL%
    start "" "%APP_URL%"
    exit /b 0
)

echo Starting Gushi Admin Dashboard...
echo URL: %APP_URL%
echo.

npm run dev -- --host 0.0.0.0 --port 5190
pause
