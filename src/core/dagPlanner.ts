import { Subtask, Task } from '../types';

export function createNewTask(goal: string, origin: string = 'user'): Task {
  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  return {
    id: taskId,
    goal,
    origin,
    status: 'queued',
    createdAt: new Date().toISOString(),
    subtasks: [],
    currentSubtaskIndex: 0,
    currentStep: 0,
    logs: [],
    lastActivity: Date.now(),
  };
}

export function decomposeGoalHeuristically(goal: string): Subtask[] {
  const lower = goal.toLowerCase();
  const subtasks: Subtask[] = [];

  // Pattern 0: Self-Healing validation test scenario
  if (lower.includes('self-healing') || lower.includes('автоисправл') || lower.includes('requests') || lower.includes('fail_python')) {
    subtasks.push({
      id: 'step_heal_1_write',
      title: 'Создание скрипта test_missing_pkg.py с отсутствующей зависимостью',
      action: 'Записать скрипт с "import requests" для проверки механизма Self-Healing',
      tool: 'FileWrite',
      toolArgs: {
        path: 'test_missing_pkg.py',
        content: '# Test script for Self-Healing validation\nimport requests\n\ndef main():\n    print("Requests version: " + requests.__version__)\n    return 0\n\nif __name__ == "__main__":\n    main()\n',
      },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_heal_2_exec',
      title: 'Запуск test_missing_pkg.py через Shell (провокация сбоя)',
      action: 'Запуск python test_missing_pkg.py для генерации ModuleNotFoundError',
      tool: 'Shell',
      toolArgs: { command: 'python test_missing_pkg.py' },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_heal_3_verify',
      title: 'Финальная верификация автоисправленного скрипта',
      action: 'Тестировщик подтверждает восстановление окружения и успешный выход',
      status: 'pending',
    });
    return subtasks;
  }

  // Pattern Skyrim LE Modding
  if (lower.includes('skyrim') || lower.includes('скарим') || lower.includes('nif') || lower.includes('papyrus') || lower.includes('havok')) {
    subtasks.push({
      id: 'step_skyrim_nif',
      title: 'Санитайзинг и валидация 3D-файла NIF (v20.2.0.7)',
      action: 'Парсинг NiNode / BSLightingShaderProperty и настройка шейдерных флагов',
      tool: 'Skyrim_NifParse',
      toolArgs: { path: 'Data/Meshes/weapons/daedric_sword.nif', autoSanitize: true },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_skyrim_esp',
      title: 'Инспекция записей плагина Skyrim LE (.esp)',
      action: 'Анализ FormID, зависимостей ESM и фильтрация ARMO/WEAP записей',
      tool: 'Skyrim_EspInspect',
      toolArgs: { espPath: 'Data/CyberArmory_SkyrimLE.esp', recordFilter: 'ARMO, WEAP' },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_skyrim_papyrus',
      title: 'Компиляция скрипта Papyrus (PSC -> PEX)',
      action: 'Компиляция исходного кода скрипта папируса с флагами TESV_Papyrus_Flags.flg',
      tool: 'Skyrim_PapyrusCompile',
      toolArgs: { pscPath: 'Scripts/Source/CyberSpellEffect.psc', flagsFile: 'TESV_Papyrus_Flags.flg' },
      status: 'pending',
    });
    return subtasks;
  }

  // Pattern Blender & Rigging / Animation
  if (lower.includes('blender') || lower.includes('риггинг') || lower.includes('gltf') || lower.includes('fbx') || lower.includes('mesh')) {
    subtasks.push({
      id: 'step_blender_mesh',
      title: 'Параметрическая генерация 3D меша через Blender bpy',
      action: 'Headless запуск Blender bpy, построение сетки дрона и UV развертки',
      tool: 'Blender_GenerateMesh',
      toolArgs: { meshType: 'armored_drone_hull', polyBudget: 3500 },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_rigging_bones',
      title: 'Автоматическая генерация скелета (Humanoid/Drone Rig)',
      action: 'Создание костей арматуры и расчет весов скиннинга',
      tool: 'Rigging_AutoBoneGenerate',
      toolArgs: { modelPath: 'models/drone.obj', rigType: 'mechanical' },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_anim_retarget',
      title: 'Ретаргетинг и конвертация FBX -> GLTF Draco',
      action: 'Оптимизация скелетных анимаций и экспорт в формат .glb с сжатием',
      tool: 'Anim_ConvertFbxToGltf',
      toolArgs: { inputPath: 'anims/hover_flight.fbx', outputPath: 'anims/hover_flight.glb' },
      status: 'pending',
    });
    return subtasks;
  }

  // Pattern Godot Engine
  if (lower.includes('godot') || lower.includes('годот')) {
    subtasks.push({
      id: 'step_godot_validate',
      title: 'Валидация синтаксиса GDScript (.gd)',
      action: 'Статическая проверка типов и синтаксиса скриптов Godot Engine',
      tool: 'Godot_CompileGDScript',
      toolArgs: { scriptPath: 'res://scripts/player_controller.gd' },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_godot_scene',
      title: 'Запуск сцены Godot в headless режиме',
      action: 'Инициализация игрового цикла и физического тика',
      tool: 'Godot_RunScene',
      toolArgs: { scenePath: 'res://scenes/ArenaLevel.tscn', timeoutSec: 10 },
      status: 'pending',
    });
    return subtasks;
  }

  // Pattern 1: Create a script and execute it
  if (lower.includes('создай') || lower.includes('create') || lower.includes('скрипт') || lower.includes('файл') || lower.includes('write')) {
    // Extract filename if present (e.g., hello.py, ping.py, test.sh, index.js)
    const fileMatch = goal.match(/([a-zA-Z0-9_\-]+\.(py|js|ts|sh|ps1|json|html|txt))/i);
    const fileName = fileMatch ? fileMatch[1] : 'script.py';

    let fileContent = '# Auto-generated script by MCP Orchestrator\nprint("Hello from Autonomous MCP")\n';
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      fileContent = '// Auto-generated script by MCP Orchestrator\nconsole.log("Hello from Autonomous MCP");\n';
    } else if (fileName.endsWith('.sh')) {
      fileContent = '#!/bin/bash\necho "Hello from Autonomous MCP"\n';
    }

    subtasks.push({
      id: 'step_1_write',
      title: `Создание файла ${fileName}`,
      action: `Записать рабочий код в файл ${fileName} через FileWrite`,
      tool: 'FileWrite',
      toolArgs: {
        path: fileName,
        content: fileContent,
      },
      status: 'pending',
    });

    if (lower.includes('запусти') || lower.includes('run') || lower.includes('exec') || lower.includes('проверь') || lower.includes('powershell') || lower.includes('shell')) {
      const execCmd = fileName.endsWith('.py')
        ? `python ${fileName}`
        : fileName.endsWith('.js')
        ? `node ${fileName}`
        : `Get-Content ${fileName}`;

      subtasks.push({
        id: 'step_2_exec',
        title: `Исполнение ${fileName} через Shell`,
        action: `Запустить команду "${execCmd}" и перехватить stdout/stderr`,
        tool: 'Shell',
        toolArgs: {
          command: execCmd,
        },
        status: 'pending',
      });

      subtasks.push({
        id: 'step_3_verify',
        title: `Верификация результатов и валидация кода возврата`,
        action: `Анализ stdout на наличие ошибок и сверка с критерием успешности`,
        status: 'pending',
      });
    }
  } else if (lower.includes('unity') || lower.includes('юнити')) {
    subtasks.push({
      id: 'step_unity_inspect',
      title: 'Инспекция активной сцены Unity',
      action: 'Запрос текущей иерархии объектов через mcp-for-unity',
      tool: 'Unity_InspectScene',
      toolArgs: { depth: 3 },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_unity_create',
      title: 'Создание игрового объекта',
      action: 'Инстанцирование целевого GameObject в сцене',
      tool: 'Unity_CreateGameObject',
      toolArgs: { name: 'MCP_Agent_Controller', components: 'BoxCollider,Rigidbody' },
      status: 'pending',
    });
  } else if (lower.includes('wsl') || lower.includes('linux')) {
    subtasks.push({
      id: 'step_wsl_command',
      title: 'Выполнение Linux команды через WSL',
      action: 'Вызов bash через wsl_exec',
      tool: 'wsl_exec',
      toolArgs: { command: 'uname -a && uptime' },
      status: 'pending',
    });
  } else {
    // Generic multi-step plan
    subtasks.push({
      id: 'step_1_analyze',
      title: 'Анализ контекста и планирование шагов',
      action: `Оценка доступных инструментов для задачи: ${goal}`,
      status: 'pending',
    });
    subtasks.push({
      id: 'step_2_execute',
      title: 'Исполнение основной операции',
      action: 'Вызов релевантного MCP инструмента для реализации цели',
      tool: 'Shell',
      toolArgs: { command: `echo "Processing: ${goal.slice(0, 40)}..."` },
      status: 'pending',
    });
    subtasks.push({
      id: 'step_3_validate',
      title: 'Проверка целостности и отчет',
      action: 'Верификация финального состояния и формирование итогового отчета',
      status: 'pending',
    });
  }

  return subtasks;
}

export function isTaskStalled(task: Task, stallTimeoutMs: number = 60000): boolean {
  if (task.status !== 'running') return false;
  return Date.now() - task.lastActivity > stallTimeoutMs;
}
