export interface AudioProcessingOptions {
  maxSizeKB: number
}

const DEFAULT_OPTIONS: AudioProcessingOptions = {
  maxSizeKB: 10240 // 10MB
}

export class AudioUtils {
  static async processAudio(file: File, options: Partial<AudioProcessingOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Check file size first
    if (file.size > opts.maxSizeKB * 1024) {
      throw new Error(`Audio size (${Math.round(file.size / 1024)}KB) exceeds limit of ${opts.maxSizeKB}KB`)
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64)
      }

      reader.onerror = () => reject(new Error('Failed to read audio file'))
      reader.readAsDataURL(file)
    })
  }

  static validateAudioFile(file: File): boolean {
    const validTypes = [
      'audio/mpeg',      // MP3
      'audio/mp3',       // MP3 (alternative)
      'audio/mp4',       // M4A
      'audio/x-m4a',     // M4A (alternative)
      'audio/wav',       // WAV
      'audio/x-wav',     // WAV (alternative)
      'audio/ogg',       // OGG
      'audio/webm',      // WebM
      'audio/aac',       // AAC
      'audio/flac'       // FLAC
    ]
    return validTypes.includes(file.type)
  }

  static getAudioDuration(base64: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(audio.duration)
      }
      audio.onerror = () => reject(new Error('Failed to load audio'))
      audio.src = base64
    })
  }

  static formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds === 0) return '0:00'

    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
