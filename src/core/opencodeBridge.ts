// DEMO: реальные MCP-серверы для Unity/Blender/Skyrim/OpenCode пока не подключены.
/**
 * @file opencodeBridge.ts
 * Прямая интеграция с OpenCode CLI и конфигуратором opencode.json.
 * Позволяет подключать сессии OpenCode в единый Оркестратор,
 * конфигурировать доступные MCP-серверы (winremote, unity, blender, skyrim)
 * и делегировать задачи моделям OpenCode.
 */

export interface OpenCodeServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
  enabled: boolean;
}

export interface OpenCodeModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'deepseek' | 'ollama' | 'custom';
  contextWindow: number;
  isFree?: boolean;
  isLocal?: boolean;
  capabilities: string[];
}

export interface OpenCodeConfigFile {
  $schema?: string;
  version: string;
  defaultModel: string;
  instructions: string;
  autoApproveSafe: boolean;
  servers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
    transport: 'stdio' | 'http';
    url?: string;
  }>;
  models: {
    id: string;
    name: string;
    provider: string;
  }[];
}

export interface OpenCodeSession {
  sessionId: string;
  name: string;
  modelId: string;
  status: 'idle' | 'running' | 'paused' | 'error';
  attachedServers: string[];
  totalTurns: number;
  lastActive: string;
  currentTaskTitle?: string;
  logs: { timestamp: string; role: 'user' | 'assistant' | 'tool' | 'system'; text: string }[];
}

/** Список предустановленных моделей OpenCode */
export const DEFAULT_OPENCODE_MODELS: OpenCodeModelConfig[] = [
  {
    id: 'opencode/claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
    provider: 'anthropic',
    contextWindow: 200000,
    capabilities: ['code_generation', 'skyrim_papyrus', 'blender_bpy', 'unity_csharp'],
  },
  {
    id: 'opencode/deepseek-r1',
    name: 'DeepSeek-R1 (Open Reasoning)',
    provider: 'deepseek',
    contextWindow: 128000,
    isFree: true,
    capabilities: ['deep_reasoning', 'dag_planning', 'self_healing_diagnosis'],
  },
  {
    id: 'opencode/qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B (Local/vLLM)',
    provider: 'ollama',
    contextWindow: 65536,
    isLocal: true,
    capabilities: ['offline_coding', 'game_scripts', 'quick_patch'],
  },
  {
    id: 'opencode/gpt-4o',
    name: 'GPT-4o (Omni Multimodal)',
    provider: 'openai',
    contextWindow: 128000,
    capabilities: ['asset_inspection', 'nif_diagnostics', 'general_orchestration'],
  },
];

/** Предустановленные MCP серверы для opencode.json */
export const DEFAULT_OPENCODE_SERVERS: Record<string, {
  command: string;
  args: string[];
  transport: 'stdio' | 'http';
  url?: string;
  description: string;
}> = {
  winremote: {
    command: 'bridge/winremote-mcp.exe',
    args: ['--enable-all', '--port', '8090'],
    transport: 'http',
    url: 'http://127.0.0.1:8090/mcp',
    description: 'Системный мост Windows / WSL2 / PowerShell',
  },
  gamedev_unity: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-unity-bridge'],
    transport: 'stdio',
    description: 'Инспекция и манипуляция сценами Unity Engine 2022/6000',
  },
  gamedev_godot: {
    command: 'godot',
    args: ['--headless', '--script', 'tools/mcp_godot_server.gd'],
    transport: 'stdio',
    description: 'Godot Engine 4.x Headless RPC сервер',
  },
  gamedev_blender: {
    command: 'blender',
    args: ['--background', '--python', 'tools/mcp_blender_server.py'],
    transport: 'stdio',
    description: 'Blender 4.x bpy сервер мешей и риггинга',
  },
  skyrim_modding: {
    command: 'node',
    args: ['tools/skyrim_mcp_bridge.cjs'],
    transport: 'stdio',
    description: 'Skyrim LE NIF 3D, Havok 2010.2 KF и компилятор Papyrus PSC->PEX',
  },
};

/**
 * Генерирует содержимое файла opencode.json
 */
export function generateOpencodeJson(
  defaultModel: string = 'opencode/deepseek-r1',
  activeServers: string[] = ['winremote', 'skyrim_modding', 'gamedev_blender']
): string {
  const serversConfig: Record<string, any> = {};

  for (const serverKey of activeServers) {
    if (DEFAULT_OPENCODE_SERVERS[serverKey]) {
      const s = DEFAULT_OPENCODE_SERVERS[serverKey];
      serversConfig[serverKey] = {
        command: s.command,
        args: s.args,
        transport: s.transport,
        ...(s.url ? { url: s.url } : {}),
      };
    }
  }

  const config: OpenCodeConfigFile = {
    $schema: 'https://raw.githubusercontent.com/opencode-ai/opencode/main/schema.json',
    version: '1.2.0',
    defaultModel,
    instructions:
      'MCP Universal Studio Integration: You are an autonomous coding and GameDev agent operating with full access to WinRemote, Unity, Blender bpy, Godot and Skyrim LE modding MCP servers. Always use self-healing validation when compiling scripts or assembling 3D assets.',
    autoApproveSafe: true,
    servers: serversConfig,
    models: DEFAULT_OPENCODE_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
    })),
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Создает новую локальную сессию OpenCode
 */
export function createOpenCodeSession(
  name: string,
  modelId: string = 'opencode/deepseek-r1',
  attachedServers: string[] = ['winremote', 'skyrim_modding', 'gamedev_blender']
): OpenCodeSession {
  const sessionId = `opencode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    sessionId,
    name,
    modelId,
    status: 'idle',
    attachedServers,
    totalTurns: 0,
    lastActive: new Date().toLocaleTimeString(),
    logs: [
      {
        timestamp: new Date().toLocaleTimeString(),
        role: 'system',
        text: `Сессия OpenCode инициализирована с моделью [${modelId}]. Подключено MCP серверов: ${attachedServers.length}.`,
      },
    ],
  };
}

/**
 * Исполняет запрос внутри OpenCode сессии (с имитацией ответа модели и работы инструментов)
 */
export async function runOpencodeSessionPrompt(
  session: OpenCodeSession,
  prompt: string,
  onLogUpdate?: (log: { timestamp: string; role: 'user' | 'assistant' | 'tool' | 'system'; text: string }) => void
): Promise<{ reply: string; toolCallsMade: string[] }> {
  session.status = 'running';
  session.totalTurns++;
  session.lastActive = new Date().toLocaleTimeString();

  const userLog = {
    timestamp: new Date().toLocaleTimeString(),
    role: 'user' as const,
    text: prompt,
  };
  session.logs.push(userLog);
  onLogUpdate?.(userLog);

  // Имитация работы CLI моста OpenCode
  await new Promise((r) => setTimeout(r, 600));

  const toolCalls: string[] = [];
  let answer = '';

  const lower = prompt.toLowerCase();
  if (lower.includes('skyrim') || lower.includes('nif') || lower.includes('papyrus')) {
    toolCalls.push('skyrim_inspect_nif', 'skyrim_compile_papyrus');
    const toolLog = {
      timestamp: new Date().toLocaleTimeString(),
      role: 'tool' as const,
      text: '[OpenCode MCP / skyrim_modding] Проверены вершины NIF v20.2.0.7 и компилирован скрипт PSC в PEX без ошибок.',
    };
    session.logs.push(toolLog);
    onLogUpdate?.(toolLog);
    answer = `[OpenCode via ${session.modelId}]: Задача по Skyrim LE выполнена. NIF геометрия валидирована, шейдер BSLightingShaderProperty настроен, скомпилирован файл скрипта в Papyrus/Scripts/*.pex.`;
  } else if (lower.includes('blender') || lower.includes('модел') || lower.includes('mesh')) {
    toolCalls.push('blender_execute_bpy', 'animation_convert_fbx_to_gltf');
    const toolLog = {
      timestamp: new Date().toLocaleTimeString(),
      role: 'tool' as const,
      text: '[OpenCode MCP / gamedev_blender] Выполнен bpy headless скрипт: меш сгенерирован, применен Bevel modifier и экспортирован в GLTF Draco.',
    };
    session.logs.push(toolLog);
    onLogUpdate?.(toolLog);
    answer = `[OpenCode via ${session.modelId}]: Модель 3D успешно собрана в Blender 4.x и передана в пайплайн.`;
  } else if (lower.includes('unity') || lower.includes('godot')) {
    toolCalls.push('unity_compile_scripts', 'godot_run_scene');
    const toolLog = {
      timestamp: new Date().toLocaleTimeString(),
      role: 'tool' as const,
      text: '[OpenCode MCP / GameDev Engine] Проект проверен: компиляция C#/GDScript завершена со статусом OK (exit code 0).',
    };
    session.logs.push(toolLog);
    onLogUpdate?.(toolLog);
    answer = `[OpenCode via ${session.modelId}]: Игровой движок синхронизирован. Скрипты и компоненты активны.`;
  } else {
    toolCalls.push('winremote_run_cmd');
    answer = `[OpenCode via ${session.modelId}]: Запрос обработан успешно. Контекст передан в оркестратор с поддержкой Self-Healing.`;
  }

  const assistantLog = {
    timestamp: new Date().toLocaleTimeString(),
    role: 'assistant' as const,
    text: answer,
  };
  session.logs.push(assistantLog);
  onLogUpdate?.(assistantLog);

  session.status = 'idle';
  return { reply: answer, toolCallsMade: toolCalls };
}
