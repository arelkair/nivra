import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PropsOf<T> = T extends (props: infer P) => unknown ? P : never

export function lazyNamed<M, K extends keyof M>(load: () => Promise<M>, name: K): LazyExoticComponent<ComponentType<PropsOf<M[K]>>> {
  return lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType<PropsOf<M[K]>> })))
}
