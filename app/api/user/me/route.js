import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { connectDb } from "@/lib/mongoose";
import User from "@/model/User";

export async function GET() {
  try {
    const session = await getRequiredSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chats = (user.chatHistory || []).map((chat) => ({
      id: String(chat._id),
      input: decryptJson(chat.promptEnc),
      answer: decryptJson(chat.answerEnc),
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
    return NextResponse.json({ error: "Failed to load user data" }, { status: 500 });
  }
}
