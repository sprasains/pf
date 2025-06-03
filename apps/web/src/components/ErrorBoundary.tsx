import React from 'react';
import { Result, Button } from 'antd';
import { logger } from '../utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Unhandled error caught by ErrorBoundary', error, {
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="We've been notified and are working to fix the issue."
          extra={[
            <Button
              type="primary"
              key="reload"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>,
            <Button
              key="home"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 