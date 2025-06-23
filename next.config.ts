import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",
    basePath: process.env.NODE_ENV === "production" ? "/SchemaForge" : "",
};

export default nextConfig;
