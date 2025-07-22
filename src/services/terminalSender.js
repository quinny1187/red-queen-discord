const { exec } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

class TerminalSender {
    constructor() {
        this.pythonScript = path.join(__dirname, 'send_to_terminal.py');
    }

    async sendToTerminal(text) {
        return new Promise((resolve, reject) => {
            // Use Python script similar to claude-listen
            const command = `python "${this.pythonScript}" "${text.replace(/"/g, '\\"')}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error('Failed to send to terminal:', error);
                    reject(error);
                    return;
                }
                
                if (stderr) {
                    logger.warn('Terminal sender warning:', stderr);
                }
                
                logger.info('Message sent to terminal successfully');
                resolve(stdout);
            });
        });
    }
}

module.exports = TerminalSender;