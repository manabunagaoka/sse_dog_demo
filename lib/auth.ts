import NextAuth, { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const parent = await prisma.parent.findUnique({
          where: { email: credentials.email as string },
        })

        if (!parent) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          parent.password
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: parent.id,
          email: parent.email,
          name: parent.name,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
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
  session: {
    strategy: "jwt",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
