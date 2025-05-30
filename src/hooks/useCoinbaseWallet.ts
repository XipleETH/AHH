import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { updateUserWallet } from '../firebase/auth';
import { base } from 'wagmi/chains';

export interface CoinbaseWalletState {
  // Estados de conexión
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  
  // Información de la wallet
  address: string | undefined;
  chainId: number | undefined;
  balance: string | undefined;
  
  // Información del usuario
  ensName: string | undefined;
  
  // Funciones
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToBase: () => Promise<void>;
  
  // Estados derivados
  isBaseNetwork: boolean;
  networkName: string;
  
  // Error handling
  error: Error | null;
}

// Función para detectar si Coinbase Wallet está instalada
const isCoinbaseWalletInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.ethereum?.isCoinbaseWallet ||
    window.coinbaseWalletExtension
  );
};

export const useCoinbaseWallet = (): CoinbaseWalletState => {
  const { address, isConnected, isReconnecting } = useAccount();
  const { connect: wagmiConnect, connectors, isPending: isConnecting, error } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [user, setUser] = useState<User | null>(null);

  // Estados derivados
  const isBaseNetwork = chainId === base.id;
  const networkName = getNetworkName(chainId);

  // Crear usuario cuando se conecta la wallet
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet conectada:', { address, chainId });
      
      // Crear usuario basado en la wallet
      const walletUser: User = {
        id: `wallet-${address}`,
        username: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        walletAddress: address
      };
      
      setUser(walletUser);
      
      // Actualizar el usuario en Firebase Auth
      updateUserWallet(address);
      
      console.log('👤 Usuario de wallet creado:', walletUser);
    } else {
      setUser(null);
    }
  }, [isConnected, address, chainId]);

  // Función para conectar con Coinbase Wallet
  const connect = useCallback(async () => {
    try {
      console.log('🔌 Iniciando conexión con Coinbase Wallet...');
      console.log('💡 Coinbase Wallet instalada:', isCoinbaseWalletInstalled());
      
      // Buscar el mejor conector disponible
      let targetConnector = null;
      
      // 1. Primero buscar el injected de Coinbase (extensión del navegador)
      const coinbaseInjected = connectors.find(
        connector => connector.id === 'injected' && connector.name.includes('Coinbase')
      );
      
      // 2. Si no, buscar el conector oficial de Coinbase Wallet
      const coinbaseWallet = connectors.find(
        connector => connector.id === 'coinbaseWalletSDK' || connector.name === 'Coinbase Wallet'
      );
      
      // 3. Como último recurso, cualquier conector injected
      const anyInjected = connectors.find(
        connector => connector.id === 'injected'
      );
      
      // Priorizar en este orden
      if (isCoinbaseWalletInstalled() && coinbaseInjected) {
        targetConnector = coinbaseInjected;
        console.log('🎯 Usando conector injected de Coinbase Wallet');
      } else if (coinbaseWallet) {
        targetConnector = coinbaseWallet;
        console.log('🎯 Usando conector oficial de Coinbase Wallet');
      } else if (anyInjected) {
        targetConnector = anyInjected;
        console.log('🎯 Usando conector injected genérico');
      }
      
      if (!targetConnector) {
        throw new Error('No se encontró un conector compatible de Coinbase Wallet');
      }
      
      console.log('🔗 Conectando con:', targetConnector.name, targetConnector.id);
      
      await wagmiConnect({ connector: targetConnector });
      console.log('✅ Conectado con Coinbase Wallet exitosamente');
    } catch (error) {
      console.error('❌ Error conectando con Coinbase Wallet:', error);
      throw error;
    }
  }, [wagmiConnect, connectors]);

  // Función para desconectar
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Desconectando wallet...');
      await wagmiDisconnect();
      setUser(null);
      console.log('✅ Wallet desconectada');
    } catch (error) {
      console.error('❌ Error desconectando wallet:', error);
      throw error;
    }
  }, [wagmiDisconnect]);

  // Función para cambiar a Base network
  const switchToBase = useCallback(async () => {
    try {
      console.log('🔄 Cambiando a Base network...');
      await switchChain({ chainId: base.id });
      console.log('✅ Cambiado a Base exitosamente');
    } catch (error) {
      console.error('❌ Error cambiando a Base:', error);
      throw error;
    }
  }, [switchChain]);

  return {
    // Estados de conexión
    isConnected,
    isConnecting,
    isReconnecting,
    
    // Información de la wallet
    address,
    chainId,
    balance: balance?.formatted,
    
    // Información del usuario
    ensName: undefined, // TODO: Implementar ENS si es necesario
    
    // Funciones
    connect,
    disconnect,
    switchToBase,
    
    // Estados derivados
    isBaseNetwork,
    networkName,
    
    // Error handling
    error: error || null
  };
};

// Función helper para obtener el nombre de la red
function getNetworkName(chainId: number | undefined): string {
  if (!chainId) return 'Red desconocida';
  
  switch (chainId) {
    case 1:
      return 'Ethereum';
    case 8453:
      return 'Base';
    case 10:
      return 'Optimism';
    default:
      return `Red ${chainId}`;
  }
} 