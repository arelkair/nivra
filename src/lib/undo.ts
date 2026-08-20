type Listener = (text: string, undo?: () => void) => void

let listener: Listener | null = null

export function registerNotifier(fn: Listener) {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

export const notify = (text: string) => listener?.(text)

export const notifyWithUndo = (text: string, undo: () => void) => listener?.(text, undo)
