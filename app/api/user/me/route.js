import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongoose";
import { decryptJson } from "@/lib/crypto";
import { getRequiredSession } from "@/lib/auth";
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
      userTime: chat.userTime,
      assistantTime: chat.assistantTime,
    }));

    const savedMessages = (user.savedMessages || []).map((item) => ({
      id: String(item._id),
      chatId: String(item.chatId),
      role: item.role,
      text: decryptJson(item.contentEnc),
      createdAt: item.createdAt,
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
      savedMessages,
    });
  } catch (error) {
    console.error("Failed to load user data:", error);
    return NextResponse.json({ error: "Failed to load user data" }, { status: 500 });
  }
}
