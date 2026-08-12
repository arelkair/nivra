# Nivra

Organizador personal que guarda todo en tu navegador. Sin cuentas, sin servidor, sin salir de tu equipo.

- **Dashboard** — resumen del día: dinero, actividades, tareas y lo que está por venir.
- **Calendario** — vista mensual con festividades, tareas, exámenes y proyectos, cada uno con su color. Marca festivos y aniversarios anuales.
- **Horario** — bloques semanales por día.
- **Tareas** — descripción, subtareas y fecha opcional que las lleva al calendario.
- **Exámenes y Proyectos** — con fecha obligatoria en exámenes y categoría en proyectos.
- **Banco** — dinero actual, ingresos y gastos por categorías, con gráficas.

Tema claro y oscuro, diseño adaptado a móvil, tablet y escritorio, y ajustes para la animación de inicio.

## Sincronización entre dispositivos

Opcional y apagada por defecto: mientras no la actives, nada sale de tu navegador.

Al crear tu código, del código se derivan dos cosas distintas:

- un **identificador** (`SHA-256`), que es lo único que viaja como dirección del cajón;
- una **clave** (`PBKDF2`, 200 000 iteraciones), que nunca sale del navegador.

Los datos se cifran con `AES-GCM` antes de subirse, así que el servidor guarda algo que no puede
leer. Pegar el código en otro dispositivo descarga esos datos y deja los dos conectados. Sin el
código no hay forma de recuperarlos.

Una vez conectados se puede trabajar en los dos a la vez: los cambios suben a a los pocos segundos
y bajan cada cuatro, y se aplican en caliente, sin recargar. Cada sección lleva su propia marca de
tiempo y se mezcla por separado, así que editar las tareas en un dispositivo y las notas en el otro
no pisa nada. Si tocas lo mismo en los dos a la vez, gana la edición más reciente.

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
