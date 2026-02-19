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

export const sendTelegramNotification = async (visitorNames, purpose, meetingWith, visitorId, approvalToken, contactNumber, isExternal = false, source = 'On-arrival') => {
    console.log('--- sendTelegramNotification ---');
    console.log('isExternal:', isExternal);
    console.log('source:', source);
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    const envAppUrl = import.meta.env.VITE_APP_URL;
    const currentUrl = window.location.origin;
    const appUrl = (envAppUrl && envAppUrl !== 'your_app_url_here') ? envAppUrl : currentUrl;

    const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

    // Check if configuration exists
    if (!token || !chatId || token === 'your_token_here' || chatId === 'your_chat_id_here') {
        console.warn('Telegram Notification Skipped: Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID in .env');
        return null;
    }

    const fullApproveUrl = `${appUrl}/approve/${approvalToken}`;

    const sourceTag = source === 'webpage' ? ' (from webpage)' : (isExternal ? ' (via the web page)' : ' (On-Arrival)');

    const message = `
🚨 <b>New Meeting Request</b> ${sourceTag}

👤 <b>Visitor:</b> ${escapeHTML(visitorNames)}
📞 <b>Contact:</b> ${escapeHTML(contactNumber || 'Not Provided')}
🏢 <b>Purpose:</b> ${escapeHTML(purpose)}
🤝 <b>Meeting With:</b> ${escapeHTML(meetingWith || 'Not Specified')}

${isLocalhost ? `🔗 <b>Approval Link:</b>\n<code>${fullApproveUrl}</code>\n\n<i>(Tap to copy. Paste this in your browser on the computer running the server.)</i>` : '📍 <b>Next Step:</b> Please set the time via the Secure Portal.'}
    `.trim();

    // Inline Buttons
    const inline_keyboard = [];

    // Telegram restricts localhost in URL buttons.
    // If NOT localhost, add the button.
    if (!isLocalhost) {
        inline_keyboard.push([{ text: "🕒 Approve & Set Time", url: fullApproveUrl }]);
    }

    // Always keep the Reject button (it's callback_data, not a URL)
    inline_keyboard.push([{ text: "❌ Reject", callback_data: `reject_mtg:${visitorId}` }]);

    const keyboard = { inline_keyboard };

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to send Telegram message:', data);
            alert(`Telegram Error [${response.status}]: ${data.description || 'Unknown error'}`);
            return null;
        } else {
            console.log('Telegram notification sent successfully.');
            return {
                message_id: data.result.message_id,
                chat_id: data.result.chat.id
            };
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        alert(`Telegram Network Error: ${error.message}`);
        return null;
    }
};

export const updateTelegramMessage = async (chatId, messageId, newText) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

    if (!token) return;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] } // Explicitly remove buttons
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Failed to update Telegram message:', data);
        } else {
            console.log('Telegram message updated successfully.');
        }
    } catch (error) {
        console.error('Error updating Telegram message:', error);
    }
};

export const editTelegramMessageMarkup = async (chatId, messageId, keyboard) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            })
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Failed to edit Telegram markup:', data);
        }
    } catch (error) {
        console.error('Error editing Telegram markup:', error);
    }
};

export const getTimeSelectorKeyboard = (visitorId, step = 'from_h', selectedValue = null) => {
    const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
    const inline_keyboard = [];

    // Create grid for hours
    for (let i = 0; i < hours.length; i += 4) {
        const row = hours.slice(i, i + 4).map(h => ({
            text: `${h}:00`,
            callback_data: `time:${step}:${visitorId}:${h}`
        }));
        inline_keyboard.push(row);
    }

    // Add a cancel button
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
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
        const payload = { callback_query_id: callbackQueryId };
        if (text) payload.text = text;

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("Error answering callback query:", error);
    }
};

export const getTelegramUpdates = async (offset = null) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) return { updates: [], maxUpdateId: 0 };

    try {
        const params = new URLSearchParams({
            timeout: '0',
            allowed_updates: JSON.stringify(["callback_query", "message"])
        });
        if (offset) params.append('offset', offset);

        const url = `https://api.telegram.org/bot${token}/getUpdates?${params.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
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
    } catch (error) {
        console.error("Error fetching Telegram updates:", error);
        return { updates: [], maxUpdateId: 0 };
    }
};

export const sendForceReply = async (chatId, text, replyToMessageId) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                reply_to_message_id: replyToMessageId,
                reply_markup: {
                    force_reply: true,
                    selective: true
                }
            })
        });
    } catch (error) {
        console.error("Error sending force reply:", error);
    }
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
