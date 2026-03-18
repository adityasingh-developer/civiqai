import { Groq } from "groq-sdk";
import { connectDb } from "@/lib/mongoose";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { getRequiredSession } from "@/lib/auth";
import User from "@/model/User";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT =
  "You only answer about real government, government/public schemes, policies, or programs from any country. "
  
export async function POST(req) {
  try {
    const session = await getRequiredSession();

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const history = Array.isArray(body?.history) ? body.history : [];
    const message =
      body?.message ??
      body?.prompt ??
      (Array.isArray(body?.messages)
        ? body.messages[body.messages.length - 1]?.content
        : undefined);

    if (!message) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const dbHistory = history.length
      ? history
      : (user.chatHistory || []).slice(-6).flatMap((chat) => [
          { role: "user", content: decryptJson(chat.promptEnc) },
          { role: "assistant", content: decryptJson(chat.answerEnc) },
        ]);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...dbHistory.map((msg) => ({
        role: msg?.role === "assistant" ? "assistant" : "user",
        content: `${msg?.content || msg?.text || ""}`,
      })),
      { role: "user", content: `${message}` },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, something went wrong.";

    const userTime = new Date();
    const assistantTime = new Date();

    user.chatHistory.push({
      promptEnc: encryptJson(message),
      answerEnc: encryptJson(answer),
      userTime,
      assistantTime,
    });
    await user.save();

    const savedChat = user.chatHistory[user.chatHistory.length - 1];

    return Response.json({
      answer,
      chat: {
        id: String(savedChat._id),
        input: message,
        answer,
        userTime,
        assistantTime,
      },
    });
  } catch (err) {
    console.error("Groq error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
