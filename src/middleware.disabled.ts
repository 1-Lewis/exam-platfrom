import { withAuth } from "next-auth/middleware"
import type { NextRequest } from "next/server"
import type { JWT } from "next-auth/jwt"

export default withAuth({
  callbacks: {
    authorized: ({ token, req }: { token: JWT | null; req: NextRequest }) => {
      const p = req.nextUrl.pathname

      // Doit être connecté pour ces pages
      if (p.startsWith("/dashboard") || p.startsWith("/exam")) return !!token

      // Admin uniquement (plus de `any` ici)
      if (p.startsWith("/admin")) return token?.role === "ADMIN"

      return true
    },
  },
})

export const config = {
  matcher: ["/dashboard/:path*", "/exam/:path*", "/admin/:path*"],
}
