# Nivra

Organizador personal que guarda todo en tu navegador. Sin cuentas, sin servidor, sin salir de tu equipo.

- **Dashboard** — resumen del día: dinero, actividades, tareas y lo que está por venir.
- **Calendario** — vista mensual con festividades, tareas, exámenes y proyectos, cada uno con su color. Marca festivos y aniversarios anuales.
- **Horario** — bloques semanales por día.
- **Tareas** — descripción, subtareas y fecha opcional que las lleva al calendario.
- **Exámenes y Proyectos** — con fecha obligatoria en exámenes y categoría en proyectos.
- **Banco** — dinero actual, ingresos y gastos por categorías, con gráficas.

Tema claro y oscuro, diseño adaptado a móvil, tablet y escritorio, y ajustes para la animación de inicio.

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

## Estructura

```
src/
  App.tsx          Estructura, navegación y estado
  components/      Piezas compartidas (interfaz e intro)
  lib/             Datos, fechas y almacenamiento
  pages/           Una por sección
```

Los datos viven en `localStorage` bajo las claves `nivra-*`. Borrarlas reinicia la aplicación.

## Tecnología

React 19, TypeScript, Tailwind CSS 4 y Vite.
