import { GoogleGenerativeAI } from "@google/generative-ai";
// import Groq from "groq-sdk";

import { decryptJson, encryptJson } from "@/lib/crypto"
import { getRequiredSession } from "@/lib/auth"
import { connectDb } from "@/lib/mongoose"
import User from "@/model/User"

const SYSTEM_PROMPT =
  "You only answer about real government/public schemes, policies, or programs from any country. " +
  "If the user asks about people, characters, places, companies (you may answer about company job recruitments), " +
  "or anything unrelated, reply exactly: Not relevant. If user asks who are you, reply exactly: Im CiviqAi. " +
  "If unsure or not real, reply exactly: Not found. Respond in simple(use simple language not legal language(like legal hindi is hard), use simple language), short, factual points (1000-1500 chars max). " +
  "Use # for headings. If user asks you can tell how to apply to that scheme";

const GOOGLE_MODEL = "gemini-2.5-flash";

function readChatText(payload) {
  try {
    const value = decryptJson(payload);
    return typeof value === "string" ? value : "";
  } catch {
    return typeof payload === "string" && !payload.includes(".") ? payload : "";
  }
}

function isDbUnavailableError(error) {
  return Boolean(
    error && (
      error.name === "MongoServerSelectionError" ||
      error.name === "MongoNetworkError" ||
      error.code === "ECONNREFUSED" ||
      error.syscall === "querySrv"
    )
  )
}

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
    ]
  })
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
    })
  })

  return parts;
}

function toStreamEvent(payload) {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(req) {
  try {
    const session = await getRequiredSession(req);

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

    const userInput =
      typeof message === "string" && message.trim().length > 0
        ? message.trim()
        : "";
    const finalMessage =
      userInput || (images.length > 0 ? "Analyze this attachment." : "");
    const promptImages = images
      .filter((image) => image?.cacheKey && image?.name && image?.mimeType)
      .map((image) => ({
        cacheKey: image.cacheKey,
        name: image.name,
        mimeType: image.mimeType,
      }));

    if (!finalMessage && images.length === 0) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    await connectDb();
    let user = await User.findOne({ email: session.user.email });

    if (!user) {
      user = await User.create({
        email: session.user.email,
        name: session.user.name || "",
        image: session.user.image || "",
        provider: "google",
        lastLogin: new Date(),
      });
    }

    const dbHistory = history.length
      ? history
      : (user.chatHistory || []).slice(-6).flatMap((chat) => [
          { role: "user", content: readChatText(chat.promptEnc) },
          { role: "assistant", content: readChatText(chat.answerEnc) },
        ]);

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GOOGLE_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chatSession = model.startChat({
      history: buildGeminiHistory(dbHistory),
      generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
    });

    const streamResult = await chatSession.sendMessageStream(
      buildGeminiParts(finalMessage, images)
    );
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let answer = "";

        try {
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();

            if (!text) {
              continue;
            }

            answer += text;
            controller.enqueue(
              encoder.encode(toStreamEvent({ type: "chunk", text }))
            );
          }

          answer = answer.trim() || "Sorry, something went wrong.";

          const userTime = new Date();
          const assistantTime = new Date();

          user.chatHistory.push({
            promptEnc: encryptJson(userInput),
            answerEnc: encryptJson(answer),
            promptImages,
            userTime,
            assistantTime,
            savedUser: false,
            savedAssistant: false,
            savedUserAt: null,
            savedAssistantAt: null,
          });
          await user.save();

          const savedChat = user.chatHistory[user.chatHistory.length - 1];

          controller.enqueue(
            encoder.encode(
              toStreamEvent({
                type: "done",
                answer,
                chat: {
                  id: String(savedChat._id),
                  input: userInput,
                  promptImages,
                  answer,
                  userTime,
                  assistantTime,
                  savedUser: false,
                  savedAssistant: false,
                  savedUserAt: null,
                  savedAssistantAt: null,
                },
              })
            )
          );
        } catch (error) {
          console.error("Gemini stream error:", error);
          controller.enqueue(
            encoder.encode(
              toStreamEvent({
                type: "error",
                error: isDbUnavailableError(error)
                  ? "Database connection failed. Check MongoDB Atlas or your network/DNS."
                  : "Server error",
              })
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Gemini error:", error);

    if (isDbUnavailableError(error)) {
      return Response.json(
        { error: "Database connection failed. Check MongoDB Atlas or your network/DNS." },
        { status: 503 }
      );
    }

    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
