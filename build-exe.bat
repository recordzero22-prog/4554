@echo off
chcp 65001 >nul
title Сборка Windows Portable EXE — MCP Universal Studio
color 0b

echo ===============================================================================
echo   MCP Universal Studio — Сборка автономного десктопного приложения Windows EXE
echo ===============================================================================
echo.

echo [1/3] Проверка окружения Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в PATH! Пожалуйста, установите Node.js 18+ с https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [2/3] Компиляция клиентского бандла Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сбой компиляции Vite build!
    pause
    exit /b 1
)

echo.
echo [3/3] Упаковка в Windows Portable EXE через electron-builder...
call npx --yes electron-builder --config electron-builder.json
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сбой сборки electron-builder!
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo   УСПЕХ! Автономный исполняемый файл готов:
echo   dist-electron\MCP Universal Studio.exe
echo ===============================================================================
echo.
pause
