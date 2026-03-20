import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getRequiredSession } from "@/lib/auth";
import { connectDb } from "@/lib/mongoose";
import User from "@/model/User";

export async function POST(req) {
  try {
    const session = await getRequiredSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, role } = await req.json();

    if (!chatId || !["user", "assistant"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    }

    const savedAt = new Date();
    const chatObjectId = new mongoose.Types.ObjectId(chatId);
    const update =
      role === "user"
        ? {
            $set: {
              "chatHistory.$.savedUser": true,
              "chatHistory.$.savedUserAt": savedAt,
            },
          }
        : {
            $set: {
              "chatHistory.$.savedAssistant": true,
              "chatHistory.$.savedAssistantAt": savedAt,
            },
          };

    const result = await User.collection.updateOne(
      { email: session.user.email, "chatHistory._id": chatObjectId },
      update
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      savedMessage: {
        id: `${chatId}:${role}`,
        chatId,
        role,
        createdAt: savedAt,
      },
    });
  } catch (error) {
    console.error("Failed to save message:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getRequiredSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, role } = await req.json();

    if (!chatId || !["user", "assistant"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    }

    const chatObjectId = new mongoose.Types.ObjectId(chatId);
    const update =
      role === "user"
        ? {
            $set: {
              "chatHistory.$.savedUser": false,
              "chatHistory.$.savedUserAt": null,
            },
          }
        : {
            $set: {
              "chatHistory.$.savedAssistant": false,
              "chatHistory.$.savedAssistantAt": null,
            },
          };

    const result = await User.collection.updateOne(
      { email: session.user.email, "chatHistory._id": chatObjectId },
      update
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unsave message:", error);
    return NextResponse.json({ error: "Failed to unsave message" }, { status: 500 });
  }
}
