type LogLevel = 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

function toLogLine(level: LogLevel, message: string, meta: LogMeta) {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

function emit(level: LogLevel, message: string, meta: LogMeta = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const line = toLogLine(level, message, meta);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  info: (message: string, meta: LogMeta = {}) => emit('info', message, meta),
  warn: (message: string, meta: LogMeta = {}) => emit('warn', message, meta),
  error: (message: string, meta: LogMeta = {}) => emit('error', message, meta),
};
