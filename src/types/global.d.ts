interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
  isConnected: () => boolean;
  chainId?: string;
  selectedAddress?: string;
  
  // Métodos específicos para billeteras
  enable: () => Promise<string[]>;
  sendAsync?: (request: { method: string; params?: any[] }, callback: (error: Error | null, response: any) => void) => void;
  send?: (request: { method: string; params?: any[] }, callback: (error: Error | null, response: any) => void) => void;
}

// Añade ethereum al objeto window
interface Window {
  ethereum?: EthereumProvider;
  farcasterSigner?: {
    signMessage: (message: string) => Promise<string>;
    isConnected: () => Promise<boolean>;
  };
}

// Tipos para @coinbase/onchainkit
declare module "@coinbase/onchainkit/minikit" {
  export interface MiniKitProviderProps {
    children: React.ReactNode;
  }

  export const MiniKitProvider: React.FC<MiniKitProviderProps>;
  
  export interface UseAuthenticateReturn {
    signIn: (options?: {
      domain?: string;
      siweUri?: string;
      resources?: string[];
    }) => Promise<void>;
    signOut: () => Promise<void>;
  }
  
  export function useAuthenticate(): UseAuthenticateReturn;
  
  export interface MiniKitContext {
    client?: {
      wallet?: {
        address?: string;
        chainId?: number;
        signMessage?: (message: string) => Promise<string>;
      };
      added?: boolean;
    };
  }
  
  export function useMiniKit(): { context: MiniKitContext | null };
}

// Tipos para Farcaster
declare module "@farcaster/frame-sdk" {
  export interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfp?: string;
    custody_address?: string;
    verifications?: string[];
    viewer_context?: {
      following: boolean;
      followed_by: boolean;
    };
  }

  export interface FrameSDK {
    getUser: () => Promise<FarcasterUser | null>;
    isFrameAvailable: () => Promise<boolean>;
    actions: {
      ready: () => Promise<void>;
      signIn: () => Promise<void>;
    };
    signer?: {
      signMessage?: (message: string) => Promise<string>;
    };
  }

  export const sdk: FrameSDK;
} 