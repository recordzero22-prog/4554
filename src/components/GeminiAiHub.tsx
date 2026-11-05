import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Search,
  Mic,
  Music,
  Image as ImageIcon,
  Radio,
  Send,
  Zap,
  Bot,
  Copy,
  Check,
  Play,
  Square,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { soundSynth } from '../game/soundSynth';

interface GeminiAiHubProps {
  onSendToOrchestrator: (goal: string) => void;
}

export const GeminiAiHub: React.FC<GeminiAiHubProps> = ({ onSendToOrchestrator }) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'search' | 'audio' | 'music' | 'image' | 'live'>('chat');

  // Chat State
  const [chatModel, setChatModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-2.5-flash'>('gemini-3.8-flash');
  const [chatRole, setChatRole] = useState<'architect' | 'winremote' | 'security'>('architect');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'model'; text: string; sources?: string[] }>>([
    {
      sender: 'model',
      text: 'Здравствуйте! Я интеллектуальный ассистент Gemini AI. Могу помочь спланировать DAG-задачи, настроить winremote-mcp или провести аудит безопасности.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Search Grounding State
  const [searchQuery, setSearchQuery] = useState('Последние обновления Model Context Protocol 2024-11-05');
  const [searchResult, setSearchResult] = useState<{ answer: string; sources: Array<{ title: string; url: string }> } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Audio Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  // Music Lyria State
  const [musicPrompt, setMusicPrompt] = useState('Cyberpunk atmospheric synthwave background music, 120 bpm, deep analog bass');
  const [musicTrack, setMusicTrack] = useState<{ title: string; isPlaying: boolean } | null>(null);

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('Futuristic autonomous AI drone in high-tech server room, glowing neon cyan and amber, photorealistic, 8k');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Live API Simulation State
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Send Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsGenerating(true);

    setTimeout(() => {
      let response = '';
      if (chatRole === 'architect') {
        response = `[${chatModel} - Архитектор]:\nДля цели "${userText}" предлагаю DAG из 3 шагов:\n1. Запись целевого скрипта через FileWrite.\n2. Вызов команды через Shell/PowerShell.\n3. Проверка артефактов и валидация exit code 0. Нажмите кнопку ниже для отправки в оркестратор!`;
      } else if (chatRole === 'winremote') {
        response = `[${chatModel} - winremote]:\nРекомендую подключение к http://127.0.0.1:8090/mcp с флагами --enable-all. JSON-RPC протокол 2024-11-05 готов к обработке вызова.`;
      } else {
        response = `[${chatModel} - DevSecOps]:\nКоманда проверена. Политике HITL соответствует, деструктивных паттернов не обнаружено.`;
      }

      setChatMessages(prev => [...prev, { sender: 'model', text: response }]);
      setIsGenerating(false);
    }, 600);
  };

  // Run Search Grounding
  const handleSearchGrounding = () => {
    setIsSearching(true);
    setTimeout(() => {
      setSearchResult({
        answer: `По данным поиска Google: Протокол Model Context Protocol (MCP) версии 2024-11-05 вводит стандартизированные возможности Streamable HTTP, инспекцию инструментов (tools/list) и безопасное взаимодействие локальных агентов с хост-системой через шлюз winremote.`,
        sources: [
          { title: 'Model Context Protocol Official Specification', url: 'https://modelcontextprotocol.io' },
          { title: 'Anthropic & Google MCP Ecosystem Overview', url: 'https://github.com/modelcontextprotocol' },
        ],
      });
      setIsSearching(false);
    }, 700);
  };

  // Audio recording toggle
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setTranscribedText('Создай в папке workspace скрипт diagnostic.py, проверь локальную сеть и выведи отчет в консоль.');
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  // Music Lyria generate & play
  const handleGenerateMusic = () => {
    setMusicTrack({ title: musicPrompt, isPlaying: true });
    soundSynth.playWaveComplete();
  };

  // Image Generation
  const handleGenerateImage = () => {
    // Generate high-tech procedural SVG cyber art
    const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230d1117"/><path d="M50 350 L300 50 L550 350 Z" stroke="%231f6feb" stroke-width="2" fill="none"/><circle cx="300" cy="200" r="80" stroke="%2300f0ff" stroke-width="3" fill="%23161b22"/><circle cx="300" cy="200" r="30" fill="%23238636"/><text x="300" y="320" font-family="monospace" font-size="16" fill="%237ee787" text-anchor="middle">MCP CYBER DRONE AGENT v2</text></svg>`;
    setGeneratedImage(svg);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Gemini AI Hub & Мультимодальность</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono font-normal">
            Demo / Coming Soon
          </span>
        </h2>
        <p className="text-xs text-[#8b949e] mt-1">
          Многопоточный чат Gemini, заземление поиском Google (Search Grounding), транскрипция речи, генерация музыки Lyria и Live API.
        </p>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 text-xs">
          {[
            { id: 'chat', label: 'Gemini Chatbot', icon: Bot },
            { id: 'search', label: 'Google Search Data', icon: Search },
            { id: 'audio', label: 'Транскрипция Речи', icon: Mic },
            { id: 'music', label: 'Музыка Lyria', icon: Music },
            { id: 'image', label: 'Генератор Изображений', icon: ImageIcon },
            { id: 'live', label: 'Live Voice API', icon: Radio },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#1f6feb] text-white shadow-sm'
                    : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View 1: Multi-Turn Chatbot */}
      {activeSubTab === 'chat' && (
        <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between space-y-3">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] pb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8b949e]">Модель:</span>
              <select
                value={chatModel}
                onChange={e => setChatModel(e.target.value as any)}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded px-2 py-1 text-xs"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (Standard)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8b949e]">Роль ассистента:</span>
              <select
                value={chatRole}
                onChange={e => setChatRole(e.target.value as any)}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded px-2 py-1 text-xs"
              >
                <option value="architect">Архитектор систем (Декомпозиция DAG)</option>
                <option value="winremote">Инженер winremote-mcp</option>
                <option value="security">DevSecOps Аудитор (HITL)</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[260px]">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#1f6feb] text-white'
                      : 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
                  }`}
                >
                  <div className="text-[10px] opacity-70 mb-1 font-mono">
                    {m.sender === 'user' ? 'Оператор' : 'Gemini AI'}
                  </div>
                  <div className="whitespace-pre-wrap select-text">{m.text}</div>

                  {m.sender === 'model' && (
                    <div className="mt-2 pt-2 border-t border-[#30363d]/60 flex justify-end">
                      <button
                        onClick={() => onSendToOrchestrator(m.text)}
                        className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Отправить в DAG Orchestrator</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-[#30363d]">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Спросите Gemini о структуре DAG, коде PowerShell или системных командах..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !chatInput.trim()}
              className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-bold px-4 py-2 rounded text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Отправить</span>
            </button>
          </form>
        </div>
      )}

      {/* View 2: Google Search Grounding */}
      {activeSubTab === 'search' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <span>Search Grounding с моделью gemini-3.8-flash</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearchGrounding}
              disabled={isSearching}
              className="bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Поиск...' : 'Искать в Google'}</span>
            </button>
          </div>

          {searchResult && (
            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs space-y-2 mt-2">
              <div className="text-[#e6edf3] leading-relaxed">{searchResult.answer}</div>
              <div className="pt-2 border-t border-[#30363d] space-y-1">
                <div className="text-[10px] text-[#8b949e] uppercase font-bold">Источники заземления (Citations):</div>
                {searchResult.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-blue-400 hover:underline text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 3: Audio Transcription */}
      {activeSubTab === 'audio' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Транскрипция аудио через gemini-3.5-transcribe</span>
          </div>

          <p className="text-xs text-[#8b949e]">
            Нажмите на микрофон для записи голосовой команды. Модель транскрибирует голос в готовую задачу для Оркестратора.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30'
                  : 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>
            <span className="text-xs font-mono text-[#c9d1d9]">
              {isRecording ? 'Идет запись... говорите цель задачи' : 'Нажмите микрофон для записи'}
            </span>
          </div>

          {transcribedText && (
            <div className="bg-[#0d1117] border border-emerald-700/50 rounded p-3 text-xs space-y-2">
              <span className="text-emerald-400 font-bold">Транскрибированный текст:</span>
              <p className="text-white font-mono">{transcribedText}</p>
              <button
                onClick={() => onSendToOrchestrator(transcribedText)}
                className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Запустить задачу в DAG Orchestrator</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* View 4: Music Generation (Lyria) */}
      {activeSubTab === 'music' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Music className="w-4 h-4 text-purple-400" />
            <span>Генерация музыки lyria-3-clip-preview</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={musicPrompt}
              onChange={e => setMusicPrompt(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleGenerateMusic}
              className="bg-[#8957e5] hover:bg-[#a371f7] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Создать трек</span>
            </button>
          </div>

          {musicTrack && (
            <div className="bg-[#0d1117] border border-purple-800/50 rounded p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-white font-mono">{musicTrack.title}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                Lyria Synthesizer Playing
              </span>
            </div>
          )}
        </div>
      )}

      {/* View 5: Image Generation */}
      {activeSubTab === 'image' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Создание и редактирование изображений gemini-nano-banana-2.1</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleGenerateImage}
              className="bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer"
            >
              Генерировать
            </button>
          </div>

          {generatedImage && (
            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 flex flex-col items-center gap-2">
              <img src={generatedImage} alt="Generated visual" className="rounded max-h-56 border border-[#30363d]" />
              <a
                href={generatedImage}
                download="mcp_cyber_drone.svg"
                className="text-xs text-blue-400 hover:underline"
              >
                Скачать изображение
              </a>
            </div>
          )}
        </div>
      )}

      {/* View 6: Live API */}
      {activeSubTab === 'live' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Двусторонняя голосовая сессия Live API (gemini-3.8-live)</span>
          </div>

          <p className="text-xs text-[#8b949e]">
            Интерфейс потоковой двусторонней голосовой связи в реальном времени.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer ${
                isLiveActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#238636] hover:bg-[#2ea043] text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{isLiveActive ? 'Остановить сессию' : 'Запустить Live сессию'}</span>
            </button>
            {isLiveActive && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live поток активен (двусторонний аудиоканал)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
