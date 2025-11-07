// middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

/**
 * Middleware = garde "large" (pas d'accès DB ici).
 * - /dashboard et /exams/* : connexion requise
 * - /admin/* : STAFF only (ADMIN ou TEACHER) ; ownership fin géré dans les handlers (ACL)
 */
export default withAuth({
  callbacks: {
    authorized: ({ token, req }: { token: JWT | null; req: NextRequest }) => {
      const p = req.nextUrl.pathname;

      // Auth requise pour ces sections
      if (p.startsWith("/dashboard") || p.startsWith("/exams")) {
        return !!token?.id;
      }

      // Espace admin accessible au STAFF uniquement (ADMIN ou TEACHER)
      if (p.startsWith("/admin")) {
        const role = token?.role as "ADMIN" | "TEACHER" | "STUDENT" | undefined | null;
        return role === "ADMIN" || role === "TEACHER";
      }

      // Le reste est public
      return true;
    },
  },
});

export const config = {
  // Protège seulement les pages (pas les API routes)
  matcher: ["/dashboard/:path*", "/exams/:path*", "/admin/:path*"],
};
