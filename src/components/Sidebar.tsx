import React from 'react';
import {
  Target,
  Terminal,
  FolderCode,
  Sparkles,
  Bot,
  Flame,
  Layers,
  BookOpen,
  Gamepad2,
  Cpu,
} from 'lucide-react';

export type TabId =
  | 'orchestrator'
  | 'game'
  | 'gamedev'
  | 'opencode'
  | 'gemini'
  | 'deepseek'
  | 'chatgpt'
  | 'fichi'
  | 'manual'
  | 'files'
  | 'models'
  | 'guide';

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
  const tabs = [
    {
      id: 'orchestrator' as TabId,
      label: 'Оркестратор',
      icon: Target,
      badge: activeTasksCount > 0 ? `${activeTasksCount}` : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      section: 'CORE',
    },
    {
      id: 'game' as TabId,
      label: '3D Кибер-Арена (Game)',
      icon: Gamepad2,
      badge: '3D PBR',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      section: 'CORE',
    },
    {
      id: 'gamedev' as TabId,
      label: 'GameDev & Skyrim MCP',
      icon: Gamepad2,
      badge: 'Skyrim/Unity',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      section: 'CORE',
    },
    {
      id: 'opencode' as TabId,
      label: 'OpenCode Сессии',
      icon: Cpu,
      badge: 'CLI Bridge',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      section: 'CORE',
    },
    {
      id: 'gemini' as TabId,
      label: 'Gemini AI Hub',
      icon: Sparkles,
      badge: 'Multimodal',
      badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      section: 'CORE',
    },
    {
      id: 'manual' as TabId,
      label: 'Ручной тест MCP',
      icon: Terminal,
      section: 'CORE',
    },
    {
      id: 'files' as TabId,
      label: 'Файлы Workspace',
      icon: FolderCode,
      badge: `${filesCount}`,
      badgeColor: 'bg-gray-700/40 text-gray-300',
      section: 'CORE',
    },
    {
      id: 'models' as TabId,
      label: 'Пул моделей & Каскад',
      icon: Layers,
      section: 'CORE',
    },
    {
      id: 'deepseek' as TabId,
      label: 'DeepSeek Chat',
      icon: Sparkles,
      section: 'WORKSPACES',
      note: 'Alt+O dispatch',
    },
    {
      id: 'chatgpt' as TabId,
      label: 'ChatGPT',
      icon: Bot,
      section: 'WORKSPACES',
      note: 'Alt+O dispatch',
    },
    {
      id: 'fichi' as TabId,
      label: 'Fichi AI',
      icon: Flame,
      section: 'WORKSPACES',
      note: 'Alt+O dispatch',
    },
    {
      id: 'guide' as TabId,
      label: 'Инструкция под ключ',
      icon: BookOpen,
      section: 'DOCS',
    },
  ];

  return (
    <aside className="w-60 bg-[#161b22] border-r border-[#30363d] flex flex-col justify-between p-3 select-none shrink-0 overflow-y-auto">
      <div className="space-y-4">
        {/* Section CORE */}
        <div>
          <div className="text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase px-2 mb-2">
            Система и Агенты
          </div>
          <div className="space-y-1">
            {tabs
              .filter(t => t.section === 'CORE')
              .map(t => {
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
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8b949e]'}`} />
                      <span>{t.label}</span>
                    </div>
                    {t.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : t.badgeColor}`}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Section WORKSPACES */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase px-2 mb-2">
            <span>Чат-пространства</span>
            <span className="text-[10px] text-blue-400 font-mono">Alt+O</span>
          </div>
          <div className="space-y-1">
            {tabs
              .filter(t => t.section === 'WORKSPACES')
              .map(t => {
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
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8b949e]'}`} />
                      <span>{t.label}</span>
                    </div>
                    {t.note && (
                      <span className="text-[10px] text-[#8b949e] font-mono opacity-80">
                        {t.note}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Section DOCS */}
        <div>
          <div className="text-[11px] font-semibold text-[#8b949e] tracking-wider uppercase px-2 mb-2">
            Документация
          </div>
          <div className="space-y-1">
            {tabs
              .filter(t => t.section === 'DOCS')
              .map(t => {
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
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8b949e]'}`} />
                      <span>{t.label}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[#30363d] text-[11px] text-[#8b949e] space-y-1 px-1">
        <div className="flex items-center justify-between">
          <span>Протокол MCP:</span>
          <span className="font-mono text-emerald-400">2024-11-05</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Изоляция:</span>
          <span className="text-[#c9d1d9]">Sandbox Context</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Watchdog:</span>
          <span className="text-emerald-400 font-mono">60s Active</span>
        </div>
      </div>
    </aside>
  );
};
