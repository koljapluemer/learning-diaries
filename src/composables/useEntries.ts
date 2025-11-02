import { db } from './useDiaries'
import type { Entry } from './useDiaries'

export function useEntries() {
  const createEntry = async (entryData: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingEntry = await db.entries
      .where('diaryId')
      .equals(entryData.diaryId)
      .and(entry => entry.date === entryData.date)
      .first()

    if (existingEntry) {
      // Append new blocks to existing entry
      const updatedBlocks = [...existingEntry.blocks, ...entryData.blocks]
      return await db.entries.update(existingEntry.id!, {
        blocks: updatedBlocks,
        updatedAt: new Date()
      })
    } else {
      const entryWithTimestamp: Omit<Entry, 'id'> = {
        ...entryData,
        createdAt: new Date()
      }
      return await db.entries.add(entryWithTimestamp)
    }
  }

  const getEntriesForDiary = async (diaryId: string): Promise<Entry[]> => {
    return await db.entries.where('diaryId').equals(diaryId).toArray()
  }

  const getEntry = async (diaryId: string, date: string): Promise<Entry | undefined> => {
    return await db.entries
      .where('diaryId')
      .equals(diaryId)
      .and(entry => entry.date === date)
      .first()
  }

  const updateEntry = async (entryId: string, updates: Partial<Omit<Entry, 'id' | 'createdAt'>>): Promise<number> => {
    return await db.entries.update(entryId, {
      ...updates,
      updatedAt: new Date()
    })
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    return await db.entries.delete(entryId)
  }

  const canModifyEntry = (entry: Entry): boolean => {
    if (!entry.createdAt) return false

    const now = new Date()
    const entryTime = new Date(entry.createdAt)
    const timeDiff = now.getTime() - entryTime.getTime()
    const fifteenMinutes = 15 * 60 * 1000

    return timeDiff <= fifteenMinutes
  }

  return {
    createEntry,
    getEntriesForDiary,
    getEntry,
    updateEntry,
    deleteEntry,
    canModifyEntry
  }
}