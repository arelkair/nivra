export const MAX_REAL_VOLUME = 40

export const realVolume = (slider: number) => Math.round((Math.min(100, Math.max(0, slider)) * MAX_REAL_VOLUME) / 100)
