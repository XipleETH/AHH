import React from 'react';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

interface MiniAppProviderProps {
  children: React.ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  return (
    <MiniKitProvider>
      {children}
    </MiniKitProvider>
  );
} 