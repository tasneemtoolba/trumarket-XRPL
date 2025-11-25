import * as fs from 'fs';
import * as path from 'path';
import pino, { type Logger, type LoggerOptions } from 'pino';

import { config } from '../config';

// Ensure log directory exists
const ensureLogDirectory = (logPath: string): void => {
  const logDir = path.dirname(logPath);
  if (logDir && !fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      // If we can't create the directory, log to console instead
      console.warn(`Failed to create log directory ${logDir}:`, error);
    }
  }
};

// Ensure log directory exists before using it
if (config.logsDestination && config.logsDestination !== '1' && config.logsDestination !== '2') {
  ensureLogDirectory(config.logsDestination);
}

const pinoOptions: LoggerOptions = { level: config.logLevel };
let pinoTransport: any;
let pinoLogger: Logger;

if (config.env === 'development' || config.prettyLogs) {
  pinoTransport = pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        level: 'trace',
        options: {
          destination: config.logsDestination,
          colorize: true,
        },
      },
      {
        target: 'pino-pretty',
        level: 'trace',
        options: { destination: 1, colorize: true },
      },
    ],
  });
}

// eslint-disable-next-line
pinoLogger = pino(pinoOptions, pinoTransport);

export const loggerOptions = pinoOptions;
export const logger = pinoLogger;
