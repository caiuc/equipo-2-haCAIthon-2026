import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl"],
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_TOKEN ?? "",
  },
  async redirects() {
    return [
      { source: "/mando", destination: "/analisis", permanent: false },
      { source: "/intake", destination: "/reporte", permanent: false },
    ];
  },
};

export default nextConfig;
