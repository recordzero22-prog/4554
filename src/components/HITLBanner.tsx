import React, { useState } from 'react';
import { ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';
import { HITLRequest } from '../types';

interface HITLBannerProps {
  requests: HITLRequest[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string, reason: string) => void;
}

export const HITLBanner: React.FC<HITLBannerProps> = ({
  requests,
  onApprove,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showReasonInput, setShowReasonInput] = useState<boolean>(false);

  if (requests.length === 0) return null;

  const current = requests[0];

  const handleRejectClick = () => {
    if (!showReasonInput) {
      setShowReasonInput(true);
      return;
    }
    onReject(current.approvalId, rejectReason || 'Отклонено оператором безопасности');
    setShowReasonInput(false);
    setRejectReason('');
  };

  const riskColors = {
    critical: 'bg-red-500/20 border-red-500/40 text-red-300',
    high: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    medium: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  };

  return (
    <div
      id="hitl-banner"
      className="mb-4 bg-[#2e1d0c] border border-[#d29922] rounded-lg p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-amber-500/20 text-amber-400 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                ⚠️ Требуется подтверждение безопасности (HITL)!
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                  riskColors[current.riskLevel]
                }`}
              >
                {current.riskLevel} Risk
              </span>
              {requests.length > 1 && (
                <span className="text-xs text-amber-200/70 font-mono">
                  (1 из {requests.length})
                </span>
              )}
            </div>

            <p id="hitl-message" className="text-xs text-[#e6edf3] font-mono leading-relaxed bg-[#161b22] p-2.5 rounded border border-[#30363d]">
              <span className="text-[#8b949e]">Инструмент:</span> <strong className="text-blue-400">{current.tool}</strong>
              <br />
              <span className="text-[#8b949e]">Аргументы:</span> <span className="text-emerald-300">{JSON.stringify(current.args)}</span>
              <br />
              <span className="text-[#8b949e]">Причина перехвата:</span> <span className="text-amber-300 font-semibold">{current.reason}</span>
            </p>

            {showReasonInput && (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Причина отклонения (необязательно)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#d29922]/50 text-white text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <button
            id="btn-hitl-approve"
            onClick={() => onApprove(current.approvalId)}
            className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Одобрить</span>
          </button>

          <button
            id="btn-hitl-reject"
            onClick={handleRejectClick}
            className="flex items-center gap-1.5 bg-[#da3633] hover:bg-[#b62324] text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>{showReasonInput ? 'Подтвердить отказ' : 'Отклонить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
