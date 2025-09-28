export interface ImageCompressionOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'webp' | 'jpeg'
  maxSizeKB: number
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'webp',
  maxSizeKB: 2048 // 2MB
}

export class ImageUtils {
  static async compressImage(file: File, options: Partial<ImageCompressionOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Check file size first
    if (file.size > opts.maxSizeKB * 1024) {
      throw new Error(`Image size (${Math.round(file.size / 1024)}KB) exceeds limit of ${opts.maxSizeKB}KB`)
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = this.calculateDimensions(img.width, img.height, opts.maxWidth, opts.maxHeight)

          canvas.width = width
          canvas.height = height

          if (!ctx) {
            throw new Error('Could not get canvas context')
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)

          // Try WebP first, fallback to JPEG
          const mimeType = opts.format === 'webp' && this.supportsWebP() ? 'image/webp' : 'image/jpeg'
          const base64 = canvas.toDataURL(mimeType, opts.quality)

          // Check if compressed size is acceptable
          const compressedSizeKB = Math.round((base64.length * 0.75) / 1024) // rough base64 to bytes conversion
          if (compressedSizeKB > opts.maxSizeKB) {
            throw new Error(`Compressed image (${compressedSizeKB}KB) still exceeds size limit`)
          }

          resolve(base64)
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Image compression failed'))
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  private static calculateDimensions(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number) {
    let { width, height } = { width: originalWidth, height: originalHeight }

    // Scale down if needed
    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    return { width: Math.round(width), height: Math.round(height) }
  }

  private static supportsWebP(): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }

  static getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = base64
    })
  }

  static validateImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    return validTypes.includes(file.type)
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}