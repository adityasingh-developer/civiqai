import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT =
  "You only answer about real government/public schemes, policies, or programs from any country. If the user asks about people, characters, places, companies(can answer company job recruitments), or anything unrelated, reply exactly: Not relevant. If unsure or not real, reply exactly: Not found. Respond in simple, short, factual points (500-1000 chars max). Use # for headings. Do not add extra commentary.";

const SCHEME_KEYWORDS = [
  "scheme",
  "policy",
  "program",
  "programme",
  "benefit",
  "subsidy",
  "grant",
  "pension",
  "welfare",
  "eligibility",
  "apply",
  "application",
  "government",
  "ministry",
  "youth",
  "farmer",
  "employment",
  "health",
  "education",
  "housing",
  "insurance",
];

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

    const lastUser = incomingMessages[incomingMessages.length - 1];
    const userText = `${lastUser?.content || ""}`.toLowerCase();
    const looksRelevant = SCHEME_KEYWORDS.some((word) => userText.includes(word));
    if (!looksRelevant) {
      return new Response("Not relevant", { status: 200 });
    }

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
