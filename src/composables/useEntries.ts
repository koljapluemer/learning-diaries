import { db } from './useDiaries'
import type { Entry } from './useDiaries'

export function useEntries() {
  const createEntry = async (entryData: Omit<Entry, 'id'>) => {
    const existingEntry = await db.entries
      .where('diaryId')
      .equals(entryData.diaryId)
      .and(entry => entry.date === entryData.date)
      .first()

    if (existingEntry) {
      const updatedContent = existingEntry.content + '\n' + entryData.content
      return await db.entries.update(existingEntry.id!, { content: updatedContent })
    } else {
      return await db.entries.add(entryData)
    }
  }

  const getEntriesForDiary = async (diaryId: number): Promise<Entry[]> => {
    return await db.entries.where('diaryId').equals(diaryId).toArray()
  }

  const getEntry = async (diaryId: number, date: string): Promise<Entry | undefined> => {
    return await db.entries
      .where('diaryId')
      .equals(diaryId)
      .and(entry => entry.date === date)
      .first()
  }

  return {
    createEntry,
    getEntriesForDiary,
    getEntry
  }
}