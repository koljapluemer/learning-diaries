import { db, type Diary, type Entry, type EntryBlock } from '@/composables/useDiaries'

interface ExportDiary {
  title: string
  width: number
  height: number
  color: string
  fontColor: string
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  createdAt: string
}

interface ExportEntry {
  diaryTitle: string
  date: string
  blocks: EntryBlock[]
  createdAt: string
  updatedAt?: string
}

interface BackupData {
  version: string
  timestamp: string
  diaries: ExportDiary[]
  entries: ExportEntry[]
}

interface BackupStats {
  diaries: number
  entries: number
  databaseSize: string
}

class BackupService {
  async exportData(): Promise<string> {
    const diaries = await db.diaries.toArray()
    const entries = await db.entries.toArray()
    const diaryTitleById = new Map(diaries.map(diary => [diary.id, diary.title]))

    const backupData: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      diaries: diaries.map(diary => this.serializeDiary(diary)),
      entries: entries
        .map(entry => this.serializeEntry(entry, diaryTitleById))
        .filter((entry): entry is ExportEntry => Boolean(entry))
    }

    return JSON.stringify(backupData, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const backupData: BackupData = JSON.parse(jsonData)

      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data format')
      }

      // Clear existing data
      await db.transaction('rw', [db.diaries, db.entries], async () => {
        const existingDiaries = await db.diaries.toArray()
        const diaryByTitle = new Map(existingDiaries.map(diary => [diary.title, diary]))
        const existingEntries = await db.entries.toArray()
        const existingEntryKeys = new Set(
          existingEntries.map(entry => this.entryDedupKey(entry.diaryId, entry.date, entry.blocks))
        )

        // Import diaries (by title)
        for (const diary of backupData.diaries) {
          if (diaryByTitle.has(diary.title)) continue
          const createdAt = new Date(diary.createdAt)
          const id = await db.diaries.add({
            ...diary,
            createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
          })
          diaryByTitle.set(diary.title, { ...diary, id, createdAt })
        }

        // Import entries (by diary title + date + blocks)
        for (const entry of backupData.entries) {
          const diary = diaryByTitle.get(entry.diaryTitle)
          if (!diary?.id) continue
          const entryKey = this.entryDedupKey(diary.id, entry.date, entry.blocks)
          if (existingEntryKeys.has(entryKey)) continue

          const createdAt = new Date(entry.createdAt)
          const updatedAt = entry.updatedAt ? new Date(entry.updatedAt) : undefined
          await db.entries.add({
            diaryId: diary.id,
            date: entry.date,
            blocks: entry.blocks,
            createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
            updatedAt: updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt : undefined
          })
          existingEntryKeys.add(entryKey)
        }
      })

    } catch (error) {
      console.error('Import failed:', error)
      throw new Error('Failed to import backup data')
    }
  }

  async exportToFile(): Promise<void> {
    const jsonData = await this.exportData()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `learning-diaries-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  async importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string
          await this.importData(jsonData)
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  async getStats(): Promise<BackupStats> {
    const diaryCount = await db.diaries.count()
    const entryCount = await db.entries.count()

    // Estimate database size
    const sampleData = await this.exportData()
    const sizeInBytes = new Blob([sampleData]).size
    const sizeInKB = Math.round(sizeInBytes / 1024)

    let sizeString = `${sizeInKB} KB`
    if (sizeInKB > 1024) {
      const sizeInMB = Math.round(sizeInKB / 1024 * 10) / 10
      sizeString = `${sizeInMB} MB`
    }

    return {
      diaries: diaryCount,
      entries: entryCount,
      databaseSize: sizeString
    }
  }

  private validateBackupData(data: unknown): data is BackupData {
    if (!data || typeof data !== 'object') return false
    const obj = data as Record<string, unknown>

    return (
      typeof obj.version === 'string' &&
      typeof obj.timestamp === 'string' &&
      Array.isArray(obj.diaries) &&
      Array.isArray(obj.entries) &&
      obj.diaries.every(this.isValidDiary) &&
      obj.entries.every(this.isValidEntry)
    )
  }

  private isValidDiary(diary: unknown): diary is ExportDiary {
    if (!diary || typeof diary !== 'object') return false
    const obj = diary as Record<string, unknown>

    return (
      typeof obj.title === 'string' &&
      typeof obj.width === 'number' &&
      typeof obj.height === 'number' &&
      typeof obj.color === 'string' &&
      typeof obj.fontColor === 'string' &&
      typeof obj.fontFamily === 'string' &&
      typeof obj.fontSize === 'number' &&
      typeof obj.bold === 'boolean' &&
      typeof obj.italic === 'boolean' &&
      typeof obj.createdAt === 'string'
    )
  }

  private isValidEntry(entry: unknown): entry is ExportEntry {
    if (!entry || typeof entry !== 'object') return false
    const obj = entry as Record<string, unknown>

    return (
      typeof obj.diaryTitle === 'string' &&
      typeof obj.date === 'string' &&
      Array.isArray(obj.blocks) &&
      typeof obj.createdAt === 'string'
    )
  }

  private serializeDiary(diary: Diary): ExportDiary {
    return {
      title: diary.title,
      width: diary.width,
      height: diary.height,
      color: diary.color,
      fontColor: diary.fontColor,
      fontFamily: diary.fontFamily,
      fontSize: diary.fontSize,
      bold: diary.bold,
      italic: diary.italic,
      createdAt: diary.createdAt.toISOString()
    }
  }

  private serializeEntry(entry: Entry, diaryTitleById: Map<string | undefined, string>): ExportEntry | null {
    const diaryTitle = diaryTitleById.get(entry.diaryId)
    if (!diaryTitle) return null
    return {
      diaryTitle,
      date: entry.date,
      blocks: entry.blocks,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : undefined
    }
  }

  private entryDedupKey(diaryId: string, date: string, blocks: EntryBlock[]): string {
    return `${diaryId}::${date}::${JSON.stringify(blocks)}`
  }
}

export const backupService = new BackupService()
