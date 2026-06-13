import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local IP dev origins to prevent HMR WebSocket blocks
  allowedDevOrigins: ["192.168.1.2", "192.168.1.2:3000", "localhost", "localhost:3000", "salty-animals-switch.loca.lt", "*.loca.lt"]
};

export default nextConfig;
