@echo off
REM Start Course Allocation System - Backend and Frontend Servers
REM This script starts both the backend and frontend servers automatically

echo.
echo ========================================
echo  Course Allocation System
echo ========================================
echo.

REM Get the script directory to ensure we're in the right location
cd /d "%~dp0"

REM Check if backend directory exists
if not exist "backend\" (
    echo ERROR: Backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "frontend\" (
    echo ERROR: Frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Starting Backend Server...
start "Backend Server" powershell -NoExit -Command "cd '%cd%\backend'; npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" powershell -NoExit -Command "cd '%cd%\frontend'; npm start"

echo.
echo ========================================
echo  Servers are starting...
echo ========================================
echo.
echo Backend Server:  http://localhost:5000
echo Frontend Server: http://localhost:3000
echo.
echo Both servers are running in separate windows.
echo You can close this window - the servers will continue running.
echo.
pause
