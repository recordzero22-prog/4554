/**
 * System Context & Briefing Generator for external Web Chats without API Keys
 * (DeepSeek Web, ChatGPT Web, Claude Web, Fichi AI Web)
 */

export interface SystemBriefingOptions {
  role?: 'architect' | 'developer' | 'sysadmin' | 'unity';
  enabledTools?: string[];
  strictMode?: boolean;
  workspacePath?: string;
  mcpEndpoint?: string;
}

export const ROLE_PRESETS = {
  architect: {
    title: 'Архитектор DAG-конвейера',
    desc: 'Формирует структурированные списки шагов и декомпозирует цели для исполнения агентами',
  },
  developer: {
    title: 'Python & Node.js Инженер',
    desc: 'Создает рабочие скрипты, проверяет зависимости и исполняет их в песочнице',
  },
  sysadmin: {
    title: 'Системный администратор Windows & WSL',
    desc: 'Выполняет PowerShell и Bash команды, соблюдая политики безопасности HITL',
  },
  unity: {
    title: 'Unity 3D Game Developer',
    desc: 'Инспектирует сцену и манипулирует объектами через mcp-for-unity',
  },
};

export function generateAgentSystemBriefing(options: SystemBriefingOptions = {}): string {
  const role = options.role || 'architect';
  const workspacePath = options.workspacePath || 'workspace/';
  const mcpEndpoint = options.mcpEndpoint || 'http://127.0.0.1:8090/mcp';
  const tools = options.enabledTools || [
    'FileWrite(path, content)',
    'FileRead(path)',
    'FileList(dir)',
    'Shell(command)',
    'wsl_exec(command)',
    'ProcessList(filter)',
    'Unity_CreateGameObject(name, components)',
    'Unity_InspectScene(depth)',
  ];

  const roleDirectives: Record<string, string> = {
    architect: `Твоя роль: Ведущий Архитектор автономных систем. Разбивай цели на четкие изолированные шаги DAG (1. Запись файла, 2. Исполнение через Shell, 3. Верификация).`,
    developer: `Твоя роль: Старший разработчик. Пиши чистый, самодостаточный код без плейсхолдеров. Скрипты должны корректно возвращать код 0 и выводить информативные логи.`,
    sysadmin: `Твоя роль: Системный администратор. Используй нативные команды PowerShell 7 и Bash WSL. Избегай деструктивных операций вроде rm -rf или format.`,
    unity: `Твоя роль: Разработчик сцен Unity. Используй инструменты mcp-for-unity для инспекции и создания игровых компонентов.`,
  };

  return `[СИСТЕМНЫЙ КОНТЕКСТ СРЕДЫ: MCP UNIVERSAL STUDIO v2]
Ты работаешь в среде автономного оркестратора MCP Universal Studio v2. Оператор взаимодействует с тобой через чат и может мгновенно отправлять твои инструкции в автоматическое исполнение на локальном компьютере.

1. ИНФРАСТРУКТУРА И ДОСТУПНЫЕ ИНСТРУМЕНТЫ:
- Локальный шлюз: ${mcpEndpoint} (протокол JSON-RPC 2.0 от 2024-11-05).
- Файловая песочница: все пути файлов создаются относительно папки "${workspacePath}".
- Активные инструменты:
${tools.map(t => `  * ${t}`).join('\n')}

2. РОЛЬ И ПОВЕДЕНИЕ:
${roleDirectives[role] || roleDirectives.architect}

3. ПРАВИЛА ФОРМАТИРОВАНИЯ ОТВЕТОВ:
- Формулируй каждую задачу ясно, компактно и исполнимо.
- При создании кода всегда указывай относительный путь файла (например, "hello.py", "script.py") и точные команды для запуска (например, "python hello.py").
- Финальную готовую команду для выполнения оформляй в виде блока:
\`\`\`mcp-task
Создай в папке workspace файл <имя_файла> с кодом <описание> и запусти через PowerShell.
\`\`\`
- Оператор может выделить любой твой блок и нажать Alt + O для немедленного запуска в автономном DAG Оркестраторе.`;
}

/**
 * Extracts action goal from a chat text if formatted with mcp-task or tool calls
 */
export function extractTaskFromText(text: string): string {
  // Check for ```mcp-task ... ``` block
  const blockMatch = text.match(/```(?:mcp-task|task)?\s*([\s\S]*?)```/i);
  if (blockMatch && blockMatch[1].trim()) {
    return blockMatch[1].trim();
  }

  // Check for lines starting with "Создай" or "Запусти"
  const lines = text.split('\n');
  const actionLine = lines.find(l => /^(создай|напиши|запусти|выполни|проверь|create|run|exec)/i.test(l.trim()));
  if (actionLine) {
    return actionLine.trim();
  }

  return text.trim();
}
