import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import http from "node:http";

const rootDir = process.cwd();
const envPath = path.join(rootDir, "apps/mobile/.env.local");
const dashboardDir = path.join(rootDir, "site-public/dashboard");
const localConfigPath = path.join(dashboardDir, "dashboard.local-config.js");
const preferredPort = Number(process.env.DASHBOARD_PORT || "4173");

function parseDotenv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function writeDashboardConfig() {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo de ambiente nao encontrado em ${envPath}.`);
  }

  const env = parseDotenv(fs.readFileSync(envPath, "utf8"));
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY precisam existir em apps/mobile/.env.local."
    );
  }

  const fileContents = `window.GG_DASHBOARD_CONFIG = ${JSON.stringify(
    {
      supabaseUrl,
      supabaseAnonKey,
    },
    null,
    2
  )};\n`;

  fs.writeFileSync(localConfigPath, fileContents, "utf8");
}

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args =
    platform === "darwin"
      ? [url]
      : platform === "win32"
        ? ["/c", "start", "", url]
        : [url];

  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "ignore",
    detached: true,
  });

  child.unref();
}

function resolveContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }

  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }

  if (extension === ".js" || extension === ".mjs") {
    return "application/javascript; charset=utf-8";
  }

  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  return "application/octet-stream";
}

function createStaticServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    let relativePath = decodeURIComponent(requestUrl.pathname);

    if (relativePath.endsWith("/")) {
      relativePath += "index.html";
    }

    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(rootDir, normalizedPath);

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": resolveContentType(filePath),
        "Cache-Control": "no-store",
      });
      response.end(data);
    });
  });
}

function startServer(startPort) {
  const server = createStaticServer();

  return new Promise((resolve, reject) => {
    function tryListen(port) {
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && port < startPort + 19) {
          tryListen(port + 1);
          return;
        }

        reject(error);
      });

      server.listen(port, "0.0.0.0", () => {
        resolve({ server, port });
      });
    }

    tryListen(startPort);
  });
}

try {
  writeDashboardConfig();
  const { server, port } = await startServer(preferredPort);
  const dashboardUrl = `http://localhost:${port}/site-public/dashboard/`;
  console.log(`Dashboard configurado com o Supabase de apps/mobile/.env.local`);
  console.log(`Abrindo ${dashboardUrl}`);
  openBrowser(dashboardUrl);
  server.on("close", () => {
    process.exit(0);
  });
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}
