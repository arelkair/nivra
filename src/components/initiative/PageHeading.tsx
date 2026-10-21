import { t } from '../../lib/i18n'

const DESCRIPTIONS: Record<string, string> = {
  Tareas: 'Una cosa cada vez.', Calendario: 'Un lugar para todo lo que viene.', Horario: 'Dale forma a tu semana.',
  'Exámenes y Proyectos': 'Prepárate con tiempo.', Notas: 'Tu progreso, con perspectiva.', Dinero: 'Tus cuentas, claras.',
  'Lista de Deseos': 'Lo que te gustaría hacer realidad.', Suscripciones: 'Ten a mano tus próximos pagos.',
  Recordatorios: 'Deja aquí lo que no quieres olvidar.', 'Cuentas atrás': 'Algo que esperar.', Laboratorio: 'Pequeñas herramientas para grandes ideas.',
  Bóveda: 'Un espacio para pensar y conectar.', Ajustes: 'Haz que Nivra se adapte a ti.',
}
export function PageHeading({ title }: { title: string }) {
  return <div className="min-w-0"><h1 className="font-initiative text-3xl font-medium tracking-tight">{t(title)}</h1>{DESCRIPTIONS[title] && <p className="mt-2 text-sm text-(--minimal-muted)">{t(DESCRIPTIONS[title])}</p>}</div>
}
