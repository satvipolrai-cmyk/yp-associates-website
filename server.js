import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const DATA_DIR = path.join(__dirname, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "valuation-requests.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  if (!existsSync(REQUESTS_FILE)) {
    await writeFile(REQUESTS_FILE, "[]\n", "utf8");
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 1_000_000) {
      throw new Error("Request body is too large.");
    }
  }

  return JSON.parse(body || "{}");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data, null, 2));
}

function isValidEnquiry(enquiry) {
  return Boolean(
    enquiry &&
      enquiry.name &&
      enquiry.mobile &&
      enquiry.propertyType &&
      enquiry.location &&
      enquiry.purpose
  );
}

async function handleCreateRequest(request, response) {
  try {
    const enquiry = await readJsonBody(request);

    if (!isValidEnquiry(enquiry)) {
      sendJson(response, 400, {
        message: "Please provide name, contact number, property category, location, and purpose.",
      });
      return;
    }

    await ensureDataFile();

    const existing = JSON.parse(await readFile(REQUESTS_FILE, "utf8"));
    const savedRequest = {
      id: randomUUID(),
      name: String(enquiry.name).trim(),
      mobile: String(enquiry.mobile).trim(),
      propertyType: String(enquiry.propertyType).trim(),
      area: String(enquiry.area || "").trim(),
      location: String(enquiry.location).trim(),
      purpose: String(enquiry.purpose).trim(),
      contactTime: String(enquiry.contactTime || "").trim(),
      details: String(enquiry.details || "").trim(),
      createdAt: new Date().toISOString(),
    };

    existing.push(savedRequest);
    await writeFile(REQUESTS_FILE, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

    sendJson(response, 201, {
      message: "Valuation request submitted successfully.",
      request: savedRequest,
    });
  } catch (error) {
    sendJson(response, 500, {
      message: "Could not save valuation request.",
      error: error.message,
    });
  }
}

async function handleListRequests(request, response) {
  const token = request.headers.authorization?.replace("Bearer ", "");

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    sendJson(response, 403, { message: "Admin access is required." });
    return;
  }

  await ensureDataFile();
  const requests = JSON.parse(await readFile(REQUESTS_FILE, "utf8"));
  sendJson(response, 200, { requests });
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(__dirname, cleanPath));

  if (!filePath.startsWith(__dirname)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/valuation-requests" && request.method === "POST") {
    await handleCreateRequest(request, response);
    return;
  }

  if (url.pathname === "/api/valuation-requests" && request.method === "GET") {
    await handleListRequests(request, response);
    return;
  }

  await serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Y&P Associates website running at http://localhost:${PORT}`);
});
