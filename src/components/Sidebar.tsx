import React, { useState } from 'react';
import {
  Target,
  Terminal,
  FolderCode,
  Sparkles,
  Layers,
  BookOpen,
  Gamepad2,
  Cpu,
  Globe,
  Package,
  ChevronDown,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';

export type TabId =
  | 'orchestrator'
  | 'browser'
  | 'manual'
  | 'files'
  | 'models'
  | 'packaging'
  | 'guide'
  | 'game'
  | 'gamedev'
  | 'opencode'
  | 'gemini';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeTasksCount: number;
  filesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeTasksCount,
  filesCount,
}) => {
  const [isExperimentalOpen, setIsExperimentalOpen] = useState<boolean>(false);

  const mainTabs = [
    {
      id: 'orchestrator' as TabId,
      label: 'Оркестратор',
      icon: Target,
      badge: activeTasksCount > 0 ? `${activeTasksCount}` : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    },
    {
      id: 'browser' as TabId,
      label: 'Браузер',
      icon: Globe,
      badge: 'Webview',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      shortcut: 'Alt+O',
    },
    {
      id: 'manual' as TabId,
      label: 'Ручной тест MCP',
      icon: Terminal,
    },
    {
      id: 'files' as TabId,
      label: 'Файлы Workspace',
      icon: FolderCode,
      badge: `${filesCount}`,
      badgeColor: 'bg-gray-700/40 text-gray-300',
    },
    {
      id: 'models' as TabId,
      label: 'Пул моделей',
      icon: Layers,
    },
    {
      id: 'packaging' as TabId,
      label: 'Упаковка в Windows EXE',
      icon: Package,
      badge: 'Portable',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'guide' as TabId,
      label: 'Инструкция под ключ',
      icon: BookOpen,
    },
  ];

  const experimentalTabs = [
    {
      id: 'gamedev' as TabId,
      label: 'GameDev & Skyrim MCP',
      icon: Gamepad2,
      badge: 'Demo',
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    },
    {
      id: 'opencode' as TabId,
      label: 'OpenCode Сессии',
      icon: Cpu,
      badge: 'Coming Soon',
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    },
    {
      id: 'gemini' as TabId,
      label: 'Gemini AI Hub',
      icon: Sparkles,
      badge: 'Demo',
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    },
    {
      id: 'game' as TabId,
      label: '3D Кибер-Арена',
      icon: Gamepad2,
      badge: 'Demo',
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    },
  ];

  return (
    <aside className="w-60 bg-[#161b22] border-r border-[#30363d] flex flex-col justify-between p-3 select-none shrink-0 overflow-y-auto">
      <div className="space-y-4">
        {/* Рабочий функционал (Основные разделы) */}
        <div>
          <div className="text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase px-2 mb-2">
            Рабочее пространство
          </div>
          <div className="space-y-1">
            {mainTabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTab(t.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#1f6feb] text-white shadow-sm'
                      : 'text-[#c9d1d9] hover:bg-[#21262d] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8b949e]'}`} />
                    <span className="truncate">{t.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.shortcut && !t.badge && (
                      <span className="text-[10px] text-blue-400 font-mono">{t.shortcut}</span>
                    )}
                    {t.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : t.badgeColor}`}>
                        {t.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task 4.2: Сворачиваемый раздел «Экспериментальное» */}
        <div className="pt-2 border-t border-[#30363d]">
          <button
            onClick={() => setIsExperimentalOpen(prev => !prev)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-[#8b949e] hover:text-[#c9d1d9] tracking-wider uppercase px-2 py-1.5 rounded transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>Экспериментальное</span>
            </div>
            {isExperimentalOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {isExperimentalOpen && (
            <div className="space-y-1 mt-1 pl-1">
              {experimentalTabs.map(t => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTab(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#21262d] text-white border border-[#30363d]'
                        : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-[#8b949e]'}`} />
                      <span className="truncate">{t.label}</span>
                    </div>
                    {t.badge && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono shrink-0 ${t.badgeColor}`}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[#30363d] text-[11px] text-[#8b949e] space-y-1 px-1">
        <div className="flex items-center justify-between">
          <span>Протокол MCP:</span>
          <span className="font-mono text-emerald-400">2024-11-05</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Транспорт:</span>
          <span className="text-[#c9d1d9]">IPC / 8090 SSE</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Сборка:</span>
          <span className="text-purple-400 font-mono">Electron EXE</span>
        </div>
      </div>
    </aside>
  );
};
