import Dexie, { type Table } from 'dexie'

export interface Diary {
  id?: number
  title: string
  minDays: number
  priority: number
  color: string
  fontColor: string
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  createdAt: Date
}

export interface Entry {
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
    this.version(1).stores({
      diaries: '++id, title, createdAt',
      entries: '++id, diaryId, date'
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