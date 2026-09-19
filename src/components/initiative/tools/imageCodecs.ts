import { t, tp } from '../../../lib/i18n'

export type Format = 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'bmp' | 'ico' | 'tiff' | 'tga' | 'ppm' | 'pgm'

export type FormatInfo = { id: Format; label: string; mime: string; ext: string; lossy: boolean; alpha: boolean; hint?: string }

export const FORMATS: FormatInfo[] = [
  { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png', lossy: false, alpha: true },
  { id: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', lossy: true, alpha: false },
  { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true, alpha: true },
  { id: 'avif', label: 'AVIF', mime: 'image/avif', ext: 'avif', lossy: true, alpha: true, hint: 'AVIF' },
  { id: 'gif', label: 'GIF', mime: 'image/gif', ext: 'gif', lossy: false, alpha: true, hint: 'GIF' },
  { id: 'bmp', label: 'BMP', mime: 'image/bmp', ext: 'bmp', lossy: false, alpha: false },
  { id: 'ico', label: 'ICO', mime: 'image/x-icon', ext: 'ico', lossy: false, alpha: true, hint: 'ICO' },
  { id: 'tiff', label: 'TIFF', mime: 'image/tiff', ext: 'tiff', lossy: false, alpha: true },
  { id: 'tga', label: 'TGA', mime: 'image/x-tga', ext: 'tga', lossy: false, alpha: true },
  { id: 'ppm', label: 'PPM', mime: 'image/x-portable-pixmap', ext: 'ppm', lossy: false, alpha: false },
  { id: 'pgm', label: 'PGM', mime: 'image/x-portable-graymap', ext: 'pgm', lossy: false, alpha: false, hint: 'PGM' },
]

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

export const INPUT_EXTENSIONS = 'png|jpe?g|jfif|webp|gif|bmp|svg|avif|ico|cur|tiff?|tga|ppm|pgm|pnm|heic|heif'

export const ACCEPT = `image/*,.${INPUT_EXTENSIONS.replace(/\?/g, '').split('|').join(',.')},.jpeg,.tif`

export const isImageFile = (file: File) => file.type.startsWith('image/') || new RegExp(`\\.(${INPUT_EXTENSIONS})$`, 'i').test(file.name)

const extensionOf = (file: File) => (file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '')

export type Decoded = { source: CanvasImageSource; w: number; h: number; close: () => void }

const fromImageData = async (data: ImageData): Promise<Decoded> => {
  const bitmap = await createImageBitmap(data)
  return { source: bitmap, w: bitmap.width, h: bitmap.height, close: () => bitmap.close() }
}

function decodeTga(bytes: Uint8Array): ImageData {
  const idLength = bytes[0]
  const type = bytes[2]
  const width = bytes[12] | (bytes[13] << 8)
  const height = bytes[14] | (bytes[15] << 8)
  const bpp = bytes[16]
  const descriptor = bytes[17]
  const pixelBytes = bpp / 8
  if (![2, 3, 10, 11].includes(type) || ![8, 24, 32].includes(bpp) || width === 0 || height === 0) throw new Error(t('Este TGA no es compatible.'))
  const rle = type >= 9
  const out = new Uint8ClampedArray(width * height * 4)
  let pos = 18 + idLength
  let pixel = 0
  const put = (offset: number) => {
    const o = pixel * 4
    if (pixelBytes === 1) {
      out[o] = out[o + 1] = out[o + 2] = bytes[offset]
      out[o + 3] = 255
    } else {
      out[o] = bytes[offset + 2]
      out[o + 1] = bytes[offset + 1]
      out[o + 2] = bytes[offset]
      out[o + 3] = pixelBytes === 4 ? bytes[offset + 3] : 255
    }
    pixel++
  }
  while (pixel < width * height && pos < bytes.length) {
    if (rle) {
      const header = bytes[pos++]
      const count = (header & 0x7f) + 1
      if (header & 0x80) {
        const start = pos
        pos += pixelBytes
        for (let i = 0; i < count && pixel < width * height; i++) put(start)
      } else {
        for (let i = 0; i < count && pixel < width * height; i++) {
          put(pos)
          pos += pixelBytes
        }
      }
    } else {
      put(pos)
      pos += pixelBytes
    }
  }
  const flipY = !(descriptor & 0x20)
  const flipX = !!(descriptor & 0x10)
  if (flipY || flipX) {
    const copy = new Uint8ClampedArray(out)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const from = (y * width + x) * 4
        const to = ((flipY ? height - 1 - y : y) * width + (flipX ? width - 1 - x : x)) * 4
        out.set(copy.subarray(from, from + 4), to)
      }
    }
  }
  return new ImageData(out, width, height)
}

function decodePnm(bytes: Uint8Array): ImageData {
  let pos = 0
  const token = () => {
    for (;;) {
      while (pos < bytes.length && /\s/.test(String.fromCharCode(bytes[pos]))) pos++
      if (bytes[pos] === 0x23) while (pos < bytes.length && bytes[pos] !== 0x0a) pos++
      else break
    }
    let out = ''
    while (pos < bytes.length && !/\s/.test(String.fromCharCode(bytes[pos]))) out += String.fromCharCode(bytes[pos++])
    return out
  }
  const magic = token()
  if (!['P2', 'P3', 'P5', 'P6'].includes(magic)) throw new Error(t('Este formato PNM no es compatible.'))
  const width = Number(token())
  const height = Number(token())
  const max = Number(token())
  if (!width || !height || !max) throw new Error(t('La cabecera del archivo no es válida.'))
  const binary = magic === 'P5' || magic === 'P6'
  const channels = magic === 'P3' || magic === 'P6' ? 3 : 1
  if (binary) pos++
  const wide = max > 255
  if (binary && bytes.length - pos < width * height * channels * (max > 255 ? 2 : 1)) throw new Error(t('El archivo está incompleto.'))
  const out = new Uint8ClampedArray(width * height * 4)
  const read = () => {
    if (!binary) return Number(token())
    if (wide) {
      const v = (bytes[pos] << 8) | bytes[pos + 1]
      pos += 2
      return v
    }
    return bytes[pos++]
  }
  for (let i = 0; i < width * height; i++) {
    const values = Array.from({ length: channels }, () => Math.round((read() / max) * 255))
    out[i * 4] = values[0]
    out[i * 4 + 1] = values[channels === 3 ? 1 : 0]
    out[i * 4 + 2] = values[channels === 3 ? 2 : 0]
    out[i * 4 + 3] = 255
  }
  return new ImageData(out, width, height)
}

export async function decodeFile(file: File): Promise<Decoded> {
  const ext = extensionOf(file)
  try {
    if (ext === 'tga') return await fromImageData(decodeTga(new Uint8Array(await file.arrayBuffer())))
    if (['ppm', 'pgm', 'pnm'].includes(ext)) return await fromImageData(decodePnm(new Uint8Array(await file.arrayBuffer())))
    if (ext === 'tif' || ext === 'tiff') {
      const UTIF = (await import('utif')).default
      const buffer = await file.arrayBuffer()
      const pages = UTIF.decode(buffer)
      if (pages.length === 0) throw new Error(t('No se puede leer esta imagen.'))
      UTIF.decodeImage(buffer, pages[0])
      const rgba = UTIF.toRGBA8(pages[0])
      if (!pages[0].width || !pages[0].height) throw new Error(t('No se puede leer esta imagen.'))
      return await fromImageData(new ImageData(new Uint8ClampedArray(rgba), pages[0].width, pages[0].height))
    }
    if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
      const heic2any = (await import('heic2any')).default
      const result = await heic2any({ blob: file, toType: 'image/png' })
      const blob = Array.isArray(result) ? result[0] : result
      const bitmap = await createImageBitmap(blob)
      return { source: bitmap, w: bitmap.width, h: bitmap.height, close: () => bitmap.close() }
    }
  } catch (e) {
    throw new Error(e instanceof Error && e.message ? e.message : t('No se puede leer esta imagen.'))
  }
  try {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, w: bitmap.width, h: bitmap.height, close: () => bitmap.close() }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { source: img, w: img.naturalWidth || 1024, h: img.naturalHeight || 1024, close: () => URL.revokeObjectURL(url) }
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(t('No se puede leer esta imagen.'))
    }
  }
}

const toPngBytes = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(t('No se pudo procesar la imagen.'))
  return new Uint8Array(await blob.arrayBuffer())
}

const pixelsOf = (canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)

const blobOf = (parts: BlobPart[], type: string) => new Blob(parts, { type })

function encodeBmp(canvas: HTMLCanvasElement): Blob {
  const { width, height } = canvas
  const data = pixelsOf(canvas).data
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const size = 54 + rowSize * height
  const buffer = new ArrayBuffer(size)
  const view = new DataView(buffer)
  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, size, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, rowSize * height, true)
  const bytes = new Uint8Array(buffer)
  for (let y = 0; y < height; y++) {
    const row = 54 + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      bytes[row + x * 3] = data[i + 2]
      bytes[row + x * 3 + 1] = data[i + 1]
      bytes[row + x * 3 + 2] = data[i]
    }
  }
  return blobOf([buffer], 'image/bmp')
}

function encodeTga(canvas: HTMLCanvasElement): Blob {
  const { width, height } = canvas
  const data = pixelsOf(canvas).data
  const out = new Uint8Array(18 + width * height * 4)
  out[2] = 2
  out[12] = width & 0xff
  out[13] = width >> 8
  out[14] = height & 0xff
  out[15] = height >> 8
  out[16] = 32
  out[17] = 0x28
  for (let i = 0; i < width * height; i++) {
    out[18 + i * 4] = data[i * 4 + 2]
    out[18 + i * 4 + 1] = data[i * 4 + 1]
    out[18 + i * 4 + 2] = data[i * 4]
    out[18 + i * 4 + 3] = data[i * 4 + 3]
  }
  return blobOf([out], 'image/x-tga')
}

function encodeTiff(canvas: HTMLCanvasElement): Blob {
  const { width, height } = canvas
  const data = pixelsOf(canvas).data
  const entries = 11
  const ifdSize = 2 + entries * 12 + 4
  const bitsOffset = 8 + ifdSize
  const dataOffset = bitsOffset + 8
  const total = dataOffset + data.length
  const buffer = new ArrayBuffer(total)
  const v = new DataView(buffer)
  v.setUint8(0, 0x49)
  v.setUint8(1, 0x49)
  v.setUint16(2, 42, true)
  v.setUint32(4, 8, true)
  v.setUint16(8, entries, true)
  let at = 10
  const entry = (tag: number, type: number, count: number, value: number) => {
    v.setUint16(at, tag, true)
    v.setUint16(at + 2, type, true)
    v.setUint32(at + 4, count, true)
    if (type === 3 && count === 1) v.setUint16(at + 8, value, true)
    else v.setUint32(at + 8, value, true)
    at += 12
  }
  entry(256, 4, 1, width)
  entry(257, 4, 1, height)
  entry(258, 3, 4, bitsOffset)
  entry(259, 3, 1, 1)
  entry(262, 3, 1, 2)
  entry(273, 4, 1, dataOffset)
  entry(277, 3, 1, 4)
  entry(278, 4, 1, height)
  entry(279, 4, 1, data.length)
  entry(284, 3, 1, 1)
  entry(338, 3, 1, 2)
  v.setUint32(at, 0, true)
  for (let i = 0; i < 4; i++) v.setUint16(bitsOffset + i * 2, 8, true)
  new Uint8Array(buffer, dataOffset).set(data)
  return blobOf([buffer], 'image/tiff')
}

function encodeNetpbm(canvas: HTMLCanvasElement, gray: boolean): Blob {
  const { width, height } = canvas
  const data = pixelsOf(canvas).data
  const header = new TextEncoder().encode(`${gray ? 'P5' : 'P6'}\n${width} ${height}\n255\n`)
  const channels = gray ? 1 : 3
  const out = new Uint8Array(header.length + width * height * channels)
  out.set(header)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    if (gray) out[header.length + i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    else {
      out[header.length + i * 3] = r
      out[header.length + i * 3 + 1] = g
      out[header.length + i * 3 + 2] = b
    }
  }
  return blobOf([out], gray ? 'image/x-portable-graymap' : 'image/x-portable-pixmap')
}

async function encodeGif(canvas: HTMLCanvasElement): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const { width, height, data } = pixelsOf(canvas)
  const rgba = new Uint8Array(data.buffer.slice(0))
  const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true })
  const index = applyPalette(rgba, palette, 'rgba4444')
  const transparentIndex = palette.findIndex((c: number[]) => c[3] === 0)
  const gif = GIFEncoder()
  gif.writeFrame(index, width, height, { palette, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex) })
  gif.finish()
  return blobOf([gif.bytes().buffer as ArrayBuffer], 'image/gif')
}

async function encodeAvif(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const native = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/avif', quality))
  if (native && native.type === 'image/avif') return native
  const { encode } = await import('@jsquash/avif')
  const buffer = await encode(pixelsOf(canvas), { quality: Math.round(quality * 100), speed: 8 })
  return blobOf([buffer], 'image/avif')
}

async function encodeIco(canvas: HTMLCanvasElement, sizes: number[]): Promise<Blob> {
  const list = (sizes.length > 0 ? sizes : [32]).sort((a, b) => a - b)
  const images: { size: number; bytes: Uint8Array }[] = []
  for (const size of list) {
    const square = document.createElement('canvas')
    square.width = size
    square.height = size
    const ctx = square.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    const scale = Math.min(size / canvas.width, size / canvas.height)
    const w = canvas.width * scale
    const h = canvas.height * scale
    ctx.drawImage(canvas, (size - w) / 2, (size - h) / 2, w, h)
    images.push({ size, bytes: await toPngBytes(square) })
  }
  const headerSize = 6 + images.length * 16
  const total = headerSize + images.reduce((sum, i) => sum + i.bytes.length, 0)
  const out = new Uint8Array(total)
  const v = new DataView(out.buffer)
  v.setUint16(2, 1, true)
  v.setUint16(4, images.length, true)
  let offset = headerSize
  images.forEach((image, i) => {
    const at = 6 + i * 16
    out[at] = image.size >= 256 ? 0 : image.size
    out[at + 1] = image.size >= 256 ? 0 : image.size
    v.setUint16(at + 4, 1, true)
    v.setUint16(at + 6, 32, true)
    v.setUint32(at + 8, image.bytes.length, true)
    v.setUint32(at + 12, offset, true)
    out.set(image.bytes, offset)
    offset += image.bytes.length
  })
  return blobOf([out], 'image/x-icon')
}

export type EncodeOptions = { quality: number; icoSizes: number[] }

export async function encodeCanvas(canvas: HTMLCanvasElement, id: Format, options: EncodeOptions): Promise<Blob> {
  const info = FORMATS.find((f) => f.id === id)!
  switch (id) {
    case 'bmp':
      return encodeBmp(canvas)
    case 'tga':
      return encodeTga(canvas)
    case 'tiff':
      return encodeTiff(canvas)
    case 'ppm':
      return encodeNetpbm(canvas, false)
    case 'pgm':
      return encodeNetpbm(canvas, true)
    case 'gif':
      return encodeGif(canvas)
    case 'avif':
      return encodeAvif(canvas, options.quality)
    case 'ico':
      return encodeIco(canvas, options.icoSizes)
    default: {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, info.mime, info.lossy ? options.quality : undefined))
      if (!blob || blob.type !== info.mime) throw new Error(tp('Este navegador no puede guardar en {0}.', info.label))
      return blob
    }
  }
}
