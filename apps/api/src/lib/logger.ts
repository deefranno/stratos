/** Minimal structured JSON logger (one JSON object per line). */
type Level = 'info' | 'warn' | 'error';
const write = (level: Level, message: string, fields: Record<string, unknown> = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => write('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write('error', message, fields),
  request: (method: string, path: string, status: number, ms: number, userId?: string) =>
    write('info', 'http_request', { method, path, status, ms, userId }),
};
