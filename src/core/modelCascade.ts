import { ModelProvider } from '../types';

export const DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    id: 'unorouter',
    name: 'UnoRouter (Free)',
    endpoint: 'https://api.unorouter.com/v1/chat/completions',
    apiKeyMasked: 'sk-0MUH...8zw1N',
    models: ['deepseek-v3:free', 'qwen-2.5-coder-32b:free', 'gemini-3.5-flash-lite:free'],
    status: 'active',
    latencyMs: 320,
  },
  {
    id: 'fichi',
    name: 'Fichi AI',
    endpoint: 'https://api.fichi.ai/v1/chat/completions',
    apiKeyMasked: 'fk_auuP...8wpk',
    models: ['deepseek-v3', 'qwen-2.5-coder-32b'],
    status: 'active',
    latencyMs: 410,
  },
  {
    id: 'ollama',
    name: 'Local Ollama',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    apiKeyMasked: 'local-no-key',
    models: ['qwen2.5-coder:latest', 'deepseek-r1:latest', 'llama3:latest'],
    status: 'active',
    latencyMs: 85,
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Native)',
    endpoint: 'https://generativelanguage.googleapis.com',
    apiKeyMasked: 'AI Studio Runtime Key',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    status: 'active',
    latencyMs: 250,
  },
];

export interface CascadeStep {
  providerName: string;
  model: string;
  success: boolean;
  error?: string;
  latencyMs: number;
}

export interface CascadeExecutionResult {
  winnerProvider: string;
  winnerModel: string;
  cascadeHistory: CascadeStep[];
  outputText: string;
}

export function executeCascade<T>(
  providers: ModelProvider[],
  caller: (provider: ModelProvider, model: string) => { success: boolean; result?: T; error?: string; latencyMs: number }
): { winner?: { provider: ModelProvider; model: string; result: T }; history: CascadeStep[]; error?: string } {
  const history: CascadeStep[] = [];

  for (const provider of providers) {
    if (provider.status === 'offline') {
      history.push({
        providerName: provider.name,
        model: 'all',
        success: false,
        error: 'Провайдер помечен как offline',
        latencyMs: 0,
      });
      continue;
    }

    for (const model of provider.models) {
      const outcome = caller(provider, model);
      history.push({
        providerName: provider.name,
        model,
        success: outcome.success,
        error: outcome.error,
        latencyMs: outcome.latencyMs,
      });

      if (outcome.success && outcome.result !== undefined) {
        return {
          winner: {
            provider,
            model,
            result: outcome.result,
          },
          history,
        };
      }
    }
  }

  return {
    history,
    error: 'Все модели и провайдеры в каскадном пуле завершились с ошибкой',
  };
}
