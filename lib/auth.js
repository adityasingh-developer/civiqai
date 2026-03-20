import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getRequiredSession(req) {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    return session;
  }

  if (!req) {
    return null;
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    return null;
  }

  return {
    user: {
      email: token.email,
      name: token.name || "",
      image: token.picture || "",
    },
  };
}
