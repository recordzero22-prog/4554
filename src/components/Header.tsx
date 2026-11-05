import React from 'react';
import { Play, ShieldAlert, Cpu, HardDrive, Network, CheckCircle2, Database } from 'lucide-react';

interface HeaderProps {
  activeTasksCount: number;
  hitlCount: number;
  onQuickRunValidation: () => void;
  isExecuting: boolean;
  mcpServerStatus: 'connected' | 'reconnecting' | 'idle';
}

export const Header: React.FC<HeaderProps> = ({
  activeTasksCount,
  hitlCount,
  onQuickRunValidation,
  isExecuting,
  mcpServerStatus,
}) => {
  return (
    <header className="h-14 bg-[#161b22] border-b border-[#30363d] px-4 flex items-center justify-between select-none shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
          ⚡
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide">
              MCP Universal Studio <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40">v2.0</span>
            </h1>
            <span className="text-xs text-[#8b949e] font-normal hidden sm:inline">— Legendary Orchestrator</span>
          </div>
          <p className="text-[11px] text-[#8b949e]">Autonomous Multi-Agent DAG & winremote-mcp Engine</p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 text-xs">
        {/* winremote-mcp status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            mcpServerStatus === 'connected'
              ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400'
              : 'bg-amber-950/40 border-amber-700/50 text-amber-400'
          }`}
          title="winremote-mcp JSON-RPC 2.0 streamable endpoint"
        >
          <Network className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">winremote:8090</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* Model Pool */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#21262d] border-[#30363d] text-[#c9d1d9]">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Pool: 4 Models</span>
        </div>

        {/* Workspace Sandbox */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#21262d] border-[#30363d] text-[#c9d1d9]">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span>/workspace</span>
        </div>

        {/* Persistence Status */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#21262d] border-[#30363d] text-[#c9d1d9]" title="Очередь задач сохраняется в localStorage и выдерживает перезагрузку страницы">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Storage: Persisted</span>
        </div>

        {/* HITL Alerts */}
        {hitlCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>HITL: {hitlCount} Требует действия</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-[#21262d] border-[#30363d] text-[#8b949e]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>HITL Guard: OK</span>
          </div>
        )}

        {/* Quick Launch Scenario 6 */}
        <button
          onClick={onQuickRunValidation}
          disabled={isExecuting}
          className="ml-2 flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-md shadow-sm transition-colors text-xs cursor-pointer"
          title="Запустить валидационный тест автономности из Шага 6 (hello.py + Shell execution)"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Тест Шаг 6</span>
        </button>
      </div>
    </header>
  );
};
