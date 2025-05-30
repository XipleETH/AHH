import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { connectWallet, getTokenBalance, getUserNFTs, buyTickets, claimPrizes } from '../utils/contract';

export const useWallet = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [nfts, setNfts] = useState<string[]>([]);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [isPendingTransaction, setIsPendingTransaction] = useState(false);

  // Intentar conectar automáticamente si hay usuario de Farcaster
  useEffect(() => {
    if (user?.isFarcasterUser && user?.walletAddress && !isConnected && !isConnecting) {
      handleConnect();
    }
  }, [user, isConnected, isConnecting]);

  // Cargar información de tokens si está conectado
  useEffect(() => {
    if (isConnected && user) {
      loadUserWalletData();
    }
  }, [isConnected, user]);

  // Conectar billetera
  const handleConnect = async () => {
    if (!user) return;
    
    try {
      setIsConnecting(true);
      const success = await connectWallet(user);
      setIsConnected(success);
    } catch (error) {
      console.error('Error al conectar billetera:', error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Cargar datos de la billetera del usuario
  const loadUserWalletData = async () => {
    if (!user) return;
    
    try {
      // Obtener balance de tokens
      const balance = await getTokenBalance(user);
      setTokenBalance(balance);
      
      // Obtener NFTs del usuario
      const userNfts = await getUserNFTs(user);
      setNfts(userNfts);
    } catch (error) {
      console.error('Error al cargar datos de billetera:', error);
    }
  };

  // Comprar tickets
  const handleBuyTickets = async (ticketCount: number) => {
    if (!user || !isConnected) return null;
    
    try {
      setIsPendingTransaction(true);
      const txHash = await buyTickets(user, ticketCount);
      setLastTransaction(txHash);
      
      // Recargar balance después de la transacción
      await loadUserWalletData();
      
      return txHash;
    } catch (error) {
      console.error('Error al comprar tickets:', error);
      return null;
    } finally {
      setIsPendingTransaction(false);
    }
  };

  // Reclamar premios
  const handleClaimPrizes = async (ticketIds: string[]) => {
    if (!user || !isConnected) return null;
    
    try {
      setIsPendingTransaction(true);
      const txHash = await claimPrizes(user, ticketIds);
      setLastTransaction(txHash);
      
      // Recargar balance después de la transacción
      await loadUserWalletData();
      
      return txHash;
    } catch (error) {
      console.error('Error al reclamar premios:', error);
      return null;
    } finally {
      setIsPendingTransaction(false);
    }
  };

  return {
    isConnected,
    isConnecting,
    tokenBalance,
    nfts,
    lastTransaction,
    isPendingTransaction,
    connectWallet: handleConnect,
    buyTickets: handleBuyTickets,
    claimPrizes: handleClaimPrizes,
    refreshWalletData: loadUserWalletData
  };
}; 