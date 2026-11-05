/**
 * Type declarations for Electron webview and mcpStudio IPC bridge
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          allowpopups?: boolean | string;
          preload?: string;
          httpreferrer?: string;
          useragent?: string;
        },
        HTMLElement
      >;
    }
  }

  interface Window {
    mcpStudio?: {
      isElectron?: boolean;
      callTool: (tool: string, args: Record<string, unknown>) => Promise<{ ok: boolean; result: string }>;
      checkHealth: () => Promise<{ ok: boolean }>;
      browser: {
        create: (url: string) => Promise<{ id: string; url: string }>;
        list: () => Promise<Array<{ id: string; url: string }>>;
        close: (id: string) => Promise<boolean>;
      };
      onEvent: (cb: (data: any) => void) => () => void;
    };
    isElectron?: boolean;
    electronBridge?: any;
  }
}

export {};
