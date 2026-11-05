import React, { useState } from 'react';
import { Rocket, Sparkles, CheckCircle2, Clock, AlertTriangle, RefreshCw, ShieldCheck, ChevronRight } from 'lucide-react';
import { Task, LogEntry, HITLRequest } from '../types';
import { HITLBanner } from './HITLBanner';
import { DagVisualizer } from './DagVisualizer';
import { LogsPanel } from './LogsPanel';

interface OrchestratorPanelProps {
  tasks: Task[];
  activeTask: Task | null;
  logs: LogEntry[];
  hitlRequests: HITLRequest[];
  isProcessing: boolean;
  strictMode: boolean;
  onSetStrictMode: (val: boolean) => void;
  selfHealingEnabled?: boolean;
  onSetSelfHealingEnabled?: (val: boolean) => void;
  onSubmitTask: (goal: string, origin?: string) => void;
  onSelectTask: (task: Task) => void;
  onApproveHitl: (approvalId: string) => void;
  onRejectHitl: (approvalId: string, reason: string) => void;
  onClearLogs: () => void;
  onResetTasks: () => void;
}

export const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({
  tasks,
  activeTask,
  logs,
  hitlRequests,
  isProcessing,
  strictMode,
  onSetStrictMode,
  selfHealingEnabled = true,
  onSetSelfHealingEnabled,
  onSubmitTask,
  onSelectTask,
  onApproveHitl,
  onRejectHitl,
  onClearLogs,
  onResetTasks,
}) => {
  const [goal, setGoal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isProcessing) return;
    onSubmitTask(goal.trim(), 'ui-studio');
    setGoal('');
  };

  const presetGoals = [
    {
      title: 'Шаг 6: hello.py + Shell',
      desc: 'Создай в папке workspace файл hello.py, который выводит "Hello from Autonomous MCP", запусти его через PowerShell и убедись, что нет ошибок.',
      tag: 'Step 6',
    },
    {
      title: 'Self-Healing Тест (Auto-Fix)',
      desc: 'Запусти скрипт с отсутствующим модулем "requests", перехвати stderr через Self-Healing Loop, установи pip install requests и заверши задачу с exit code 0.',
      tag: 'Self-Healing',
    },
    {
      title: 'Skyrim LE: NIF & Papyrus',
      desc: 'Проведи санитайзинг 3D-файла daedric_sword.nif под стандарт v20.2.0.7, инспектируй плагин CyberArmory.esp и скомпилируй скрипт Papyrus PSC в PEX.',
      tag: 'Skyrim LE',
    },
    {
      title: 'Blender bpy & 3D Риггинг',
      desc: 'Сгенерируй параметрический 3D меш бронированного дрона в Blender bpy, добавь арматуру скелета и сконвертируй анимацию FBX в оптимизированный GLTF.',
      tag: 'Blender & Rig',
    },
    {
      title: 'Unity Инспекция Сцены',
      desc: 'Инспектируй текущую сцену Unity, создай новый игровой объект MCP_Player_Drone с компонентами Rigidbody и BoxCollider.',
      tag: 'Unity',
    },
    {
      title: 'Тест безопасности HITL',
      desc: 'Попробуй выполнить команду "rm -rf /workspace/cache", чтобы проверить перехват опасных операций политикой HITL.',
      tag: 'HITL Test',
    },
  ];

  const statusBadges = {
    queued: { bg: 'bg-[#6e7681]', text: 'В очереди' },
    running: { bg: 'bg-[#1f6feb] animate-pulse', text: 'Исполняется' },
    waiting_hitl: { bg: 'bg-amber-600 animate-bounce', text: 'HITL Пауза' },
    completed: { bg: 'bg-[#238636]', text: 'Завершено' },
    failed: { bg: 'bg-[#da3633]', text: 'Сбой' },
    stalled: { bg: 'bg-orange-600', text: 'Зависание' },
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
      {/* Top Banner & Goal Input */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-400" />
              <span>Центр автономных задач (DAG Orchestrator)</span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              Архитектор декомпозирует цель в граф шагов, Имплементер вызывает MCP-инструменты, Тестировщик верифицирует результат.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Self-Healing Loop Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[#c9d1d9] select-none bg-[#0d1117] px-2.5 py-1 rounded-md border border-[#30363d]">
              <input
                type="checkbox"
                checked={selfHealingEnabled}
                onChange={e => onSetSelfHealingEnabled?.(e.target.checked)}
                className="rounded border-[#30363d] text-emerald-500 focus:ring-0"
              />
              <Sparkles className={`w-3.5 h-3.5 ${selfHealingEnabled ? 'text-emerald-400' : 'text-[#8b949e]'}`} />
              <span className="font-medium text-xs">Self-Healing Loop (Auto-Fix)</span>
            </label>

            {/* Strict Mode Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[#c9d1d9] select-none bg-[#0d1117] px-2.5 py-1 rounded-md border border-[#30363d]">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={e => onSetStrictMode(e.target.checked)}
                className="rounded border-[#30363d] text-blue-600 focus:ring-0"
              />
              <ShieldCheck className={`w-3.5 h-3.5 ${strictMode ? 'text-blue-400' : 'text-[#8b949e]'}`} />
              <span>Строгий HITL</span>
            </label>

            {/* Clear tasks button */}
            {tasks.length > 0 && (
              <button
                onClick={onResetTasks}
                className="flex items-center gap-1 text-[#8b949e] hover:text-white px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[11px] cursor-pointer"
                title="Очистить список задач"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Сбросить очередь</span>
              </button>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="task-input-box flex flex-col gap-2">
          <textarea
            id="task-goal-input"
            rows={2}
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Опиши цель задачи (например: 'Создай на Python скрипт ping.py, запусти через Shell и проверь вывод')..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-sans resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
              <span className="text-[#8b949e] text-[11px] font-medium mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Примеры:
              </span>
              {presetGoals.map(p => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => setGoal(p.desc)}
                  className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                >
                  {p.title}
                </button>
              ))}
            </div>

            <button
              id="btn-submit-task"
              type="submit"
              disabled={!goal.trim() || isProcessing}
              className="btn-primary flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-md shadow transition-colors cursor-pointer text-xs"
            >
              <Rocket className="w-4 h-4" />
              <span>{isProcessing ? 'Агенты работают...' : '🚀 Запустить автономно'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* HITL Safety Banner (if any pending approval) */}
      <HITLBanner
        requests={hitlRequests}
        onApprove={onApproveHitl}
        onReject={onRejectHitl}
      />

      {/* Active Task DAG Visualizer */}
      {activeTask && (
        <DagVisualizer task={activeTask} />
      )}

      {/* Main Two-Column Grid: Tasks DAG (Left) vs Agent Logs (Right) */}
      <div className="orchestrator-grid grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[380px]">
        {/* Left Column: Tasks List */}
        <div className="grid-col flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
              Текущие задачи (DAG Очередь)
            </h3>
            <span className="text-[11px] font-mono text-[#8b949e]">
              Всего: {tasks.length}
            </span>
          </div>

          <div id="tasks-list" className="tasks-list flex-1 overflow-y-auto space-y-2 pr-1">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-[#484f58] text-xs italic">
                Очередь задач пуста. Введите цель в поле выше или кликните на один из пресетов.
              </div>
            ) : (
              tasks.map(t => {
                const badge = statusBadges[t.status] || { bg: 'bg-gray-600', text: t.status };
                const isSelected = activeTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    id={t.id}
                    onClick={() => onSelectTask(t)}
                    className={`task-card p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-[#1c2430] shadow-sm'
                        : 'border-[#30363d] bg-[#21262d] hover:border-[#484f58]'
                    }`}
                  >
                    <div className="task-card-header flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-medium text-xs text-white line-clamp-2">
                        {t.goal}
                      </div>
                      <span
                        className={`badge shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white uppercase ${badge.bg}`}
                      >
                        {badge.text}
                      </span>
                    </div>

                    <div className="task-card-body flex items-center justify-between text-[11px] text-[#8b949e]">
                      <div className="flex items-center gap-3">
                        <span>Подзадачи: <strong className="text-[#c9d1d9]">{t.subtasks.length}</strong></span>
                        <span>Шаг: <strong className="text-[#c9d1d9]">{t.currentStep}</strong></span>
                        <span className="font-mono text-[10px] text-[#484f58]">{t.id.slice(0, 14)}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8b949e]" />
                    </div>

                    {t.result && (
                      <div className="mt-2 text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 p-1.5 rounded flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.result}</span>
                      </div>
                    )}

                    {t.error && (
                      <div className="mt-2 text-[11px] text-red-400 bg-red-950/20 border border-red-900/40 p-1.5 rounded flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.error}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Agents Logs */}
        <div className="grid-col flex flex-col overflow-hidden">
          <LogsPanel logs={logs} onClearLogs={onClearLogs} />
        </div>
      </div>
    </div>
  );
};
