import React, { useState } from 'react';
import {
  Gamepad2,
  Box,
  Layers,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send,
  Wrench,
  Scroll,
  Cpu,
} from 'lucide-react';
import { GAMEDEV_MCP_TOOLS, executeGamedevTool } from '../core/gamedevMcpTools';
import { MCPResult } from '../types';

interface GamedevToolsPanelProps {
  onExecuteTool: (tool: string, args: Record<string, unknown>) => MCPResult;
  onSendToOrchestrator: (goal: string) => void;
}

type GamedevCategory = 'all' | 'unity' | 'godot' | 'blender' | 'rigging' | 'skyrim';

export const GamedevToolsPanel: React.FC<GamedevToolsPanelProps> = ({
  onExecuteTool,
  onSendToOrchestrator,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GamedevCategory>('all');
  const [selectedToolName, setSelectedToolName] = useState<string>('Skyrim_NifParse');
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({
    path: 'Data/Meshes/weapons/iron_battleaxe.nif',
    autoSanitize: true,
  });
  const [lastResult, setLastResult] = useState<MCPResult | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const selectedTool =
    GAMEDEV_MCP_TOOLS.find((t) => t.name === selectedToolName) || GAMEDEV_MCP_TOOLS[0];

  const filteredTools = GAMEDEV_MCP_TOOLS.filter((t) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unity') return t.name.startsWith('Unity_');
    if (selectedCategory === 'godot') return t.name.startsWith('Godot_');
    if (selectedCategory === 'blender') return t.name.startsWith('Blender_');
    if (selectedCategory === 'rigging')
      return t.name.startsWith('Rigging_') || t.name.startsWith('Anim_');
    if (selectedCategory === 'skyrim') return t.name.startsWith('Skyrim_');
    return true;
  });

  const handleSelectTool = (name: string) => {
    setSelectedToolName(name);
    // Presets for quick convenience
    if (name === 'Skyrim_NifParse') {
      setToolArgs({ path: 'Data/Meshes/weapons/daedric_sword.nif', autoSanitize: true });
    } else if (name === 'Skyrim_EspInspect') {
      setToolArgs({ espPath: 'Data/CyberArmory_SkyrimLE.esp', recordFilter: 'ARMO, WEAP' });
    } else if (name === 'Skyrim_PapyrusCompile') {
      setToolArgs({ pscPath: 'Scripts/Source/CyberSpellEffect.psc', flagsFile: 'TESV_Papyrus_Flags.flg' });
    } else if (name === 'Skyrim_HavokKfConvert') {
      setToolArgs({ kfPath: 'Animations/CombatIdle.kf', targetSkeleton: 'xp32_maximum_skeleton' });
    } else if (name === 'Blender_GenerateMesh') {
      setToolArgs({ meshType: 'armored_drone_hull', polyBudget: 3500 });
    } else if (name === 'Blender_ExecuteScript') {
      setToolArgs({
        script: 'import bpy\nbpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2)\nbpy.ops.object.modifier_add(type="BEVEL")',
        outputFormat: 'gltf',
      });
    } else if (name === 'Rigging_AutoBoneGenerate') {
      setToolArgs({ modelPath: 'models/character_cyber.obj', rigType: 'humanoid_biped' });
    } else if (name === 'Rigging_RetargetSkeleton') {
      setToolArgs({ sourceSkeleton: 'mixamo_running.fbx', targetSkeleton: 'unity_humanoid', rootMotion: true });
    } else if (name === 'Unity_CreateGameObject') {
      setToolArgs({ name: 'CyberBoss_Stage2', components: 'Rigidbody, BoxCollider, AudioSource' });
    } else if (name === 'Unity_AddComponent') {
      setToolArgs({ targetObject: 'CyberBoss_Stage2', component: 'NavMeshAgent' });
    } else if (name === 'Godot_RunScene') {
      setToolArgs({ scenePath: 'res://scenes/ArenaLevel.tscn', timeoutSec: 15 });
    } else {
      const def = GAMEDEV_MCP_TOOLS.find((t) => t.name === name);
      const defaults: Record<string, any> = {};
      if (def?.parameters) {
        Object.keys(def.parameters).forEach((k) => {
          defaults[k] = def.parameters[k].type === 'boolean' ? true : def.parameters[k].type === 'number' ? 0 : 'sample_value';
        });
      }
      setToolArgs(defaults);
    }
  };

  const handleRun = () => {
    const res = onExecuteTool ? onExecuteTool(selectedTool.name, toolArgs) : executeGamedevTool(selectedTool.name, toolArgs);
    setLastResult(res);
  };

  const handleCopyResult = () => {
    if (lastResult?.result) {
      navigator.clipboard.writeText(lastResult.result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDelegateToDAG = () => {
    const goal = `Выполни инструмент GameDev [${selectedTool.name}] с параметрами: ${JSON.stringify(
      toolArgs
    )}, проверь валидность артефактов и интегрируй в проект.`;
    onSendToOrchestrator(goal);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden text-[#c9d1d9]">
      {/* Header Bar */}
      <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              GameDev & Skyrim LE MCP Suite
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                v20.2.0.7 / Unity 6 / Blender 4.x
              </span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              Специализированные MCP-инструменты для Unity, Godot, Blender (bpy), Риггинга и Моддинга Skyrim LE (NIF/ESP/Havok/Papyrus)
            </p>
          </div>
        </div>

        {/* Quick Category Filters */}
        <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs">
          {(
            [
              { id: 'all', label: 'Все (16)' },
              { id: 'skyrim', label: 'Skyrim LE (4)' },
              { id: 'blender', label: 'Blender bpy (3)' },
              { id: 'rigging', label: 'Риггинг & FBX (3)' },
              { id: 'unity', label: 'Unity (4)' },
              { id: 'godot', label: 'Godot (3)' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-[#1f6feb] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Left Tool Selector, Right Configuration & Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Tool List */}
        <div className="w-80 border-r border-[#30363d] bg-[#161b22]/50 flex flex-col overflow-y-auto p-3 space-y-1.5 shrink-0">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider px-2 py-1">
            Каталог инструментов ({filteredTools.length})
          </div>
          {filteredTools.map((t) => {
            const isSelected = t.name === selectedToolName;
            const isSkyrim = t.name.startsWith('Skyrim_');
            const isBlender = t.name.startsWith('Blender_');
            const isRig = t.name.startsWith('Rigging_') || t.name.startsWith('Anim_');
            const isUnity = t.name.startsWith('Unity_');

            let badge = 'MCP';
            let badgeCls = 'bg-gray-700/40 text-gray-300';
            if (isSkyrim) {
              badge = 'Skyrim LE';
              badgeCls = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            } else if (isBlender) {
              badge = 'Blender 4.x';
              badgeCls = 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
            } else if (isRig) {
              badge = 'Rigging';
              badgeCls = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
            } else if (isUnity) {
              badge = 'Unity 6';
              badgeCls = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            } else {
              badge = 'Godot 4';
              badgeCls = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
            }

            return (
              <button
                key={t.name}
                onClick={() => handleSelectTool(t.name)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1f6feb]/15 border-[#1f6feb] text-white shadow-sm'
                    : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50 text-[#c9d1d9]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold">{t.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${badgeCls}`}>
                    {badge}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed">
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Execution Form & Output */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-5">
          {/* Active Tool Header Card */}
          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">{selectedTool.name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Категория: {selectedTool.category}
              </span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              {selectedTool.description}
            </p>
          </div>

          {/* Parameters Form */}
          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
            <h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
              Параметры вызова (JSON-RPC 2.0 arguments)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(selectedTool.parameters || {}).map(([paramKey, paramDef]) => {
                const val = toolArgs[paramKey];
                const isBool = paramDef.type === 'boolean';
                return (
                  <div key={paramKey} className={paramDef.type === 'string' && String(val || '').length > 40 ? 'col-span-full' : ''}>
                    <label className="block text-xs font-mono text-[#c9d1d9] mb-1">
                      {paramKey}
                      {paramDef.required && <span className="text-rose-400 ml-1">*</span>}
                      <span className="text-[11px] text-[#8b949e] font-sans ml-2">
                        ({paramDef.description})
                      </span>
                    </label>

                    {isBool ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={paramKey}
                          checked={Boolean(val)}
                          onChange={(e) =>
                            setToolArgs((prev) => ({ ...prev, [paramKey]: e.target.checked }))
                          }
                          className="rounded border-[#30363d] text-blue-500 focus:ring-blue-500 bg-[#0d1117] h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor={paramKey} className="text-xs text-[#8b949e] cursor-pointer">
                          Включено / Active
                        </label>
                      </div>
                    ) : paramKey === 'script' ? (
                      <textarea
                        value={String(val || '')}
                        rows={4}
                        onChange={(e) =>
                          setToolArgs((prev) => ({ ...prev, [paramKey]: e.target.value }))
                        }
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type={paramDef.type === 'number' ? 'number' : 'text'}
                        value={val !== undefined ? val : ''}
                        onChange={(e) =>
                          setToolArgs((prev) => ({
                            ...prev,
                            [paramKey]: paramDef.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
              <div className="text-[11px] text-[#8b949e]">
                Поддерживается прямая передача аргументов в песочницу или в DAG
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelegateToDAG}
                  className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363d]"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  Делегировать в DAG
                </button>
                <button
                  onClick={handleRun}
                  className="px-4 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  Выполнить инструмент
                </button>
              </div>
            </div>
          </div>

          {/* Execution Result Box */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <h4 className="text-xs font-semibold text-white">
                    Результат выполнения {lastResult.ok ? '(Успех)' : '(Ошибка)'}
                  </h4>
                  {lastResult.executionTimeMs !== undefined && (
                    <span className="text-[11px] text-[#8b949e] font-mono">
                      ({lastResult.executionTimeMs} ms)
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopyResult}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {isCopied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {lastResult.result}
              </pre>
            </div>
          )}

          {/* Quick Skyrim LE Modding Architecture Reference */}
          <div className="p-4 rounded-xl bg-[#161b22]/70 border border-[#30363d]/60 space-y-2">
            <h5 className="text-xs font-semibold text-[#8b949e] flex items-center gap-2">
              <Scroll className="w-4 h-4 text-amber-400" />
              Справочник структуры Skyrim LE 32-bit (NetImmerse & Havok 2010.2)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#8b949e] pt-1">
              <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <strong className="text-amber-300 block mb-1">NIF v20.2.0.7:</strong>
                Skyrim LE 32-bit требует BSLightingShaderProperty со специфическими шейдерными флагами. NiTriShape/BSFadeNode.
              </div>
              <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <strong className="text-amber-300 block mb-1">Havok 2010.2 KF/HKX:</strong>
                Скелетные анимации сжаты под 32-битный движок. Совместимы с XP32 Maximum Skeleton Extended (XPMSE).
              </div>
              <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <strong className="text-amber-300 block mb-1">Papyrus PSC ➔ PEX:</strong>
                Язык скриптов Papyrus компилируется в байткод .pex с флагами TESV_Papyrus_Flags.flg.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
