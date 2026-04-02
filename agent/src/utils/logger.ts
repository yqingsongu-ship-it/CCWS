import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export function createLogger(label: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { label },
    transports: [
      new winston.transports.Console({
        format: combine(colorize(), logFormat),
      }),
      new winston.transports.File({
        filename: `logs/agent-error.log`,
        level: 'error',
        format: combine(logFormat),
      }),
      new winston.transports.File({
        filename: `logs/agent.log`,
        format: combine(logFormat),
      }),
    ],
  });
}
