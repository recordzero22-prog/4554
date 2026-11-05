import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Trash2, ArrowDownCircle, Filter } from 'lucide-react';
import { AgentRole, LogEntry } from '../types';

interface LogsPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<AgentRole | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const roleColors: Record<AgentRole, { text: string; bg: string; border: string }> = {
    Architect: { text: '#a371f7', bg: 'rgba(163, 113, 247, 0.1)', border: 'rgba(163, 113, 247, 0.3)' },
    Implementer: { text: '#58a6ff', bg: 'rgba(88, 166, 255, 0.1)', border: 'rgba(88, 166, 255, 0.3)' },
    Tester: { text: '#7ee787', bg: 'rgba(126, 231, 135, 0.1)', border: 'rgba(126, 231, 135, 0.3)' },
    Coordinator: { text: '#d29922', bg: 'rgba(210, 153, 34, 0.1)', border: 'rgba(210, 153, 34, 0.3)' },
    Watchdog: { text: '#f85149', bg: 'rgba(248, 81, 73, 0.1)', border: 'rgba(248, 81, 73, 0.3)' },
  };

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(entry => {
    const matchesRole = selectedRole === 'ALL' || entry.role === selectedRole;
    const matchesSearch =
      searchTerm.trim() === '' ||
      entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleExportAudit = () => {
    const jsonl = logs
      .map(l => JSON.stringify({ time: l.time, role: l.role, message: l.message, taskId: l.taskId }))
      .join('\n');
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
      {/* Header and Controls */}
      <div className="p-3 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2 bg-[#1b2028]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-[#c9d1d9] tracking-wider uppercase">
            Логи агентов в реальном времени
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#30363d] text-[#8b949e] font-mono">
            {logs.length} записей
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Поиск логов..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded text-[11px] text-white pl-7 pr-2 py-1 w-36 sm:w-44 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Autoscroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded border text-xs cursor-pointer ${
              autoScroll
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
            }`}
            title={autoScroll ? 'Автопрокрутка включена' : 'Автопрокрутка выключена'}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Export Audit Log */}
          <button
            onClick={handleExportAudit}
            className="p-1.5 rounded border bg-[#21262d] hover:bg-[#30363d] border-[#30363d] text-[#c9d1d9] cursor-pointer"
            title="Экспорт в audit.log"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded border bg-[#21262d] hover:bg-red-950/40 border-[#30363d] hover:border-red-700/50 text-[#8b949e] hover:text-red-400 cursor-pointer"
            title="Очистить лог"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role Filter Pills */}
      <div className="px-3 py-1.5 border-b border-[#30363d] bg-[#141820] flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <Filter className="w-3 h-3 text-[#8b949e] shrink-0" />
        <button
          onClick={() => setSelectedRole('ALL')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
            selectedRole === 'ALL'
              ? 'bg-[#30363d] text-white font-medium'
              : 'text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          Все
        </button>
        {(['Architect', 'Implementer', 'Tester', 'Coordinator', 'Watchdog'] as AgentRole[]).map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-mono flex items-center gap-1 ${
              selectedRole === role
                ? 'font-bold'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: roleColors[role].text,
              backgroundColor: selectedRole === role ? roleColors[role].bg : 'transparent',
              border: selectedRole === role ? `1px solid ${roleColors[role].border}` : '1px solid transparent',
            }}
          >
            <span>{role}</span>
          </button>
        ))}
      </div>

      {/* Logs stream body */}
      <div
        id="agent-logs"
        ref={logContainerRef}
        className="flex-1 p-3 bg-[#0d1117] overflow-y-auto font-mono text-[11px] space-y-1.5 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-[#484f58] italic">
            Логи пусты. Запустите задачу в Оркестраторе, чтобы наблюдать за взаимодействием агентов.
          </div>
        ) : (
          filteredLogs.map(entry => {
            const roleStyle = roleColors[entry.role] || { text: '#c9d1d9', bg: 'transparent', border: 'transparent' };
            return (
              <div
                key={entry.id}
                className="leading-relaxed hover:bg-[#161b22] px-1.5 py-0.5 rounded transition-colors break-words"
              >
                <span className="text-[#8b949e] mr-2">[{entry.time}]</span>
                <strong
                  className="mr-2 px-1 py-0.2 rounded"
                  style={{ color: roleStyle.text, backgroundColor: roleStyle.bg }}
                >
                  [{entry.role}]
                </strong>
                <span className="text-[#e6edf3]">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
