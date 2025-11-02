<template>
  <div class="bookshelf-view">
    <PageHeader
      title="Learning Diaries"
      :actions="[
        { label: 'Settings', to: '/settings' },
        { label: 'Add New Diary', to: '/new-diary' }
      ]"
    />
    <div class="bookshelf" ref="bookshelfRef" :style="{
      '--shelf-thickness': `${SHELF_THICKNESS}px`,
      '--bookcase-min-height': `${MIN_BOOKSHELF_HEIGHT}px`,
      height: `${bookshelfHeight}px`
    }">
      <div v-for="(diary, index) in randomizedActiveDiaries" :key="diary.id ?? `active-${index}`" class="book-slot"
        :style="activeBookLayouts[index]
          ? {
            left: `${activeBookLayouts[index].left}px`,
            bottom: `${activeBookLayouts[index].bottom}px`
          }
          : {}">
        <BookSpine :diary="diary" @click="openDiary(diary.id)" />
      </div>
      <div v-for="(diary, index) in randomizedInactiveDiaries" :key="diary.id ?? `inactive-${index}`" class="book-flat"
        @click="openDiary(diary.id)" :style="inactiveBookLayouts[index]
          ? {
            left: `${inactiveBookLayouts[index].left}px`,
            bottom: `${inactiveBookLayouts[index].bottom}px`,
            width: `${inactiveBookLayouts[index].width}px`,
            height: `${inactiveBookLayouts[index].thickness}px`,
            backgroundColor: diary.color,
            color: diary.fontColor,
            fontFamily: diary.fontFamily,
            fontSize: `${diary.fontSize}px`,
            fontWeight: diary.bold ? 'bold' : 'normal',
            fontStyle: diary.italic ? 'italic' : 'normal',
            zIndex: inactiveBookLayouts[index].zIndex
          }
          : {}">
        <span class="book-flat-title">{{ diary.title }}</span>
      </div>
      <div v-if="inactiveShelfBottom !== null" class="shelf shelf-inactive"
        :style="{ bottom: `${inactiveShelfBottom}px` }" />
      <div v-for="(shelfBottom, index) in shelfPositions" :key="`shelf-${index}`" class="shelf"
        :style="{ bottom: `${shelfBottom}px` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BookSpine from '@/components/BookSpine.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useDiaries } from '@/composables/useDiaries'
import { useEntries } from '@/composables/useEntries'
import type { Diary } from '@/composables/useDiaries'

const SHELF_THICKNESS = 28
const SHELF_GAP = 48
const MIN_BOOKSHELF_HEIGHT = 320
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const INACTIVE_STACK_GAP = 72

const router = useRouter()
const { getAllDiaries } = useDiaries()
const { getEntriesForDiary } = useEntries()

const diaries = ref<Diary[]>([])
const activeDiaries = ref<Diary[]>([])
const inactiveDiaries = ref<Diary[]>([])
const randomizedActiveDiaries = ref<Diary[]>([])
const randomizedInactiveDiaries = ref<Diary[]>([])
const activeBookLayouts = ref<Array<{ left: number; bottom: number }>>([])
const inactiveBookLayouts = ref<Array<{ left: number; bottom: number; width: number; thickness: number; zIndex: number }>>([])
const shelfPositions = ref<number[]>([])
const inactiveShelfBottom = ref<number | null>(null)
const bookshelfHeight = ref(MIN_BOOKSHELF_HEIGHT)
const bookshelfRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let groupingToken = 0

const shuffleDiaries = (items: Diary[]) => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const shuffleInactiveWithBias = (items: Diary[]) => {
  if (items.length <= 1) {
    return [...items]
  }

  const scored = items.map(diary => {
    const sizeScore = diary.width * 2 + diary.height
    const noise = (Math.random() - 0.5) * sizeScore * 0.6
    return { diary, score: sizeScore + noise }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map(entry => entry.diary)
}

const updateDiaryGroups = async (list: Diary[]) => {
  const token = ++groupingToken

  if (list.length === 0) {
    activeDiaries.value = []
    inactiveDiaries.value = []
    randomizedActiveDiaries.value = []
    randomizedInactiveDiaries.value = []
    await nextTick()
    recalcLayout()
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoffDate = new Date(today.getTime() - RECENT_WINDOW_MS)
  cutoffDate.setHours(0, 0, 0, 0)

  const groups = await Promise.all(list.map(async (diary) => {
    if (!diary.id) {
      return { diary, isRecent: false }
    }

    const entries = await getEntriesForDiary(diary.id)
    if (entries.length === 0) {
      return { diary, isRecent: false }
    }

    // Find the latest entry date by comparing date strings directly
    const latestEntryDate = entries.reduce((latest, entry) => {
      return entry.date > latest ? entry.date : latest
    }, '')

    if (!latestEntryDate) {
      return { diary, isRecent: false }
    }

    // Parse the date in local timezone and normalize to midnight
    const entryDate = new Date(latestEntryDate + 'T00:00:00')
    entryDate.setHours(0, 0, 0, 0)

    return {
      diary,
      isRecent: entryDate >= cutoffDate
    }
  }))

  if (token !== groupingToken) {
    return
  }

  const recent = groups.filter(group => group.isRecent).map(group => group.diary)
  const stale = groups.filter(group => !group.isRecent).map(group => group.diary)

  activeDiaries.value = recent
  inactiveDiaries.value = stale
  randomizedActiveDiaries.value = shuffleDiaries(recent)
  randomizedInactiveDiaries.value = shuffleInactiveWithBias(stale)

  await nextTick()
  recalcLayout()
}

const recalcLayout = () => {
  const container = bookshelfRef.value
  const active = randomizedActiveDiaries.value
  const inactive = randomizedInactiveDiaries.value

  if (!container) {
    activeBookLayouts.value = []
    inactiveBookLayouts.value = []
    shelfPositions.value = []
    inactiveShelfBottom.value = null
    bookshelfHeight.value = MIN_BOOKSHELF_HEIGHT
    return
  }

  const containerWidth = container.clientWidth
  if (containerWidth === 0) {
    return
  }

  const inactiveLayouts: Array<{
    left: number
    bottom: number
    width: number
    thickness: number
    zIndex: number
  }> = []
  let stackHeight = 0

  if (inactive.length > 0) {
    const sortedInactive = [...inactive]
    if (sortedInactive.length > 1) {
      let widestIndex = 0
      let widestWidth = -Infinity
      sortedInactive.forEach((diary, index) => {
        if (diary.height > widestWidth) {
          widestWidth = diary.height
          widestIndex = index
        }
      })
      if (widestIndex !== 0) {
        const [baseDiary] = sortedInactive.splice(widestIndex, 1)
        sortedInactive.unshift(baseDiary)
      }
    }

    let currentHeight = SHELF_THICKNESS
    let baseCenter = 0

    sortedInactive.forEach((diary, index) => {
      const coverWidth = Math.min(Math.max(diary.height, 1), containerWidth)
      const thickness = Math.max(diary.width, 1)
      let left: number

      if (index === 0) {
        left = 0
        baseCenter = coverWidth / 2
      } else {
        const jitter = Math.random() * 40 - 20
        const centeredLeft = baseCenter - coverWidth / 2 + jitter
        left = Math.min(Math.max(centeredLeft, 0), Math.max(containerWidth - coverWidth, 0))
      }

      const bottom = currentHeight
      inactiveLayouts.push({
        left,
        bottom,
        width: coverWidth,
        thickness,
        zIndex: 10 + index
      })
      currentHeight += thickness
    })

    stackHeight = currentHeight
    inactiveShelfBottom.value = 0
  } else {
    inactiveShelfBottom.value = null
  }

  inactiveBookLayouts.value = inactiveLayouts

  const positions: Array<{ left: number; bottom: number }> = new Array(active.length)
  const shelves: Array<{ base: number; height: number }> = []

  if (active.length > 0) {
    let currentX = 0
    let currentBase = stackHeight > 0 ? stackHeight + INACTIVE_STACK_GAP : 0

    shelves.push({ base: currentBase, height: 0 })

    active.forEach((diary, index) => {
      const bookWidth = Math.max(diary.width, 1)
      const bookHeight = Math.max(diary.height, 1)

      if (currentX > 0 && currentX + bookWidth > containerWidth) {
        const lastShelf = shelves[shelves.length - 1]
        currentBase += lastShelf.height + SHELF_THICKNESS + SHELF_GAP
        currentX = 0
        shelves.push({ base: currentBase, height: 0 })
      }

      const shelf = shelves[shelves.length - 1]
      shelf.height = Math.max(shelf.height, bookHeight)

      positions[index] = {
        left: currentX,
        bottom: shelf.base + SHELF_THICKNESS
      }

      currentX += bookWidth
    })
  }

  shelfPositions.value = shelves.map(({ base }) => base)

  const lastShelf = shelves.length > 0 ? shelves[shelves.length - 1] : null
  const activeHeight = lastShelf ? lastShelf.base + lastShelf.height + SHELF_THICKNESS : 0

  const totalHeight = Math.max(activeHeight, stackHeight)
  bookshelfHeight.value = Math.max(totalHeight, MIN_BOOKSHELF_HEIGHT)
  activeBookLayouts.value = positions
}

onMounted(async () => {
  diaries.value = await getAllDiaries()
  await updateDiaryGroups(diaries.value)

  if (bookshelfRef.value) {
    resizeObserver = new ResizeObserver(() => {
      recalcLayout()
    })
    resizeObserver.observe(bookshelfRef.value)
  }

  window.addEventListener('orientationchange', recalcLayout)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('orientationchange', recalcLayout)
})

watch(diaries, (value) => {
  void updateDiaryGroups(value)
})

watch([randomizedActiveDiaries, randomizedInactiveDiaries], async () => {
  await nextTick()
  recalcLayout()
})

const openDiary = (diaryId: string | undefined) => {
  if (diaryId) {
    router.push(`/diary/${diaryId}`)
  }
}
</script>

<style scoped>
.bookshelf-view {
  padding: 2rem;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .bookshelf-view {
    padding: 1rem;
  }
}

.bookshelf {
  position: relative;
  min-height: var(--bookcase-min-height, 320px);
  padding: 1.5rem 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  overflow: hidden;
}

.book-slot {
  position: absolute;
  transition: transform 0.2s ease;
  z-index: 2;
}

.book-slot:hover {
  transform: translateY(4px);
}

.book-flat {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.45),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35),
    0 8px 18px rgba(0, 0, 0, 0.4);
  padding: 0 18px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.book-flat:hover {
  transform: translateY(-4px);
}

.book-flat-title {
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  user-select: none;
}

.shelf {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--shelf-thickness);
  background-image: url('/wood.jpg');
  background-size: cover;
  background-repeat: repeat;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.35),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35),
    0 12px 20px rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.shelf-inactive {
  filter: saturate(0.85) brightness(0.9);
}
</style>
