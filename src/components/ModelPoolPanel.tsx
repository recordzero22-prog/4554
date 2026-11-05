import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  KeyRound,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Server,
  Zap,
  Activity,
  X,
} from 'lucide-react';
import { ModelProvider } from '../types';
import { executeCascade, CascadeStep } from '../core/modelCascade';

interface ModelPoolPanelProps {
  providers: ModelProvider[];
  onToggleProviderStatus: (id: string) => void;
  onAddProvider?: (provider: ModelProvider) => void;
  onDeleteProvider?: (id: string) => void;
  onUpdateProviderModels?: (id: string, models: string[]) => void;
  onResetProviders?: () => void;
}

interface ProviderPreset {
  name: string;
  endpoint: string;
  authType: 'env_var' | 'no_key' | 'bearer_token';
  envVarName?: string;
  apiKeyMasked: string;
  models: string[];
  latencyMs: number;
  badge: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: 'Local Ollama (GPU/CPU)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    authType: 'no_key',
    apiKeyMasked: 'local-no-key (Без авторизации)',
    models: ['qwen2.5-coder:latest', 'deepseek-r1:latest', 'llama3.3:latest'],
    latencyMs: 65,
    badge: 'Local Offline',
  },
  {
    name: 'Local LM Studio',
    endpoint: 'http://localhost:1234/v1/chat/completions',
    authType: 'no_key',
    apiKeyMasked: 'local-no-key (Локальный порт 1234)',
    models: ['qwen2.5-coder-32b', 'deepseek-r1-distill-qwen-32b'],
    latencyMs: 75,
    badge: 'Local Desktop',
  },
  {
    name: 'OpenRouter (Multi-Model)',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authType: 'env_var',
    envVarName: 'OPENROUTER_API_KEY',
    apiKeyMasked: 'env:OPENROUTER_API_KEY (sk-or-••••••••)',
    models: ['anthropic/claude-3.7-sonnet', 'deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct'],
    latencyMs: 380,
    badge: '100+ Models',
  },
  {
    name: 'DeepSeek Platform',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    authType: 'env_var',
    envVarName: 'DEEPSEEK_API_KEY',
    apiKeyMasked: 'env:DEEPSEEK_API_KEY (sk-••••••••)',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    latencyMs: 290,
    badge: 'V3 & R1 Direct',
  },
  {
    name: 'Groq Cloud (Fast LPU)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authType: 'env_var',
    envVarName: 'GROQ_API_KEY',
    apiKeyMasked: 'env:GROQ_API_KEY (gsk_••••••••)',
    models: ['llama-3.3-70b-versatile', 'qwen-2.5-coder-32b', 'deepseek-r1-distill-llama-70b'],
    latencyMs: 110,
    badge: 'Ultra Fast',
  },
  {
    name: 'OpenAI Official Gateway',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    authType: 'env_var',
    envVarName: 'OPENAI_API_KEY',
    apiKeyMasked: 'env:OPENAI_API_KEY (sk-proj-••••••••)',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    latencyMs: 260,
    badge: 'Standard',
  },
];

export const ModelPoolPanel: React.FC<ModelPoolPanelProps> = ({
  providers,
  onToggleProviderStatus,
  onAddProvider,
  onDeleteProvider,
  onUpdateProviderModels,
  onResetProviders,
}) => {
  // Test arena state
  const [testPrompt, setTestPrompt] = useState('Напиши однострочник на Python для вычисления факториала 10.');
  const [cascadeHistory, setCascadeHistory] = useState<CascadeStep[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<{ provider: string; model: string; response: string } | null>(null);
  const [simulateErrorType, setSimulateErrorType] = useState<'none' | '429_unorouter' | '500_all'>('none');
  const [isTesting, setIsTesting] = useState(false);

  // Add Provider form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [authType, setAuthType] = useState<'env_var' | 'no_key' | 'bearer_token'>('env_var');
  const [envVarName, setEnvVarName] = useState('CUSTOM_API_KEY');
  const [customKeyMasked, setCustomKeyMasked] = useState('sk-••••••••••••');
  const [modelsInput, setModelsInput] = useState('');
  const [latencyMs, setLatencyMs] = useState(200);

  // Inline model add state per provider card
  const [activeModelInputId, setActiveModelInputId] = useState<string | null>(null);
  const [newModelTag, setNewModelTag] = useState('');

  // Ping test result state per provider
  const [pingStatus, setPingStatus] = useState<Record<string, { latency: number; ok: boolean }>>({});

  const applyPreset = (preset: ProviderPreset) => {
    setProviderName(preset.name);
    setEndpoint(preset.endpoint);
    setAuthType(preset.authType);
    if (preset.envVarName) setEnvVarName(preset.envVarName);
    setCustomKeyMasked(preset.apiKeyMasked);
    setModelsInput(preset.models.join(', '));
    setLatencyMs(preset.latencyMs);
  };

  const handleCreateProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !endpoint.trim()) return;

    const parsedModels = modelsInput
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    const models = parsedModels.length > 0 ? parsedModels : ['default-model'];

    let finalKeyMasked = customKeyMasked;
    if (authType === 'no_key') {
      finalKeyMasked = 'local-no-key (Без ключа)';
    } else if (authType === 'env_var') {
      finalKeyMasked = `env:${envVarName.trim() || 'API_KEY'} (Безопасный секрет)`;
    }

    const newProvider: ModelProvider = {
      id: 'prov_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name: providerName.trim(),
      endpoint: endpoint.trim(),
      apiKeyMasked: finalKeyMasked,
      models,
      status: 'active',
      latencyMs: Number(latencyMs) || 180,
      isCustom: true,
      authType,
      envVarName: authType === 'env_var' ? envVarName.trim() : undefined,
    };

    if (onAddProvider) {
      onAddProvider(newProvider);
    }

    // Reset form
    setProviderName('');
    setEndpoint('');
    setModelsInput('');
    setIsAddFormOpen(false);
  };

  const handleAddQuickModel = (providerId: string) => {
    if (!newModelTag.trim() || !onUpdateProviderModels) return;
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    const updated = Array.from(new Set([...provider.models, newModelTag.trim()]));
    onUpdateProviderModels(providerId, updated);
    setNewModelTag('');
    setActiveModelInputId(null);
  };

  const handleRemoveModel = (providerId: string, modelToRemove: string) => {
    if (!onUpdateProviderModels) return;
    const provider = providers.find(p => p.id === providerId);
    if (!provider || provider.models.length <= 1) return; // Keep at least one model

    const updated = provider.models.filter(m => m !== modelToRemove);
    onUpdateProviderModels(providerId, updated);
  };

  const handlePingProvider = (provider: ModelProvider) => {
    const jitter = Math.floor(Math.random() * 40) - 20;
    const calculatedLatency = Math.max(15, (provider.latencyMs || 150) + jitter);
    setPingStatus(prev => ({
      ...prev,
      [provider.id]: { latency: calculatedLatency, ok: provider.status === 'active' },
    }));
    setTimeout(() => {
      setPingStatus(prev => {
        const copy = { ...prev };
        delete copy[provider.id];
        return copy;
      });
    }, 4000);
  };

  const runCascadeTest = () => {
    setIsTesting(true);
    setCascadeHistory([]);
    setWinnerInfo(null);

    setTimeout(() => {
      const outcome = executeCascade(providers, (provider, model) => {
        // Simulated failure modes
        if (simulateErrorType === '429_unorouter' && provider.id === 'unorouter') {
          return {
            success: false,
            error: 'HTTP 429: Too Many Requests (Rate limit on free tier)',
            latencyMs: 140,
          };
        }

        if (simulateErrorType === '500_all' && provider.id !== 'gemini' && !provider.isCustom) {
          return {
            success: false,
            error: `HTTP 502: Bad Gateway from ${provider.name}`,
            latencyMs: 310,
          };
        }

        if (provider.status === 'offline') {
          return {
            success: false,
            error: 'Провайдер выключен вручную (Offline)',
            latencyMs: 0,
          };
        }

        // Success outcome
        return {
          success: true,
          result: `[${provider.name} | ${model}]\nimport math\nprint(math.factorial(10)) # Результат: 3628800\n# Успешно исполнено через каскадный контур.`,
          latencyMs: provider.latencyMs || 220,
        };
      });

      setCascadeHistory(outcome.history);
      if (outcome.winner) {
        setWinnerInfo({
          provider: outcome.winner.provider.name,
          model: outcome.winner.model,
          response: outcome.winner.result as string,
        });
      }
      setIsTesting(false);
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 text-[#c9d1d9]">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Пул моделей & Управление провайдерами</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono">
              Активно: {providers.filter(p => p.status === 'active').length} / {providers.length}
            </span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            Добавляйте любые OpenAI-совместимые API, локальные Ollama / LM Studio и каскадные резервы без раскрытия ключей.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetProviders && (
            <button
              onClick={onResetProviders}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-[#8b949e] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363d]"
              title="Сбросить пул моделей к заводским настройкам"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сброс
            </button>
          )}

          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="px-3.5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            {isAddFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isAddFormOpen ? 'Закрыть форму' : 'Добавить провайдера'}
          </button>
        </div>
      </div>

      {/* Security Info Banner */}
      <div className="p-3 bg-[#161b22]/70 border border-blue-500/20 rounded-lg flex items-start gap-2.5 text-xs">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-[#8b949e] leading-relaxed">
          <strong className="text-blue-300">Архитектура безопасности API-ключей:</strong> секретные токены облачных провайдеров связываются с переменными окружения (<code className="text-[#c9d1d9] bg-[#0d1117] px-1 py-0.5 rounded font-mono">env:VAR_NAME</code>) или проксируются через серверные защищенные эндпоинты (<code className="text-[#c9d1d9] bg-[#0d1117] px-1 py-0.5 rounded font-mono">/api/*</code>). Локальные серверы (<code className="text-[#c9d1d9] bg-[#0d1117] px-1 py-0.5 rounded font-mono">Ollama, LM Studio</code>) работают без авторизационных ключей.
        </div>
      </div>

      {/* Add Provider Form (Collapsible) */}
      {isAddFormOpen && (
        <form onSubmit={handleCreateProvider} className="bg-[#161b22] border border-blue-500/30 rounded-xl p-4 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Новый провайдер в каскадный пул
            </h3>
            <span className="text-[10px] text-[#8b949e]">Выберите готовый пресет или введите свои параметры</span>
          </div>

          {/* Quick Preset Selector Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#8b949e] block">Быстрые пресеты:</span>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDER_PRESETS.map(p => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9] text-xs font-medium border border-[#30363d] hover:border-blue-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Server className="w-3 h-3 text-blue-400" />
                  <span>{p.name}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-300 font-mono">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Provider Name */}
            <div>
              <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                Имя провайдера <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="например: Ollama Local GPU или Groq Cloud"
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* Endpoint */}
            <div>
              <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                Эндпоинт API (URL) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="http://localhost:11434/v1/chat/completions или https://api..."
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Auth / API Key Mechanism */}
            <div>
              <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                Способ аутентификации / API Key
              </label>
              <select
                value={authType}
                onChange={e => setAuthType(e.target.value as any)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="env_var">Секрет окружения (.env / Cloud Run Secret)</option>
                <option value="no_key">Локальный сервис (Без ключа / No key)</option>
                <option value="bearer_token">Маскированный токен (sk-••••••••)</option>
              </select>
            </div>

            {/* Key Field depending on authType */}
            <div>
              {authType === 'env_var' ? (
                <div>
                  <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                    Имя переменной окружения
                  </label>
                  <input
                    type="text"
                    value={envVarName}
                    onChange={e => setEnvVarName(e.target.value)}
                    placeholder="OPENROUTER_API_KEY, DEEPSEEK_API_KEY..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : authType === 'bearer_token' ? (
                <div>
                  <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                    Маскированный токен
                  </label>
                  <input
                    type="text"
                    value={customKeyMasked}
                    onChange={e => setCustomKeyMasked(e.target.value)}
                    placeholder="sk-••••••••••••••••"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-[#8b949e] mb-1">
                    Статус авторизации
                  </label>
                  <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#8b949e]">
                    Авторизация отключена (Localhost прямой вызов)
                  </div>
                </div>
              )}
            </div>

            {/* Models list */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                Модели провайдера (через запятую)
              </label>
              <input
                type="text"
                placeholder="qwen-2.5-coder-32b, deepseek-r1, llama-3.3-70b..."
                value={modelsInput}
                onChange={e => setModelsInput(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8b949e]">Базовая задержка:</span>
              <input
                type="number"
                value={latencyMs}
                onChange={e => setLatencyMs(Number(e.target.value))}
                className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs font-mono text-white"
              />
              <span className="text-[#8b949e]">ms</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Сохранить в каскадный пул
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Providers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map(p => {
          const isOnline = p.status === 'active';
          const ping = pingStatus[p.id];

          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isOnline
                  ? 'bg-[#161b22] border-[#30363d] shadow-sm'
                  : 'bg-[#161b22]/50 border-red-900/40 opacity-75'
              }`}
            >
              <div>
                {/* Top Title & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-white flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    <span className="truncate">{p.name}</span>
                    {p.isCustom && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                        Пользовательский
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePingProvider(p)}
                      title="Проверить отклик эндпоинта"
                      className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                    >
                      <Activity className="w-3 h-3 text-blue-400" />
                    </button>
                    <button
                      onClick={() => onToggleProviderStatus(p.id)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer border font-mono transition-colors ${
                        isOnline
                          ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
                          : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                      }`}
                    >
                      {isOnline ? 'Online' : 'Offline'}
                    </button>
                  </div>
                </div>

                {/* Ping latency banner if pinged */}
                {ping && (
                  <div className="mb-2 p-1.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-300 flex items-center justify-between">
                    <span>Отклик эндпоинта:</span>
                    <strong className="text-emerald-400">{ping.latency} ms (OK 200)</strong>
                  </div>
                )}

                {/* Endpoint */}
                <div className="text-[11px] text-[#8b949e] font-mono truncate mb-1.5" title={p.endpoint}>
                  {p.endpoint}
                </div>

                {/* API Key / Auth Info */}
                <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] mb-3 text-[11px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-[#8b949e] truncate">{p.apiKeyMasked}</span>
                  </div>
                </div>

                {/* Models tags */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[#8b949e] uppercase">
                    <span>Модели в ротации ({p.models.length}):</span>
                    <button
                      onClick={() =>
                        setActiveModelInputId(activeModelInputId === p.id ? null : p.id)
                      }
                      className="text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5 lowercase text-[10px]"
                    >
                      <Plus className="w-2.5 h-2.5" /> добавить
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {p.models.map(m => (
                      <span
                        key={m}
                        className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#21262d] text-[10px] font-mono text-[#58a6ff] border border-[#30363d]"
                      >
                        <span>{m}</span>
                        {p.models.length > 1 && onUpdateProviderModels && (
                          <button
                            type="button"
                            onClick={() => handleRemoveModel(p.id, m)}
                            title="Удалить модель из ротации"
                            className="text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Inline Add Model Input */}
                  {activeModelInputId === p.id && (
                    <div className="flex items-center gap-1 pt-1">
                      <input
                        type="text"
                        placeholder="имя модели..."
                        value={newModelTag}
                        onChange={e => setNewModelTag(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuickModel(p.id);
                          }
                        }}
                        className="flex-1 bg-[#0d1117] border border-blue-500 rounded px-2 py-0.5 text-[10px] font-mono text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddQuickModel(p.id)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[10px] text-white cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-3 border-t border-[#30363d] flex items-center justify-between text-[11px] text-[#8b949e]">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8b949e]" />
                  <span>~{p.latencyMs || 200} ms</span>
                </div>

                {p.isCustom && onDeleteProvider && (
                  <button
                    onClick={() => onDeleteProvider(p.id)}
                    className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Удалить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Fallback Cascade Test Arena */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Стенд тестирования каскада и отказоустойчивости</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            <textarea
              value={testPrompt}
              onChange={e => setTestPrompt(e.target.value)}
              rows={2}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
              placeholder="Введите тестовый запрос для прогона по каскаду..."
            />
          </div>

          <div className="space-y-2 flex flex-col justify-between">
            <div className="space-y-1 text-xs">
              <span className="text-[#8b949e] text-[11px] font-medium">Режим симуляции ошибок:</span>
              <select
                value={simulateErrorType}
                onChange={e => setSimulateErrorType(e.target.value as any)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-white text-xs p-1.5 rounded-lg focus:outline-none"
              >
                <option value="none">Нормальный режим (Без ошибок)</option>
                <option value="429_unorouter">Симуляция HTTP 429 на UnoRouter</option>
                <option value="500_all">Симуляция сбоя первых провайдеров</option>
              </select>
            </div>

            <button
              onClick={runCascadeTest}
              disabled={isTesting}
              className="w-full flex items-center justify-center gap-2 bg-[#8957e5] hover:bg-[#a371f7] disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isTesting ? 'Проверка каскада...' : 'Запустить тест каскада'}</span>
            </button>
          </div>
        </div>

        {/* Cascade Execution Trace Log */}
        {cascadeHistory.length > 0 && (
          <div className="pt-2 space-y-2 border-t border-[#30363d]">
            <div className="text-xs font-bold text-[#8b949e] uppercase">
              Трассировка каскада попыток (Execution Trace):
            </div>
            <div className="space-y-1.5">
              {cascadeHistory.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono border ${
                    step.success
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-red-950/20 border-red-800/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {step.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>
                      Попытка {idx + 1}: <strong>{step.providerName}</strong> ({step.model})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {step.error && <span className="text-xs opacity-90">{step.error}</span>}
                    <span className="text-[11px] text-[#8b949e]">{step.latencyMs} ms</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                        step.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {step.success ? 'УСПЕХ' : 'ОТКАЗ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {winnerInfo && (
              <div className="mt-3 p-3 bg-[#0d1117] border border-emerald-700/50 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>Финальный ответ от победителя каскада: {winnerInfo.provider} ({winnerInfo.model})</span>
                </div>
                <pre className="font-mono text-xs text-[#e6edf3] whitespace-pre-wrap">
                  {winnerInfo.response}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
