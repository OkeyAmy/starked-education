import type { AppProps } from 'next/app';
import { WalletProvider } from '../context/WalletContext';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
      <Toaster position="bottom-right" />
    </WalletProvider>
  );
}

export default MyApp;
