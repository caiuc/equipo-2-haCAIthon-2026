import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl"],
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_TOKEN ?? "",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY ?? "",
  },
  async redirects() {
    return [
      { source: "/mando", destination: "/hospital", permanent: false },
      { source: "/analisis", destination: "/hospital", permanent: false },
      { source: "/intake", destination: "/registro", permanent: false },
      { source: "/reporte", destination: "/registro", permanent: false },
      { source: "/urgencias", destination: "/registro", permanent: false },
    ];
  },
};

export default nextConfig;
