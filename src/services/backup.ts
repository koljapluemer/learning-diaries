import { db, type Diary, type Entry } from '@/composables/useDiaries'

interface BackupData {
  version: string
  timestamp: string
  diaries: Diary[]
  entries: Entry[]
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

    const backupData: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      diaries,
      entries
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
        await db.diaries.clear()
        await db.entries.clear()

        // Import diaries
        for (const diary of backupData.diaries) {
          const { id, ...diaryData } = diary
          void id // Ignore unused variable
          await db.diaries.add({
            ...diaryData,
            createdAt: new Date(diaryData.createdAt)
          })
        }

        // Import entries
        for (const entry of backupData.entries) {
          const { id, ...entryData } = entry
          void id // Ignore unused variable
          await db.entries.add(entryData)
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

  private isValidDiary(diary: unknown): diary is Diary {
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
      (obj.createdAt instanceof Date || typeof obj.createdAt === 'string')
    )
  }

  private isValidEntry(entry: unknown): entry is Entry {
    if (!entry || typeof entry !== 'object') return false
    const obj = entry as Record<string, unknown>

    return (
      typeof obj.diaryId === 'number' &&
      typeof obj.date === 'string' &&
      typeof obj.content === 'string'
    )
  }
}

export const backupService = new BackupService()