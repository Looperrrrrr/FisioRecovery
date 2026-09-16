# FisioRecovery Madrid

Web premium de demostración para una clínica de fisioterapia en Madrid (lesiones deportivas, rehabilitación y masaje terapéutico), con asistente de IA (Gemini) y calculadora de presupuesto interactiva. Pensada para desplegarse en [Render.com](https://render.com).

## Qué incluye

- **Sitio estático** (HTML/CSS/JS vanilla, sin frameworks ni build step) servido por un pequeño servidor Node/Express.
- **Calculadora de presupuesto** — cálculo 100% en el navegador (servicio, sesiones/semana, semanas de tratamiento, descuento por bono).
- **Asistente virtual "Aitana"** — chat que responde sobre la clínica usando Google Gemini (capa gratuita), a través de un proxy en el servidor: la clave de la IA nunca llega al navegador.
- **Formulario de contacto / captura de leads** — guarda las solicitudes en el servidor.
- **Fotografías** con licencia Creative Commons vía [Openverse](https://openverse.org), con página de créditos (`creditos.html`).

## ⚠️ Importante — dos límites a conocer

1. **Imágenes cargadas en el navegador del visitante, no incluidas en el repo.** El entorno donde se generó este proyecto no tenía salida a internet hacia Openverse, así que las fotos se piden a `api.openverse.org` desde el propio navegador de quien visita la web (patrón "runtime fallback" documentado en la skill). Funciona bien para un visitante normal, pero significa que las fotos pueden variar ligeramente entre visitas y dependen de que Openverse esté disponible. **Recomendado antes de vender esta web a un cliente real:** desde una máquina con acceso normal a internet, ejecutar el pipeline estándar de imágenes (descargar a `assets/photos/source/`, convertir a WebP con `webp_convert.py`, generar `assets/credits.json`) y sustituir las fotos por versiones fijas en el repo — así la web no depende de una API externa en cada visita.
2. **El envío de leads (`data/leads.jsonl`) usa disco local.** El plan gratuito de Render usa almacenamiento efímero: cada despliegue o reinicio del servicio borra ese archivo. Para producción real, conecta un servicio de email (o una base de datos, p. ej. la Postgres gratuita de Render) para no perder solicitudes de pacientes.

## Desarrollo local

```bash
npm install
cp .env.example .env   # opcional: añade tu GEMINI_API_KEY para probar el chat
npm start
```

Abre `http://localhost:3000`.

## Desplegar en Render.com

1. Sube este repositorio a GitHub (ya hecho si estás leyendo esto desde el repo).
2. En Render: **New → Web Service**, conecta el repositorio. Render detectará `render.yaml` automáticamente (Blueprint).
3. En la pestaña **Environment** del servicio, añade la variable `GEMINI_API_KEY` con tu clave gratuita de [Google AI Studio](https://aistudio.google.com/) → "Crear clave de API".
4. Despliega. El servicio sirve la web y las rutas `/api/asistente` y `/api/lead`.

Sin la clave configurada, el asistente sigue funcionando pero responde con un mensaje de "configurándose" y el formulario de contacto sigue disponible como alternativa.

## Estructura

```
fisiorecovery-madrid/
├── public/              ← sitio estático servido por Express
│   ├── index.html
│   ├── creditos.html
│   ├── styles.css
│   ├── main.js
│   └── lib/
├── server.js            ← servidor Express: estáticos + proxy Gemini + leads
├── knowledge.js          ← persona y base de conocimiento del asistente "Aitana"
├── render.yaml           ← blueprint de despliegue en Render
└── package.json
```

## Contenido de ejemplo

Los testimonios de la sección "Testimonios" son **contenido de ejemplo** (marcado como tal en la propia web) — sustitúyelos por reseñas reales de pacientes antes de publicar la web para un cliente real. Lo mismo aplica a teléfono, email y dirección: son de demostración.
