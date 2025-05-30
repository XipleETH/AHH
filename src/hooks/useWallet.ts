import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useCoinbaseWallet } from './useCoinbaseWallet';

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | undefined;
  tokenBalance: string | undefined;
  nfts: string[] | undefined;
  lastTransaction: string | undefined;
  isPendingTransaction: boolean;
  chainId: number | undefined;
  isBaseNetwork: boolean;
  networkName: string;
  connectWallet: () => Promise<void>;
  refreshWalletData: () => Promise<void>;
}

export const useWallet = (): WalletState => {
  const { connectWallet: authConnectWallet, walletAddress, walletBalance } = useAuth();
  const {
    isConnected,
    isConnecting,
    address,
    balance,
    chainId,
    isBaseNetwork,
    networkName,
    connect
  } = useCoinbaseWallet();

  const [tokenBalance, setTokenBalance] = useState<string | undefined>();
  const [nfts, setNfts] = useState<string[]>([]);
  const [lastTransaction, setLastTransaction] = useState<string | undefined>();
  const [isPendingTransaction, setIsPendingTransaction] = useState(false);

  // Sincronizar con el balance de wallet
  useEffect(() => {
    if (walletBalance) {
      setTokenBalance(walletBalance);
    } else if (balance) {
      setTokenBalance(balance);
    }
  }, [walletBalance, balance]);

  // Función para conectar wallet
  const connectWallet = useCallback(async () => {
    try {
      await authConnectWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [authConnectWallet]);

  // Función para refrescar datos de wallet
  const refreshWalletData = useCallback(async () => {
    if (!address) return;

    try {
      setIsPendingTransaction(true);
      
      // Aquí podrías agregar llamadas para obtener:
      // - Balance de tokens personalizados
      // - NFTs del usuario
      // - Historial de transacciones
      
      console.log('📊 Refrescando datos de wallet para:', address);
      
      // Simular actualización de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Datos de wallet actualizados');
    } catch (error) {
      console.error('❌ Error refreshing wallet data:', error);
      throw error;
    } finally {
      setIsPendingTransaction(false);
    }
  }, [address]);

  // Auto-refresh cuando cambia la dirección
  useEffect(() => {
    if (address && isConnected) {
      refreshWalletData();
    }
  }, [address, isConnected, refreshWalletData]);

  return {
    isConnected,
    isConnecting,
    address: address || walletAddress,
    tokenBalance,
    nfts,
    lastTransaction,
    isPendingTransaction,
    chainId,
    isBaseNetwork,
    networkName,
    connectWallet,
    refreshWalletData
  };
}; 