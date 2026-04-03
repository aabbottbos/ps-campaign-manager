import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables")
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET environment variable")
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }

      // Validate user still exists in database
      if (token.id && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
          })

          // If user doesn't exist, find or create by email
          if (!dbUser) {
            console.log("[JWT] User ID not found, looking up by email:", token.email)
            const userByEmail = await prisma.user.findUnique({
              where: { email: token.email },
            })

            if (userByEmail) {
              console.log("[JWT] Found user by email, updating token ID:", userByEmail.id)
              token.id = userByEmail.id
            }
          }
        } catch (error) {
          console.error("[JWT] Error validating user:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}
