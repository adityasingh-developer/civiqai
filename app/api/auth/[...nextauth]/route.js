import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDb } from "@/lib/mongoose";
import { encryptJson } from "@/lib/crypto";
import User from "@/model/User";

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectDb();

      await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            email: user.email,
            name: user.name || profile?.name || "",
            image: user.image || profile?.picture || "",
            provider: account?.provider || "google",
            profileEnc: encryptJson(profile || {}),
            lastLogin: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      return true;
    },
    async session({ session }) {
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
