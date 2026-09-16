(function () {
  "use strict";
  window.__BRAND__ = {
    name: "FisioRecovery Madrid",
    tagline: "Recupera tu movimiento. Vuelve a tu mejor versión.",
    phone: "+34 910 000 000",
    email: "hola@fisiorecoverymadrid.es",
    address: "Calle de la Recuperación, 12 · 28010 Madrid",

    stats: [
      { id: "anios", value: 12, suffix: "+", label: "años de experiencia" },
      { id: "pacientes", value: 3000, suffix: "+", label: "pacientes tratados" },
      { id: "valoracion", value: 4.9, suffix: "★", label: "valoración media" },
      { id: "colegiados", value: 100, suffix: "%", label: "fisioterapeutas colegiados" },
    ],

    servicios: [
      {
        id: "deportivas",
        nombre: "Lesiones deportivas",
        resumen: "Esguinces, tendinopatías y roturas fibrilares. Vuelve a competir con seguridad.",
        desde: "40€",
      },
      {
        id: "rehabilitacion",
        nombre: "Rehabilitación",
        resumen: "Postquirúrgica, traumatológica y neurológica. Planes de recuperación a medida.",
        desde: "40€",
      },
      {
        id: "masaje",
        nombre: "Masaje terapéutico",
        resumen: "Descontracturante, deportivo y drenaje. Alivio real, no solo relax.",
        desde: "35€",
      },
    ],

    proceso: [
      { n: "01", titulo: "Reserva tu cita", texto: "Desde la web o por teléfono, en menos de un minuto." },
      { n: "02", titulo: "Valoración inicial", texto: "Historia clínica, pruebas funcionales y objetivos claros." },
      { n: "03", titulo: "Plan personalizado", texto: "Sesiones y técnicas ajustadas a tu lesión y tu ritmo de vida." },
      { n: "04", titulo: "Seguimiento y alta", texto: "Ajustamos el plan en cada sesión hasta tu recuperación completa." },
    ],

    testimonios: [
      {
        nombre: "Marta G.",
        rol: "Corredora amateur",
        texto:
          "Llegué con una tendinopatía rotuliana que arrastraba meses. En 8 semanas volví a entrenar sin dolor.",
      },
      {
        nombre: "Javier R.",
        rol: "Paciente de rehabilitación",
        texto:
          "Después de la operación de rodilla, el plan de rehabilitación fue clave para recuperar la movilidad completa.",
      },
      {
        nombre: "Lucía M.",
        rol: "Oficinista",
        texto: "Iba por las contracturas de espalda y ahora vengo cada mes a mantenimiento. Se nota muchísimo.",
      },
    ],

    faqsAsistente: [
      "¿Cuánto cuesta la primera visita?",
      "¿Cuántas sesiones necesito para una tendinopatía?",
      "¿Atendéis lesiones deportivas de nivel amateur?",
    ],

    calculadora: {
      servicios: [
        { id: "deportivas", nombre: "Lesiones deportivas", precioSesion: 45 },
        { id: "rehabilitacion", nombre: "Rehabilitación", precioSesion: 45 },
        { id: "masaje", nombre: "Masaje terapéutico", precioSesion: 40 },
      ],
      descuentosBono: [
        { minSesiones: 10, descuento: 0.15 },
        { minSesiones: 5, descuento: 0.08 },
      ],
    },
  };
})();
