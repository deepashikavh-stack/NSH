/**
 * NotificationStrategy — Abstract base for notification channels.
 * 
 * Implements the Strategy pattern so that notification dispatch is
 * decoupled from channel-specific logic. Each channel (Telegram, SMS,
 * Calendar) implements its own send() method.
 * 
 * Usage:
 *   const service = new NotificationService();
 *   service.addChannel(new TelegramNotification());
 *   service.addChannel(new SMSNotification());
 *   await service.notifyAll(recipient, message);
 */

// ─── Abstract Strategy ───────────────────────────────────────────────────────

export class NotificationStrategy {
    /**
     * @param {string} channelName — Human-readable channel identifier
     */
    constructor(channelName) {
        if (new.target === NotificationStrategy) {
            throw new Error('NotificationStrategy is abstract.');
        }
        this.channelName = channelName;
    }

    /**
     * Send a notification. Must be implemented by subclasses.
     * @param {string|Object} _recipient — Channel-specific recipient identifier
     * @param {string} _message — The notification content
     * @param {Object} [_options={}] — Channel-specific options
     * @returns {Promise<Object|null>} Channel-specific result
     */
    async send(_recipient, __unused_message = {}, __unused_options = {}) /* eslint-disable-line no-unused-vars */ {
        throw new Error(`${this.channelName}: send() not implemented`);
    }

    /**
     * Validate that this channel is properly configured.
     * @returns {boolean}
     */
    isConfigured() {
        return true;
    }
}

// ─── Telegram Strategy ───────────────────────────────────────────────────────

export class TelegramNotification extends NotificationStrategy {
    constructor() {
        super('Telegram');
        this.proxyUrl = import.meta.env.VITE_TELEGRAM_PROXY_URL;
        this.chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    }

    isConfigured() {
        return !!(this.proxyUrl && this.proxyUrl !== 'your_telegram_proxy_url_here'
            && this.chatId && this.chatId !== 'your_chat_id_here');
    }

    async send(recipient, message = {}, options = {}) {
        if (!this.isConfigured()) {
            if (import.meta.env.DEV) console.warn('Telegram: not configured, skipping.');
            return null;
        }

        const chatId = recipient || this.chatId;
        const params = {
            chat_id: chatId,
            text: message,
            parse_mode: options.parseMode || 'HTML',
        };

        if (options.replyMarkup) {
            params.reply_markup = options.replyMarkup;
        }

        return this._callProxy('sendMessage', params);
    }

    /**
     * Edit an existing Telegram message.
     */
    async editMessage(chatId, messageId, newText) {
        return this._callProxy('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: newText,
            parse_mode: 'HTML',
        });
    }

    /**
     * Edit the reply markup of an existing message.
     */
    async editMessageMarkup(chatId, messageId, keyboard) {
        return this._callProxy('editMessageReplyMarkup', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
        });
    }

    /**
     * Answer a callback query (inline button press).
     */
    async answerCallback(callbackQueryId, text = null) {
        const params = { callback_query_id: callbackQueryId };
        if (text) params.text = text;
        return this._callProxy('answerCallbackQuery', params);
    }

    /**
     * Get pending updates from the Telegram bot.
     */
    async getUpdates(offset = null) {
        const params = { timeout: 0 };
        if (offset) params.offset = offset;
        return this._callProxy('getUpdates', params);
    }

    /** Internal proxy caller */
    async _callProxy(action, params) {
        try {
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ action, params }),
            });

            const data = await response.json();
            if (!response.ok) {
                if (import.meta.env.DEV) console.error(`Telegram proxy error [${action}]:`, data);
                return null;
            }
            return data;
        } catch (error) {
            if (import.meta.env.DEV) console.error(`Telegram proxy network error [${action}]:`, error);
            return null;
        }
    }
}

// ─── SMS Strategy ────────────────────────────────────────────────────────────

export class SMSNotification extends NotificationStrategy {
    constructor() {
        super('SMS');
    }

    async send(recipient, message = {}, __unused_options = {}) /* eslint-disable-line no-unused-vars */ {
        // TODO: Integrate with real SMS gateway (Twilio, Vonage, local provider)
        console.log('--- [SMS LOG START] ---');
        console.log(`To: ${recipient}`);
        console.log(`Message: ${message}`);
        console.log('--- [SMS LOG END] ---');

        return { success: true, status: 'logged' };
    }
}

// ─── Calendar Strategy ───────────────────────────────────────────────────────

export class CalendarNotification extends NotificationStrategy {
    constructor() {
        super('Calendar');
    }

    /**
     * Create a calendar event as a notification mechanism.
     * This delegates to the existing Google Calendar integration.
     */
    async send(_recipient, __unused_message = {}, options = {}) /* eslint-disable-line no-unused-vars */ {
        // Calendar notifications are handled via googleCalendar.js
        // This strategy wraps event creation for the notification pipeline
        const { createGoogleCalendarEvent } = await import('../../lib/googleCalendar');
        return createGoogleCalendarEvent(options.eventDetails);
    }
}
