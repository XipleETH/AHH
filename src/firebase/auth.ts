import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User, FarcasterProfile } from '../types';
import { sdk } from '@farcaster/frame-sdk';

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid,
    username: user.displayName || `User-${user.uid.substring(0, 5)}`,
    avatar: user.photoURL || undefined,
    isFarcasterUser: false
  };
};

// Función para obtener datos adicionales del perfil de Farcaster
const fetchFarcasterProfileInfo = async (fid: number): Promise<FarcasterProfile | null> => {
  try {
    // Esta función debería hacer una llamada real a la API de Farcaster
    console.log(`Obteniendo información adicional de perfil para FID: ${fid}`);
    
    // Aquí deberíamos usar la API de Neynar o Hubble para obtener datos reales
    // Por ahora, devolvemos null hasta implementar la integración real
    return null;
  } catch (error) {
    console.error('Error obteniendo información adicional de Farcaster:', error);
    return null;
  }
};

// Función para obtener datos del usuario de Farcaster
export const getFarcasterUserData = async (): Promise<User | null> => {
  try {
    // Verificar si el SDK de Farcaster está disponible y el usuario está autenticado
    if (!sdk) {
      console.error('ERROR: SDK de Farcaster no disponible');
      return null;
    }
    
    try {
      // Establecer un tiempo máximo para la operación
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log("Tiempo de espera agotado al obtener usuario de Farcaster");
          resolve(null);
        }, 3000); // 3 segundos máximo
      });
      
      // Crear la promesa para obtener el usuario
      const getUserPromise = (async () => {
        // Obtener información básica del usuario
        const user = await sdk.getUser();
        if (!user) {
          console.log('No hay usuario autenticado en Farcaster');
          return null;
        }
        
        console.log('Usuario de Farcaster obtenido:', user);
        
        // Verificación de billetera
        let verifiedWallet = false;
        let walletAddress = user.custody_address;
        
        // Si tenemos una dirección de custodia, asumimos que está verificada
        if (walletAddress) {
          verifiedWallet = true;
        }
        
        // Si no hay dirección de wallet, no podemos continuar
        if (!walletAddress) {
          console.log('Usuario de Farcaster sin wallet verificada');
          return null;
        }
        
        // Mapear los datos del usuario de Farcaster a nuestro tipo User
        return {
          id: `farcaster-${user.fid}`,
          username: user.username || `farcaster-${user.fid}`,
          avatar: user.pfp || undefined,
          walletAddress: walletAddress,
          fid: user.fid,
          isFarcasterUser: true,
          verifiedWallet: verifiedWallet,
          chainId: 10 // Optimism es la cadena principal para Farcaster
        };
      })();
      
      // Usar la promesa que termine primero
      return await Promise.race([getUserPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error obteniendo usuario de Farcaster:', error);
      return null;
    }
  } catch (error) {
    console.error('Error obteniendo datos de Farcaster:', error);
    return null;
  }
};

// Iniciar sesión con Farcaster
export const signInWithFarcaster = async (): Promise<User | null> => {
  try {
    if (!sdk) {
      console.error('SDK de Farcaster no disponible');
      return null;
    }
    
    // Primero intentar iniciar sesión
    try {
      await sdk.actions.signIn();
    } catch (e) {
      console.error('Error en signIn de Farcaster:', e);
    }
    
    // Luego intentar obtener usuario
    const farcasterUser = await getFarcasterUserData();
    if (farcasterUser) {
      return farcasterUser;
    }
    
    // Si no hay usuario de Farcaster, devolver null
    console.log('No se pudo autenticar con Farcaster');
    return null;
  } catch (error) {
    console.error('Error en signInWithFarcaster:', error);
    return null;
  }
};

// Iniciar sesión anónima (como fallback si no hay Farcaster)
export const signInAnonymousUser = async (): Promise<User | null> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return mapFirebaseUser(userCredential.user);
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
};

// Observar cambios en el estado de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Primero intentamos con Farcaster
  getFarcasterUserData().then(farcasterUser => {
    if (farcasterUser) {
      callback(farcasterUser);
    } else {
      // Si no hay usuario de Farcaster, devolvemos null
      callback(null);
    }
  }).catch(error => {
    console.error('Error en onAuthStateChanged:', error);
    callback(null);
  });
  
  // Devolver una función para limpiar
  return () => {};
};

// Obtener usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  // Primero intentar obtener usuario de Farcaster
  const farcasterUser = await getFarcasterUserData();
  if (farcasterUser) {
    return farcasterUser;
  }
  
  // Si no hay usuario de Farcaster, devolver null
  return null;
}; 