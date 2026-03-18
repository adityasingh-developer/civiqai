import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongoose";
import { encryptJson } from "@/lib/crypto";
import { getRequiredSession } from "@/lib/auth";
import User from "@/model/User";

export async function POST(req) {
  try {
    const session = await getRequiredSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, role, text } = await req.json();

    if (!chatId || !text || !["user", "assistant"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const exists = user.savedMessages.some(
      (item) => String(item.chatId) === String(chatId) && item.role === role
    );

    if (!exists) {
      user.savedMessages.push({
        chatId,
        role,
        contentEnc: encryptJson(text),
        createdAt: new Date(),
      });
      await user.save();
    }

    const saved = user.savedMessages.find(
      (item) => String(item.chatId) === String(chatId) && item.role === role
    );

    return NextResponse.json({
      ok: true,
      savedMessage: saved
        ? {
            id: String(saved._id),
            chatId: String(saved.chatId),
            role: saved.role,
            createdAt: saved.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to save message:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getRequiredSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, role } = await req.json();

    if (!chatId || !["user", "assistant"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.savedMessages = user.savedMessages.filter(
      (item) => !(String(item.chatId) === String(chatId) && item.role === role)
    );
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unsave message:", error);
    return NextResponse.json({ error: "Failed to unsave message" }, { status: 500 });
  }
}
