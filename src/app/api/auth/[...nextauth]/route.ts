import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
// Utilise l'alias @ si ton tsconfig est ok, sinon remplace par "../../../../lib/prisma"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase()
        const password = credentials?.password?.toString() || ""
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        // NextAuth attend au minimum { id, email, name }
        return { id: user.id, email: user.email, name: user.name ?? null }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Après login, 'user' est défini → stocke l'id
      if (user) token.id = user.id as string

      // Ajoute le rôle au JWT si absent
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        })
        token.role = dbUser?.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: { signIn: "/login" },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
