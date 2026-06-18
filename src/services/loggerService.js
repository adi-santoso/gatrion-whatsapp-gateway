import pino from 'pino';

class LoggerService {
  constructor() {
    this.rootLogger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    });
    
    this.sessionLoggers = new Map();
  }

  getSessionLogger(sessionId) {
    if (!this.sessionLoggers.has(sessionId)) {
      this.sessionLoggers.set(
        sessionId,
        this.rootLogger.child({ sessionId })
      );
    }
    return this.sessionLoggers.get(sessionId);
  }

  log(sessionId, level, message, meta = {}) {
    const logger = this.getSessionLogger(sessionId);
    logger[level]({ ...meta }, message);
  }

  info(sessionId, message, meta = {}) {
    this.log(sessionId, 'info', message, meta);
  }

  error(sessionId, message, meta = {}) {
    this.log(sessionId, 'error', message, meta);
  }

  warn(sessionId, message, meta = {}) {
    this.log(sessionId, 'warn', message, meta);
  }

  debug(sessionId, message, meta = {}) {
    this.log(sessionId, 'debug', message, meta);
  }
}

export const loggerService = new LoggerService();
