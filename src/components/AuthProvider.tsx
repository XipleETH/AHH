import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signInWithFarcaster } from '../firebase/auth';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  isFarcasterAvailable: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  isFarcasterAvailable: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFarcasterAvailable, setIsFarcasterAvailable] = useState(false);
  const [authAttempted, setAuthAttempted] = useState(false);
  
  // Usar nuestro hook personalizado de Farcaster
  const { 
    isConnected: isFarcasterConnected,
    address: farcasterAddress,
    fid: farcasterFid,
    username: farcasterUsername,
    connect: connectFarcasterWallet
  } = useFarcasterWallet();
  
  // Obtener información del contexto MiniKit
  const { farcasterUser, isWarpcastApp } = useMiniKitAuth();

  // Forzar fin de carga después de un tiempo máximo
  useEffect(() => {
    if (!authAttempted) return;
    
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Tiempo máximo de carga alcanzado, finalizando estado de carga");
        setIsLoading(false);
      }
    }, 3000); // 3 segundos máximo de carga
    
    return () => clearTimeout(timeout);
  }, [isLoading, authAttempted]);

  // Actualizar el estado cuando cambia el usuario de Farcaster
  useEffect(() => {
    if (farcasterUser) {
      console.log("Estableciendo usuario de Farcaster desde MiniKitAuth:", farcasterUser);
      setUser(farcasterUser);
      setIsLoading(false);
      setAuthAttempted(true);
    }
  }, [farcasterUser]);

  // Actualizar disponibilidad de Farcaster
  useEffect(() => {
    setIsFarcasterAvailable(isWarpcastApp);
  }, [isWarpcastApp]);

  // Crear usuario de Farcaster desde datos de billetera
  useEffect(() => {
    // Si tenemos información de la billetera de Farcaster pero no un usuario completo,
    // crear uno basado en esos datos
    if (isFarcasterConnected && farcasterAddress && farcasterFid && !user) {
      console.log("Creando usuario de Farcaster desde datos de billetera:", {
        fid: farcasterFid,
        address: farcasterAddress,
        username: farcasterUsername
      });
      
      const newUser: User = {
        id: `farcaster-${farcasterFid}`,
        username: farcasterUsername || `farcaster-${farcasterFid}`,
        walletAddress: farcasterAddress,
        fid: farcasterFid,
        isFarcasterUser: true,
        verifiedWallet: true,
        chainId: 10 // Optimism
      };
      
      setUser(newUser);
      setIsLoading(false);
      setAuthAttempted(true);
    }
  }, [isFarcasterConnected, farcasterAddress, farcasterFid, farcasterUsername, user]);

  // Verificar autenticación una sola vez al inicio
  useEffect(() => {
    if (authAttempted) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    const checkAuth = async () => {
      try {
        // Si ya tenemos un usuario de Farcaster, no hacer nada más
        if (farcasterUser || (isFarcasterConnected && farcasterAddress)) {
          return;
        }
        
        console.log("Verificando autenticación inicial...");
        const result = await new Promise<User | null>((resolve) => {
          onAuthStateChanged((authUser) => {
            if (authUser?.isFarcasterUser) {
              console.log("Usuario de Farcaster encontrado:", authUser);
              resolve(authUser);
            } else {
              console.log("No se encontró usuario de Farcaster");
              resolve(null);
            }
          });
        });
        
        if (isMounted) {
          if (result) {
            setUser(result);
          }
          setIsLoading(false);
          setAuthAttempted(true);
        }
      } catch (error) {
        console.error("Error en verificación de autenticación:", error);
        if (isMounted) {
          setIsLoading(false);
          setAuthAttempted(true);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [farcasterUser, isFarcasterConnected, farcasterAddress, authAttempted]);

  // Función optimizada de inicio de sesión
  const signIn = useCallback(async () => {
    if (user) return;
    
    try {
      setIsLoading(true);
      setAuthAttempted(true);
      
      console.log("Iniciando proceso de autenticación...");
      
      // Si ya tenemos usuario de Farcaster, usarlo
      if (farcasterUser) {
        console.log("Ya tenemos usuario de Farcaster, usándolo");
        setUser(farcasterUser);
        setIsLoading(false);
        return;
      }
      
      // Intentar conectar billetera de Farcaster
      if (!isFarcasterConnected && connectFarcasterWallet) {
        console.log("Conectando billetera Farcaster...");
        try {
          await connectFarcasterWallet();
          // Dar tiempo para que se actualicen los estados
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (isFarcasterConnected && farcasterAddress && farcasterFid) {
            console.log("Billetera conectada con éxito");
            // Los efectos se encargarán de actualizar el usuario
            return;
          }
        } catch (error) {
          console.error("Error conectando billetera:", error);
        }
      }
      
      // Último intento: API directa de Farcaster
      try {
        console.log("Intentando API directa de Farcaster");
        const farcasterAuthUser = await signInWithFarcaster();
        if (farcasterAuthUser) {
          console.log("Autenticación exitosa con API de Farcaster");
          setUser(farcasterAuthUser);
        } else {
          console.log("Autenticación fallida con API de Farcaster");
        }
      } catch (error) {
        console.error("Error final en autenticación:", error);
      }
    } catch (error) {
      console.error("Error general en signIn:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, farcasterUser, isFarcasterConnected, farcasterAddress, farcasterFid, connectFarcasterWallet]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading: isLoading && authAttempted, // Solo mostrar carga si realmente intentamos autenticar
      signIn, 
      isFarcasterAvailable 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 