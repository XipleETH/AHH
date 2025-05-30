import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';

// Estado global del usuario actual
let currentUser: User | null = null;

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null, walletAddress?: string): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid, // SIEMPRE usar el UID de Firebase como ID consistente
    username: walletAddress 
      ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
      : `User-${user.uid.substring(0, 8)}`,
    avatar: user.photoURL || undefined,
    walletAddress: walletAddress
  };
};

// Función para obtener el usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('🔍 getCurrentUser llamado, currentUser:', currentUser);
  
  // Si ya tenemos un usuario en memoria, devolverlo
  if (currentUser) {
    console.log('✅ Devolviendo usuario en memoria:', currentUser);
    return currentUser;
  }
  
  // Si no hay usuario de Firebase autenticado, crear uno anónimo
  if (!auth.currentUser) {
    try {
      console.log('🔑 Creando usuario anónimo de Firebase...');
      const result = await signInAnonymously(auth);
      const user = mapFirebaseUser(result.user);
      currentUser = user;
      console.log('✅ Usuario anónimo creado:', user);
      return user;
    } catch (error) {
      console.error('❌ Error creando usuario anónimo:', error);
      return null;
    }
  }
  
  // Mapear el usuario de Firebase existente
  const user = mapFirebaseUser(auth.currentUser, currentUser?.walletAddress);
  currentUser = user;
  console.log('✅ Usuario de Firebase mapeado:', user);
  return user;
};

// Función para iniciar sesión (simplificada)
export const signIn = async (): Promise<User | null> => {
  try {
    console.log('🔑 Iniciando sesión...');
    return await getCurrentUser();
  } catch (error) {
    console.error('❌ Error en inicio de sesión:', error);
    return null;
  }
};

// Función para actualizar la wallet del usuario
export const updateUserWallet = (walletAddress: string): void => {
  console.log('🔄 Actualizando wallet del usuario:', walletAddress);
  
  if (currentUser) {
    // Mantener el mismo ID de Firebase, solo actualizar la wallet y username
    currentUser = {
      ...currentUser,
      walletAddress,
      username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    };
  } else if (auth.currentUser) {
    // Si hay un usuario de Firebase pero no en memoria, mapearlo con la wallet
    currentUser = mapFirebaseUser(auth.currentUser, walletAddress);
  }
  
  console.log('✅ Usuario actualizado con wallet:', currentUser);
};

// Función para limpiar la wallet del usuario
export const clearUserWallet = (): void => {
  console.log('🧹 Limpiando wallet del usuario');
  
  if (currentUser) {
    // Mantener el usuario pero quitar la wallet
    currentUser = {
      ...currentUser,
      walletAddress: undefined,
      username: `User-${currentUser.id.substring(0, 8)}`
    };
  }
  
  console.log('✅ Wallet limpiada, usuario actual:', currentUser);
};

// Función para cerrar sesión
export const signOut = async (): Promise<void> => {
  try {
    await auth.signOut();
    currentUser = null;
    console.log('🚪 Sesión cerrada');
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error);
  }
};

// Función para crear un usuario basado en una dirección de wallet (legacy)
export const createWalletUser = (walletAddress: string): User => {
  console.warn('⚠️ createWalletUser está deprecated, usando Firebase Auth en su lugar');
  return getCurrentUser().then(user => user || {
    id: 'anonymous',
    username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
    walletAddress: walletAddress
  }) as any;
};

// Función para obtener el usuario por dirección de wallet (para tickets)
export const getUserByWallet = (walletAddress: string): User => {
  // Si el usuario actual tiene esta wallet, devolverlo
  if (currentUser && currentUser.walletAddress === walletAddress) {
    return currentUser;
  }
  
  // Si no, devolver un usuario genérico (esto no debería pasar en la implementación actual)
  console.warn('⚠️ getUserByWallet llamado para wallet no actual:', walletAddress);
  return {
    id: 'unknown',
    username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
    walletAddress: walletAddress
  };
};

// Suscribirse a cambios de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Callback interno que maneja los cambios de Firebase Auth
  const handleAuthChange = (firebaseUser: FirebaseUser | null) => {
    console.log('🔄 Firebase auth state changed:', firebaseUser?.uid);
    
    if (firebaseUser) {
      // Mantener la wallet actual si existe
      const walletAddress = currentUser?.walletAddress;
      const user = mapFirebaseUser(firebaseUser, walletAddress);
      currentUser = user;
      console.log('👤 Usuario actualizado por Firebase Auth:', user);
      callback(user);
    } else {
      currentUser = null;
      console.log('👤 Usuario desconectado');
      callback(null);
    }
  };
  
  return onFirebaseAuthStateChanged(auth, handleAuthChange);
}; 