export type Lang = 'es' | 'en'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
]

const KEY = 'nivra-lang'

const guardado = (): Lang => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'es' || raw === 'en') return raw
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
  } catch {
    return 'es'
  }
}

let lang: Lang = guardado()

export const getLang = () => lang

export const locale = () => (lang === 'en' ? 'en-GB' : 'es-ES')

export function setLang(next: Lang) {
  localStorage.setItem(KEY, next)
  location.reload()
}

const EN: Record<string, string> = {
  // navegación y apartados
  Principal: 'Main',
  Estudio: 'Study',
  Dinero: 'Money',
  Utilidades: 'Utilities',
  Dashboard: 'Dashboard',
  Inicio: 'Home',
  Calendario: 'Calendar',
  'Calend.': 'Cal.',
  Horario: 'Timetable',
  Tareas: 'Tasks',
  'Exámenes y Proyectos': 'Exams and Projects',
  'Exámenes y proyectos': 'Exams and projects',
  'Exám.': 'Exams',
  Notas: 'Grades',
  Banco: 'Bank',
  'Lista de Deseos': 'Wishlist',
  Deseos: 'Wishes',
  Suscripciones: 'Subscriptions',
  Subs: 'Subs',
  'Bloc de Notas': 'Notepad',
  'Bloc de notas': 'Notepad',
  Bloc: 'Notepad',
  'Cuentas atrás': 'Countdowns',
  Cuentas: 'Timers',
  'Cuenta atrás': 'Countdown',
  Recordatorios: 'Reminders',
  Recordatorio: 'Reminder',
  Avisos: 'Alerts',

  // acciones comunes
  Guardar: 'Save',
  Editar: 'Edit',
  Eliminar: 'Delete',
  Quitar: 'Remove',
  Añadir: 'Add',
  Cerrar: 'Close',
  Abrir: 'Open',
  Ver: 'Show',
  Ocultar: 'Hide',
  Volver: 'Back',
  Buscar: 'Search',
  'Buscar…': 'Search…',
  Vaciar: 'Clear',
  Deshacer: 'Undo',
  Menú: 'Menu',
  Detalles: 'Details',
  Lista: 'List',
  Sumar: 'Add',
  Restar: 'Subtract',
  Copiar: 'Copy',
  Unir: 'Link',

  // campos
  Título: 'Title',
  Subtítulo: 'Subtitle',
  'Subtítulo (opcional)': 'Subtitle (optional)',
  Descripción: 'Description',
  Nombre: 'Name',
  Fecha: 'Date',
  'Fecha (obligatoria)': 'Date (required)',
  'Fecha (opcional)': 'Date (optional)',
  Hora: 'Time',
  Día: 'Day',
  Mes: 'Month',
  Semana: 'Week',
  Final: 'Final',
  Fin: 'End',
  Tipo: 'Kind',
  Categoría: 'Category',
  Importe: 'Amount',
  Cantidad: 'Amount',
  Concepto: 'Note',
  Precio: 'Price',
  Enlace: 'Link',
  Periodo: 'Period',
  Trimestre: 'Term',
  Asignatura: 'Subject',
  Asignaturas: 'Subjects',
  'Asignatura o bloque': 'Subject or block',
  Repetición: 'Repeat',
  'Vincular a': 'Link to',
  'Del 1 al 10': 'From 1 to 10',
  'Nota obtenida': 'Grade obtained',
  Nota: 'Grade',
  Página: 'Page',
  Bloque: 'Block',
  'Bloque del horario': 'Timetable block',
  'Perfil de horario': 'Timetable profile',
  Examen: 'Exam',
  Proyecto: 'Project',
  Tarea: 'Task',
  Festividad: 'Holiday',
  Aniversario: 'Anniversary',
  'Actividad del calendario': 'Calendar activity',
  Gasto: 'Expense',
  Gastos: 'Expenses',
  Ingreso: 'Income',
  Ingresos: 'Income',
  Objetivos: 'Goals',
  Meta: 'Target',
  'Meta de ahorro': 'Savings target',
  Límite: 'Limit',
  'Límite de gasto': 'Spending limit',
  Idea: 'Idea',
  Deseo: 'Wish',
  'Categoría de gasto': 'Expense category',
  'Categoría de ingreso': 'Income category',

  // nuevos
  'Nueva tarea': 'New task',
  'Nueva subtarea': 'New subtask',
  'Añadir tarea': 'Add task',
  'Añadir subtarea': 'Add subtask',
  'Añadir asignatura': 'Add subject',
  'Nueva asignatura': 'New subject',
  'Nueva actividad': 'New activity',
  'Nueva cuenta atrás': 'New countdown',
  'Nueva página': 'New page',
  'Nueva suscripción': 'New subscription',
  'Nuevo bloc': 'New notepad',
  'Nuevo deseo': 'New wish',
  'Nuevo examen': 'New exam',
  'Nuevo proyecto': 'New project',
  'Nuevo gasto': 'New expense',
  'Nuevo ingreso': 'New income',
  'Nuevo horario': 'New timetable',
  'Nuevo objetivo': 'New goal',
  'Nuevo recordatorio': 'New reminder',
  'Nueva nota': 'New grade',
  'Nombre del bloc': 'Notepad name',
  'Nombre del horario': 'Timetable name',

  // vacíos y ayudas
  'Sin tareas.': 'No tasks.',
  'Sin actividades.': 'No activities.',
  'Sin bloques.': 'No blocks.',
  'Sin deseos.': 'No wishes.',
  'Sin suscripciones.': 'No subscriptions.',
  'Sin recordatorios.': 'No reminders.',
  'Sin cuenta atrás.': 'No countdown.',
  'Sin asignaturas.': 'No subjects.',
  'Sin datos.': 'No data.',
  'Sin movimientos.': 'No entries.',
  'Sin notas.': 'No grades.',
  'Sin objetivos.': 'No goals.',
  'Nada por venir.': 'Nothing coming up.',
  'Sin blocs todavía': 'No notepads yet',
  'Sin vincular': 'Not linked',
  'Sin fecha': 'No date',
  'Sin asignatura': 'No subject',
  Pendiente: 'Pending',
  Hecho: 'Done',
  Hoy: 'Today',
  HOY: 'TODAY',
  hoy: 'today',
  Próximo: 'Upcoming',
  Mejores: 'Best',
  Peores: 'Worst',
  Media: 'Average',

  // ajustes
  Ajustes: 'Settings',
  General: 'General',
  Aplicación: 'Application',
  Color: 'Colour',
  Idioma: 'Language',
  Notificaciones: 'Notifications',
  'Atajos de teclado': 'Keyboard shortcuts',
  Sincronización: 'Sync',
  'Exportar o importar datos': 'Export or import data',
  'Copia de seguridad': 'Backup',
  Cumpleaños: 'Birthday',
  Reloj: 'Clock',
  Buscador: 'Search bar',
  'Animación de inicio': 'Intro animation',
  'Animaciones al cambiar de apartado': 'Animations when switching sections',
  'Tema según la hora': 'Theme follows the clock',
  'Formato de 12 horas': '12-hour format',
  'Botones de atrás y adelante': 'Back and forward buttons',
  'Atajos activados': 'Shortcuts enabled',
  'Avisos dentro de la web': 'In-app alerts',
  'Notificaciones del sistema': 'System notifications',
  'Permitir notificaciones': 'Allow notifications',
  'Bloqueadas por el navegador': 'Blocked by the browser',
  'Instalar Nivra': 'Install Nivra',
  'Importar copia': 'Import backup',
  'Fecha de cumpleaños': 'Birthday date',
  'La presentación de Nivra al abrir o recargar la web.':
    'The Nivra intro shown when opening or reloading the app.',
  'Aparece en la cabecera y busca en todos los apartados.':
    'Appears in the header and searches every section.',
  'Claro de 7:00 a 20:00 y oscuro el resto. Si lo cambias a mano, aguanta hasta el siguiente tramo.':
    'Light from 07:00 to 20:00 and dark otherwise. A manual change lasts until the next stretch.',
  'Aparecen abajo a la derecha.': 'They appear in the bottom right corner.',
  'Cuentas atrás que acaban, aniversarios, actividades de hoy y exámenes de mañana.':
    'Countdowns reaching their end, anniversaries, today’s activities and tomorrow’s exams.',
  'No se disparan mientras escribes en un campo.':
    'They do not fire while you are typing in a field.',
  'Pulsa para cambiar la tecla': 'Press to change the key',
  'pulsa una tecla…': 'press a key…',
  'Este navegador no admite notificaciones.': 'This browser does not support notifications.',
  'El navegador te preguntará si quieres permitirlas.':
    'The browser will ask whether to allow them.',
  'Tendrás que volver a permitirlas desde los ajustes del navegador.':
    'You will have to allow them again from the browser settings.',
  'Notificaciones activadas.': 'Notifications enabled.',
  'El navegador ha bloqueado las notificaciones.': 'The browser blocked notifications.',
  'Nivra se está instalando.': 'Nivra is being installed.',
  'Instalación cancelada.': 'Installation cancelled.',
  'Ya la estás usando instalada.': 'You are already using it installed.',
  'En iPhone o iPad: pulsa Compartir y luego «Añadir a pantalla de inicio».':
    'On iPhone or iPad: tap Share and then “Add to Home Screen”.',
  'Tu navegador aún no ofrece instalarla. Suele aparecer tras usar la web un rato, o desde su menú, en «Instalar aplicación».':
    'Your browser does not offer to install it yet. It usually appears after using the app for a while, or from its menu under “Install app”.',
  'Instalada se abre a pantalla completa, con su icono, y funciona sin conexión.':
    'Once installed it opens full screen, with its own icon, and works offline.',
  'Ábrelos con «Importar calendario» en Google Calendar o Apple Calendar.':
    'Open them with “Import calendar” in Google Calendar or Apple Calendar.',
  'Exportar a Google/Apple Calendar': 'Export to Google/Apple Calendar',
  'Calendario (.ics)': 'Calendar (.ics)',
  'Horario (.ics)': 'Timetable (.ics)',

  // sincronización
  'Crear mi código': 'Create my code',
  'Código de otro dispositivo': 'Code from another device',
  'Copiar código': 'Copy code',
  'Código copiado.': 'Code copied.',
  'Activando…': 'Activating…',
  'El código debe tener 16 caracteres.': 'The code must be 16 characters long.',
  'El código tiene 16 caracteres.': 'The code is 16 characters long.',
  'Código nuevo: se han subido tus datos.': 'New code: your data has been uploaded.',
  'Conectado. Datos del otro dispositivo descargados.':
    'Connected. Data from the other device downloaded.',
  'Conectado. Ya estabais igual.': 'Connected. Both devices already matched.',
  'Listo. Copia el código y pégalo en el otro dispositivo.':
    'Done. Copy the code and paste it on the other device.',
  'Este dispositivo ya no se sincroniza. Tus datos siguen aquí.':
    'This device no longer syncs. Your data stays here.',
  'Sin sincronizar todavía.': 'Not synced yet.',
  Desconectar: 'Disconnect',

  // calendario
  'Mes anterior': 'Previous month',
  'Mes siguiente': 'Next month',
  'Semana anterior': 'Previous week',
  'Semana siguiente': 'Next week',
  'Marcar día': 'Mark day',
  'Marca tu día': 'Mark your day',
  'Día especial': 'Special day',
  'Día sin trabajo': 'Day off',
  'Marcar como día especial': 'Mark as a special day',
  'Marcar como día sin trabajo': 'Mark as a day off',
  'Marcar como aniversario (cada año)': 'Mark as an anniversary (every year)',
  '¿De qué o de quién es el aniversario?': 'What or who is the anniversary for?',
  'Festivo oficial o fin de semana': 'Public holiday or weekend',
  'Ese día se renueva una suscripción': 'A subscription renews on that day',
  'Cada semana': 'Every week',
  'Cada mes': 'Every month',
  'Cada año': 'Every year',

  // meses y días
  enero: 'January', febrero: 'February', marzo: 'March', abril: 'April',
  mayo: 'May', junio: 'June', julio: 'July', agosto: 'August',
  septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December',
  Lunes: 'Monday', Martes: 'Tuesday', Miércoles: 'Wednesday', Jueves: 'Thursday',
  Viernes: 'Friday', Sábado: 'Saturday', Domingo: 'Sunday',

  // unidades
  año: 'year', años: 'years', mes: 'month', meses: 'months',
  día: 'day', días: 'days', hora: 'hour', horas: 'hours',
  minuto: 'minute', minutos: 'minutes', segundo: 'second', segundos: 'seconds',
  'día seguido': 'day in a row', 'días seguidos': 'days in a row',
  'Se acabó': 'Finished',
  'esta semana': 'this week',
  'este mes': 'this month',

  // colores
  Básico: 'Basic', Rojo: 'Red', Naranja: 'Orange', Amarillo: 'Yellow', Verde: 'Green',
  'Azul cielo': 'Sky blue', 'Azul marino': 'Navy', Púrpura: 'Purple', Rosa: 'Pink', Beige: 'Beige',

  // editor
  Negrita: 'Bold', Cursiva: 'Italic', Subrayado: 'Underline', Tachado: 'Strikethrough',
  'Quitar formato': 'Clear formatting',
  'Buscar en el bloc': 'Search the notepad',
  'Buscar en esta página…': 'Search this page…',
  'Buscar en todo el bloc…': 'Search the whole notepad…',
  'Sin resultados': 'No results',
  'Coincidencia anterior': 'Previous match',
  'Siguiente coincidencia': 'Next match',
  'Página anterior': 'Previous page',
  'Página siguiente': 'Next page',
  'Eliminar esta página': 'Delete this page',
  'Renombrar o eliminar': 'Rename or delete',
  'Nota rápida': 'Quick note',
  'Nota flotante': 'Floating note',
  'Cerrar nota flotante': 'Close floating note',
  'Sin blocs. Crea el primero con el botón +.':
    'No notepads. Create the first one with the + button.',

  // atajos
  'Ir al dashboard': 'Go to the dashboard',
  'Ir al calendario': 'Go to the calendar',
  'Ir al horario': 'Go to the timetable',
  'Ir al bloc de notas': 'Go to the notepad',
  'Ir a tareas': 'Go to tasks',
  'Ir a exámenes y proyectos': 'Go to exams and projects',
  'Ir a notas': 'Go to grades',
  'Ir al banco': 'Go to the bank',
  'Ir a la lista de deseos': 'Go to the wishlist',
  'Ir a suscripciones': 'Go to subscriptions',
  'Ir a cuentas atrás': 'Go to countdowns',
  'Ir a recordatorios': 'Go to reminders',
  'Abrir ajustes': 'Open settings',
  'Cambiar tema': 'Switch theme',
  'Volver atrás': 'Go back',
  'Ir adelante': 'Go forward',
  Atrás: 'Back',
  Adelante: 'Forward',
  'Tema claro': 'Light theme',
  'Tema oscuro': 'Dark theme',
  'Cerrar menú': 'Close menu',
  'Cerrar aviso': 'Dismiss alert',

  // banco y objetivos
  'Dinero actual': 'Current balance',
  'Primera vez': 'First time',
  '¿Cuánto dinero tienes ahora?': 'How much money do you have now?',
  'Sólo se pregunta una vez. Queda en tu navegador.':
    'You are only asked once. It stays in your browser.',
  'Dónde gastas': 'Where you spend',
  'De dónde viene': 'Where it comes from',
  'Cambiar dinero inicial': 'Change starting balance',
  'Eliminar movimiento': 'Delete entry',
  'Movimiento eliminado': 'Entry deleted',
  '¿Cuánto quieres tener?': 'How much do you want to have?',
  '¿Cuánto puedes gastar?': 'How much can you spend?',
  'Para cuándo': 'By when',
  '¿De qué? (opcional)': 'What for? (optional)',
  '¿En qué? (opcional)': 'On what? (optional)',
  '¿Qué quieres?': 'What do you want?',
  '¿Qué hay que recordar?': 'What should be remembered?',
  'Precio al mes': 'Price per month',
  'Día de renovación': 'Renewal day',
  'Racha ya marcada hoy': 'Streak already marked today',

  // otros
  'Fecha obligatoria. Sale en rojo.': 'Date required. Shown in red.',
  'Fecha opcional. Sale en verde.': 'Date optional. Shown in green.',
  'Examen o proyecto': 'Exam or project',
  Trabajo: 'Coursework',
  Otro: 'Other',
  'Día de inicio': 'Start date',
  'Hora de inicio': 'Start time',
  'Día del final': 'End date',
  'Hora del final': 'End time',
  Empieza: 'Starts',
  Acaba: 'Ends',
  Unidades: 'Units',
  'Cambiar a este horario': 'Switch to this timetable',
  Privado: 'Private',
  'Todo en tu navegador.': 'Everything in your browser.',
  'Eventos por día.': 'Events by day.',
  'Bloques semanales.': 'Weekly blocks.',
  'Pendientes y hechas.': 'Pending and done.',
  'Bienvenido a Nivra, tu espacio privado de organización.':
    'Welcome to Nivra, your private organizing space.',
  Entrar: 'Enter',
  dinero: 'money',
  tareas: 'tasks',
  'por venir': 'upcoming',
  '1º Trimestre': '1st Term',
  '2º Trimestre': '2nd Term',
  '3º Trimestre': '3rd Term',
  'No se repite': 'Does not repeat',
  Regalo: 'Gift',
  Deuda: 'Debt',
  Venta: 'Sale',
  Otros: 'Other',
  'Alimentación': 'Food',
  Juegos: 'Games',
  Aparatos: 'Devices',
  'Suscripción': 'Subscription',
  'Vacío.': 'Empty.',
  'Sin exámenes.': 'No exams.',
  'Sin proyectos.': 'No projects.',
  '«{0}» eliminado': '“{0}” deleted',
  '«{0}» eliminada': '“{0}” deleted',
  'Se han cobrado {0} suscripción/es.': '{0} subscription(s) charged.',
  'Esa tecla ya la usa «{0}».': 'That key is already used by “{0}”.',
  'Último intento fallido: {0}': 'Last attempt failed: {0}',
  'Al día · {0} · se comprueba sola': 'Up to date · {0} · checks itself',
  '{0}. Ya has marcado hoy.': '{0}. Already marked today.',
  ' · desde su apartado': ' · from its own section',
  Nada: 'Nothing',
  Nuevo: 'New',
  'Página ': 'Page ',
  palabra: 'word',
  palabras: 'words',
  'en esta página': 'on this page',
  ' · {0} en el bloc': ' · {0} in the notepad',
  ' · último cobro {0}': ' · last charged {0}',
  'Se renueva el día {0} de cada mes': 'Renews on day {0} of every month',
  'Añadir bloque el {0}': 'Add a block on {0}',
  ' · {0}º Trim.': ' · Term {0}',
  'Hoy{0}: {1}': 'Today{0}: {1}',
  ' a las {0}': ' at {0}',
  'Mañana tienes {0} de {1}': 'Tomorrow you have {0} for {1}',
  'Se ha acabado la cuenta atrás de {0}': 'The countdown for {0} has finished',
  'Hoy es el aniversario de {0}': 'Today is the anniversary of {0}',
  'algo tuyo': 'something of yours',
  '{0} de hoy: {1}': '{0} today: {1}',
  'Tarea atrasada: {0}': 'Overdue task: {0}',
  'Tienes {0} tareas atrasadas': 'You have {0} overdue tasks',
  'Metas de dinero': 'Money targets',
  'Límites de gasto': 'Spending limits',
  'Ideas para conseguir dinero': 'Ideas to make money',
  Todas: 'All',
  Subtareas: 'Subtasks',
  Exámenes: 'Exams',
  Proyectos: 'Projects',
  'al mes': 'per month',
  nota: 'grade',
  notas: 'grades',
  'Crear un bloc para escribir': 'Create a notepad to write in',
  'Escribe para buscar en todos los apartados.': 'Type to search across every section.',
  'Ese día, todos los años, cae confeti.': 'Confetti falls on that day every year.',
  'El CSV es para abrirlo fuera; para volver a entrar usa el JSON. Importar reemplaza lo que haya.':
    'The CSV is for opening elsewhere; use the JSON to import back. Importing replaces everything.',
  'Desconectar este dispositivo': 'Disconnect this device',
  'Los datos se cifran en tu navegador con el código antes de salir. El servidor guarda algo que no puede leer, y sin el código no hay forma de recuperarlo.':
    'Data is encrypted in your browser with the code before it leaves. The server only holds something it cannot read, and without the code there is no way to recover it.',
  'La categoría no sale en el calendario.': 'The category is not shown on the calendar.',
  'Crea asignaturas en Ajustes para poder elegir de qué es la nota.':
    'Create subjects in Settings to choose what the grade is for.',
  'Arrastra un bloque a otro día para moverlo, o púlsalo para editarlo.':
    'Drag a block to another day to move it, or tap it to edit.',
  'Al eliminarlo se borran también sus bloques.': 'Deleting it also removes its blocks.',
  'El día de renovación se resta solo del dinero, como gasto de categoría «Suscripción».':
    'On the renewal day it is deducted automatically, as an expense in the Subscription category.',
  'Precio al mes y día del mes en que se renueva.':
    'Monthly price and the day of the month it renews.',
  'Con fecha aparece en el calendario como Tarea, en azul.':
    'With a date it appears on the calendar as a Task, in blue.',
  'El enlace debe empezar por http:// o https://.': 'The link must start with http:// or https://.',
  'Abrir enlace de {0}': 'Open the link for {0}',

  // marcadores, tablas, gráficas y texto desplegable
  'Añadir marcador aquí': 'Add bookmark here',
  'Ver marcadores de esta página': 'View this page’s bookmarks',
  'Nuevo marcador': 'New bookmark',
  'Título del marcador': 'Bookmark title',
  'Sin marcadores en esta página.': 'No bookmarks on this page.',
  'Eliminar marcador «{0}»': 'Delete bookmark “{0}”',
  Marcadores: 'Bookmarks',
  'Texto normal': 'Normal text',
  'Insertar tabla': 'Insert table',
  'Insertar gráfica': 'Insert chart',
  'Insertar texto desplegable': 'Insert collapsible text',
  Filas: 'Rows',
  Columnas: 'Columns',
  Insertar: 'Insert',
  'Gráfica de barras': 'Bar chart',
  Etiqueta: 'Label',
  Valor: 'Value',
  'Añadir fila': 'Add row',
  'Toca para expandir': 'Tap to expand',
  'Escribe aquí…': 'Write here…',

  // horario
  'Colocar al final del día': 'Place at the end of the day',
  'Útil si tienes una actividad que empieza pasada la medianoche.':
    'Useful if you have an activity that starts after midnight.',

  // carrusel de cuentas atrás
  'Carrusel de cuentas atrás': 'Countdown carousel',
  'En el dashboard, va cambiando de cuenta atrás en vez de mostrar siempre la misma.':
    'On the dashboard, it cycles through your countdowns instead of always showing the same one.',
  'Cambiar cada': 'Switch every',
  'Segundos entre cuentas atrás': 'Seconds between countdowns',

  // fondo
  Fondo: 'Background',
  Ninguno: 'None',
  'Forma simple': 'Simple shape',
  'Imagen o gif': 'Image or gif',
  Puntos: 'Dots',
  Rejilla: 'Grid',
  Diagonales: 'Diagonals',
  Olas: 'Waves',
  'Subir imagen o gif': 'Upload an image or gif',
  'Cambiar imagen': 'Change image',
  'Se ve de fondo, muy suave, detrás del contenido. Se queda solo en este dispositivo.':
    'Shown very faintly behind the content. Stays only on this device.',

  // sonidos
  Sonidos: 'Sounds',
  'Sonidos de interfaz': 'Interface sounds',
  'Un sonido muy suave al pulsar interruptores o cuando aparece un aviso.':
    'A very soft sound when you flip a switch or an alert appears.',
  Volumen: 'Volume',
  'Sonido de ambiente': 'Ambient sound',
  'Un ruido de fondo relajante y continuo, muy bajito.':
    'A calm, continuous background hum, very quiet.',
  Lluvia: 'Rain',
  Estática: 'Static',
  'Tu música': 'Your music',
  'Enlace de música': 'Music link',
  'Admite canciones, álbumes y listas de Spotify, y vídeos o listas de YouTube/YouTube Music. Aparece un reproductor pequeño; Spotify y YouTube no dejan que lo controlemos nosotros, así que tienes que darle a reproducir tú una vez.':
    'Works with Spotify tracks, albums and playlists, and YouTube/YouTube Music videos or playlists. A small player appears; Spotify and YouTube do not let us control it ourselves, so you need to press play in it once.',

  // notas por asignatura y %
  'Todas las asignaturas': 'All subjects',
  '¿Qué % vale de la nota final? (opcional)': 'What % of the final grade is this worth? (optional)',
  'Porcentaje de la nota final': 'Percentage of the final grade',
  'Media simple de todas las notas, sin porcentajes. Solo para ver tu rango académico.':
    'A plain average of every grade, no percentages. Just to see your overall standing.',
  'de la nota puesta': 'of the grade set so far',
  'Ninguna nota de esta asignatura tiene un % puesto todavía.':
    'No grade for this subject has a % set yet.',
  'Suma de cada nota por el % que le hayas puesto.':
    'The sum of each grade times the % you gave it.',
  'Notas de la asignatura': 'Subject grades',
  'Nota {0} eliminada': 'Grade {0} deleted',

  // horario en tabla
  'Horario libre': 'Free layout',
  'Horario en tabla': 'Table layout',
  'Nuevo bloque': 'New block',
  'Nueva franja horaria': 'New time slot',
  'Las horas fijas se mantienen siempre en la misma fila. Un día con una hora distinta simplemente añade una franja nueva.':
    'Fixed hours always stay on the same row. A day with a different time just adds a new slot.',
  'Añadir bloque el {0} de {1} a {2}': 'Add a block on {0} from {1} to {2}',

  // estilo
  Estilo: 'Style',
  'Barra Lateral': 'Sidebar',
  Temas: 'Themes',
  Naturaleza: 'Nature',
  Espacio: 'Space',
  'Cambia casi toda la web: fondo animado propio y su propio sonido de ambiente. Los ajustes y la barra de arriba no cambian.':
    'Changes almost the whole app: its own animated background and its own ambient sound. Settings and the top bar stay the same.',
  Clásico: 'Classic',
  'Carpetas de escritorio': 'Desktop folders',
  'Cambia el aspecto general de la navegación. No afecta al color ni al modo claro u oscuro.':
    'Changes the overall look of the navigation. Does not affect the accent colour or light/dark mode.',

  // ajustes de secciones
  'Sección de banco': 'Bank section',
  'Oculta el banco, sus estadísticas y sus atajos del resto de la aplicación.':
    'Hides the bank, its stats and its shortcuts from the rest of the app.',

  // arrastrar
  'Arrastra un bloc para reordenarlo.': 'Drag a notepad to reorder it.',
  'Arrastra una cuenta atrás para reordenarla.': 'Drag a countdown to reorder it.',
}

/** Como t(), pero sustituyendo {0}, {1}... por los valores dados. */
export const tp = (s: string, ...args: (string | number)[]) =>
  args.reduce<string>((acc, v, i) => acc.split('{' + i + '}').join(String(v)), t(s))

/** Iniciales de los dias: no valen para el diccionario porque se repiten. */
export const weekdayLetters = () =>
  lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const t = (s: string): string => (lang === 'en' ? (EN[s] ?? s) : s)
