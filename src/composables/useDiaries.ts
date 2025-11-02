import Dexie, { type Table } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'

export interface Diary {
  id?: string
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
  id?: string
  diaryId: string
  date: string
  blocks: EntryBlock[]
  createdAt: Date
  updatedAt?: Date
}

export class LearningDiariesDB extends Dexie {
  diaries!: Table<Diary>
  entries!: Table<Entry>

  constructor() {
    super('LearningDiariesDB', { addons: [dexieCloud] })

    this.version(1).stores({
      diaries: '@id, title, createdAt',
      entries: '@id, diaryId, date'
    })

    // Version 2: Add createdAt and updatedAt to entries
    this.version(2).stores({
      diaries: '@id, title, createdAt',
      entries: '@id, diaryId, date, createdAt'
    }).upgrade(tx => {
      // Migrate existing entries to have createdAt timestamp
      return tx.table('entries').toCollection().modify(entry => {
        if (!entry.createdAt) {
          entry.createdAt = new Date()
        }
      })
    })
  }
}

export const db = new LearningDiariesDB()

// Configure Dexie Cloud
db.cloud.configure({
  databaseUrl: import.meta.env.VITE_DEXIE_CLOUD_URL,
  requireAuth: false // Allows offline-first usage
})

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

  const getDiary = async (id: string): Promise<Diary | undefined> => {
    return await db.diaries.get(id)
  }

  return {
    createDiary,
    getAllDiaries,
    getDiary
  }
}