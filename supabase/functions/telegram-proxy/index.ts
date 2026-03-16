import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-proxy-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate proxy secret to prevent unauthorized access
  const proxySecret = Deno.env.get("TELEGRAM_PROXY_SECRET");
  const requestSecret = req.headers.get("x-telegram-proxy-secret");

  if (proxySecret && requestSecret !== proxySecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "Bot token not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

  try {
    const body = await req.json();
    const { action, params } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let telegramUrl = "";
    let telegramBody: Record<string, unknown> = {};

    switch (action) {
      case "sendMessage":
        telegramUrl = `${BASE_URL}/sendMessage`;
        telegramBody = {
          chat_id: params.chat_id,
          text: params.text,
          parse_mode: params.parse_mode || "Markdown",
          reply_markup: params.reply_markup,
          reply_to_message_id: params.reply_to_message_id,
        };
        break;

      case "editMessageText":
        telegramUrl = `${BASE_URL}/editMessageText`;
        telegramBody = {
          chat_id: params.chat_id,
          message_id: params.message_id,
          text: params.text,
          parse_mode: params.parse_mode || "Markdown",
        };
        break;

      case "editMessageReplyMarkup":
        telegramUrl = `${BASE_URL}/editMessageReplyMarkup`;
        telegramBody = {
          chat_id: params.chat_id,
          message_id: params.message_id,
          reply_markup: params.reply_markup,
        };
        break;

      case "answerCallbackQuery":
        telegramUrl = `${BASE_URL}/answerCallbackQuery`;
        telegramBody = {
          callback_query_id: params.callback_query_id,
          text: params.text,
        };
        break;

      case "getUpdates":
        telegramUrl = `${BASE_URL}/getUpdates`;
        telegramBody = {
          offset: params.offset,
          timeout: params.timeout || 0,
        };
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Forward the request to Telegram API
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telegramBody),
    });

    const telegramData = await telegramResponse.json();

    return new Response(JSON.stringify(telegramData), {
      status: telegramResponse.ok ? 200 : telegramResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
