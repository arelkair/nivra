import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PropsOf<T> = T extends (props: infer P) => unknown ? P : never
type Group = 'classic' | 'initiative'

const loaders: { group: Group; load: () => Promise<unknown> }[] = []

export function lazyNamed<M, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
  group: Group | false = 'initiative',
): LazyExoticComponent<ComponentType<PropsOf<M[K]>>> {
  if (group) loaders.push({ group, load })
  return lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType<PropsOf<M[K]>> })))
}

export function preloadSections(group: Group) {
  let cursor = 0
  let idle = 0
  const worker = () => {
    while (cursor < loaders.length && loaders[cursor].group !== group) cursor++
    const item = loaders[cursor++]
    if (item) {
      idle = 0
      item.load().catch(() => undefined).finally(worker)
      return
    }
    cursor = Math.min(cursor, loaders.length)
    if (++idle < 30) setTimeout(worker, 200)
  }
  const start = () => {
    for (let i = 0; i < 3; i++) setTimeout(worker, 150 + i * 40)
  }
  if (document.readyState === 'complete') start()
  else addEventListener('load', start, { once: true })
}
