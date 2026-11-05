import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Terminal, FileCode, CheckCheck, Shield } from 'lucide-react';
import { Subtask, Task } from '../types';

interface DagVisualizerProps {
  task: Task;
}

export const DagVisualizer: React.FC<DagVisualizerProps> = ({ task }) => {
  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(
    task.subtasks[task.currentSubtaskIndex] || task.subtasks[0] || null
  );

  if (task.subtasks.length === 0) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 text-center text-xs text-[#8b949e]">
        Декомпозиция DAG еще не выполнена. [Architect] ожидает анализа цели...
      </div>
    );
  }

  const getToolIcon = (tool?: string) => {
    if (!tool) return CheckCheck;
    if (tool === 'FileWrite' || tool === 'FileRead') return FileCode;
    if (tool === 'Shell' || tool === 'wsl_exec') return Terminal;
    return Shield;
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide flex items-center gap-2">
          <span>DAG Граф Подзадач</span>
          <span className="font-mono text-blue-400">({task.subtasks.length} шагов)</span>
        </div>
        <span className="text-[11px] text-[#8b949e]">
          Текущий шаг: <strong className="text-white font-mono">{task.currentSubtaskIndex + 1}</strong> из {task.subtasks.length}
        </span>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
        {task.subtasks.map((sub, idx) => {
          const isCurrent = idx === task.currentSubtaskIndex && task.status === 'running';
          const isWaitingHitl = idx === task.currentSubtaskIndex && task.status === 'waiting_hitl';
          const isSelected = selectedSubtask?.id === sub.id;
          const ToolIcon = getToolIcon(sub.tool);

          let borderClass = 'border-[#30363d] bg-[#21262d] text-[#c9d1d9]';
          if (sub.status === 'completed') {
            borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
          } else if (sub.status === 'failed') {
            borderClass = 'border-red-500/50 bg-red-950/20 text-red-300';
          } else if (isWaitingHitl) {
            borderClass = 'border-amber-500 bg-amber-950/40 text-amber-300 animate-pulse';
          } else if (isCurrent) {
            borderClass = 'border-blue-500 bg-blue-950/40 text-blue-300 ring-2 ring-blue-500/20';
          }

          return (
            <React.Fragment key={sub.id}>
              <button
                onClick={() => setSelectedSubtask(sub)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all shrink-0 text-left ${borderClass} ${
                  isSelected ? 'ring-1 ring-white/30' : ''
                }`}
              >
                <div className="p-1 rounded bg-black/30">
                  <ToolIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{idx + 1}. {sub.title}</span>
                    {sub.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                    {isCurrent && <Clock className="w-3 h-3 text-blue-400 animate-spin shrink-0" />}
                    {sub.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-[#8b949e] font-mono">
                    {sub.tool || 'Verification'}
                  </div>
                </div>
              </button>

              {idx < task.subtasks.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[#484f58] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedSubtask && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span className="text-blue-400 font-mono">#{selectedSubtask.id}</span>
              <span>{selectedSubtask.title}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                selectedSubtask.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : selectedSubtask.status === 'running'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : selectedSubtask.status === 'failed'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {selectedSubtask.status}
            </span>
          </div>

          <div className="text-[#c9d1d9]">
            <span className="text-[#8b949e]">Действие: </span>
            {selectedSubtask.action}
          </div>

          {selectedSubtask.tool && (
            <div className="text-[#c9d1d9]">
              <span className="text-[#8b949e]">Инструмент MCP: </span>
              <strong className="text-blue-400 font-mono">{selectedSubtask.tool}</strong>
            </div>
          )}

          {selectedSubtask.toolArgs && (
            <div className="space-y-1">
              <span className="text-[#8b949e]">Аргументы вызова:</span>
              <pre className="bg-[#161b22] p-2 rounded border border-[#30363d] font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-28">
                {JSON.stringify(selectedSubtask.toolArgs, null, 2)}
              </pre>
            </div>
          )}

          {selectedSubtask.output && (
            <div className="space-y-1 pt-1">
              <span className="text-[#8b949e]">Результат исполнения (stdout):</span>
              <pre className="bg-[#161b22] p-2 rounded border border-[#30363d] font-mono text-[11px] text-gray-200 overflow-x-auto whitespace-pre-wrap max-h-36">
                {selectedSubtask.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
