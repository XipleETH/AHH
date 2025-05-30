import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signIn as authSignIn, updateUserWallet, clearUserWallet } from '../firebase/auth';
import { useCoinbaseWallet } from '../hooks/useCoinbaseWallet';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  // Información de wallet
  walletConnected: boolean;
  walletAddress: string | undefined;
  walletBalance: string | undefined;
  isBaseNetwork: boolean;
  switchToBase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  walletConnected: false,
  walletAddress: undefined,
  walletBalance: undefined,
  isBaseNetwork: false,
  switchToBase: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hook de Coinbase Wallet
  const {
    isConnected: walletConnected,
    isConnecting: walletConnecting,
    address: walletAddress,
    balance: walletBalance,
    isBaseNetwork,
    connect: connectCoinbaseWallet,
    disconnect: disconnectCoinbaseWallet,
    switchToBase: switchWalletToBase,
    error: walletError
  } = useCoinbaseWallet();

  // Suscribirse a cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      console.log('🔄 Auth state changed:', authUser);
      setUser(authUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sincronizar wallet con autenticación
  useEffect(() => {
    if (walletConnected && walletAddress) {
      console.log('🔗 Wallet conectada, actualizando usuario:', walletAddress);
      updateUserWallet(walletAddress);
    } else if (!walletConnected && user?.walletAddress) {
      console.log('🔌 Wallet desconectada, limpiando usuario');
      clearUserWallet();
    }
  }, [walletConnected, walletAddress, user?.walletAddress]);

  // Mostrar errores de wallet
  useEffect(() => {
    if (walletError) {
      console.error('💥 Error de wallet:', walletError);
    }
  }, [walletError]);

  // Función para iniciar sesión básica
  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔑 Iniciando proceso de autenticación...');
      
      const authUser = await authSignIn();
      if (authUser) {
        setUser(authUser);
        console.log('✅ Usuario autenticado exitosamente:', authUser);
      } else {
        console.log('❌ No se pudo autenticar el usuario');
      }
    } catch (error) {
      console.error('💥 Error en el proceso de autenticación:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para conectar wallet
  const connectWallet = useCallback(async () => {
    try {
      console.log('🔌 Conectando Coinbase Wallet...');
      await connectCoinbaseWallet();
      console.log('✅ Wallet conectada exitosamente');
    } catch (error) {
      console.error('❌ Error conectando wallet:', error);
      throw error;
    }
  }, [connectCoinbaseWallet]);

  // Función para desconectar wallet
  const disconnectWallet = useCallback(async () => {
    try {
      console.log('🔌 Desconectando wallet...');
      await disconnectCoinbaseWallet();
      console.log('✅ Wallet desconectada exitosamente');
    } catch (error) {
      console.error('❌ Error desconectando wallet:', error);
      throw error;
    }
  }, [disconnectCoinbaseWallet]);

  // Función para cambiar a Base
  const switchToBase = useCallback(async () => {
    try {
      console.log('🔄 Cambiando a Base network...');
      await switchWalletToBase();
      console.log('✅ Cambiado a Base exitosamente');
    } catch (error) {
      console.error('❌ Error cambiando a Base:', error);
      throw error;
    }
  }, [switchWalletToBase]);

  // Auto-login en el primer montaje
  useEffect(() => {
    if (!user && !isLoading && !walletConnected) {
      signIn();
    }
  }, [signIn, user, isLoading, walletConnected]);

  const value: AuthContextType = {
    user,
    isLoading: isLoading || walletConnecting,
    signIn,
    connectWallet,
    disconnectWallet,
    walletConnected,
    walletAddress,
    walletBalance,
    isBaseNetwork,
    switchToBase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 