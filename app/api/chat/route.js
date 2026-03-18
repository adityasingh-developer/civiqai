import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT =
  "You only answer about real government/public schemes, policies, or programs from any country. If the user asks about people, characters, places, companies (you may answer about company job recruitments), or anything unrelated, reply exactly: Not relevant. If user asks who are you, reply exactly: Im CiviqAi. If unsure or not real, reply exactly: Not found. Respond in simple, short, factual points (500-1000 chars max). Use # for headings. Do not add extra commentary.";

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

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta?.content || "";
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          console.error("Groq stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });

  } catch (err) {
    console.error("Groq error:", err);
    return new Response("Server error", { status: 500 });
  }
}
