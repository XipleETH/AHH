import { http, createConfig } from 'wagmi';
import { base, optimism, mainnet } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

// Configuración de los conectores de billetera
const connectors = [
  coinbaseWallet({
    appName: 'LottoMoji',
    appLogoUrl: 'https://lottomoji.app/logo.png', // Puedes cambiar esto por tu logo
    headlessMode: false, // Usar UI de Coinbase Wallet
    preference: 'smartWalletOnly' // Priorizar Smart Wallet
  }),
  injected({
    target: 'metaMask'
  })
];

// Configuración de las redes que soportamos
export const config = createConfig({
  chains: [base, optimism, mainnet],
  connectors,
  transports: {
    [base.id]: http(),
    [optimism.id]: http(),
    [mainnet.id]: http()
  }
});

// Exportar constantes útiles
export const SUPPORTED_CHAINS = [base, optimism, mainnet];
export const DEFAULT_CHAIN = base; 