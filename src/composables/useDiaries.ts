import Dexie, { type Table } from 'dexie'

export interface Diary {
  id?: number
  title: string
  width: number
  height: number
  color: string
  fontColor: string
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  createdAt: Date
}

export interface EntryBlock {
  type: 'text' | 'image'
  content: string // text content or base64 image data
  caption?: string // optional caption for images
}

export interface Entry {
  id?: number
  diaryId: number
  date: string
  blocks: EntryBlock[]
}

// Legacy interface for migration
export interface LegacyEntry {
  id?: number
  diaryId: number
  date: string
  content: string
}

export class LearningDiariesDB extends Dexie {
  diaries!: Table<Diary>
  entries!: Table<Entry>

  constructor() {
    super('LearningDiariesDB')

    // Version 1: Original schema
    this.version(1).stores({
      diaries: '++id, title, createdAt',
      entries: '++id, diaryId, date'
    })

    // Version 2: Migrate entries to block-based structure
    this.version(2).stores({
      diaries: '++id, title, createdAt',
      entries: '++id, diaryId, date'
    }).upgrade(async tx => {
      // Migrate existing entries from content string to blocks array
      const entries = await tx.table('entries').toArray()

      for (const entry of entries) {
        const legacyEntry = entry as LegacyEntry
        if (typeof legacyEntry.content === 'string') {
          const migratedEntry: Entry = {
            ...legacyEntry,
            blocks: legacyEntry.content.trim()
              ? [{ type: 'text', content: legacyEntry.content }]
              : []
          }
          // Remove old content property and add blocks
          delete (migratedEntry as unknown as Record<string, unknown>).content
          await tx.table('entries').put(migratedEntry)
        }
      }
    })
  }
}

export const db = new LearningDiariesDB()

export function useDiaries() {
  const createDiary = async (diaryData: Omit<Diary, 'id' | 'createdAt'>) => {
    const diary: Omit<Diary, 'id'> = {
      ...diaryData,
      createdAt: new Date()
    }
    return await db.diaries.add(diary)
  }

  const getAllDiaries = async (): Promise<Diary[]> => {
    return await db.diaries.orderBy('createdAt').toArray()
  }

  const getDiary = async (id: number): Promise<Diary | undefined> => {
    return await db.diaries.get(id)
  }

  return {
    createDiary,
    getAllDiaries,
    getDiary
  }
}