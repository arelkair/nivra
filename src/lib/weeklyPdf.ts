import { locale, t } from './i18n'
import type { Task, Grade, Subject } from './store'
import { weeklySummary, type FocusSession } from './study'

export async function buildWeeklyPdf(tasks: Task[], sessions: FocusSession[], grades: Grade[], subjects: Subject[], name: string) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page = pdf.addPage(), y = 790
  const safe = (text: string) => [...text].map(char => { try { font.encodeText(char); return char } catch { return '?' } }).join('')
  const line = (text: string, heading = false) => {
    const words = safe(text).split(/\s+/); let current = ''
    const draw = () => { if (y < 55) { page = pdf.addPage(); y = 790 } page.drawText(current, { x: 48, y, size: heading ? 17 : 11, font: heading ? bold : font, color: rgb(.2, .2, .22) }); y -= heading ? 29 : 19 }
    for (const word of words) { const next = current ? `${current} ${word}` : word; if (font.widthOfTextAtSize(next, heading ? 17 : 11) > 495 && current) { draw(); current = word } else current = next }
    if (current) draw()
  }
  const summary = weeklySummary(tasks, sessions)
  line(`Nivra · ${t('Resumen semanal')}`, true)
  line(`${name || t('Mi curso')} · ${new Date().toLocaleDateString(locale())}`)
  line(`${summary.start} — ${summary.end}`); y -= 12
  line(`${t('Tareas completadas')}: ${summary.tasks}`)
  line(`${t('Minutos de concentración')}: ${summary.minutes}`)
  line(`${t('Tareas pendientes')}: ${tasks.filter(task => !task.done).length}`); y -= 12
  line(t('Tu curso en números'), true)
  for (const subject of subjects) {
    const marks = grades.filter(g => g.subject === subject.id)
    const minutes = sessions.filter(s => s.subject === subject.id).reduce((sum, s) => sum + s.minutes, 0)
    line(`${subject.name}: ${marks.length ? (marks.reduce((sum, g) => sum + g.value, 0) / marks.length).toFixed(2) : '—'} · ${minutes} min`)
  }
  y -= 12; line(t('Próximas tareas'), true)
  for (const task of tasks.filter(task => !task.done).sort((a, b) => (a.due || a.date || '9999').localeCompare(b.due || b.date || '9999')).slice(0, 30)) line(`· ${task.title} · ${task.due || task.date || t('Sin fecha')}`)
  return new Uint8Array(await pdf.save())
}
export async function downloadWeeklyPdf(tasks: Task[], sessions: FocusSession[], grades: Grade[], subjects: Subject[], name: string) {
  const bytes = await buildWeeklyPdf(tasks, sessions, grades, subjects, name)
  const summary = weeklySummary(tasks, sessions)
  const blob = new Blob([bytes], { type: 'application/pdf' }), url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `nivra-${summary.end}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
