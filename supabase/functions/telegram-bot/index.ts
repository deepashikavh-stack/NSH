// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

serve(async (req) => {
    try {
        // Validate webhook secret to prevent unauthorized access
        const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
        if (webhookSecret) {
            const requestSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
            if (requestSecret !== webhookSecret) {
                return new Response('Unauthorized', { status: 401 });
            }
        }

        const url = new URL(req.url)

        // 1. Handle Database Trigger (POST /notify)
        // This is called by Supabase Database Webhook when a new visitor is inserted
        if (url.pathname === '/notify') {
            const payload = await req.json()
            const record = payload.record

            // Only notify if status is Pending
            if (record.status !== 'Pending') {
                return new Response('Not a pending record', { status: 200 })
            }

            const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

            const message = `
🚨 *Approval Required*

👤 *Name:* ${record.name}
🏢 *Purpose:* ${record.purpose}
🤝 *Meeting:* ${record.meeting_with || 'Not specified'}
`
            // Keyboard with Approve/Reject Buttons
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "✅ Approve", callback_data: `approve:${record.id}` },
                        { text: "❌ Reject", callback_data: `reject:${record.id}` }
                    ]
                ]
            }

            const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                })
            })

            return new Response('Notification sent', { status: 200 })
        }

        // 2. Handle Telegram Webhook (POST /webhook)
        // This is called by Telegram when a user clicks a button
        if (req.method === 'POST') {
            const update = await req.json()

            // Handle Callback Query (Button Click)
            if (update.callback_query) {
                const query = update.callback_query
                const data = query.data // e.g., "approve:123"
                const [action, visitorId] = data.split(':')

                let newStatus = ''
                let replyText = ''

                if (action === 'approve') {
                    newStatus = 'Checked-in'
                    replyText = '✅ Visitor Approved & Checked-in'
                } else if (action === 'reject') {
                    newStatus = 'Denied'
                    replyText = '❌ Visitor Access Denied'
                }

                // Update Database
                const { error } = await supabase
                    .from('visitors')
                    .update({ status: newStatus })
                    .eq('id', visitorId)

                if (error) {
                    console.error("DB Update Error", error)
                    replyText = '⚠️ Error updating database'
                }

                // Answer Callback (Stop spinner on button)
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: query.id,
                        text: replyText
                    })
                })

                // Update Message Text (Remove buttons)
                await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        text: `${query.message.text}\n\nProcessed: ${replyText}`,
                        reply_markup: { inline_keyboard: [] } // Clear buttons
                    })
                })

                return new Response('Callback processed', { status: 200 })
            }
        }

        return new Response('Ok', { status: 200 })

    } catch (error) {
        console.error(error)
        return new Response('Error', { status: 500 })
    }
})
