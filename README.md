# Nivra

Organizador personal que guarda todo en tu navegador. Sin cuentas, sin servidor, sin salir de tu equipo.

- **Dashboard** — resumen del día: eventos, tareas abiertas y bloques.
- **Calendario** — vista mensual, eventos por día con hora opcional.
- **Horario** — bloques semanales por día.
- **Tareas** — pendientes y hechas.

Tema claro y oscuro, y diseño adaptado a móvil, tablet y escritorio.

## Desarrollo

```bash
npm install
npm run dev
```

```bash
npm run build
```

Los datos viven en `localStorage` bajo las claves `nivra-*`. Borrarlas reinicia la aplicación.

## Tecnología

React 19, TypeScript, Tailwind CSS 4 y Vite.
