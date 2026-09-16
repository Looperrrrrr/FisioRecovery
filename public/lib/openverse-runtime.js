(function () {
  "use strict";
  // openverse-runtime.js — fetches free stock photos from Openverse directly in
  // the visitor's browser. Used because these images are baked in at build time
  // in the normal pipeline; here they're fetched at runtime instead (see
  // reference/05-image-and-asset-pipeline.md §9 "runtime fetch fallback").
  // Every slot already shows a designed CSS placeholder, so the page looks
  // complete even if this script fails or is blocked.

  const API = "https://api.openverse.org/v1/images/";
  const LICENSES = "cc0,by,by-sa,pdm";
  const CACHE_KEY = "ov_cache_v2";
  const RENDERABLE_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i;

  // Openverse leans heavily on Wikimedia Commons archives, where medical /
  // physiotherapy search terms often match old military rehabilitation
  // photos. Filter those out client-side since we can't preview results
  // ourselves before they go live.
  const IRRELEVANT_RE = /\b(soldier|military|army|navy|marine|war|veteran|troop|regiment|infantry|ww1|ww2|world war|combat|barracks)\b/i;
  const PREFERRED_SOURCES = ["flickr", "stocksnap", "rawpixel", "pexels"];

  function readCache() {
    try {
      return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }
  function writeCache(cache) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  function isRelevant(r) {
    const text = ((r.title || "") + " " + (r.tags || []).map((t) => t.name || t).join(" ")).toLowerCase();
    return !IRRELEVANT_RE.test(text);
  }

  function pickBest(results) {
    const renderable = results.filter((r) => r.url && RENDERABLE_RE.test(r.url));
    const relevant = renderable.filter(isRelevant);
    const pool = relevant.length ? relevant : renderable; // relevance filter is best-effort, never block a real match entirely
    if (!pool.length) return null;
    const preferred = pool.find((r) => PREFERRED_SOURCES.includes((r.source || r.provider || "").toLowerCase()));
    return preferred || pool[0];
  }

  async function fetchTier(params) {
    const clean = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) clean.set(k, v);
    });
    try {
      const res = await fetch(API + "?" + clean.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data && data.results) || [];
    } catch (_) {
      return [];
    }
  }

  // Progressively relax filters until something relevant turns up — mirrors
  // the build-time Python fetcher's fallback ladder (see
  // scripts/openverse_fetch.py) since a single strict query often returns
  // zero (or irrelevant) results.
  async function searchOne(query, aspect) {
    const tiers = [
      { q: query, license: LICENSES, aspect_ratio: aspect, source: PREFERRED_SOURCES.join(","), mature: "false", page_size: "8" },
      { q: query, license: LICENSES, aspect_ratio: aspect, mature: "false", page_size: "8" },
      { q: query, license: LICENSES, mature: "false", page_size: "8" },
      { q: query, mature: "false", page_size: "8" },
    ];
    for (const params of tiers) {
      const results = await fetchTier(params);
      const best = pickBest(results);
      if (best) return best;
    }
    return null;
  }

  function creditFrom(result) {
    return {
      title: (result.title || "Fotografía").replace(/^File:/, "").slice(0, 140),
      creator: result.creator || "Autor desconocido",
      creator_url: result.creator_url || "",
      license: (result.license || "cc").toUpperCase(),
      license_version: result.license_version || "",
      license_url: result.license_url || "https://creativecommons.org/",
      foreign_landing_url: result.foreign_landing_url || result.url,
      source: result.source || result.provider || "openverse",
    };
  }

  async function loadSlot(el, cache) {
    const query = el.getAttribute("data-ov-query");
    const aspect = el.getAttribute("data-ov-aspect") || null;
    const id = el.getAttribute("data-ov-id") || query;
    if (!query) return;

    const cacheKey = query + "|" + (aspect || "");
    let result = cache[cacheKey];
    if (!result) {
      const found = await searchOne(query, aspect);
      if (!found) return;
      result = { url: found.url, credit: creditFrom(found) };
      cache[cacheKey] = result;
    }

    const img = el.querySelector("[data-ov-img]");
    if (img && !img.src) {
      img.src = result.url;
      img.addEventListener(
        "load",
        () => {
          el.classList.add("is-loaded");
        },
        { once: true }
      );
    }

    window.__OV_CREDITS__ = window.__OV_CREDITS__ || {};
    window.__OV_CREDITS__[id] = result.credit;
  }

  async function boot() {
    const slots = Array.from(document.querySelectorAll("[data-ov-query]"));
    if (!slots.length) return;
    const cache = readCache();
    // Sequential-ish with small concurrency to be polite to the public API.
    const CONCURRENCY = 3;
    let i = 0;
    async function worker() {
      while (i < slots.length) {
        const el = slots[i++];
        await loadSlot(el, cache);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, slots.length) }, worker));
    writeCache(cache);
    document.dispatchEvent(new CustomEvent("ov:done"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
