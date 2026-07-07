@echo off
echo ==========================================
echo   Security Agency Software Updater
echo   Manual Fallback Script
echo ==========================================
echo.

:: Set your application name (must match the exe name from electron-builder)
set APP_NAME=Security Firm Management
set EXE_NAME=Security Firm Management.exe

:: Set paths
set INSTALL_DIR=%LOCALAPPDATA%\Programs\security-firm-management
set UPDATES_DIR=%~dp0Updates

:: 1. Check if a new update file exists
if not exist "%UPDATES_DIR%\%EXE_NAME%" (
    echo [ERROR] No new update found in the Updates folder!
    echo.
    echo Please place the new "%EXE_NAME%" file inside:
    echo   %UPDATES_DIR%
    echo.
    pause
    exit /b 1
)

echo [1/4] Stopping the current application...
taskkill /IM "%EXE_NAME%" /F >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/4] Backing up current version...
if exist "%INSTALL_DIR%\%EXE_NAME%" (
    copy /Y "%INSTALL_DIR%\%EXE_NAME%" "%INSTALL_DIR%\%EXE_NAME%.backup" >nul 2>&1
)

echo [3/4] Installing the new update...
copy /Y "%UPDATES_DIR%\%EXE_NAME%" "%INSTALL_DIR%\%EXE_NAME%"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy the new file. Restoring backup...
    if exist "%INSTALL_DIR%\%EXE_NAME%.backup" (
        copy /Y "%INSTALL_DIR%\%EXE_NAME%.backup" "%INSTALL_DIR%\%EXE_NAME%" >nul 2>&1
    )
    pause
    exit /b 1
)

echo [4/4] Cleaning up and starting the updated application...
del "%UPDATES_DIR%\%EXE_NAME%" >nul 2>&1
del "%INSTALL_DIR%\%EXE_NAME%.backup" >nul 2>&1

start "" "%INSTALL_DIR%\%EXE_NAME%"

echo.
echo =============================================
echo   Update Complete! You can close this window.
echo =============================================
timeout /t 5 /nobreak >nul
