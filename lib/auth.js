import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  return session;
}
