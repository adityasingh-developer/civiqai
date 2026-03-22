import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth"
import { connectDb } from "@/lib/mongoose"
import User from "@/model/User"

export async function DELETE(req) {
  try {
    const session = await getRequiredSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    await User.updateOne(
      { email: session.user.email },
      { $set: { chatHistory: [] } }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete history:", error);
    return NextResponse.json({ error: "Failed to delete history" }, { status: 500 });
  }
}
