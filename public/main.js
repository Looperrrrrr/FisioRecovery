(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const escHTML = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function safe(fn, name) {
    try {
      fn();
    } catch (e) {
      console.warn("[" + name + "] failed:", e);
    }
  }

  // ---------------------------------------------------------------------
  function initNav() {
    const burger = $("[data-nav-burger]");
    const mobile = $("[data-nav-mobile]");
    if (!burger || !mobile) return;
    burger.addEventListener("click", () => {
      const open = mobile.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$("a", mobile).forEach((a) =>
      a.addEventListener("click", () => {
        mobile.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  function setupSmoothScroll() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const navOffset = 84;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }

  // ---------------------------------------------------------------------
  function initReveals() {
    const targets = $$("[data-reveal-auto], .glass-card, .hero-content, .hero-photo");
    targets.forEach((el) => el.setAttribute("data-reveal", ""));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -2% 0px" }
    );
    targets.forEach((el) => io.observe(el));
    setTimeout(() => {
      $$("[data-reveal]:not(.is-visible)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  // ---------------------------------------------------------------------
  function initCountUp() {
    const nums = $$("[data-count-to]");
    if (!nums.length) return;
    const animate = (el) => {
      const to = parseFloat(el.getAttribute("data-count-to"));
      const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      const suffix = el.getAttribute("data-suffix") || "";
      const duration = reduced ? 1 : 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = to * eased;
        el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    nums.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------------------
  function initCalculadora() {
    const form = $("[data-calc-form]");
    if (!form) return;
    const cfg = (data.calculadora && data.calculadora.descuentosBono) || [
      { minSesiones: 10, descuento: 0.15 },
      { minSesiones: 5, descuento: 0.08 },
    ];
    const servicioSel = $("[data-calc-servicio]", form);
    const frecuenciaInp = $("[data-calc-frecuencia]", form);
    const semanasInp = $("[data-calc-semanas]", form);
    const sesionesOut = $("[data-calc-sesiones]", form);
    const brutoOut = $("[data-calc-bruto]", form);
    const totalOut = $("[data-calc-total]", form);
    const descuentoOut = $("[data-calc-descuento]", form);

    function recalc() {
      const precio = parseFloat(servicioSel.selectedOptions[0].getAttribute("data-precio")) || 0;
      const frecuencia = Math.max(1, parseInt(frecuenciaInp.value, 10) || 1);
      const semanas = Math.max(1, parseInt(semanasInp.value, 10) || 1);
      const sesiones = frecuencia * semanas;
      const bruto = sesiones * precio;

      let descuento = 0;
      const tramo = cfg.slice().sort((a, b) => b.minSesiones - a.minSesiones).find((t) => sesiones >= t.minSesiones);
      if (tramo) descuento = tramo.descuento;

      const total = Math.round(bruto * (1 - descuento));

      sesionesOut.textContent = String(sesiones);
      brutoOut.textContent = Math.round(bruto) + "€";
      totalOut.textContent = total + "€";
      descuentoOut.textContent = descuento
        ? `Bono de ${tramo.minSesiones}+ sesiones: ${Math.round(descuento * 100)}% de descuento`
        : "Sin bono aplicable todavía — a partir de 5 sesiones hay descuento.";
    }

    [servicioSel, frecuenciaInp, semanasInp].forEach((el) => el.addEventListener("input", recalc));
    form.addEventListener("submit", (e) => e.preventDefault());
    recalc();
  }

  // ---------------------------------------------------------------------
  function initLeadForm() {
    const form = $("[data-lead-form]");
    if (!form) return;
    const status = $("[data-lead-status]", form);
    const submitBtn = $("[data-lead-submit]", form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const payload = {
        nombre: fd.get("nombre"),
        email: fd.get("email"),
        telefono: fd.get("telefono"),
        mensaje: fd.get("mensaje"),
        origen: "contacto",
      };
      submitBtn.disabled = true;
      status.classList.remove("is-error");
      status.textContent = "Enviando…";
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.ok) {
          status.textContent = "¡Gracias! Te contactaremos en breve para confirmar tu cita.";
          form.reset();
        } else {
          status.classList.add("is-error");
          status.textContent = out.reason || "No se pudo enviar. Prueba de nuevo en unos segundos.";
        }
      } catch (_) {
        status.classList.add("is-error");
        status.textContent = "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ---------------------------------------------------------------------
  function initChat() {
    const widget = $("[data-chat]");
    if (!widget) return;
    const toggle = $("[data-chat-toggle]", widget);
    const panel = $("[data-chat-panel]", widget);
    const closeBtn = $("[data-chat-close]", widget);
    const messages = $("[data-chat-messages]", widget);
    const chatForm = $("[data-chat-form]", widget);
    const chatInput = $("[data-chat-input]", widget);
    const suggestions = $("[data-chat-suggestions]", widget);

    let history = [];
    let sending = false;

    function openPanel() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      chatInput.focus();
    }
    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
    closeBtn.addEventListener("click", closePanel);

    function appendMsg(text, role) {
      const div = document.createElement("div");
      div.className = "chat-msg chat-msg--" + role;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    async function sendMessage(text) {
      if (!text || sending) return;
      sending = true;
      appendMsg(text, "user");
      history.push({ role: "user", text });
      chatInput.value = "";
      const pending = appendMsg("Escribiendo…", "bot");
      pending.classList.add("chat-msg--pending");
      try {
        const res = await fetch("/api/asistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: history.slice(-8) }),
        });
        const out = await res.json().catch(() => ({}));
        const reply = out.reply || "Ahora mismo no puedo responder. Escríbenos por el formulario de contacto.";
        pending.textContent = reply;
        pending.classList.remove("chat-msg--pending");
        history.push({ role: "model", text: reply });
      } catch (_) {
        pending.textContent = "No he podido conectar. Escríbenos por el formulario de contacto y te ayudamos.";
        pending.classList.remove("chat-msg--pending");
      } finally {
        sending = false;
      }
    }

    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(chatInput.value.trim());
    });

    $$("button", suggestions).forEach((btn) => {
      btn.addEventListener("click", () => sendMessage(btn.textContent.trim()));
    });
  }

  // ---------------------------------------------------------------------
  function boot() {
    safe(initNav, "initNav");
    safe(setupSmoothScroll, "setupSmoothScroll");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initCalculadora, "initCalculadora");
    safe(initLeadForm, "initLeadForm");
    safe(initChat, "initChat");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
