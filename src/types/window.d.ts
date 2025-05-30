// Declaraciones de tipos para objetos window
declare global {
  interface Window {
    ethereum?: {
      isCoinbaseWallet?: boolean;
      isMetaMask?: boolean;
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
    coinbaseWalletExtension?: any;
  }
}

export {}; 