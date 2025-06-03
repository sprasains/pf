import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import ErrorBoundary from '../components/ErrorBoundary';
import { logger } from '../utils/logger';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Log initial page load
    logger.info('Page loaded', {
      path: router.pathname,
      query: router.query,
    });

    // Log navigation events
    const handleRouteChange = (url: string) => {
      logger.logNavigation(router.asPath, url);
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return (
    <ErrorBoundary>
      <ConfigProvider>
        <Component {...pageProps} />
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App; 