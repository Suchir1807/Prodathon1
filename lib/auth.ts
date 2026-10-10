import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim().toLowerCase();
        const password = credentials?.password;

        if (!username || !password) {
          return null;
        }

        await connectDB();
        const user = await User.findOne({ username }).select(
          "_id username password isProfileComplete",
        );
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.username,
          isProfileComplete: Boolean(user.isProfileComplete),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.username = user.name ?? undefined;
        token.isProfileComplete = user.isProfileComplete ?? false;
      }
      if (trigger === "update" && session && "isProfileComplete" in session) {
        token.isProfileComplete = Boolean(session.isProfileComplete);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = (token.username as string) ?? session.user.name;
        session.user.isProfileComplete = Boolean(token.isProfileComplete);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
