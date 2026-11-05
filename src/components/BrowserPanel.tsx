import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ExternalLink,
  Plus,
  X,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Bot,
  Flame,
  Lock,
  Copy,
  Check,
  ArrowUpRight,
  Terminal,
} from 'lucide-react';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  partition: string;
}

const DEFAULT_TABS: BrowserTab[] = [
  {
    id: 'deepseek',
    title: 'DeepSeek Chat',
    url: 'https://chat.deepseek.com',
    partition: 'persist:chat-deepseek',
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
    partition: 'persist:chat-chatgpt',
  },
  {
    id: 'claude',
    title: 'Claude',
    url: 'https://claude.ai',
    partition: 'persist:chat-claude',
  },
  {
    id: 'fichi',
    title: 'Fichi AI',
    url: 'https://fichi.ai',
    partition: 'persist:chat-fichi',
  },
];

const PRESET_BOOKMARKS = [
  { name: 'DeepSeek Chat', url: 'https://chat.deepseek.com', icon: Sparkles, id: 'deepseek' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: Bot, id: 'chatgpt' },
  { name: 'Claude', url: 'https://claude.ai', icon: Sparkles, id: 'claude' },
  { name: 'Fichi AI', url: 'https://fichi.ai', icon: Flame, id: 'fichi' },
  { name: 'NexusMods Skyrim LE', url: 'https://www.nexusmods.com/skyrim', icon: Globe, id: 'nexus' },
  { name: 'Unity Learn', url: 'https://learn.unity.com', icon: Globe, id: 'unity' },
];

export interface BrowserPanelProps {
  onSendToOrchestrator?: (goal: string) => void;
  onOpenManualTool?: (tool: string, args: Record<string, unknown>) => void;
}

export const BrowserPanel: React.FC<BrowserPanelProps> = ({
  onSendToOrchestrator,
  onOpenManualTool,
}) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    try {
      const saved = localStorage.getItem('mcp_browser_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mcp_browser_active');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'deepseek';
  });

  const [inputUrl, setInputUrl] = useState<string>('https://chat.deepseek.com');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTabUrl, setNewTabUrl] = useState<string>('');
  const [newTabTitle, setNewTabTitle] = useState<string>('');
  const [extractModalOpen, setExtractModalOpen] = useState<boolean>(false);
  const [rawResponseText, setRawResponseText] = useState<string>('');

  useEffect(() => {
    const electronDetected = Boolean(
      (window as any).mcpStudio?.isElectron ||
      (window as any).isElectron ||
      (window as any).electronBridge ||
      navigator.userAgent.toLowerCase().includes('electron')
    );
    setIsElectron(electronDetected);
  }, []);

  // Sync tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mcp_browser_tabs', JSON.stringify(tabs));
    } catch {
      // ignore
    }
  }, [tabs]);

  // Sync activeTabId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mcp_browser_active', activeTabId);
    } catch {
      // ignore
    }
  }, [activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || DEFAULT_TABS[0];

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
    }
  }, [activeTabId, activeTab]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setTabs(prev =>
      prev.map(t =>
        t.id === activeTabId
          ? { ...t, url, title: url.replace(/^https?:\/\//i, '').split('/')[0] }
          : t
      )
    );
    setInputUrl(url);
  };

  const handleOpenPreset = (name: string, url: string, id: string) => {
    const existing = tabs.find(t => t.id === id || t.url === url);
    if (existing) {
      setActiveTabId(existing.id);
      setInputUrl(existing.url);
      return;
    }
    const newTab: BrowserTab = {
      id,
      title: name,
      url,
      partition: `persist:chat-${id}`,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInputUrl(url);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[0].id);
      setInputUrl(nextTabs[0].url);
    }
  };

  const handleAddCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    let url = newTabUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const id = 'custom_' + Date.now().toString(36);
    const title = newTabTitle.trim() || url.replace(/^https?:\/\//i, '').split('/')[0];
    const newTab: BrowserTab = {
      id,
      title,
      url,
      partition: `persist:chat-${id}`,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setInputUrl(url);
    setNewTabUrl('');
    setNewTabTitle('');
    setShowAddModal(false);
  };

  const handleOpenExternal = () => {
    if (activeTab?.url) {
      window.open(activeTab.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Task 3.4: Копирование системного промпта для внешних чат-моделей
  const handleCopySystemPrompt = () => {
    const prompt = `Ты работаешь в среде MCP Universal Studio через автономный мост winremote-mcp (JSON-RPC 2.0).
Твоя цель — помогать оператору в управлении системой, программировании и игровом моддинге.

Доступные инструменты:
1. Shell: { command: "PowerShell или cmd команда для выполнения в Windows / WSL2" }
2. FileWrite: { path: "относительный путь в workspace (например: hello.py)", content: "текст файла" }
3. FileRead: { path: "относительный путь к файлу для чтения" }
4. FileList: { path: "workspace" }
5. ListProcesses: {}

ИНСТРУКЦИЯ ПО ВЫЗОВУ:
Когда тебе нужно совершить действие (создать файл, запустить тест, проверить статус), ответь в формате чистого JSON-блока:
\`\`\`json
{
  "tool": "FileWrite",
  "args": {
    "path": "hello.py",
    "content": "print('Hello from MCP')"
  }
}
\`\`\`
После ответа оператор выполнит инструмент в 1 клик через студию.`;

    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Task 3.4: Парсинг и отправка ответа модели в ManualMCPPanel или DAG
  const handleProcessModelResponse = () => {
    if (!rawResponseText.trim()) return;
    try {
      // Ищем JSON блок { "tool": ..., "args": ... }
      const jsonMatch = rawResponseText.match(/\{[\s\S]*"tool"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tool && onOpenManualTool) {
          onOpenManualTool(parsed.tool, parsed.args || {});
          setExtractModalOpen(false);
          setRawResponseText('');
          return;
        }
      }
    } catch {
      // fallback to orchestrator goal
    }

    if (onSendToOrchestrator) {
      onSendToOrchestrator(rawResponseText.trim());
      setExtractModalOpen(false);
      setRawResponseText('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden text-[#c9d1d9] relative">
      {/* Tab bar (Task 3.1) */}
      <div className="bg-[#161b22] border-b border-[#30363d] flex items-center px-2 pt-2 gap-1 overflow-x-auto select-none shrink-0">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setInputUrl(tab.url);
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer border-t border-x transition-colors max-w-[200px] truncate ${
                isActive
                  ? 'bg-[#0d1117] border-[#30363d] text-white border-b-transparent shadow-sm'
                  : 'bg-[#161b22] border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-[#8b949e]'}`} />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 rounded p-0.5 transition-opacity"
                  title="Закрыть вкладку"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setShowAddModal(true)}
          className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
          title="Добавить вкладку"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation & Address Bar */}
      <div className="bg-[#161b22] border-b border-[#30363d] p-2 flex items-center gap-2 shrink-0">
        <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="Введите URL (например: https://chat.deepseek.com)..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Перейти</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          onClick={handleOpenExternal}
          className="px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363d]"
          title="Открыть в браузере по умолчанию"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">В браузере</span>
        </button>

        {/* Task 3.4: Кнопка Скопировать системный промпт */}
        <button
          onClick={handleCopySystemPrompt}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-700/50"
          title="Скопировать системный промпт с описанием MCP-инструментов для передачи в чат"
        >
          {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="hidden md:inline">{copiedPrompt ? 'Скопировано!' : 'Промпт для чата'}</span>
        </button>

        {/* Task 3.4: Кнопка Отправить ответ модели в MCP */}
        <button
          onClick={() => setExtractModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-700/50"
          title="Вставить ответ модели или JSON-вызов инструмента"
        >
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden lg:inline">Ответ в MCP</span>
        </button>
      </div>

      {/* Quick Bookmark presets */}
      <div className="bg-[#161b22]/70 border-b border-[#30363d] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        <span className="text-[11px] text-[#8b949e] shrink-0">Закладки:</span>
        {PRESET_BOOKMARKS.map(b => {
          const Icon = b.icon;
          return (
            <button
              key={b.name}
              onClick={() => handleOpenPreset(b.name, b.url, b.id)}
              className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-[11px] text-[#c9d1d9] hover:text-white flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              <Icon className="w-3 h-3 text-blue-400" />
              <span>{b.name}</span>
            </button>
          );
        })}
      </div>

      {/* Non-Electron Banner notice */}
      {!isElectron && (
        <div className="bg-amber-950/20 border-b border-amber-800/30 px-3 py-1.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px]">
              <strong>Режим веб-превью:</strong> сайты с защитой Cloudflare / CSP (DeepSeek, ChatGPT) блокируют встраивание в iframe. В десктопном приложении <strong>Electron EXE</strong> используется нативный <code>&lt;webview&gt;</code> без блокировок.
            </span>
          </div>
          <button
            onClick={handleOpenExternal}
            className="px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-[11px] text-amber-200 border border-amber-700/50 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Открыть во внешнем окне</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Webview / Iframe Views: Keep all tabs alive in DOM (Task 3.3) */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-[#0d1117]">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;

          if (isElectron) {
            // Task 3.1: В Electron рендерится нативный <webview> с изолированным partition
            return (
              <div
                key={tab.id}
                style={{
                  display: isActive ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                }}
                className="w-full h-full"
              >
                <webview
                  src={tab.url}
                  partition={tab.partition}
                  allowpopups={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            );
          }

          // В веб-превью (iframe)
          if (!isActive) return null;

          return (
            <div key={tab.id} className="w-full h-full flex flex-col">
              <iframe
                src={tab.url}
                title={tab.title}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                className="w-full flex-1 border-0"
              />
            </div>
          );
        })}
      </div>

      {/* Modal: Добавить вкладку */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Добавить новую вкладку</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8b949e] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTab} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">
                  Название вкладки
                </label>
                <input
                  type="text"
                  value={newTabTitle}
                  onChange={e => setNewTabTitle(e.target.value)}
                  placeholder="Например: Claude Sonnet или Nexus"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">
                  URL адрес *
                </label>
                <input
                  type="text"
                  required
                  value={newTabUrl}
                  onChange={e => setNewTabUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] text-xs font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-medium cursor-pointer"
                >
                  Открыть вкладку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Отправить ответ модели в MCP */}
      {extractModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>Отправить ответ модели в MCP Studio</span>
              </h3>
              <button
                onClick={() => setExtractModalOpen(false)}
                className="text-[#8b949e] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8b949e]">
              Вставьте сюда скопированный ответ от DeepSeek, ChatGPT или Claude (включая блок JSON или текстовую цель). Студия автоматически извлечет вызов инструмента или передаст задачу в оркестратор.
            </p>

            <textarea
              rows={6}
              value={rawResponseText}
              onChange={e => setRawResponseText(e.target.value)}
              placeholder='Вставьте текст ответа (например: { "tool": "Shell", "args": { "command": "Get-Date" } })...'
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white placeholder-[#8b949e] font-mono focus:outline-none focus:border-purple-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtractModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] text-xs font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleProcessModelResponse}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Выполнить в Студии</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
