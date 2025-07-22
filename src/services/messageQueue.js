const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class MessageQueue {
    constructor() {
        this.queue = [];
        this.queuePath = process.env.MESSAGE_QUEUE_PATH || './message-queue';
        this.maxQueueSize = 1000;
        this.initializeQueue();
    }
    
    async initializeQueue() {
        try {
            // Create queue directory if it doesn't exist
            await fs.mkdir(this.queuePath, { recursive: true });
            
            // Load existing queue if any
            const queueFile = path.join(this.queuePath, 'queue.json');
            try {
                const data = await fs.readFile(queueFile, 'utf8');
                this.queue = JSON.parse(data);
                logger.info(`Loaded ${this.queue.length} messages from queue`);
            } catch (error) {
                // File doesn't exist, start with empty queue
                logger.info('Starting with empty message queue');
            }
        } catch (error) {
            logger.error('Error initializing message queue:', error);
        }
    }
    
    async addMessage(message) {
        try {
            // Add message to queue
            this.queue.push({
                ...message,
                queuedAt: Date.now()
            });
            
            // Limit queue size
            if (this.queue.length > this.maxQueueSize) {
                this.queue = this.queue.slice(-this.maxQueueSize);
            }
            
            // Save to file
            await this.saveQueue();
            
            // Emit event for console bridge
            this.emit('message', message);
            
            logger.debug(`Added message to queue: ${message.id}`);
        } catch (error) {
            logger.error('Error adding message to queue:', error);
        }
    }
    
    async getMessages(limit = 10) {
        return this.queue.slice(-limit);
    }
    
    async getMessageById(id) {
        return this.queue.find(msg => msg.id === id);
    }
    
    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
    }
    
    async saveQueue() {
        try {
            const queueFile = path.join(this.queuePath, 'queue.json');
            await fs.writeFile(queueFile, JSON.stringify(this.queue, null, 2));
        } catch (error) {
            logger.error('Error saving queue:', error);
        }
    }
    
    // Event emitter functionality
    emit(event, data) {
        if (this.listeners && this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    on(event, callback) {
        if (!this.listeners) this.listeners = {};
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
}

module.exports = MessageQueue;