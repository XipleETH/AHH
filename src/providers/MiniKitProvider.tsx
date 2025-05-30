import React, { createContext, useContext, useEffect, useState } from 'react';
import { MiniKitProvider as OnchainMiniKitProvider } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { User } from '../types';

// Constantes para redes blockchain
const OPTIMISM_CHAIN_ID = 10;
const BASE_CHAIN_ID = 8453;

interface MiniKitContextType {
  farcasterUser: User | null;
  isFarcasterReady: boolean;
  isWarpcastApp: boolean;
  connectFarcaster: () => Promise<void>;
  disconnectFarcaster: () => void;
  checkFarcasterConnection: () => Promise<boolean>;
  getCurrentChainId: () => number | null;
  switchToBase: () => Promise<boolean>;
}

const MiniKitContext = createContext<MiniKitContextType>({
  farcasterUser: null,
  isFarcasterReady: false,
  isWarpcastApp: false,
  connectFarcaster: async () => {},
  disconnectFarcaster: () => {},
  checkFarcasterConnection: async () => false,
  getCurrentChainId: () => null,
  switchToBase: async () => false
});

export const useMiniKitAuth = () => useContext(MiniKitContext);

interface MiniKitAuthProviderProps {
  children: React.ReactNode;
}

export const MiniKitAuthProvider: React.FC<MiniKitAuthProviderProps> = ({ children }) => {
  const [farcasterUser, setFarcasterUser] = useState<User | null>(null);
  const [isFarcasterReady, setIsFarcasterReady] = useState(false);
  const [isWarpcastApp, setIsWarpcastApp] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Verificar si estamos en la app de Warpcast
  useEffect(() => {
    const checkWarpcastEnvironment = async () => {
      try {
        // Marcar como inicializado incluso si hay errores
        setTimeout(() => {
          if (!isInitialized) {
            console.log('Forzando inicialización tras timeout');
            setIsInitialized(true);
          }
        }, 2000);

        if (!sdk) {
          console.error('ERROR: SDK de Farcaster no está disponible');
          setIsInitialized(true);
          return;
        }
        
        console.log('Inicializando SDK de Farcaster...');
        
        try {
          // Verificar si el SDK está listo
          await sdk.actions.ready();
          setIsFarcasterReady(true);
          console.log('SDK de Farcaster listo');
          
          // Verificar si estamos en Warpcast
          const isFrame = await sdk.isFrameAvailable();
          setIsWarpcastApp(isFrame);
          
          console.log('Entorno de Farcaster detectado:', { 
            isFrame,
            isSdkAvailable: !!sdk,
            signer: !!sdk.signer
          });
          
          // Si estamos en Warpcast, intentamos obtener el usuario automáticamente
          if (isFrame) {
            console.log('Detectado Warpcast, obteniendo usuario automáticamente...');
            await checkAndSetFarcasterUser();
            
            // Intentar detectar qué red está utilizando el usuario
            try {
              if (window.ethereum) {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                setCurrentChainId(chainId);
                console.log(`Red actual detectada: ${chainId} (${getNetworkName(chainId)})`);
              }
            } catch (chainError) {
              console.error('Error detectando red actual:', chainError);
            }
          } else {
            console.log('No estamos en Warpcast. El usuario deberá conectarse manualmente.');
            
            // Intentar detectar la red de todos modos
            try {
              if (window.ethereum) {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                setCurrentChainId(chainId);
                console.log(`Red detectada: ${chainId} (${getNetworkName(chainId)})`);
              }
            } catch (chainError) {
              console.error('Error detectando red:', chainError);
            }
          }
        } catch (error) {
          console.error('Error durante la inicialización de Farcaster:', error);
        } finally {
          // Marcar como inicializado sin importar el resultado
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error crítico en checkWarpcastEnvironment:', error);
        setIsInitialized(true);
      }
    };
    
    checkWarpcastEnvironment();
    
    // Configurar listener para cambios de red
    const setupNetworkChangeListener = () => {
      if (window.ethereum) {
        window.ethereum.on('chainChanged', (chainIdHex: string) => {
          const chainId = parseInt(chainIdHex, 16);
          console.log(`Red cambiada: ${chainId} (${getNetworkName(chainId)})`);
          setCurrentChainId(chainId);
        });
        
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          console.log('Cuentas cambiadas:', accounts);
          if (accounts.length > 0) {
            // Refrescar el usuario de Farcaster
            checkAndSetFarcasterUser();
          } else {
            // No hay cuentas, desconectar
            setFarcasterUser(null);
          }
        });
      }
    };
    
    setupNetworkChangeListener();
    
    // Limpiar listeners al desmontar
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Obtener nombre de red basado en el chainId
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet';
      case OPTIMISM_CHAIN_ID: return 'Optimism';
      case BASE_CHAIN_ID: return 'Base';
      case 84531: return 'Base Goerli (Testnet)';
      case 11155111: return 'Sepolia (Testnet)';
      default: return `Red desconocida (${chainId})`;
    }
  };

  // Obtener la red actual
  const getCurrentChainId = (): number | null => {
    return currentChainId;
  };

  // Cambiar a la red Base
  const switchToBase = async (): Promise<boolean> => {
    try {
      if (!window.ethereum) {
        console.error('Ethereum provider no disponible');
        return false;
      }

      try {
        // Intentar cambiar a la red Base
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
        });
        
        setCurrentChainId(BASE_CHAIN_ID);
        console.log('Cambiado exitosamente a la red Base');
        return true;
      } catch (switchError: any) {
        // Si la red no está agregada, intentar añadirla
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                  chainName: 'Base',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                },
              ],
            });
            
            setCurrentChainId(BASE_CHAIN_ID);
            console.log('Red Base añadida y seleccionada');
            return true;
          } catch (addError) {
            console.error('Error añadiendo la red Base:', addError);
            return false;
          }
        } else {
          console.error('Error cambiando a red Base:', switchError);
          return false;
        }
      }
    } catch (error) {
      console.error('Error en switchToBase:', error);
      return false;
    }
  };

  // Función para obtener y mapear el usuario de Farcaster
  const checkAndSetFarcasterUser = async () => {
    try {
      if (!sdk) {
        console.error('SDK no disponible');
        return false;
      }
      
      console.log('Solicitando información de usuario a Farcaster...');
      const user = await sdk.getUser();
      console.log('Respuesta de Farcaster getUser:', user);
      
      if (!user) {
        console.log('No hay usuario autenticado en Farcaster');
        setFarcasterUser(null);
        return false;
      }
      
      // Verificar que tenemos la información mínima necesaria
      if (!user.fid) {
        console.error('ERROR: Usuario de Farcaster sin FID:', user);
        return false;
      }
      
      // Verificar si tenemos una billetera activa (Ethereum)
      let detectedWallet = user.custody_address || '';
      let verifiedWallet = !!user.custody_address;
      
      // Intentar obtener la billetera actual si no tenemos una de custody_address
      if (!detectedWallet && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            detectedWallet = accounts[0];
            console.log(`Billetera detectada desde conexión Ethereum: ${detectedWallet}`);
            
            // No podemos verificar que esta billetera pertenezca al usuario de Farcaster
            // sin una firma adicional, así que la marcamos como no verificada
            verifiedWallet = false;
          }
        } catch (ethError) {
          console.error('Error obteniendo cuentas de Ethereum:', ethError);
        }
      }
      
      // Mapear los datos del usuario de Farcaster
      const mappedUser: User = {
        id: `farcaster-${user.fid}`,
        username: user.username || `farcaster-${user.fid}`,
        avatar: user.pfp || undefined,
        walletAddress: detectedWallet || undefined,
        fid: user.fid,
        isFarcasterUser: true,
        verifiedWallet: verifiedWallet,
        chainId: currentChainId || OPTIMISM_CHAIN_ID // Usamos la red detectada o Optimism por defecto
      };
      
      console.log('Usuario de Farcaster mapeado exitosamente:', mappedUser);
      setFarcasterUser(mappedUser);
      return true;
    } catch (error) {
      console.error('Error obteniendo usuario de Farcaster:', error);
      return false;
    }
  };

  // Conectar con Farcaster
  const connectFarcaster = async () => {
    try {
      if (!sdk) {
        console.error('SDK de Farcaster no disponible');
        return;
      }
      
      console.log('Intentando conectar con Farcaster...');
      
      // En Warpcast, usamos el método signIn para conectar
      if (isWarpcastApp) {
        console.log('Conectando en entorno Warpcast...');
        try {
          await sdk.actions.signIn();
          console.log('Sign-in de Farcaster completado, verificando usuario...');
          const success = await checkAndSetFarcasterUser();
          
          if (success) {
            console.log('Conexión con Farcaster exitosa');
            
            // Intentar detectar en qué red está el usuario ahora
            if (window.ethereum) {
              try {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                setCurrentChainId(chainId);
                console.log(`Red detectada post-conexión: ${chainId} (${getNetworkName(chainId)})`);
              } catch (chainError) {
                console.error('Error detectando red:', chainError);
              }
            }
          } else {
            console.error('ERROR: No se pudo obtener usuario después de signIn');
          }
        } catch (signInError) {
          console.error('Error en signIn de Farcaster:', signInError);
          
          // Intentar obtener el usuario de todos modos
          await checkAndSetFarcasterUser();
        }
      } else {
        // En un navegador normal, intentar conectar con signIn
        console.log('Intentando conectar en navegador normal...');
        try {
          await sdk.actions.signIn();
          console.log('Sign-in en navegador completado, verificando usuario...');
          
          const success = await checkAndSetFarcasterUser();
          if (success) {
            console.log('Conexión con Farcaster exitosa en navegador');
          } else {
            console.error('ERROR: No se pudo obtener usuario después de signIn en navegador');
          }
        } catch (browserError) {
          console.error('Error conectando en navegador:', browserError);
        }
      }
    } catch (error) {
      console.error('Error conectando con Farcaster:', error);
    }
  };

  // Desconectar de Farcaster
  const disconnectFarcaster = () => {
    setFarcasterUser(null);
    console.log('Usuario de Farcaster desconectado');
  };

  // Verificar conexión con Farcaster
  const checkFarcasterConnection = async () => {
    return await checkAndSetFarcasterUser();
  };

  // Si aún no estamos inicializados, mostrar un estado intermedio
  if (!isInitialized) {
    console.log('MiniKitProvider aún inicializando...');
    // No bloqueamos el renderizado, continuamos con valores predeterminados
  }

  return (
    <MiniKitContext.Provider
      value={{
        farcasterUser,
        isFarcasterReady,
        isWarpcastApp,
        connectFarcaster,
        disconnectFarcaster,
        checkFarcasterConnection,
        getCurrentChainId,
        switchToBase
      }}
    >
      {children}
    </MiniKitContext.Provider>
  );
};

// Este es el proveedor combinado que usaremos en nuestra aplicación
export const MiniKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OnchainMiniKitProvider>
      <MiniKitAuthProvider>
        {children}
      </MiniKitAuthProvider>
    </OnchainMiniKitProvider>
  );
}; 