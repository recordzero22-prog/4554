import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Send,
  Plus,
  Play,
  FileCode2,
  Copy,
  CheckCircle2,
  RotateCcw,
  Server,
  Settings2,
} from 'lucide-react';
import {
  OpenCodeSession,
  DEFAULT_OPENCODE_MODELS,
  DEFAULT_OPENCODE_SERVERS,
  createOpenCodeSession,
  generateOpencodeJson,
  runOpencodeSessionPrompt,
} from '../core/opencodeBridge';

interface OpencodeBridgePanelProps {
  onSendToOrchestrator: (goal: string) => void;
  onSaveConfigFile?: (path: string, content: string) => void;
}

export const OpencodeBridgePanel: React.FC<OpencodeBridgePanelProps> = ({
  onSendToOrchestrator,
  onSaveConfigFile,
}) => {
  // Sessions state
  const [sessions, setSessions] = useState<OpenCodeSession[]>(() => [
    createOpenCodeSession(
      'Основная сессия (DeepSeek-R1)',
      'opencode/deepseek-r1',
      ['winremote', 'skyrim_modding', 'gamedev_blender']
    ),
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.sessionId || '');
  const [promptInput, setPromptInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('opencode/deepseek-r1');
  const [activeServers, setActiveServers] = useState<string[]>([
    'winremote',
    'skyrim_modding',
    'gamedev_blender',
  ]);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) || sessions[0];

  const handleCreateSession = () => {
    const name = newSessionName.trim() || `Сессия #${sessions.length + 1}`;
    const newSession = createOpenCodeSession(name, selectedModel, activeServers);
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.sessionId);
    setNewSessionName('');
  };

  const handleSendPrompt = async () => {
    if (!promptInput.trim() || isExecuting || !activeSession) return;
    const prompt = promptInput.trim();
    setPromptInput('');
    setIsExecuting(true);

    try {
      await runOpencodeSessionPrompt(activeSession, prompt, () => {
        // Trigger re-render of session logs
        setSessions((prev) => [...prev]);
      });
    } finally {
      setIsExecuting(false);
      setSessions((prev) => [...prev]);
    }
  };

  const handleDelegateToDAG = () => {
    if (!promptInput.trim() && !activeSession?.logs.length) return;
    const lastUserPrompt =
      promptInput.trim() ||
      [...activeSession.logs].reverse().find((l) => l.role === 'user')?.text ||
      'Автономная сборка игрового проекта';

    onSendToOrchestrator(`[OpenCode Session: ${activeSession.modelId}] ${lastUserPrompt}`);
  };

  const currentOpencodeJson = generateOpencodeJson(
    activeSession?.modelId || 'opencode/deepseek-r1',
    activeSession?.attachedServers || activeServers
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(currentOpencodeJson);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleSaveToWorkspace = () => {
    if (onSaveConfigFile) {
      onSaveConfigFile('opencode.json', currentOpencodeJson);
    }
  };

  const toggleServer = (serverKey: string) => {
    setActiveServers((prev) =>
      prev.includes(serverKey) ? prev.filter((s) => s !== serverKey) : [...prev, serverKey]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden text-[#c9d1d9]">
      {/* Header Bar */}
      <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Интеграция с OpenCode CLI & Оркестром
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                Demo / Coming Soon
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                opencode.json v1.2.0
              </span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              Управление активными сессиями OpenCode, моделями (DeepSeek-R1 / Claude 3.7 / Qwen 2.5) и транспортом MCP-серверов
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363d]"
          >
            <Settings2 className="w-3.5 h-3.5 text-blue-400" />
            {showConfigModal ? 'Скрыть opencode.json' : 'Просмотр opencode.json'}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Sessions & Configuration */}
        <div className="w-80 border-r border-[#30363d] bg-[#161b22]/50 flex flex-col p-3 space-y-4 overflow-y-auto shrink-0">
          {/* New Session Box */}
          <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2.5">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
              Новая сессия OpenCode
            </span>
            <input
              type="text"
              placeholder="Имя сессии (например: Skyrim Modder)..."
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500"
            />

            <div>
              <label className="block text-[11px] text-[#8b949e] mb-1">Выбор модели OpenCode:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {DEFAULT_OPENCODE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isFree ? '(Бесплатно)' : m.isLocal ? '(Local)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateSession}
              className="w-full py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Создать сессию
            </button>
          </div>

          {/* Attached MCP Servers for session */}
          <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                MCP Серверы OpenCode
              </span>
              <Server className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="space-y-1.5 pt-1">
              {Object.entries(DEFAULT_OPENCODE_SERVERS).map(([key, s]) => {
                const isActive = activeServers.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleServer(key)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-500/10 border-blue-500/40 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-medium">{key}</div>
                      <div className="text-[10px] text-[#8b949e]">{s.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => {}}
                      className="rounded border-[#30363d] text-blue-500 bg-[#0d1117] h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Sessions List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider px-1 block">
              Активные сессии ({sessions.length})
            </span>
            {sessions.map((s) => {
              const isCurrent = s.sessionId === activeSessionId;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => setActiveSessionId(s.sessionId)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#1f6feb]/20 border-[#1f6feb] text-white'
                      : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50 text-[#c9d1d9]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs truncate max-w-[170px]">{s.name}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        s.status === 'running'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-[#8b949e] truncate">{s.modelId}</div>
                  <div className="flex items-center justify-between text-[10px] text-[#8b949e] mt-1">
                    <span>Реплик: {s.logs.length}</span>
                    <span>Активность: {s.lastActive}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Chat & Session Stream / opencode.json viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
          {showConfigModal ? (
            /* opencode.json Full Configuration Viewer */
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-400" />
                    Файл конфигурации opencode.json
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Используется CLI OpenCode для обнаружения и вызова MCP-серверов в рабочей директории
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] flex items-center gap-1.5 border border-[#30363d] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedConfig ? 'Скопировано!' : 'Копировать JSON'}
                  </button>
                  <button
                    onClick={handleSaveToWorkspace}
                    className="px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Сохранить в Workspace
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre leading-relaxed">
                {currentOpencodeJson}
              </pre>
            </div>
          ) : (
            /* Session Chat Interaction */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active Session Status Bar */}
              <div className="px-4 py-2.5 bg-[#161b22]/70 border-b border-[#30363d] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#8b949e]">Сессия:</span>
                  <span className="text-white font-semibold">{activeSession?.name}</span>
                  <span className="text-[#8b949e]">|</span>
                  <span className="text-blue-400">{activeSession?.modelId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8b949e]">Серверы:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-emerald-400">
                    {activeSession?.attachedServers.join(', ') || 'нет'}
                  </span>
                </div>
              </div>

              {/* Message / Logs Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {activeSession?.logs.map((log, idx) => {
                  let roleColor = 'text-blue-400 border-blue-500/30 bg-blue-500/10';
                  let roleLabel = 'USER';
                  if (log.role === 'assistant') {
                    roleColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
                    roleLabel = 'OPENCODE';
                  } else if (log.role === 'tool') {
                    roleColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
                    roleLabel = 'MCP TOOL';
                  } else if (log.role === 'system') {
                    roleColor = 'text-purple-400 border-purple-500/30 bg-purple-500/10';
                    roleLabel = 'SYSTEM';
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roleColor}`}
                        >
                          {roleLabel}
                        </span>
                        <span className="text-[10px] text-[#8b949e]">{log.timestamp}</span>
                      </div>
                      <div className="text-[#c9d1d9] leading-relaxed whitespace-pre-wrap font-sans text-xs">
                        {log.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-[#30363d] bg-[#161b22] space-y-2">
                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    value={promptInput}
                    disabled={isExecuting}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPrompt();
                      }
                    }}
                    placeholder={`Введите задачу для ${activeSession?.modelId} (например: Проверь NIF модель Skyrim и сгенерируй скрипт в Blender)...`}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleSendPrompt}
                      disabled={isExecuting || !promptInput.trim()}
                      className="px-4 py-2 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Отправить
                    </button>
                    <button
                      onClick={handleDelegateToDAG}
                      className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#30363d]"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      В Оркестратор
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                  <span>Enter — отправить запрос, Shift+Enter — новая строка</span>
                  <span className="font-mono text-emerald-400">
                    Транспорт: JSON-RPC 2.0 / stdio / HTTP 8090
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
