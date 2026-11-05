import React, { useState } from 'react';
import {
  FolderCode,
  FileText,
  RefreshCw,
  Plus,
  Play,
  Save,
  Trash2,
  Download,
  Check,
  Code,
  Terminal,
} from 'lucide-react';
import { WorkspaceFile, MCPResult } from '../types';

interface WorkspaceFilesPanelProps {
  files: WorkspaceFile[];
  onRefresh: () => void;
  onSaveFile: (path: string, content: string) => void;
  onDeleteFile: (path: string) => void;
  onExecuteInSandbox: (tool: string, args: Record<string, unknown>) => MCPResult;
}

export const WorkspaceFilesPanel: React.FC<WorkspaceFilesPanelProps> = ({
  files,
  onRefresh,
  onSaveFile,
  onDeleteFile,
  onExecuteInSandbox,
}) => {
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(files[0] || null);
  const [editorContent, setEditorContent] = useState<string>(files[0]?.content || '');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  const handleSelectFile = (file: WorkspaceFile) => {
    setSelectedFile(file);
    setEditorContent(file.content);
    setIsEditing(false);
    setSandboxOutput(null);
  };

  const handleSave = () => {
    if (!selectedFile) return;
    onSaveFile(selectedFile.path, editorContent);
    setIsSaved(true);
    setIsEditing(false);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const cleanPath = newFileName.trim();
    onSaveFile(cleanPath, `# ${cleanPath}\n`);
    setShowNewModal(false);
    setNewFileName('');
    setTimeout(() => {
      const created = files.find(f => f.path === cleanPath);
      if (created) handleSelectFile(created);
    }, 100);
  };

  const handleRunInSandbox = () => {
    if (!selectedFile) return;
    let tool = 'Shell';
    let command = '';

    if (selectedFile.name.endsWith('.py')) {
      command = `python ${selectedFile.path}`;
    } else if (selectedFile.name.endsWith('.js') || selectedFile.name.endsWith('.ts')) {
      command = `node ${selectedFile.path}`;
    } else if (selectedFile.name.endsWith('.sh')) {
      tool = 'wsl_exec';
      command = `bash ${selectedFile.path}`;
    } else {
      command = `Get-Content ${selectedFile.path}`;
    }

    const res = onExecuteInSandbox(tool, { command });
    setSandboxOutput(`[Команда]: ${tool} -> "${command}"\n[Результат]:\n${res.result}`);
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="panel-header bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderCode className="w-5 h-5 text-blue-400" />
            <span>Workspace Sandbox Files (Песочница)</span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            Изолированная файловая среда <code>workspace/</code>. Агенты имеют доступ только к файлам в этой директории.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый файл</span>
          </button>

          <button
            id="refresh-files"
            onClick={onRefresh}
            className="btn-secondary flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* New File Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 w-full max-w-sm space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white">Создать файл в workspace</h3>
            <form onSubmit={handleCreateNewFile} className="space-y-3">
              <input
                type="text"
                placeholder="Имя файла (например: script.py, test.sh)"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-white text-xs p-2 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded bg-[#21262d] text-xs text-[#8b949e] hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#238636] text-xs text-white font-bold"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left: Files List */}
        <div className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-1">
            <span>Файлы в песочнице</span>
            <span className="font-mono text-[11px] text-[#58a6ff]">{files.length} шт</span>
          </div>

          <div id="file-list" className="file-list flex flex-col gap-1.5 overflow-y-auto flex-1">
            {files.map(f => {
              const isSelected = selectedFile?.path === f.path;
              return (
                <div
                  key={f.path}
                  onClick={() => handleSelectFile(f)}
                  className={`file-item p-2.5 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-[#1f6feb]/20 text-white font-semibold'
                      : 'border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:border-[#484f58]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{f.isDirectory ? '📁' : '📄'}</span>
                    <span className="truncate font-mono">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-[#8b949e] font-mono shrink-0">
                    {f.size} B
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Code Viewer & Sandbox Runner */}
        <div className="lg:col-span-2 flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2">
          {selectedFile ? (
            <>
              {/* File details bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs font-bold text-white">{selectedFile.path}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#30363d] text-[#8b949e] uppercase font-mono">
                    {selectedFile.language}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Run in Sandbox */}
                  <button
                    onClick={handleRunInSandbox}
                    className="flex items-center gap-1 bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] px-2.5 py-1 rounded cursor-pointer font-medium"
                    title="Запустить этот файл в песочнице"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Исполнить</span>
                  </button>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[11px] px-2.5 py-1 rounded cursor-pointer font-medium"
                    title="Сохранить изменения"
                  >
                    {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                    <span>{isSaved ? 'Сохранено!' : 'Сохранить'}</span>
                  </button>

                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] cursor-pointer"
                    title="Скачать файл"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm(`Удалить файл ${selectedFile.name}?`)) {
                        onDeleteFile(selectedFile.path);
                        setSelectedFile(files[0] || null);
                      }
                    }}
                    className="p-1 rounded bg-[#21262d] hover:bg-red-950/40 border border-[#30363d] hover:border-red-700/50 text-[#8b949e] hover:text-red-400 cursor-pointer"
                    title="Удалить файл"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <textarea
                  value={editorContent}
                  onChange={e => {
                    setEditorContent(e.target.value);
                    setIsEditing(true);
                  }}
                  className="flex-1 w-full bg-[#0d1117] border border-[#30363d] rounded p-3 font-mono text-xs text-[#e6edf3] focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
                  spellCheck={false}
                />
              </div>

              {/* Sandbox Execution Output */}
              {sandboxOutput && (
                <div className="mt-2 bg-[#0d1117] border border-[#30363d] rounded p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#8b949e]">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      Консольный вывод (Sandbox Execution)
                    </span>
                    <button
                      onClick={() => setSandboxOutput(null)}
                      className="text-[10px] text-[#8b949e] hover:text-white"
                    >
                      Закрыть
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-emerald-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {sandboxOutput}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#8b949e] italic">
              Выберите файл из списка слева для просмотра и редактирования
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
