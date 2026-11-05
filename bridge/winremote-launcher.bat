@echo off
chcp 65001 >nul
title WinRemote MCP Server Launcher (Port 8090)

echo Запуск winremote-mcp.exe с поддержкой Streamable HTTP на http://127.0.0.1:8090/mcp...
if exist "%~dp0winremote-mcp.exe" (
    "%~dp0winremote-mcp.exe" --enable-all --host 127.0.0.1 --port 8090
) else (
    echo [ОШИБКА] Файл winremote-mcp.exe не найден в папке bridge!
    echo Скачайте исполняемый файл winremote-mcp и поместите в: %~dp0
    pause
)
