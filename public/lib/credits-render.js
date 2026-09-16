(function () {
  "use strict";
  const LABELS = {
    hero: "Portada — fisioterapeuta tratando a un paciente",
    deportivas: "Lesiones deportivas",
    rehabilitacion: "Rehabilitación",
    masaje: "Masaje terapéutico",
  };

  function render() {
    const list = document.querySelector("[data-credits]");
    if (!list) return;
    const credits = window.__OV_CREDITS__ || {};
    const ids = Object.keys(credits);
    if (!ids.length) {
      list.innerHTML = "<li>No se pudieron cargar las atribuciones ahora mismo. Recarga la página.</li>";
      return;
    }
    list.innerHTML = ids
      .map((id) => {
        const c = credits[id];
        const label = LABELS[id] || id;
        const authorLink = c.creator_url
          ? `<a href="${c.creator_url}" target="_blank" rel="noopener">${c.creator}</a>`
          : c.creator;
        return `<li><strong>${label}</strong> — "${c.title}" por ${authorLink} (${c.source}) ·
          <a href="${c.license_url}" target="_blank" rel="noopener">${c.license} ${c.license_version}</a> ·
          <a href="${c.foreign_landing_url}" target="_blank" rel="noopener">Ver original ↗</a></li>`;
      })
      .join("");
  }

  document.addEventListener("ov:done", render);
  setTimeout(render, 6000);
})();
