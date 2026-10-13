@echo off
title EV Charge Hub - Automated Test Suite Runner
echo ========================================================
echo     EV Charge Hub - Automated Full Test Suite Runner
echo ========================================================
echo.
echo [1/3] Checking pytest installation...
python -m pytest --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pytest not found! Please ensure Python and pytest are installed.
    pause
    exit /b 1
)

echo [2/3] Running all 52 Selenium Automated Tests...
echo (Tests are running across all 11 modules...)
echo.
python -m pytest %*

echo.
echo [3/3] Execution completed! Opening HTML Evaluation Report...
if exist "reports\test_report.html" (
    start "" "reports\test_report.html"
) else (
    echo Report generated in reports directory.
)
echo ========================================================
pause
