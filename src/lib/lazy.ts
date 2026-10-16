import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PropsOf<T> = T extends (props: infer P) => unknown ? P : never

const loaders: (() => Promise<unknown>)[] = []

export function lazyNamed<M, K extends keyof M>(load: () => Promise<M>, name: K, preload = true): LazyExoticComponent<ComponentType<PropsOf<M[K]>>> {
  if (preload) loaders.push(load)
  return lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType<PropsOf<M[K]>> })))
}

export function preloadSections() {
  let cursor = 0
  let idle = 0
  const next = () => {
    const load = loaders[cursor++]
    if (load) {
      idle = 0
      load().catch(() => undefined).finally(() => setTimeout(next, 60))
      return
    }
    cursor--
    if (++idle < 20) setTimeout(next, 300)
  }
  const start = () => setTimeout(next, 800)
  if (document.readyState === 'complete') start()
  else addEventListener('load', start, { once: true })
}
