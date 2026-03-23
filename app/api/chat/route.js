import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";
// import Groq from "groq-sdk";

import { decryptJson, encryptJson } from "@/lib/crypto"
import { getRequiredSession } from "@/lib/auth"
import { connectDb } from "@/lib/mongoose"
import User from "@/model/User"

export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You only answer about real government/public schemes, policies, or programs from any country. " +
  "If the user asks about people, characters, places, companies (you may answer about company job recruitments), " +
  "or anything unrelated, reply exactly: Not relevant. If user asks who are you, reply exactly: Im CiviqAi. " +
  "If unsure or not real, reply exactly: Not found. Respond in simple(use simple language not legal language(like legal hindi is hard), use simple language), short, factual points (1000-1500 chars max). " +
  "Use # for headings. If user asks you can tell how to apply to that scheme. Always finish the final sentence or final bullet completely before stopping.";

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

async function withRetries(run, attempts = 3, delayMs = 1200) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
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

async function waitForFileActive(fileManager, file) {
  let nextFile = file;

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (nextFile.state === FileState.ACTIVE) {
      return nextFile;
    }

    if (nextFile.state === FileState.FAILED) {
      throw new Error("Attachment processing failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
    nextFile = await withRetries(() => fileManager.getFile(nextFile.name), 2, 800);
  }

  throw new Error("Attachment processing timed out.");
}

async function buildGeminiParts(message, images, fileManager) {
  const parts = [];
  const uploadedFiles = [];

  if (message) {
    parts.push({ text: message });
  }

  for (const image of images) {
    if (!image?.buffer || !image?.mimeType) {
      continue;
    }

    if (image.mimeType.startsWith("image/")) {
      parts.push({
        inlineData: {
          data: image.buffer.toString("base64"),
          mimeType: image.mimeType,
        },
      });
      continue;
    }

    const upload = await withRetries(
      () =>
        fileManager.uploadFile(image.buffer, {
          mimeType: image.mimeType,
          displayName: image.name || "attachment",
        }),
      2,
      1000
    );
    const readyFile = await waitForFileActive(fileManager, upload.file);
    uploadedFiles.push(readyFile.name);

    parts.push({
      fileData: {
        mimeType: readyFile.mimeType,
        fileUri: readyFile.uri,
      },
    })
  }

  return { parts, uploadedFiles };
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

    const contentType = req.headers.get("content-type") || "";
    let history = [];
    let images = [];
    let message;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawHistory = formData.get("history");
      const attachmentFiles = formData.getAll("attachments");
      const attachmentMeta = formData
        .getAll("attachmentMeta")
        .map((item) => {
          try {
            return JSON.parse(`${item || "{}"}`);
          } catch {
            return {};
          }
        });

      const parsedHistory = JSON.parse(`${rawHistory || "[]"}`);
      history = Array.isArray(parsedHistory) ? parsedHistory : [];
      message = formData.get("message");
      images = await Promise.all(
        attachmentFiles.map(async (file, index) => {
          const meta = attachmentMeta[index] || {};
          return {
            cacheKey: meta.cacheKey || "",
            name: meta.name || file.name || `attachment-${index + 1}`,
            mimeType: meta.mimeType || file.type || "application/octet-stream",
            size: meta.size || file.size || 0,
            buffer: Buffer.from(await file.arrayBuffer()),
          };
        })
      );
    } else {
      const body = await req.json();
      history = Array.isArray(body?.history) ? body.history : [];
      message =
        body?.message ??
        body?.prompt ??
        (Array.isArray(body?.messages)
          ? body.messages[body.messages.length - 1]?.content
          : undefined);
    }

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
    const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GOOGLE_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chatSession = model.startChat({
      history: buildGeminiHistory(dbHistory),
      generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
    });

    const { parts, uploadedFiles } = await buildGeminiParts(finalMessage, images, fileManager);
    const result = await withRetries(() => chatSession.sendMessage(parts), 2, 1000);
    const answer = result.response.text().trim() || "Sorry, something went wrong.";

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

    await Promise.allSettled(
      uploadedFiles.map((fileName) => fileManager.deleteFile(fileName))
    );

    return Response.json({
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
    });
  } catch (error) {
    console.error("Gemini error:", error);

    if (isDbUnavailableError(error)) {
      return Response.json(
        { error: "Database connection failed. Check MongoDB Atlas or your network/DNS." },
        { status: 503 }
      );
    }

    return Response.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}
