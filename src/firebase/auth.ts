import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid,
    username: user.displayName || `User-${user.uid.substring(0, 8)}`,
    avatar: user.photoURL || undefined,
    walletAddress: undefined // Se establecerá cuando se conecte la wallet
  };
};

// Estado global del usuario actual
let currentUser: User | null = null;

// Función para crear un usuario basado en una dirección de wallet
export const createWalletUser = (walletAddress: string): User => {
  const walletUser: User = {
    id: `wallet-${walletAddress}`,
    username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
    walletAddress: walletAddress
  };
  
  console.log('👤 Usuario de wallet creado:', walletUser);
  currentUser = walletUser;
  return walletUser;
};

// Función para obtener el usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  // Si ya tenemos un usuario de wallet en memoria, devolverlo
  if (currentUser && currentUser.walletAddress) {
    return currentUser;
  }
  
  // Si tenemos un usuario de Firebase pero sin wallet, mantenerlo
  if (currentUser) {
    return currentUser;
  }
  
  // Si no hay usuario en Firebase, crear uno anónimo
  if (!auth.currentUser) {
    try {
      console.log('🔑 Creando usuario anónimo...');
      const result = await signInAnonymously(auth);
      const user = mapFirebaseUser(result.user);
      currentUser = user;
      return user;
    } catch (error) {
      console.error('Error creando usuario anónimo:', error);
      return null;
    }
  }
  
  // Mapear el usuario de Firebase existente
  const user = mapFirebaseUser(auth.currentUser);
  currentUser = user;
  return user;
};

// Función para iniciar sesión (simplificada)
export const signIn = async (): Promise<User | null> => {
  try {
    console.log('🔑 Iniciando sesión...');
    return await getCurrentUser();
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    return null;
  }
};

// Función para actualizar la wallet del usuario
export const updateUserWallet = (walletAddress: string): void => {
  console.log('🔄 Actualizando wallet del usuario:', walletAddress);
  
  if (currentUser) {
    // Actualizar el usuario existente con la nueva wallet
    currentUser = {
      ...currentUser,
      id: `wallet-${walletAddress}`, // Cambiar ID para que sea basado en wallet
      walletAddress,
      username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    };
  } else {
    // Crear un nuevo usuario basado en la wallet
    currentUser = createWalletUser(walletAddress);
  }
  
  console.log('✅ Usuario actualizado con wallet:', currentUser);
};

// Función para limpiar la wallet del usuario
export const clearUserWallet = (): void => {
  console.log('🧹 Limpiando wallet del usuario');
  
  if (currentUser && currentUser.walletAddress) {
    // Si el usuario tenía una wallet, volver al estado de Firebase
    if (auth.currentUser) {
      currentUser = mapFirebaseUser(auth.currentUser);
    } else {
      currentUser = null;
    }
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
    console.error('Error cerrando sesión:', error);
  }
};

// Función para obtener el usuario por dirección de wallet (para tickets)
export const getUserByWallet = (walletAddress: string): User => {
  // Si el usuario actual tiene esta wallet, devolverlo
  if (currentUser && currentUser.walletAddress === walletAddress) {
    return currentUser;
  }
  
  // Si no, crear un usuario temporal basado en la wallet
  return {
    id: `wallet-${walletAddress}`,
    username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
    walletAddress: walletAddress
  };
};

// Suscribirse a cambios de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Callback interno que maneja los cambios de Firebase Auth
  const handleAuthChange = (firebaseUser: FirebaseUser | null) => {
    console.log('🔄 Firebase auth state changed:', firebaseUser?.uid);
    
    // Si tenemos un usuario con wallet, mantenerlo
    if (currentUser && currentUser.walletAddress) {
      console.log('👤 Manteniendo usuario con wallet:', currentUser);
      callback(currentUser);
      return;
    }
    
    // Si no hay wallet, usar el usuario de Firebase
    const user = mapFirebaseUser(firebaseUser);
    currentUser = user;
    callback(user);
  };
  
  return onFirebaseAuthStateChanged(auth, handleAuthChange);
}; 