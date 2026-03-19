import { GoogleGenerativeAI } from "@google/generative-ai";
// import { Groq } from "groq-sdk";

import { decryptJson, encryptJson } from "@/lib/crypto";
import { getRequiredSession } from "@/lib/auth";
import { connectDb } from "@/lib/mongoose";
import User from "@/model/User";

const SYSTEM_PROMPT =
  "You only answer about real government/public schemes, policies, or programs from any country. " +
  "If the user asks about people, characters, places, companies (you may answer about company job recruitments), " +
  "or anything unrelated, reply exactly: Not relevant. If user asks who are you, reply exactly: Im CiviqAi. " +
  "If unsure or not real, reply exactly: Not found. Respond in simple, short, factual points (500-1000 chars max). " +
  "Use # for headings. Do not add extra commentary.";

const GOOGLE_MODEL = "gemini-2.5-flash";

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

function buildGeminiHistory(history) {
  return history.flatMap((message) => {
    const text = `${message?.content || message?.text || ""}`.trim();

    if (!text) {
      return [];
    }

    return [
      {
        role: message?.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      },
    ];
  });
}

function buildGeminiParts(message, images) {
  const parts = [];

  if (message) {
    parts.push({ text: message });
  }

  images.forEach((image) => {
    if (!image?.data || !image?.mimeType) {
      return;
    }

    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    });
  });

  return parts;
}

export async function POST(req) {
  try {
    const session = await getRequiredSession();

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json(
        { error: "GOOGLE_AI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const history = Array.isArray(body?.history) ? body.history : [];
    const images = Array.isArray(body?.images) ? body.images : [];
    const message =
      body?.message ??
      body?.prompt ??
      (Array.isArray(body?.messages)
        ? body.messages[body.messages.length - 1]?.content
        : undefined);

    const finalMessage =
      typeof message === "string" && message.trim().length > 0
        ? message.trim()
        : images.length > 0
          ? "Analyze this image."
          : "";

    if (!finalMessage && images.length === 0) {
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

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GOOGLE_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chatSession = model.startChat({
      history: buildGeminiHistory(dbHistory),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    });

    const result = await chatSession.sendMessage(
      buildGeminiParts(finalMessage, images)
    );
    const answer = result.response.text().trim() || "Sorry, something went wrong.";

    const userTime = new Date();
    const assistantTime = new Date();

    user.chatHistory.push({
      promptEnc: encryptJson(finalMessage),
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
        input: finalMessage,
        answer,
        userTime,
        assistantTime,
      },
    });
  } catch (error) {
    console.error("Gemini error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
