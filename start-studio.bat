@echo off
chcp 65001 >nul
title MCP Universal Studio v2 — Запуск

echo ========================================================
echo   MCP Universal Studio v2 — Запуск системы
echo ========================================================
echo.

:: 1. Проверяем или запускаем локальный мост winremote-mcp
echo [1/2] Проверка winremote-mcp на порту 8090...
curl -s -X POST http://127.0.0.1:8090/mcp -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}" >nul 2>nul
if %errorlevel% neq 0 (
    if exist "bridge\winremote-mcp.exe" (
        echo Запуск службы winremote-mcp в фоне...
        start "" /B "bridge\winremote-mcp.exe" --enable-all --host 127.0.0.1 --port 8090
        timeout /t 2 /nobreak >nul
    ) else (
        echo [Предупреждение] bridge\winremote-mcp.exe не найден. Запустите winremote вручную или используйте встроенную песочницу.
    )
) else (
    echo Служба winremote-mcp уже активна.
)

:: 2. Запуск приложения в Electron или браузере
echo [2/2] Запуск MCP Universal Studio...
if exist "release\win-unpacked\MCP Universal Studio.exe" (
    start "" "release\win-unpacked\MCP Universal Studio.exe"
) else (
    start http://localhost:3000
    npm run dev
)
