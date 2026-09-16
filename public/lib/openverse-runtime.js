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
  const CACHE_KEY = "ov_cache_v1";

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

  async function searchOne(query, aspect) {
    const params = new URLSearchParams({
      q: query,
      license: LICENSES,
      mature: "false",
      page_size: "3",
    });
    if (aspect) params.set("aspect_ratio", aspect);
    try {
      const res = await fetch(API + "?" + params.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const data = await res.json();
      const results = (data && data.results) || [];
      const renderable = results.filter((r) => r.url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(r.url));
      return renderable[0] || results[0] || null;
    } catch (_) {
      return null;
    }
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
