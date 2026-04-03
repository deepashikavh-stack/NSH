/**
 * Telegram integration via server-side proxy.
 * The bot token is NEVER exposed to the client.
 * All API calls go through the Supabase Edge Function `telegram-proxy`.
 */

const PROXY_URL = import.meta.env.VITE_TELEGRAM_PROXY_URL;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

/**
 * Internal helper: call the telegram proxy edge function
 */
const PROXY_SECRET = import.meta.env.VITE_TELEGRAM_PROXY_SECRET;

const callProxy = async (action, params) => {
    if (!PROXY_URL || PROXY_URL === 'your_telegram_proxy_url_here') {
        if (import.meta.env.DEV) console.warn('Telegram proxy not configured. Skipping.');
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };

    // Include proxy secret header if configured — required by telegram-proxy edge function
    if (PROXY_SECRET && PROXY_SECRET !== 'your_proxy_secret_here') {
        headers['x-telegram-proxy-secret'] = PROXY_SECRET;
    }

    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action, params })
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
};

export const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString().replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
};

export const sendTelegramNotification = async (visitorNames, purpose, meetingWith, visitorId, approvalToken, contactNumber, isExternal = false, source = 'On-arrival', requestedDate = null, requestedTime = null) => {
    const chatId = CHAT_ID;
    const envAppUrl = import.meta.env.VITE_APP_URL;
    const currentUrl = window.location.origin;
    const appUrl = (envAppUrl && envAppUrl !== 'your_app_url_here') ? envAppUrl : currentUrl;

    const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

    if (!chatId || chatId === 'your_chat_id_here') {
        if (import.meta.env.DEV) console.warn('Telegram Notification Skipped: Missing VITE_TELEGRAM_CHAT_ID in .env');
        return null;
    }

    const fullApproveUrl = `${appUrl}/appointment-approval?request_id=${visitorId}`;

    const sourceTag = source === 'webpage' ? ' (from webpage)' : (isExternal ? ' (via the web page)' : ' (On-Arrival)');

    const message = `
🚨 <b>New Meeting Request</b> ${sourceTag}

👤 <b>Visitor:</b> ${escapeHTML(visitorNames)}
📞 <b>Contact:</b> ${escapeHTML(contactNumber || 'Not Provided')}
🏢 <b>Purpose:</b> ${escapeHTML(purpose)}
🤝 <b>Meeting With:</b> ${escapeHTML(meetingWith || 'Not Specified')}
${requestedDate ? `🕒 <b>Requested Time:</b> ${requestedDate} at ${requestedTime}\n` : ''}

${isLocalhost ? `🔗 <b>Approval Link:</b>\n<code>${fullApproveUrl}</code>\n\n<i>(Tap to copy. Paste this in your browser on the computer running the server.)</i>` : '📍 <b>Next Step:</b> Please set the time via the Secure Portal.'}
    `.trim();

    // Inline Buttons
    const inline_keyboard = [];

    if (!isLocalhost) {
        inline_keyboard.push([{ text: "🕒 Approve & Set Time", url: fullApproveUrl }]);
    }

    inline_keyboard.push([{ text: "❌ Reject", callback_data: `reject_mtg:${visitorId}` }]);

    const keyboard = { inline_keyboard };

    const data = await callProxy('sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: keyboard
    });

    if (data?.result) {
        return {
            message_id: data.result.message_id,
            chat_id: data.result.chat.id
        };
    }
    return null;
};

export const updateTelegramMessage = async (chatId, messageId, newText) => {
    await callProxy('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'HTML',
    });
};

export const editTelegramMessageMarkup = async (chatId, messageId, keyboard) => {
    await callProxy('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
    });
};

export const getTimeSelectorKeyboard = (visitorId, step = 'from_h', _unused_selectedValue = null) /* eslint-disable-line no-unused-vars */ => {
    const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
    const inline_keyboard = [];

    for (let i = 0; i < hours.length; i += 4) {
        const row = hours.slice(i, i + 4).map(h => ({
            text: `${h}:00`,
            callback_data: `time:${step}:${visitorId}:${h}`
        }));
        inline_keyboard.push(row);
    }

    inline_keyboard.push([{ text: "◀️ Cancel", callback_data: `cancel_time:${visitorId}` }]);

    return { inline_keyboard };
};

export const getMinuteSelectorKeyboard = (visitorId, step, hour) => {
    const minutes = ['00', '15', '30', '45'];
    const inline_keyboard = [
        minutes.map(m => ({
            text: `${hour}:${m}`,
            callback_data: `time:${step}:${visitorId}:${hour}:${m}`
        })),
        [{ text: "◀️ Back to Hours", callback_data: `resettle_hours:${visitorId}:${step}` }]
    ];

    return { inline_keyboard };
};

export const answerCallbackQuery = async (callbackQueryId, text = null) => {
    const params = { callback_query_id: callbackQueryId };
    if (text) params.text = text;
    await callProxy('answerCallbackQuery', params);
};

export const getTelegramUpdates = async (offset = null) => {
    const params = { timeout: 0 };
    if (offset) params.offset = offset;

    const data = await callProxy('getUpdates', params);

    if (data?.ok && data.result?.length > 0) {
        const maxUpdateId = Math.max(...data.result.map(u => u.update_id));

        const updates = data.result.map(update => {
            if (update.callback_query) {
                return {
                    type: 'callback_query',
                    update_id: update.update_id,
                    callback_id: update.callback_query.id,
                    data: update.callback_query.data,
                    from: update.callback_query.from,
                    message: update.callback_query.message
                };
            }
            if (update.message) {
                return {
                    type: 'message',
                    update_id: update.update_id,
                    message_id: update.message.message_id,
                    text: update.message.text,
                    from: update.message.from,
                    reply_to_message: update.message.reply_to_message
                };
            }
            return null;
        }).filter(u => u !== null);

        return { updates, maxUpdateId };
    }
    return { updates: [], maxUpdateId: 0 };
};

export const sendForceReply = async (chatId, text, replyToMessageId) => {
    await callProxy('sendMessage', {
        chat_id: chatId,
        text: text,
        reply_to_message_id: replyToMessageId,
        reply_markup: {
            force_reply: true,
            selective: true
        }
    });
};

export const formatApprovedMessage = (details) => {
    const {
        visitorNames,
        purpose,
        meetingWith,
        requestReceived,
        approvedBy,
        approvedAt,
        startTime,
        endTime,
        date,
        sourceTag = '(via Web Portal)'
    } = details;

    return `
📅 <b>Meeting Scheduled</b> ${sourceTag}

👤 <b>Visitor(s):</b> ${escapeHTML(visitorNames)}
🏢 <b>Purpose:</b> ${escapeHTML(purpose)}
🤝 <b>Meeting With:</b> ${escapeHTML(meetingWith || 'Not Specified')}
⏰ <b>Request Received:</b> ${requestReceived}

🔐 <b>Confirmed via Secure Portal</b>
👮‍♂️ <b>Approved By:</b> ${escapeHTML(approvedBy)}
⏰ <b>Scheduled At:</b> ${approvedAt}

🕒 <b>Assigned Slot:</b> ${startTime} - ${endTime}
📅 <b>Date:</b> ${date}

📍 <b>Next Step:</b> Visitor is now guided to perform a formal check-in at the kiosk.
    `.trim();
};

export const formatDeniedMessage = (details) => {
    const {
        visitorNames,
        purpose,
        meetingWith,
        actionBy,
        actionAt
    } = details;

    return `
❌ <b>Meeting Request Cancelled</b>

👤 <b>Visitor(s):</b> ${escapeHTML(visitorNames)}
🏢 <b>Purpose:</b> ${escapeHTML(purpose)}
🤝 <b>Meeting With:</b> ${escapeHTML(meetingWith || 'Not Specified')}

👮‍♂️ <b>Action By:</b> ${escapeHTML(actionBy)}
⏰ <b>Time:</b> ${actionAt}
    `.trim();
};
