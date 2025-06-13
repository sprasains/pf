import { API_BASE_URL } from '../config';
import api from './api'; // Import the axios instance

// Log levels
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const;

// Log colors for console
const LOG_COLORS = {
  [LOG_LEVELS.DEBUG]: '#6c757d',
  [LOG_LEVELS.INFO]: '#0d6efd',
  [LOG_LEVELS.WARN]: '#ffc107',
  [LOG_LEVELS.ERROR]: '#dc3545'
};

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private logToConsole(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level as keyof typeof LOG_COLORS];
    
    console.log(
      `%c[${timestamp}] ${level.toUpperCase()}: ${message}`,
      `color: ${color}`
    );
    
    if (data) {
      console.log(data);
    }
  }

  private async logToServer(level: string, message: string, data?: any) {
    try {
      // Use the imported axios instance for sending logs
      await api.post('/api/logs', {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  }

  public debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.logToConsole(LOG_LEVELS.DEBUG, message, data);
    }
  }

  public info(message: string, data?: any) {
    this.logToConsole(LOG_LEVELS.INFO, message, data);
    this.logToServer(LOG_LEVELS.INFO, message, data);
  }

  public warn(message: string, data?: any) {
    this.logToConsole(LOG_LEVELS.WARN, message, data);
    this.logToServer(LOG_LEVELS.WARN, message, data);
  }

  public error(message: string, error?: Error, data?: any) {
    this.logToConsole(LOG_LEVELS.ERROR, message, { error, ...data });
    this.logToServer(LOG_LEVELS.ERROR, message, {
      error: error?.message,
      stack: error?.stack,
      ...data
    });
  }

  public logNavigation(from: string, to: string) {
    this.info('Navigation', { from, to });
  }

  public logComponentLifecycle(componentName: string, lifecycle: 'mount' | 'update' | 'unmount') {
    this.debug(`Component ${lifecycle}`, { componentName });
  }

  public logApiCall(method: string, url: string, status: number, duration: number) {
    this.info('API Call', { method, url, status, duration });
  }
}

export const logger = Logger.getInstance(); 