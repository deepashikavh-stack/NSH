import { NotificationStrategy } from './NotificationStrategy';

/**
 * NotificationService — Orchestrates multi-channel notification dispatch.
 * 
 * Design Pattern: Strategy + Observer
 *  - Strategy: Each channel implements NotificationStrategy
 *  - Observer: Service dispatches to all registered channels
 * 
 * Usage:
 *   const notifier = new NotificationService();
 *   notifier.addChannel(new TelegramNotification());
 *   notifier.addChannel(new SMSNotification());
 *   
 *   await notifier.notifyAll(recipient, 'Meeting approved', { parseMode: 'HTML' });
 *   await notifier.notifyChannel('Telegram', chatId, message);
 */
export class NotificationService {
    constructor() {
        /** @type {Map<string, NotificationStrategy>} */
        this.channels = new Map();
    }

    /**
     * Register a notification channel.
     * @param {NotificationStrategy} channel
     * @returns {NotificationService} this (for chaining)
     */
    addChannel(channel) {
        if (!(channel instanceof NotificationStrategy)) {
            throw new Error('Channel must extend NotificationStrategy');
        }
        this.channels.set(channel.channelName, channel);
        return this;
    }

    /**
     * Remove a notification channel.
     * @param {string} channelName
     * @returns {NotificationService} this
     */
    removeChannel(channelName) {
        this.channels.delete(channelName);
        return this;
    }

    /**
     * Send notification through ALL configured channels.
     * Failures on individual channels do not block others.
     * @param {string|Object} recipient
     * @param {string} message
     * @param {Object} [options={}]
     * @returns {Promise<Object>} Results map: { channelName: result|error }
     */
    async notifyAll(recipient, message, options = {}) {
        const results = {};

        const promises = Array.from(this.channels.entries()).map(async ([name, channel]) => {
            try {
                if (channel.isConfigured()) {
                    results[name] = await channel.send(recipient, message, options);
                } else {
                    results[name] = { skipped: true, reason: 'not configured' };
                }
            } catch (error) {
                console.error(`NotificationService: ${name} channel failed:`, error);
                results[name] = { error: error.message };
            }
        });

        await Promise.allSettled(promises);
        return results;
    }

    /**
     * Send notification through a SPECIFIC channel.
     * @param {string} channelName
     * @param {string|Object} recipient
     * @param {string} message
     * @param {Object} [options={}]
     * @returns {Promise<Object|null>}
     */
    async notifyChannel(channelName, recipient, message, options = {}) {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`NotificationService: unknown channel '${channelName}'`);
        }

        if (!channel.isConfigured()) {
            console.warn(`NotificationService: ${channelName} is not configured`);
            return null;
        }

        return channel.send(recipient, message, options);
    }

    /**
     * Get a specific channel for direct access to channel-specific methods.
     * @param {string} channelName
     * @returns {NotificationStrategy|undefined}
     */
    getChannel(channelName) {
        return this.channels.get(channelName);
    }

    /**
     * List all registered channels and their configuration status.
     * @returns {Array<{ name: string, configured: boolean }>}
     */
    listChannels() {
        return Array.from(this.channels.entries()).map(([name, channel]) => ({
            name,
            configured: channel.isConfigured(),
        }));
    }
}
