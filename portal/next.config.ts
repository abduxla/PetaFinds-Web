import type { NextConfig } from "next";

/**
 * The portal ships as a fully static bundle served by Netlify UNDER the
 * marketing site: https://petafinds.lk/portal/. There is no Next.js
 * server: all data access goes through the Firebase JS SDK (Firestore
 * rules enforce authorization) and privileged writes go through
 * App-Check-enforced callable Cloud Functions — the same trust model as
 * the PettahFinds mobile app.
 *
 * The Netlify build (repo-root netlify.toml) compiles this app and copies
 * `out/` into `website/portal/`, which Netlify publishes alongside the
 * static marketing site.
 */
const nextConfig: NextConfig = {
  output: "export",
  // Served under petafinds.lk/portal — all routes/assets get this prefix.
  basePath: "/portal",
  // No image-optimization server in a static export; images serve as-is.
  images: { unoptimized: true },
  // Emit /route/index.html paths so static hosting serves deep links.
  trailingSlash: true,
};

export default nextConfig;
