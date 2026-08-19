import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default dev indicator position (bottom-left) overlaps the canvas's
  // zoom-out button (see canvas-control-bar.tsx). Bottom-right is free
  // since MiniMap was removed from there.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
