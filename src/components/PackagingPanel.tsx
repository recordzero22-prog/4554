import React, { useState } from 'react';
import {
  Package,
  CheckCircle2,
  Download,
  Copy,
  Terminal,
  FileCode2,
  Play,
  Monitor,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Gamepad2,
  FolderArchive,
  ArrowRight,
} from 'lucide-react';

export const PackagingPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'build_bat' | 'config' | 'main_js'>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildBatContent = `@echo off
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
echo   dist-electron\\MCP Universal Studio.exe
echo ===============================================================================
echo.
pause`;

  const builderConfigContent = `{
  "appId": "com.mcpstudio.app",
  "productName": "MCP Universal Studio",
  "directories": {
    "output": "dist-electron"
  },
  "win": {
    "target": "portable",
    "icon": "build/icon.ico"
  },
  "files": [
    "main.js",
    "preload.js",
    "webview-preload.js",
    "dist/**/*",
    "package.json"
  ],
  "extraResources": []
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-y-auto p-5 text-[#c9d1d9] space-y-5">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Упаковка в красивый и удобный Windows EXE
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                Portable & NSIS Installer
              </span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              Генерация десктопного приложения Electron с поддержкой нативного &lt;webview&gt;, встроенным мостом winremote-mcp и ярлыком на рабочем столе
            </p>
          </div>
        </div>

        <button
          onClick={() => copyToClipboard('call build-exe.bat', 'quick-cmd')}
          className="px-3.5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Play className="w-3.5 h-3.5" />
          {copiedId === 'quick-cmd' ? 'Команда скопирована!' : 'Запустить build-exe.bat'}
        </button>
      </div>

      {/* Target Executables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Portable EXE */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Портативный EXE (Portable)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Zero Install
            </span>
          </div>

          <p className="text-xs text-[#8b949e] leading-relaxed">
            Автономный одиночный исполняемый файл <strong>MCP_Universal_Studio_Portable.exe</strong>. Запускается на любой Windows 10/11 x64 с флешки или рабочего стола без прав администратора.
          </p>

          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono space-y-1 text-[#8b949e]">
            <div className="text-white">.\release\MCP_Universal_Studio_Portable.exe</div>
            <div className="text-[11px] text-emerald-400">✓ Не оставляет следов в реестре</div>
            <div className="text-[11px] text-emerald-400">✓ Все зависимости и рантайм упакованы внутри</div>
          </div>
        </div>

        {/* Card 2: NSIS Installer */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Удобный инсталлятор (NSIS Setup)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Installer
            </span>
          </div>

          <p className="text-xs text-[#8b949e] leading-relaxed">
            Полноценный инсталлятор <strong>MCP Universal Studio Setup.exe</strong>. Создает ярлык на рабочем столе (<code className="text-white">MCP Universal Studio.lnk</code>) и интегрируется в меню «Пуск».
          </p>

          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono space-y-1 text-[#8b949e]">
            <div className="text-white">.\release\MCP Universal Studio Setup.exe</div>
            <div className="text-[11px] text-emerald-400">✓ Мастер установки с выбором директории</div>
            <div className="text-[11px] text-emerald-400">✓ Автоматическое создание ярлыков на Desktop и Start Menu</div>
          </div>
        </div>
      </div>

      {/* Checklist of Desktop Capabilities */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Преимущества собранного десктопного EXE перед браузерной версией
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Нативный &lt;webview&gt; без CSP блокировок
            </div>
            <p className="text-[11px] text-[#8b949e]">
              В Electron чаты с антибот-защитой Cloudflare (DeepSeek, ChatGPT, Claude) работают напрямую без ошибки «Max challenge attempts exceeded».
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Прямой доступ к winremote-mcp и WSL2
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Вызовы PowerShell, системных служб, создание файлов в реальной файловой системе Windows без ограничений песочницы браузера.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Автозапуск фонового MCP-моста на 8090
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Electron автоматически проверяет доступность порта 8090 и при необходимости запускает <code>bridge/winremote-mcp.exe</code> в скрытом фоновом режиме.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Полная интеграция GameDev & Skyrim LE
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Моддинг NIF v20.2.0.7, компиляция Papyrus PSC ➔ PEX, headless Blender bpy, Unity и Godot работают с прямым доступом к игровым директориям.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs for scripts & configs */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'overview' ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:bg-[#21262d]'
              }`}
            >
              Инструкция по сборке в 1 клик
            </button>
            <button
              onClick={() => setActiveTab('build_bat')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'build_bat' ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:bg-[#21262d]'
              }`}
            >
              build-exe.bat
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'config' ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:bg-[#21262d]'
              }`}
            >
              builder-config.json
            </button>
          </div>

          {activeTab === 'build_bat' && (
            <button
              onClick={() => copyToClipboard(buildBatContent, 'bat')}
              className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] flex items-center gap-1 border border-[#30363d] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedId === 'bat' ? 'Скопировано!' : 'Копировать .bat'}
            </button>
          )}

          {activeTab === 'config' && (
            <button
              onClick={() => copyToClipboard(builderConfigContent, 'json')}
              className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] flex items-center gap-1 border border-[#30363d] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedId === 'json' ? 'Скопировано!' : 'Копировать JSON'}
            </button>
          )}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
              <span className="font-semibold text-white block">Как собрать EXE на вашем компьютере (Windows):</span>
              <ol className="list-decimal list-inside space-y-1.5 text-[#8b949e]">
                <li>
                  Откройте папку проекта <code className="text-white font-mono bg-[#161b22] px-1 py-0.5 rounded">C:\Users\ВЕРА\Desktop\4554</code>.
                </li>
                <li>
                  Дважды кликните по файлу <strong className="text-emerald-400 font-mono">build-exe.bat</strong>.
                </li>
                <li>
                  Скрипт автоматически выполнит <code className="text-blue-300 font-mono">npm run build</code> и вызовет <code className="text-blue-300 font-mono">electron-builder</code>.
                </li>
                <li>
                  В появившейся папке <strong className="text-white font-mono">release\</strong> будут готовы два исполняемых файла:
                  <ul className="list-disc list-inside ml-4 mt-1 text-white">
                    <li><strong className="text-blue-400 font-mono">MCP_Universal_Studio_Portable.exe</strong> — готов к мгновенному запуску без установки.</li>
                    <li><strong className="text-emerald-400 font-mono">MCP Universal Studio Setup.exe</strong> — инсталлятор с ярлыком на рабочем столе.</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'build_bat' && (
          <pre className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
            {buildBatContent}
          </pre>
        )}

        {activeTab === 'config' && (
          <pre className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre leading-relaxed">
            {builderConfigContent}
          </pre>
        )}
      </div>
    </div>
  );
};
