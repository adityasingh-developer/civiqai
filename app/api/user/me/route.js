import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { connectDb } from "@/lib/mongoose";
import User from "@/model/User";

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
  );
}

export async function GET(req) {
  let session = null;

  try {
    session = await getRequiredSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json({
        user: {
          email: session.user.email,
          name: session.user.name || "",
          image: session.user.image || "",
          provider: "google",
          createdAt: null,
          lastLogin: null,
        },
        chats: [],
      });
    }

    const chats = (user.chatHistory || []).map((chat) => ({
      id: String(chat._id),
      input: readChatText(chat.promptEnc),
      answer: readChatText(chat.answerEnc),
      promptImages: Array.isArray(chat.promptImages) ? chat.promptImages : [],
      userTime: chat.userTime,
      assistantTime: chat.assistantTime,
      savedUser: Boolean(chat.savedUser),
      savedAssistant: Boolean(chat.savedAssistant),
      savedUserAt: chat.savedUserAt,
      savedAssistantAt: chat.savedAssistantAt,
    }));

    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        image: user.image,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      chats,
    });
  } catch (error) {
    console.error("Failed to load user data:", error);

    if (session && isDbUnavailableError(error)) {
      return NextResponse.json({
        user: {
          email: session.user.email,
          name: session.user.name || "",
          image: session.user.image || "",
          provider: "google",
          createdAt: null,
          lastLogin: null,
        },
        chats: [],
        degraded: true,
      });
    }

    return NextResponse.json({ error: "Failed to load user data" }, { status: 500 });
  }
}
