@echo off
chcp 65001 >nul
title MCP Universal Studio - Быстрый установщик и запуск
color 0b

echo ===============================================================================
echo        MCP Universal Studio v2.0 - Мастер проверки и запуска
echo ===============================================================================
echo.

set WINREMOTE_EXE=bridge\winremote-mcp.exe

if exist "%WINREMOTE_EXE%" (
    echo [OK] Найден исполняемый файл winremote-mcp.exe в папке bridge\.
) else (
    echo [ВНИМАНИЕ] Файл bridge\winremote-mcp.exe не найден в локальной папке.
    echo Если у вас уже запущен winremote-mcp на порту 8090, студия подключится автоматически.
    echo.
)

echo [1/3] Проверка сборки десктопного приложения...
if not exist "dist-electron\MCP Universal Studio.exe" (
    echo [ИНФО] Portable EXE еще не собран. Запуск компиляции через build-exe.bat...
    call build-exe.bat
) else (
    echo [OK] Найден собранный dist-electron\MCP Universal Studio.exe
)

echo.
echo [2/3] Запуск MCP-сервера winremote на порту 8090...
if exist "%WINREMOTE_EXE%" (
    start "winremote-mcp (Background Engine)" /min "%WINREMOTE_EXE%" --port 8090
)

echo.
echo [3/3] Запуск MCP Universal Studio...
if exist "dist-electron\MCP Universal Studio.exe" (
    start "" "dist-electron\MCP Universal Studio.exe"
) else (
    echo Запуск в режиме разработки Electron...
    npm run electron:dev
)

echo.
echo ===============================================================================
echo        Студия успешно запущена!
echo ===============================================================================
pause
