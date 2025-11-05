// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empêche Next d'ajouter .next/types dans tsconfig
  typedRoutes: false,
};

export default nextConfig;
