import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logFile: string;

  constructor() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, `discord-mcp-${new Date().toISOString().split('T')[0]}.log`);
  }

  private log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output
    console.error(`[${level}] ${message}`, data || '');

    // File output
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }
}