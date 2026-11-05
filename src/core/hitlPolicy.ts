/**
 * Human-In-The-Loop (HITL) Safety Policy Checker
 */

export interface PolicyCheckResult {
  requiresApproval: boolean;
  reason?: string;
  riskLevel: 'medium' | 'high' | 'critical';
}

const HIGH_RISK_COMMAND_PATTERNS = [
  { pattern: /\b(rm\s+-rf|del\s+\/s|Remove-Item\s+-Recurse|format\s+[a-z]:)/i, reason: 'Потенциально деструктивное удаление файлов или форматирование диска', level: 'critical' as const },
  { pattern: /\b(shutdown|reboot|restart-computer|Stop-Computer)/i, reason: 'Команда перезагрузки или выключения системы', level: 'critical' as const },
  { pattern: /\b(taskkill\s+\/f|Stop-Process\s+-Force)/i, reason: 'Принудительное завершение системных процессов', level: 'high' as const },
  { pattern: /\b(reg\s+delete|reg\s+add|Set-ItemProperty.*Registry)/i, reason: 'Модификация системного реестра Windows', level: 'high' as const },
  { pattern: /\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod).*((\||\;)\s*(bash|sh|iex|Invoke-Expression))/i, reason: 'Загрузка и немедленное исполнение стороннего удаленного скрипта', level: 'critical' as const },
  { pattern: /\b(mkfs|dd\s+if=)/i, reason: 'Низкоуровневая операция с блочными устройствами', level: 'critical' as const },
  { pattern: /\b(netsh|New-NetFirewallRule|iptables)/i, reason: 'Изменение настроек брандмауэра или сетевых правил', level: 'high' as const },
];

export function evaluateHITLPolicy(
  tool: string,
  args: Record<string, unknown>,
  strictMode: boolean = false
): PolicyCheckResult {
  // If tool is Shell or wsl_exec, inspect the command string
  if (tool === 'Shell' || tool === 'wsl_exec') {
    const cmd = String(args.command || args.cmd || '');

    for (const rule of HIGH_RISK_COMMAND_PATTERNS) {
      if (rule.pattern.test(cmd)) {
        return {
          requiresApproval: true,
          reason: rule.reason,
          riskLevel: rule.level,
        };
      }
    }

    // In strict mode, any command with pipes or backgrounding requires approval
    if (strictMode && (cmd.includes('|') || cmd.includes('Start-Process') || cmd.includes('&'))) {
      return {
        requiresApproval: true,
        reason: 'Строгий режим: обнаружены пайпы или запуск подпроцессов',
        riskLevel: 'medium',
      };
    }
  }

  // FileWrite outside workspace or touching sensitive extensions
  if (tool === 'FileWrite') {
    const filePath = String(args.path || '');
    if (filePath.includes('..') || filePath.startsWith('C:\\Windows') || filePath.startsWith('/etc')) {
      return {
        requiresApproval: true,
        reason: 'Попытка записи за пределами безопасной песочницы workspace',
        riskLevel: 'critical',
      };
    }

    if (/\.(exe|bat|cmd|vbs|ps1)$/i.test(filePath) && strictMode) {
      return {
        requiresApproval: true,
        reason: 'Запись исполняемого системного скрипта в строгом режиме',
        riskLevel: 'medium',
      };
    }
  }

  return {
    requiresApproval: false,
    riskLevel: 'medium',
  };
}
