import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Flame,
  ArrowRight,
  Zap,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle,
  Code2,
  Terminal,
} from 'lucide-react';
import { generateAgentSystemBriefing, ROLE_PRESETS, extractTaskFromText } from '../core/agentSystemContext';

interface EmbeddedChatPanelProps {
  providerName: 'DeepSeek' | 'ChatGPT' | 'Fichi AI';
  onSendToOrchestrator: (goal: string) => void;
}

export const EmbeddedChatPanel: React.FC<EmbeddedChatPanelProps> = ({
  providerName,
  onSendToOrchestrator,
}) => {
  const [selectedRole, setSelectedRole] = useState<'architect' | 'developer' | 'sysadmin' | 'unity'>('architect');
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: `Здравствуйте! Я интерфейс ${providerName}. Поскольку здесь мы работаем без API-ключа, скопируйте системный контекст выше и отправьте мне в первом сообщении, чтобы я знал все доступные инструменты winremote-mcp и структуру папки workspace.`,
    },
    {
      sender: 'user',
      text: 'Мне нужен скрипт на Python для создания файла hello.py и проверки его работы через консоль PowerShell.',
    },
    {
      sender: 'bot',
      text: `Понял задачу! Выполняю в рамках MCP Universal Studio v2.\n\`\`\`mcp-task\nСоздай в папке workspace файл hello.py, который выводит "Hello from Autonomous MCP", запусти его через PowerShell и убедись, что нет ошибок.\n\`\`\``,
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [selectedText, setSelectedText] = useState('');

  const currentBriefing = generateAgentSystemBriefing({
    role: selectedRole,
  });

  const handleCopyBriefing = () => {
    navigator.clipboard.writeText(currentBriefing);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const userText = inputVal.trim();
    setInputVal('');

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userText },
      {
        sender: 'bot',
        text: `Принято! Вот инструкция для Оркестратора:\n\`\`\`mcp-task\n${extractTaskFromText(userText)}\n\`\`\``,
      },
    ]);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 5) {
      setSelectedText(sel);
    }
  };

  const providerIcons = {
    DeepSeek: Sparkles,
    ChatGPT: Bot,
    'Fichi AI': Flame,
  };

  const Icon = providerIcons[providerName] || Bot;

  return (
    <div
      onMouseUp={handleMouseUp}
      className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4"
    >
      {/* Top Banner with Quick Context Injection */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {providerName} Workspace
                </h2>
                <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded font-mono">
                  Режим без API-ключа (Web Chat)
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                Передайте модели системный контекст, чтобы она знала инструменты <code>winremote-mcp</code> и пути <code>workspace/</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Copy System Briefing */}
            <button
              onClick={handleCopyBriefing}
              className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow cursor-pointer transition-colors"
              title="Скопировать системную инструкцию в буфер обмена для вставки в чат"
            >
              {copiedBriefing ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBriefing ? 'Контекст скопирован!' : '📋 Скопировать системный промпт'}</span>
            </button>

            {/* Toggle Config Drawer */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] px-2.5 py-1.5 rounded text-xs cursor-pointer"
              title="Настроить роль и инструменты контекста"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Роль: {ROLE_PRESETS[selectedRole].title.split(' ')[0]}</span>
              {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Toggle Quick Guide */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="p-1.5 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-white cursor-pointer"
              title="Как это работает?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected text hotkey banner */}
        {selectedText && (
          <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/40 p-2.5 rounded-md text-xs animate-in fade-in">
            <span className="text-blue-200 truncate max-w-lg">
              Выделено для запуска: <strong>"{selectedText.slice(0, 50)}..."</strong>
            </span>
            <button
              onClick={() => {
                onSendToOrchestrator(selectedText);
                setSelectedText('');
              }}
              className="flex items-center gap-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold px-3 py-1 rounded shadow cursor-pointer transition-colors shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Отправить в Оркестратор (Alt+O)</span>
            </button>
          </div>
        )}

        {/* Collapsible Role Configuration Drawer */}
        {showConfig && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>Настройка контекста агента для вставки в Web-чат:</span>
              <span className="text-[10px] text-[#8b949e]">Шлюз: winremote:8090 | workspace/</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(ROLE_PRESETS) as Array<keyof typeof ROLE_PRESETS>).map(r => {
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/30 text-white'
                        : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#484f58]'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-1">{ROLE_PRESETS[r].title}</div>
                    <div className="text-[10px] text-[#8b949e] leading-snug">{ROLE_PRESETS[r].desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] text-[#8b949e]">
                <span>Предпросмотр генерируемого системного промпта:</span>
                <button
                  onClick={handleCopyBriefing}
                  className="text-blue-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Копировать весь промпт</span>
                </button>
              </div>
              <pre className="bg-[#161b22] border border-[#30363d] rounded p-2.5 font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                {currentBriefing}
              </pre>
            </div>
          </div>
        )}

        {/* Collapsible Workflow Guide */}
        {showGuide && (
          <div className="bg-[#0d1117] border border-blue-900/40 rounded-lg p-3 text-xs space-y-2 text-[#c9d1d9] animate-in fade-in">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              <span>Пошаговый сценарий работы с чатами без API-ключа:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>Нажмите зеленую кнопку <strong>«Скопировать системный промпт»</strong> выше.</li>
              <li>Вставьте скопированный текст в первое сообщение окна чата ({providerName}) и отправьте его.</li>
              <li>Модель сразу поймет, что она работает внутри <strong>MCP Universal Studio v2</strong>, узнает список инструментов (<code>FileWrite</code>, <code>Shell</code>, <code>wsl_exec</code>) и структуру папки <code>workspace/</code>.</li>
              <li>Опишите модели любую задачу (например: <em>«Создай скрипт для парсинга логов»</em>).</li>
              <li>Модель выдаст структурированный шаг или блок <code>```mcp-task</code>.</li>
              <li>Выделите текст ответа и нажмите клавиши <kbd className="px-1 py-0.5 bg-[#21262d] rounded border border-[#30363d] font-mono text-blue-400">Alt + O</kbd> (или кнопку под сообщением) — задача немедленно запустится в автономном DAG Оркестраторе!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, i) => {
            const hasTaskBlock = m.text.includes('```mcp-task') || m.text.includes('```task');
            const extractedGoal = extractTaskFromText(m.text);

            return (
              <div
                key={i}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#1f6feb] text-white'
                      : 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 opacity-70 text-[10px]">
                    <span>{m.sender === 'user' ? 'Оператор' : providerName}</span>
                    {hasTaskBlock && (
                      <span className="text-emerald-400 font-mono font-bold">MCP-Task обнаружен</span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap select-text">{m.text}</div>

                  {m.sender === 'bot' && (
                    <div className="mt-2 pt-2 border-t border-[#30363d]/60 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-[#8b949e]">
                        Выделите текст + Alt+O
                      </span>
                      <button
                        onClick={() => onSendToOrchestrator(extractedGoal)}
                        className="flex items-center gap-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-colors"
                        title="Отправить распознанную задачу в DAG Оркестратор"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Исполнить в DAG (Alt+O)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="pt-3 border-t border-[#30363d] flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder={`Задайте вопрос ${providerName} или отправьте цель для формирования шагов...`}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white px-3 py-2 rounded border border-[#30363d] text-xs cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
