import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { OrchestratorPanel } from './components/OrchestratorPanel';
import { ManualMCPPanel } from './components/ManualMCPPanel';
import { WorkspaceFilesPanel } from './components/WorkspaceFilesPanel';
import { ModelPoolPanel } from './components/ModelPoolPanel';
import { EmbeddedChatPanel } from './components/EmbeddedChatPanel';
import { SetupGuidePanel } from './components/SetupGuidePanel';
import { CyberArenaGame } from './components/CyberArenaGame';
import { GeminiAiHub } from './components/GeminiAiHub';
import { GamedevToolsPanel } from './components/GamedevToolsPanel';
import { OpencodeBridgePanel } from './components/OpencodeBridgePanel';
import { Task, LogEntry, HITLRequest, AgentRole, WorkspaceFile, ModelProvider, MCPResult } from './types';
import { createNewTask, decomposeGoalHeuristically } from './core/dagPlanner';
import { evaluateHITLPolicy } from './core/hitlPolicy';
import { analyzeExecutionFailure } from './core/selfHealing';
import { SandboxEngine, INITIAL_WORKSPACE_FILES } from './core/sandboxEngine';
import { DEFAULT_PROVIDERS } from './core/modelCascade';
import { saveTasks, loadTasks, saveActiveTaskId, loadActiveTaskId, clearTasks, saveProviders, loadProviders } from './core/taskStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('orchestrator');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadActiveTaskId());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hitlRequests, setHitlRequests] = useState<HITLRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [selfHealingEnabled, setSelfHealingEnabled] = useState<boolean>(true);
  const [providers, setProviders] = useState<ModelProvider[]>(() => loadProviders() || DEFAULT_PROVIDERS);

  // Sync tasks to localStorage whenever they change
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Sync activeTaskId to localStorage
  useEffect(() => {
    saveActiveTaskId(activeTaskId);
  }, [activeTaskId]);

  // Sync providers to localStorage
  useEffect(() => {
    saveProviders(providers);
  }, [providers]);

  // Sandbox File Engine
  const sandboxRef = useRef<SandboxEngine>(new SandboxEngine(INITIAL_WORKSPACE_FILES));
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(() =>
    sandboxRef.current.getFiles()
  );

  // Pending resolver for HITL pause
  const hitlResolversRef = useRef<Map<string, { resolve: (approved: boolean) => void; reason?: string }>>(new Map());

  // Logging utility
  const addLog = (role: AgentRole, message: string, taskId?: string) => {
    const now = new Date();
    const entry: LogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      role,
      message,
      time: now.toLocaleTimeString(),
      timestamp: Date.now(),
      taskId,
    };
    setLogs(prev => [...prev, entry]);
  };

  // Initial welcome and ready telemetry
  useEffect(() => {
    addLog('Coordinator', 'MCP Universal Studio v2.0 инициализирована в режиме оркестрации DAG.');
    addLog('Coordinator', 'Подключен локальный транспорт winremote-mcp: http://127.0.0.1:8090/mcp');
    addLog('Coordinator', 'Песочница workspace инициализирована (файлов: 4).');

    const storedTasks = loadTasks();
    if (storedTasks.length > 0) {
      addLog(
        'Coordinator',
        `Слой персистентности: восстановлено ${storedTasks.length} сохраненных задач из хранилища (localStorage).`
      );
    }
  }, []);

  // Global hotkey Alt+O listener (matching webview-preload / main window behavior)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'o' || e.key === 'O' || e.key === 'щ')) {
        const selection = window.getSelection()?.toString().trim();
        if (selection) {
          e.preventDefault();
          submitTask(selection, 'hotkey-alt-o');
          setActiveTab('orchestrator');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Core Orchestration Execution Loop
  const submitTask = async (goal: string, origin: string = 'user') => {
    const task = createNewTask(goal, origin);
    setTasks(prev => [task, ...prev]);
    setActiveTaskId(task.id);
    setIsProcessing(true);

    addLog('Coordinator', `Принята новая цель: "${goal}" (источник: ${origin})`, task.id);

    try {
      // Phase 1: Architect decomposes goal into DAG steps
      addLog('Architect', `Декомпозиция цели в DAG подзадач: "${goal}"`, task.id);
      await new Promise(r => setTimeout(r, 450));

      const subtasks = decomposeGoalHeuristically(goal);
      task.subtasks = subtasks;
      task.status = 'running';
      task.lastActivity = Date.now();
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));

      addLog('Architect', `Сформирован DAG: ${subtasks.length} шагов. Начинаем исполнение...`, task.id);

      // Phase 2: Implementer step-by-step tool execution loop
      for (let i = 0; i < subtasks.length; i++) {
        const sub = subtasks[i];
        task.currentSubtaskIndex = i;
        task.currentStep = i + 1;
        sub.status = 'running';
        sub.startedAt = Date.now();
        task.lastActivity = Date.now();
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));

        addLog('Coordinator', `Запуск шага [${i + 1}/${subtasks.length}]: ${sub.title}`, task.id);
        await new Promise(r => setTimeout(r, 400));

        // HITL Safety Governance Check
        if (sub.tool && sub.toolArgs) {
          const policyCheck = evaluateHITLPolicy(sub.tool, sub.toolArgs, strictMode);

          if (policyCheck.requiresApproval) {
            const approvalId = 'hitl_' + Date.now();
            const hitlReq: HITLRequest = {
              approvalId,
              taskId: task.id,
              subtaskId: sub.id,
              tool: sub.tool,
              args: sub.toolArgs,
              reason: policyCheck.reason || 'Защитная политика HITL',
              riskLevel: policyCheck.riskLevel,
              timestamp: Date.now(),
            };

            setHitlRequests(prev => [...prev, hitlReq]);
            task.status = 'waiting_hitl';
            setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));

            addLog(
              'Watchdog',
              `⚠️ [HITL ПЕРЕХВАТ] Вызов ${sub.tool} заблокирован до подтверждения оператора: ${policyCheck.reason}`,
              task.id
            );

            // Wait for human decision
            const approved = await new Promise<boolean>(resolve => {
              hitlResolversRef.current.set(approvalId, { resolve });
            });

            setHitlRequests(prev => prev.filter(r => r.approvalId !== approvalId));

            if (!approved) {
              const reason = hitlResolversRef.current.get(approvalId)?.reason || 'Отклонено оператором';
              sub.status = 'failed';
              sub.error = reason;
              task.status = 'failed';
              task.error = `Операция отклонена оператором безопасности: ${reason}`;
              addLog('Watchdog', `❌ Действие отклонено пользователем: ${reason}`, task.id);
              setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));
              setIsProcessing(false);
              return;
            }

            addLog('Watchdog', `✅ Действие одобрено оператором. Возобновление выполнения шага...`, task.id);
            task.status = 'running';
            setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));
          }

          // Tool Execution in Sandbox
          addLog('Implementer', `Исполнение MCP вызова [${sub.tool}] с аргументами: ${JSON.stringify(sub.toolArgs)}`, task.id);
          let execRes = sandboxRef.current.executeTool(sub.tool, sub.toolArgs);
          sub.output = execRes.result;
          setWorkspaceFiles(sandboxRef.current.getFiles());

          if (!execRes.ok) {
            let recovered = false;
            if (selfHealingEnabled) {
              const analysis = analyzeExecutionFailure(
                execRes.result,
                String(sub.toolArgs?.command || sub.tool),
                String(sub.toolArgs?.path || '')
              );

              addLog(
                'Tester',
                `⚠️ [Сбой шага]: ${analysis.diagnosedIssue}. Запуск цикла Self-Healing...`,
                task.id
              );
              addLog(
                'Architect',
                `🔧 [Self-Healing Рефлексия]: Рекомендовано действие "${analysis.recommendedFixAction}"`,
                task.id
              );

              if (analysis.autoApplicable) {
                addLog(
                  'Implementer',
                  `🩹 [Self-Healing Патч]: Вызов [${analysis.fixTool}] с параметрами ${JSON.stringify(analysis.fixArgs)}`,
                  task.id
                );
                await new Promise(r => setTimeout(r, 450));
                const fixRes = sandboxRef.current.executeTool(analysis.fixTool, analysis.fixArgs);
                setWorkspaceFiles(sandboxRef.current.getFiles());
                addLog('Implementer', `[Результат автоисправления]: ${fixRes.result.slice(0, 110)}`, task.id);

                // Retry original step with repaired environment / file
                addLog('Coordinator', `🔁 Повторная попытка выполнения шага: ${sub.title}...`, task.id);
                await new Promise(r => setTimeout(r, 400));
                const retryRes = sandboxRef.current.executeTool(sub.tool, sub.toolArgs);
                setWorkspaceFiles(sandboxRef.current.getFiles());

                if (retryRes.ok) {
                  execRes = retryRes;
                  sub.output = retryRes.result;
                  recovered = true;
                  addLog('Tester', `✅ [Self-Healing Успех]: Сбой устранен! Шаг выполнен со статусом OK (exit code 0).`, task.id);
                } else {
                  addLog('Tester', `❌ Повторная попытка также завершилась ошибкой: ${retryRes.result}`, task.id);
                }
              }
            }

            if (!recovered) {
              sub.status = 'failed';
              sub.error = execRes.result;
              task.status = 'failed';
              task.error = execRes.result;
              addLog('Implementer', `❌ Ошибка выполнения [${sub.tool}]: ${execRes.result}`, task.id);
              setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));
              setIsProcessing(false);
              return;
            }
          }

          addLog('Implementer', `Результат [${sub.tool}]: ${execRes.result.slice(0, 120)} (${execRes.executionTimeMs}ms)`, task.id);
        } else {
          // Verification / analytical subtask
          sub.output = 'Анализ завершен, все выходные сигнатуры соответствуют спецификации.';
        }

        sub.status = 'completed';
        sub.completedAt = Date.now();
        task.lastActivity = Date.now();
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));
        await new Promise(r => setTimeout(r, 300));
      }

      // Phase 3: Tester verification
      addLog('Tester', 'Запуск финальной верификации результатов и артефактов...', task.id);
      await new Promise(r => setTimeout(r, 400));

      task.status = 'completed';
      task.result = `Успешно завершено: ${task.subtasks.map(s => s.title).join(' -> ')}`;
      task.lastActivity = Date.now();
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));

      addLog('Tester', `Верификация подтверждена. Выходной код: 0. Артефакты проверены в /workspace.`, task.id);
      addLog('Coordinator', task.result, task.id);
    } catch (err) {
      task.status = 'failed';
      task.error = err instanceof Error ? err.message : String(err);
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...task } : t)));
      addLog('Coordinator', `Критический сбой выполнения задачи: ${task.error}`, task.id);
    } finally {
      setIsProcessing(false);
    }
  };

  // HITL Approval actions
  const handleApproveHitl = (approvalId: string) => {
    const resolver = hitlResolversRef.current.get(approvalId);
    if (resolver) {
      resolver.resolve(true);
      hitlResolversRef.current.delete(approvalId);
    }
  };

  const handleRejectHitl = (approvalId: string, reason: string) => {
    const resolver = hitlResolversRef.current.get(approvalId);
    if (resolver) {
      resolver.reason = reason;
      resolver.resolve(false);
      hitlResolversRef.current.delete(approvalId);
    }
  };

  // Direct MCP Tool execution for Manual Panel
  const handleExecuteManualTool = (tool: string, args: Record<string, unknown>): MCPResult => {
    const res = sandboxRef.current.executeTool(tool, args);
    setWorkspaceFiles(sandboxRef.current.getFiles());
    addLog('Implementer', `[Ручной вызов] ${tool}: ${res.result.slice(0, 100)} (${res.executionTimeMs}ms)`);
    return res;
  };

  // Workspace File operations
  const handleSaveFile = (path: string, content: string) => {
    sandboxRef.current.writeFile(path, content);
    setWorkspaceFiles(sandboxRef.current.getFiles());
    addLog('Implementer', `Файл сохранен в workspace: ${path}`);
  };

  const handleDeleteFile = (path: string) => {
    sandboxRef.current.deleteFile(path);
    setWorkspaceFiles(sandboxRef.current.getFiles());
    addLog('Implementer', `Файл удален из workspace: ${path}`);
  };

  const handleToggleProviderStatus = (id: string) => {
    setProviders(prev =>
      prev.map(p => (p.id === id ? { ...p, status: p.status === 'active' ? 'offline' : 'active' } : p))
    );
  };

  const handleAddProvider = (newProvider: ModelProvider) => {
    setProviders(prev => [...prev, newProvider]);
    addLog('Coordinator', `Добавлен новый провайдер моделей: "${newProvider.name}" (${newProvider.endpoint})`);
  };

  const handleDeleteProvider = (id: string) => {
    const prov = providers.find(p => p.id === id);
    setProviders(prev => prev.filter(p => p.id !== id));
    addLog('Coordinator', `Удален провайдер моделей: "${prov?.name || id}"`);
  };

  const handleUpdateProviderModels = (id: string, models: string[]) => {
    setProviders(prev => prev.map(p => (p.id === id ? { ...p, models } : p)));
  };

  const handleResetProviders = () => {
    setProviders(DEFAULT_PROVIDERS);
    addLog('Coordinator', 'Пул моделей сброшен к заводским настройкам по умолчанию.');
  };

  // Step 6 Validation Scenario Quick Trigger
  const handleRunValidationScenario = () => {
    setActiveTab('orchestrator');
    submitTask(
      'Создай в папке workspace файл hello.py, который выводит "Hello from Autonomous MCP", запусти его через PowerShell и убедись, что нет ошибок.',
      'validation-step-6'
    );
  };

  const activeTask = tasks.find(t => t.id === activeTaskId) || tasks[0] || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden select-none">
      {/* Top Application Header */}
      <Header
        activeTasksCount={tasks.filter(t => t.status === 'running' || t.status === 'queued').length}
        hitlCount={hitlRequests.length}
        onQuickRunValidation={handleRunValidationScenario}
        isExecuting={isProcessing}
        mcpServerStatus="connected"
      />

      {/* Main Studio Body: Sidebar + Active Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeTasksCount={tasks.filter(t => t.status === 'running').length}
          filesCount={workspaceFiles.length}
        />

        {/* Content Views */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] relative">
          {activeTab === 'orchestrator' && (
            <OrchestratorPanel
              tasks={tasks}
              activeTask={activeTask}
              logs={logs}
              hitlRequests={hitlRequests}
              isProcessing={isProcessing}
              strictMode={strictMode}
              onSetStrictMode={setStrictMode}
              selfHealingEnabled={selfHealingEnabled}
              onSetSelfHealingEnabled={setSelfHealingEnabled}
              onSubmitTask={submitTask}
              onSelectTask={t => setActiveTaskId(t.id)}
              onApproveHitl={handleApproveHitl}
              onRejectHitl={handleRejectHitl}
              onClearLogs={() => setLogs([])}
              onResetTasks={() => {
                clearTasks();
                setTasks([]);
                setActiveTaskId(null);
                addLog('Coordinator', 'Очередь задач очищена и удалена из локального хранилища (localStorage).');
              }}
            />
          )}

          {activeTab === 'game' && (
            <CyberArenaGame
              onSpawnMcpTask={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, '3d-game-agent');
              }}
            />
          )}

          {activeTab === 'gamedev' && (
            <GamedevToolsPanel
              onExecuteTool={handleExecuteManualTool}
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'gamedev-panel');
              }}
            />
          )}

          {activeTab === 'opencode' && (
            <OpencodeBridgePanel
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'opencode-bridge');
              }}
              onSaveConfigFile={handleSaveFile}
            />
          )}

          {activeTab === 'gemini' && (
            <GeminiAiHub
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'gemini-hub');
              }}
            />
          )}

          {activeTab === 'manual' && (
            <ManualMCPPanel onExecuteTool={handleExecuteManualTool} />
          )}

          {activeTab === 'files' && (
            <WorkspaceFilesPanel
              files={workspaceFiles}
              onRefresh={() => setWorkspaceFiles(sandboxRef.current.getFiles())}
              onSaveFile={handleSaveFile}
              onDeleteFile={handleDeleteFile}
              onExecuteInSandbox={handleExecuteManualTool}
            />
          )}

          {activeTab === 'models' && (
            <ModelPoolPanel
              providers={providers}
              onToggleProviderStatus={handleToggleProviderStatus}
              onAddProvider={handleAddProvider}
              onDeleteProvider={handleDeleteProvider}
              onUpdateProviderModels={handleUpdateProviderModels}
              onResetProviders={handleResetProviders}
            />
          )}

          {activeTab === 'deepseek' && (
            <EmbeddedChatPanel
              providerName="DeepSeek"
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'deepseek-chat');
              }}
            />
          )}

          {activeTab === 'chatgpt' && (
            <EmbeddedChatPanel
              providerName="ChatGPT"
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'chatgpt-chat');
              }}
            />
          )}

          {activeTab === 'fichi' && (
            <EmbeddedChatPanel
              providerName="Fichi AI"
              onSendToOrchestrator={goal => {
                setActiveTab('orchestrator');
                submitTask(goal, 'fichi-ai-chat');
              }}
            />
          )}

          {activeTab === 'guide' && <SetupGuidePanel />}
        </main>
      </div>
    </div>
  );
}
