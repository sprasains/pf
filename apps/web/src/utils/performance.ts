import React, { lazy, Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { logger } from './logger';

// Lazy load component with loading fallback
export function lazyLoad(importFunc: () => Promise<any>, fallback: React.ReactNode = null) {
  const LazyComponent = lazy(importFunc);
  return (props: any) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Virtualized list component
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [ref, inView] = useInView({
    threshold: 0,
  });

  const startIndex = Math.floor(window.scrollY / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight),
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;

  return {
    ref,
    inView,
    visibleItems,
    startIndex,
    totalHeight,
  };
}

// Debounced function
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// Memoized value with cache
export function useMemoizedValue<T>(
  value: T,
  key: string,
  ttl: number = 5 * 60 * 1000 // 5 minutes
) {
  const cache = useRef<Map<string, { value: T; timestamp: number }>>(new Map());

  return useMemo(() => {
    const cached = cache.current.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    cache.current.set(key, { value, timestamp: now });
    return value;
  }, [value, key, ttl]);
}

// Image lazy loading
export function useLazyImage(src: string) {
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: true,
  });

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (inView && !loaded && !error) {
      const img = new Image();
      img.src = src;
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
    }
  }, [inView, src, loaded, error]);

  return {
    ref,
    loaded,
    error,
  };
}

// Performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(window.performance.now());

  useEffect(() => {
    const now = window.performance.now();
    const renderTime = now - lastRenderTime.current;
    renderCount.current++;

    logger.debug('Component render:', {
      component: componentName,
      renderCount: renderCount.current,
      renderTime,
    });

    lastRenderTime.current = now;
  });
}

// Resource preloading
export function useResourcePreload(resources: string[]) {
  useEffect(() => {
    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = resource.endsWith('.js') ? 'script' : 'style';
      link.href = resource;
      document.head.appendChild(link);
    });
  }, [resources]);
}

// Error boundary
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Performance optimization hooks
export const performanceHooks = {
  useVirtualization,
  useDebounce,
  useMemoizedValue,
  useLazyImage,
  usePerformanceMonitor,
  useResourcePreload,
};

// Export all utilities
export const performance = {
  lazyLoad,
  ErrorBoundary,
  ...performanceHooks,
}; 