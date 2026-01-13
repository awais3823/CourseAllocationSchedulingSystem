


@echo off
echo Starting Course Allocation System...
echo.

echo Starting Backend Server...
start "Backend Server" powershell -NoExit -Command "cd backend; npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" powershell -NoExit -Command "cd frontend; npm start"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause





