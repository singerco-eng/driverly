import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;
  const sentryOrg = env.SENTRY_ORG || process.env.SENTRY_ORG;
  const sentryProject = env.SENTRY_PROJECT || process.env.SENTRY_PROJECT;

  const plugins = [react()];

  if (mode === "production" && sentryAuthToken && sentryOrg && sentryProject) {
    plugins.push(
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
        telemetry: false,
        sourcemaps: {
          assets: "./dist/**",
        },
      })
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      sourcemap: true,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
