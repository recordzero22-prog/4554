import test from 'node:test';
import assert from 'node:assert/strict';
import { createRpcRequest, parseRpcResponse } from './mcpProtocol';
import { evaluateHITLPolicy } from './hitlPolicy';
import { createNewTask, decomposeGoalHeuristically, isTaskStalled } from './dagPlanner';
import { SandboxEngine } from './sandboxEngine';
import { executeCascade, DEFAULT_PROVIDERS } from './modelCascade';

test('MCP Protocol: creates valid JSON-RPC 2.0 request', () => {
  const req = createRpcRequest('tools/call', { name: 'Shell', arguments: { command: 'dir' } }, 42);
  assert.equal(req.jsonrpc, '2.0');
  assert.equal(req.id, 42);
  assert.equal(req.method, 'tools/call');
  assert.deepEqual(req.params, { name: 'Shell', arguments: { command: 'dir' } });
});

test('MCP Protocol: parses valid JSON-RPC 2.0 response and handles errors', () => {
  const successRes = parseRpcResponse({
    jsonrpc: '2.0',
    id: 1,
    result: { content: [{ type: 'text', text: 'Hello' }] }
  });
  assert.equal(successRes.success, true);

  const errorRes = parseRpcResponse({
    jsonrpc: '2.0',
    id: 1,
    error: { code: -32601, message: 'Method not found' }
  });
  assert.equal(errorRes.success, false);
  assert.match(errorRes.error || '', /Method not found/);
});

test('HITL Policy: flags critical commands like rm -rf, shutdown, and format', () => {
  const riskyCheck = evaluateHITLPolicy('Shell', { command: 'rm -rf /workspace' });
  assert.equal(riskyCheck.requiresApproval, true);
  assert.equal(riskyCheck.riskLevel, 'critical');

  const safeCheck = evaluateHITLPolicy('Shell', { command: 'python hello.py' });
  assert.equal(safeCheck.requiresApproval, false);

  const formatCheck = evaluateHITLPolicy('Shell', { command: 'format C: /fs:NTFS' });
  assert.equal(formatCheck.requiresApproval, true);

  const pathEscCheck = evaluateHITLPolicy('FileWrite', { path: '../../etc/passwd', content: 'test' });
  assert.equal(pathEscCheck.requiresApproval, true);
});

test('DAG Planner: creates task and decomposes script goal into DAG steps', () => {
  const task = createNewTask('Создай в папке workspace файл hello.py, запусти его через PowerShell и проверь вывод');
  assert.equal(task.status, 'queued');

  const steps = decomposeGoalHeuristically(task.goal);
  assert.ok(steps.length >= 2, 'Should decompose into at least 2 steps');
  assert.equal(steps[0].tool, 'FileWrite');
  assert.equal(steps[1].tool, 'Shell');
});

test('DAG Planner: watchdog detects stalled task after timeout', () => {
  const task = createNewTask('Test stall');
  task.status = 'running';
  task.lastActivity = Date.now() - 70000;
  assert.equal(isTaskStalled(task, 60000), true);

  task.lastActivity = Date.now();
  assert.equal(isTaskStalled(task, 60000), false);
});

test('Sandbox Engine: writes file and executes Python script correctly', () => {
  const sandbox = new SandboxEngine([]);
  const writeRes = sandbox.executeTool('FileWrite', {
    path: 'test_script.py',
    content: 'print("Hello from Autonomous MCP")'
  });
  assert.equal(writeRes.ok, true);

  const file = sandbox.getFile('test_script.py');
  assert.ok(file);
  assert.equal(file?.name, 'test_script.py');

  const execRes = sandbox.executeTool('Shell', { command: 'python test_script.py' });
  assert.equal(execRes.ok, true);
  assert.match(execRes.result, /Hello from Autonomous MCP/);
});

test('Model Cascade: falls back to subsequent model when primary fails', () => {
  let attempt = 0;
  const result = executeCascade(DEFAULT_PROVIDERS, (provider, model) => {
    attempt++;
    if (provider.id === 'unorouter') {
      return { success: false, error: 'HTTP 429: Rate limit exceeded', latencyMs: 50 };
    }
    return { success: true, result: `Success with ${provider.name} (${model})`, latencyMs: 120 };
  });

  assert.ok(result.winner, 'Cascade should find a working winner');
  assert.notEqual(result.winner?.provider.id, 'unorouter');
  assert.ok(result.history.some(h => h.error?.includes('429')));
});

test('TaskStorage: persists and reloads tasks across reloads', async () => {
  const { saveTasks, loadTasks, clearTasks, saveActiveTaskId, loadActiveTaskId } = await import('./taskStorage');
  clearTasks();

  const mockTasks = [
    {
      id: 'task_persisted_1',
      goal: 'Persistent task test',
      origin: 'test',
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      subtasks: [
        {
          id: 'sub_1',
          title: 'Step 1',
          action: 'Testing action',
          status: 'completed' as const,
          output: 'Done',
        },
      ],
      currentSubtaskIndex: 1,
      currentStep: 1,
      logs: [],
      lastActivity: Date.now(),
    },
  ];

  const saved = saveTasks(mockTasks);
  assert.equal(saved, true);

  const loaded = loadTasks();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'task_persisted_1');
  assert.equal(loaded[0].goal, 'Persistent task test');
  assert.equal(loaded[0].status, 'completed');

  saveActiveTaskId('task_persisted_1');
  assert.equal(loadActiveTaskId(), 'task_persisted_1');

  clearTasks();
  assert.equal(loadTasks().length, 0);
  assert.equal(loadActiveTaskId(), null);
});

test('TaskStorage: interrupted running task transitions to stalled on reload', async () => {
  const { saveTasks, loadTasks, clearTasks } = await import('./taskStorage');
  clearTasks();

  const interruptedTask = {
    id: 'task_interrupted',
    goal: 'Long running task',
    origin: 'test',
    status: 'running' as const,
    createdAt: new Date().toISOString(),
    subtasks: [],
    currentSubtaskIndex: 0,
    currentStep: 0,
    logs: [],
    lastActivity: Date.now(),
  };

  saveTasks([interruptedTask]);
  const reloaded = loadTasks();
  assert.equal(reloaded[0].status, 'stalled');
  assert.ok(reloaded[0].error?.includes('прервано'));

  clearTasks();
});

test('AgentSystemContext: generates briefing with tools, workspace, and role directives', async () => {
  const { generateAgentSystemBriefing, extractTaskFromText } = await import('./agentSystemContext');

  const briefing = generateAgentSystemBriefing({ role: 'developer' });
  assert.ok(briefing.includes('MCP UNIVERSAL STUDIO v2'));
  assert.ok(briefing.includes('FileWrite'));
  assert.ok(briefing.includes('workspace/'));
  assert.ok(briefing.includes('Alt + O'));
  assert.ok(briefing.includes('Старший разработчик'));

  // Test extraction from ```mcp-task block
  const sampleWithBlock = `Конечно! Вот задача:\n\`\`\`mcp-task\nСоздай hello.py и запусти в Shell\n\`\`\`\nУдачи!`;
  assert.equal(extractTaskFromText(sampleWithBlock), 'Создай hello.py и запусти в Shell');

  // Test extraction from action line
  const sampleWithAction = `Приветствую.\nСоздай файл test.sh и запусти его в WSL.\nДо свидания.`;
  assert.equal(extractTaskFromText(sampleWithAction), 'Создай файл test.sh и запусти его в WSL.');
});

test('Self-Healing Engine: accurately classifies stderr and recommends auto-fixes', async () => {
  const { analyzeExecutionFailure } = await import('./selfHealing');

  // 1. Python missing package
  const pyErr = `Traceback (most recent call last):\n  File "script.py", line 1, in <module>\n    import requests\nModuleNotFoundError: No module named 'requests'`;
  const pyFix = analyzeExecutionFailure(pyErr, 'python script.py');
  assert.equal(pyFix.errorType, 'missing_python_pkg');
  assert.equal(pyFix.autoApplicable, true);
  assert.equal(pyFix.fixTool, 'Shell');
  assert.equal((pyFix.fixArgs as any).command, 'pip install requests');

  // 2. Node.js missing package
  const nodeErr = `Error: Cannot find module 'lodash'\nRequire stack:\n- /workspace/app.js`;
  const nodeFix = analyzeExecutionFailure(nodeErr, 'node app.js');
  assert.equal(nodeFix.errorType, 'missing_node_pkg');
  assert.equal(nodeFix.autoApplicable, true);
  assert.equal((nodeFix.fixArgs as any).command, 'npm install lodash');

  // 3. Python syntax error
  const syntaxErr = `  File "bad.py", line 3\n    def func(\n            ^\nSyntaxError: unexpected EOF while parsing`;
  const syntaxFix = analyzeExecutionFailure(syntaxErr, 'python bad.py', 'bad.py');
  assert.equal(syntaxFix.errorType, 'syntax_error');
  assert.equal(syntaxFix.autoApplicable, true);
  assert.equal(syntaxFix.fixTool, 'FileWrite');

  // 4. Skyrim LE NIF error
  const nifErr = `BSLightingShaderProperty: Invalid flags SLSF1 in NetImmerse block 14 of mesh.nif`;
  const nifFix = analyzeExecutionFailure(nifErr);
  assert.equal(nifFix.errorType, 'skyrim_nif_error');
  assert.equal(nifFix.fixTool, 'Skyrim_NifParse');

  // 5. Blender bpy context error
  const bpyErr = `RuntimeError: Operator bpy.ops.object.mode_set.poll() failed, context is incorrect`;
  const bpyFix = analyzeExecutionFailure(bpyErr);
  assert.equal(bpyFix.errorType, 'blender_error');
  assert.equal(bpyFix.fixTool, 'Blender_ExecuteScript');

  // 6. Unity missing component
  const unityErr = `MissingComponentException: There is no 'Rigidbody' attached to the 'Hero' game object`;
  const unityFix = analyzeExecutionFailure(unityErr);
  assert.equal(unityFix.errorType, 'unity_missing_comp');
  assert.equal(unityFix.fixTool, 'Unity_AddComponent');
});

test('GameDev & Skyrim LE MCP Suite: executes tools with verified signatures', async () => {
  const { GAMEDEV_MCP_TOOLS, executeGamedevTool } = await import('./gamedevMcpTools');

  assert.ok(GAMEDEV_MCP_TOOLS.length >= 12, 'Catalog must contain rich set of tools');

  // Skyrim LE NIF Parse
  const nifRes = executeGamedevTool('Skyrim_NifParse', { path: 'weapons/sword.nif', autoSanitize: true });
  assert.equal(nifRes.ok, true);
  assert.ok(nifRes.result.includes('v20.2.0.7'));
  assert.ok(nifRes.result.includes('BSLightingShaderProperty'));

  // Skyrim LE ESP Inspect
  const espRes = executeGamedevTool('Skyrim_EspInspect', { espPath: 'Data/CyberArmor.esp' });
  assert.equal(espRes.ok, true);
  assert.ok(espRes.result.includes('TES4 Plugin Inspector'));

  // Skyrim LE Papyrus Compiler
  const pexRes = executeGamedevTool('Skyrim_PapyrusCompile', { pscPath: 'Scripts/Source/Quest.psc' });
  assert.equal(pexRes.ok, true);
  assert.ok(pexRes.result.includes('.pex'));

  // Blender Parametric Mesh
  const blendRes = executeGamedevTool('Blender_GenerateMesh', { meshType: 'armored_drone_hull' });
  assert.equal(blendRes.ok, true);
  assert.ok(blendRes.result.includes('Blender 4.2 LTS'));

  // Rigging Auto Bone Generate
  const rigRes = executeGamedevTool('Rigging_AutoBoneGenerate', { modelPath: 'hero.obj', rigType: 'humanoid_biped' });
  assert.equal(rigRes.ok, true);
  assert.ok(rigRes.result.includes('Auto-Rig Engine'));

  // Unity GameObject
  const unityRes = executeGamedevTool('Unity_CreateGameObject', { name: 'Player', components: 'Rigidbody' });
  assert.equal(unityRes.ok, true);
  assert.ok(unityRes.result.includes('mcp-for-unity'));

  // Godot Run Scene
  const godotRes = executeGamedevTool('Godot_RunScene', { scenePath: 'res://Main.tscn' });
  assert.equal(godotRes.ok, true);
  assert.ok(godotRes.result.includes('Godot 4.3 Engine Headless'));
});

test('OpenCode Bridge: manages sessions, generates opencode.json, and executes queries', async () => {
  const { createOpenCodeSession, generateOpencodeJson, runOpencodeSessionPrompt, DEFAULT_OPENCODE_MODELS } = await import('./opencodeBridge');

  assert.ok(DEFAULT_OPENCODE_MODELS.length >= 3);

  // JSON generation
  const jsonStr = generateOpencodeJson('opencode/claude-3-7-sonnet', ['winremote', 'skyrim_modding', 'gamedev_blender']);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.defaultModel, 'opencode/claude-3-7-sonnet');
  assert.ok(parsed.servers.winremote);
  assert.ok(parsed.servers.skyrim_modding);

  // Session lifecycle
  const session = createOpenCodeSession('Test Modder', 'opencode/deepseek-r1');
  assert.equal(session.name, 'Test Modder');
  assert.equal(session.status, 'idle');

  // Session execution with Skyrim prompt
  const execResult = await runOpencodeSessionPrompt(session, 'Проверь nif файл для Skyrim LE');
  assert.ok(execResult.toolCallsMade.includes('skyrim_inspect_nif'));
  assert.ok(session.logs.length >= 3);
  assert.equal(session.status, 'idle');
});

test('Sandbox Engine: executes GameDev tools and handles self-healing recovery commands', () => {
  const sandbox = new SandboxEngine([]);

  // Skyrim tool through sandbox
  const nifRes = sandbox.executeTool('Skyrim_NifParse', { path: 'armor.nif' });
  assert.equal(nifRes.ok, true);
  assert.ok(nifRes.result.includes('Skyrim LE'));

  // pip install simulation
  const pipRes = sandbox.executeTool('Shell', { command: 'pip install requests' });
  assert.equal(pipRes.ok, true);
  assert.ok(pipRes.result.includes('Successfully installed requests'));

  // simulated failure trigger
  const failRes = sandbox.executeTool('Shell', { command: 'python fail_python_script.py' });
  assert.equal(failRes.ok, false);
  assert.ok(failRes.result.includes('ModuleNotFoundError'));
});

test('TaskStorage: persists and restores custom providers', async () => {
  const { saveProviders, loadProviders } = await import('./taskStorage');

  const customProviders = [
    {
      id: 'prov_custom_1',
      name: 'Groq Fast LPU',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKeyMasked: 'env:GROQ_API_KEY (gsk_••••••••)',
      models: ['llama-3.3-70b-versatile', 'qwen-2.5-coder-32b'],
      status: 'active' as const,
      latencyMs: 95,
      isCustom: true,
      authType: 'env_var' as const,
      envVarName: 'GROQ_API_KEY',
    },
  ];

  const saved = saveProviders(customProviders);
  assert.equal(saved, true);

  const loaded = loadProviders();
  assert.ok(loaded);
  assert.equal(loaded?.length, 1);
  assert.equal(loaded?.[0].name, 'Groq Fast LPU');
  assert.equal(loaded?.[0].isCustom, true);
  assert.equal(loaded?.[0].envVarName, 'GROQ_API_KEY');
});


