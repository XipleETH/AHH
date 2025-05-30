import { useState, useEffect, useRef } from 'react';
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { sdk } from '@farcaster/frame-sdk';

// Constantes de cadenas
const BASE_CHAIN_ID = 8453;

interface FarcasterWalletHook {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  fid: number | null;
  username: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
  currentChainId: number | null;
  switchToBase: () => Promise<boolean>;
  isBaseNetwork: boolean;
}

export const useFarcasterWallet = (): FarcasterWalletHook => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionAttemptInProgress = useRef(false);
  const { context } = useMiniKit();
  const { signIn, signOut } = useAuthenticate();
  const { 
    farcasterUser,
    isFarcasterReady,
    isWarpcastApp,
    connectFarcaster,
    getCurrentChainId,
    switchToBase
  } = useMiniKitAuth();

  // Obtener la cadena actual del proveedor de OnchainKit
  const currentChainId = getCurrentChainId();
  
  // Verificar si estamos en la red Base
  const isBaseNetwork = currentChainId === BASE_CHAIN_ID;

  // Determinar si está conectado (usuario de Farcaster con wallet)
  const isConnected = !!farcasterUser?.walletAddress;
  
  // Obtener la dirección de la billetera
  const address = farcasterUser?.walletAddress || null;
  
  // Obtener el FID
  const fid = farcasterUser?.fid || null;
  
  // Obtener el nombre de usuario
  const username = farcasterUser?.username || null;

  // Diagnosticar el estado actual
  useEffect(() => {
    console.log("Estado actual de Farcaster:", {
      isConnected,
      address,
      fid,
      username,
      chainId: currentChainId,
      isBaseNetwork,
      user: farcasterUser
    });
  }, [isConnected, address, fid, username, farcasterUser, currentChainId, isBaseNetwork]);

  // Conectar con la billetera de Farcaster
  const connect = async () => {
    // Evitar múltiples intentos de conexión simultáneos
    if (isConnecting || connectionAttemptInProgress.current) {
      console.log("Conexión ya en progreso, ignorando solicitud");
      return;
    }
    
    try {
      setIsConnecting(true);
      connectionAttemptInProgress.current = true;
      setError(null);
      
      console.log("Iniciando proceso de conexión de billetera Farcaster...");
      
      // Si ya estamos conectados, solo verificamos la red
      if (isConnected && address) {
        console.log("Ya conectado con billetera:", address);
        
        // Si no estamos en Base, intentar cambiar
        if (!isBaseNetwork) {
          console.log("Cambiando a red Base...");
          await switchToBase();
        }
        
        return;
      }
      
      // Estamos en Warpcast
      if (isWarpcastApp) {
        console.log("Conectando en entorno Warpcast...");
        await connectFarcaster();
      } 
      // Estamos en navegador normal
      else {
        console.log("Conectando en navegador normal...");
        
        try {
          // Intentar primero con OnchainKit
          console.log("Intentando signIn con OnchainKit");
          await signIn({
            domain: window.location.host,
            siweUri: window.location.origin,
            resources: [window.location.origin]
          });
          
          // Dar tiempo para que se actualice el estado
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar si se conectó correctamente
          if (!farcasterUser?.walletAddress) {
            console.log("Intentando conectar con Frame SDK como respaldo");
            if (sdk) {
              try {
                await sdk.actions.signIn();
                await connectFarcaster();
              } catch (sdkError) {
                console.error("Error con Frame SDK:", sdkError);
              }
            }
          }
        } catch (error) {
          console.error("Error conectando con billetera:", error);
          setError("No se pudo conectar con la billetera");
        }
      }
    } catch (err) {
      console.error('Error en proceso de conexión:', err);
      setError('Error al conectar con la billetera de Farcaster');
    } finally {
      setIsConnecting(false);
      connectionAttemptInProgress.current = false;
    }
  };

  // Desconectar de la billetera
  const disconnect = () => {
    // Intentar desconectar con OnchainKit
    try {
      signOut().catch(err => console.error('Error en OnchainKit signOut:', err));
    } catch (err) {
      console.error('Error al desconectar OnchainKit:', err);
    }
    
    console.log('Desconectando de Farcaster');
  };

  // Firmar un mensaje con la billetera de Farcaster
  const signMessage = async (message: string): Promise<string | null> => {
    try {
      // Verificar si tenemos una billetera
      if (!isConnected) {
        console.error('No hay billetera conectada para firmar');
        return null;
      }
      
      // Verificar si estamos en Base - si no lo estamos, intentar cambiar
      if (!isBaseNetwork) {
        console.log("No estamos en la red Base. Intentando cambiar antes de firmar...");
        const switched = await switchToBase();
        if (!switched) {
          console.warn("No se pudo cambiar a la red Base, continuando en la red actual");
        }
      }
      
      console.log(`Intentando firmar mensaje con billetera Farcaster: "${message}"`);
      
      // Intentar usar OnchainKit para firmar si está disponible
      if (context?.client?.wallet) {
        try {
          console.log("Intentando firmar con billetera de OnchainKit");
          
          if (typeof window.ethereum !== 'undefined') {
            // Solicitar firma del usuario usando window.ethereum
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
              console.log(`Cuenta activa detectada: ${accounts[0]}`);
              try {
                const signature = await window.ethereum.request({
                  method: 'personal_sign',
                  params: [message, accounts[0]],
                });
                console.log("Firma obtenida:", signature);
                return signature;
              } catch (ethError) {
                console.error("Error firmando con ethereum:", ethError);
              }
            }
          }
        } catch (onchainError) {
          console.error("Error firmando con OnchainKit:", onchainError);
        }
      }
      
      // Intentar con el SDK de Farcaster como respaldo
      if (sdk?.signer?.signMessage) {
        try {
          console.log("Intentando usar signer nativo de Farcaster");
          const signature = await sdk.signer.signMessage(message);
          console.log("Firma obtenida de Farcaster:", signature);
          return signature;
        } catch (e) {
          console.error("Error usando signer nativo:", e);
        }
      }
      
      console.warn("No se pudo firmar el mensaje con la billetera");
      return null;
    } catch (err) {
      console.error('Error firmando mensaje:', err);
      setError('Error al firmar mensaje con la billetera de Farcaster');
      return null;
    }
  };

  // Comprobar automáticamente el estado de la conexión cuando cambia el contexto
  useEffect(() => {
    // Solo intentamos conectar una vez
    if (connectionAttemptInProgress.current) return;
    
    const checkConnection = async () => {
      // Si ya estamos conectados, no hacemos nada
      if (isConnected) return;
      
      if (context && context.client?.added && !isConnecting) {
        console.log("Detectado frame en contexto, intentando conectar automáticamente");
        connect().catch(e => console.error("Error en conexión automática:", e));
      }
    };
    
    checkConnection();
  }, [context, isConnected, isConnecting]);

  return {
    isConnected,
    isConnecting,
    address,
    fid,
    username,
    error,
    connect,
    disconnect,
    signMessage,
    currentChainId,
    switchToBase,
    isBaseNetwork
  };
}; 