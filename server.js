"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");

const KNOWLEDGE = require("./knowledge");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));
app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res, filePath) {
      if (/\.(html)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      } else if (/\.(css|js|json)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      } else if (/\.(webp|jpg|jpeg|png|svg|woff|woff2|ico)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=2592000");
      }
    },
  })
);

// ---------------------------------------------------------------------------
// Rate limiting — in-memory, per IP. Fine for a single Render free instance;
// resets on restart, which is acceptable for a demo-scale deployment.
// ---------------------------------------------------------------------------
const RATE = {
  asistente: { perMin: 8, perDay: 100, globalDay: 1200 },
  lead: { perMin: 3, perDay: 20, globalDay: 300 },
};
const hits = new Map(); // key: `${bucket}:${ip}` -> array of timestamps (ms)
const globalHits = new Map(); // key: `${bucket}:${YYYYMMDD}` -> count

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function checkRateLimit(bucket, ip) {
  const cfg = RATE[bucket];
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const arr = (hits.get(key) || []).filter((t) => now - t < 86400000);

  const inLastMin = arr.filter((t) => now - t < 60000).length;
  if (inLastMin >= cfg.perMin) return "Vas muy rápido 🙂 Espera unos segundos y vuelve a intentarlo.";
  if (arr.length >= cfg.perDay) return "Has hecho ya muchas peticiones hoy. Escríbenos por el formulario y te ayudamos.";

  const gKey = `${bucket}:${todayKey()}`;
  const gCount = globalHits.get(gKey) || 0;
  if (gCount >= cfg.globalDay) return "El servicio está muy solicitado ahora mismo. Inténtalo más tarde o escríbenos por el formulario.";

  arr.push(now);
  hits.set(key, arr.slice(-300));
  globalHits.set(gKey, gCount + 1);
  return null;
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "0.0.0.0";
}

function sameOriginGuard(req) {
  const host = (req.headers.host || "").toLowerCase();
  const src = req.headers.origin || req.headers.referer || "";
  if (!src) return true;
  try {
    const srcHost = new URL(src).host.toLowerCase();
    return srcHost === host;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Gemini call — free tier, walks a small model list, never throws to caller.
// ---------------------------------------------------------------------------
const MODELS = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

function callGemini(model, apiKey, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "" });
    });
    req.write(body);
    req.end();
  });
}

app.post("/api/asistente", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (!sameOriginGuard(req)) return res.status(403).json({ error: "origin" });

  const ip = clientIp(req);
  const limited = checkRateLimit("asistente", ip);
  if (limited) return res.json({ reply: limited });

  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    return res.json({
      reply:
        "El asistente todavía se está configurando. Mientras tanto, escríbenos por el formulario de contacto y te respondemos enseguida.",
    });
  }

  const message = String((req.body && req.body.message) || "").trim();
  const history = Array.isArray(req.body && req.body.history) ? req.body.history.slice(-8) : [];
  if (!message || message.length > 500) return res.status(400).json({ error: "input" });

  const contents = [];
  for (const h of history) {
    const role = h && h.role === "model" ? "model" : "user";
    const text = String((h && h.text) || "").slice(0, 1000);
    if (text) contents.push({ role, parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const payload = {
    system_instruction: { parts: [{ text: KNOWLEDGE }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 700,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  let reply = "";
  let lastErr = "";
  for (const model of MODELS) {
    const { status, body } = await callGemini(model, key, payload);
    if (status >= 200 && status < 300 && body) {
      try {
        const data = JSON.parse(body);
        reply = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) || "";
        if (!reply) {
          const block = (data.promptFeedback && data.promptFeedback.blockReason) || (data.candidates && data.candidates[0] && data.candidates[0].finishReason) || "desconocido";
          lastErr = `modelo ${model} respuesta vacía (${block})`;
        }
      } catch (e) {
        lastErr = `modelo ${model} JSON inválido: ${e.message}`;
      }
    } else {
      lastErr = `modelo ${model} http ${status}: ${String(body).slice(0, 400)}`;
    }
    if (reply) break;
  }

  if (!reply) {
    console.warn("[asistente]", lastErr);
    return res.json({
      reply: "Ahora mismo no puedo responder. Escríbenos por el formulario y te ayudamos enseguida.",
    });
  }
  res.json({ reply });
});

app.post("/api/lead", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!sameOriginGuard(req)) return res.status(403).json({ error: "origin" });

  const ip = clientIp(req);
  const limited = checkRateLimit("lead", ip);
  if (limited) return res.status(429).json({ ok: false, reason: limited });

  const b = req.body || {};
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  const email = String(b.email || "").trim().slice(0, 160);
  const telefono = String(b.telefono || "").trim().slice(0, 40);
  const mensaje = String(b.mensaje || "").trim().slice(0, 1000);
  const origen = String(b.origen || "contacto").trim().slice(0, 40);

  if (!nombre || (!email && !telefono)) {
    return res.status(400).json({ ok: false, reason: "Faltan datos: nombre y email o teléfono." });
  }

  const lead = { nombre, email, telefono, mensaje, origen, fecha: new Date().toISOString(), ip };
  const file = path.join(DATA_DIR, "leads.jsonl");
  try {
    fs.appendFileSync(file, JSON.stringify(lead) + "\n");
  } catch (e) {
    console.warn("[lead] no se pudo guardar:", e.message);
  }

  res.json({ ok: true });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.listen(PORT, () => {
  console.log(`FisioRecovery Madrid escuchando en el puerto ${PORT}`);
});
