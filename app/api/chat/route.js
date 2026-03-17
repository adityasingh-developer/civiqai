const MODELS = [
  "openai/gpt-oss-20b:free"
];

const SYSTEM_PROMPT =
  "Only answer government schemes. If unrelated, say \"Not relevant\". Respond in simple, short, factual points. No fluff.";

async function callModel(model, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is missing");
      clearTimeout(timeout);
      return null;
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "CiviqAI",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`OpenRouter error ${res.status} for ${model}:`, errorText);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    console.error(`OpenRouter request failed for ${model}`);
    clearTimeout(timeout);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const incomingMessages = Array.isArray(body?.messages)
      ? body.messages
      : body?.message
        ? [{ role: "user", content: body.message }]
        : [];

    if (incomingMessages.length === 0) {
      return new Response("Missing messages", { status: 400 });
    }

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...incomingMessages,
    ];

    let reply = null;

    for (const model of MODELS) {
      reply = await callModel(model, messages);
      if (reply) break;
    }

    return new Response(reply || "All models failed", { status: 200 });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}
