<template>
  <div class="bookshelf-view">
    <div class="header">
      <h1>Learning Diaries</h1>
      <div class="header-actions">
        <router-link to="/settings" class="settings-btn">Settings</router-link>
        <router-link to="/new-diary" class="add-diary-btn">Add New Diary</router-link>
      </div>
    </div>
    <div class="bookshelf" ref="bookshelfRef" :style="{
      '--shelf-thickness': `${SHELF_THICKNESS}px`,
      '--bookcase-min-height': `${MIN_BOOKSHELF_HEIGHT}px`,
      height: `${bookshelfHeight}px`
    }">
      <div v-for="(diary, index) in randomizedDiaries" :key="diary.id ?? `diary-${index}`" class="book-slot"
        :style="bookLayouts[index] ? { left: `${bookLayouts[index].left}px`, bottom: `${bookLayouts[index].bottom}px` } : {}">
        <BookSpine :diary="diary" @click="openDiary(diary.id)" />
      </div>
      <div v-for="(shelfBottom, index) in shelfPositions" :key="`shelf-${index}`" class="shelf"
        :style="{ bottom: `${shelfBottom}px` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BookSpine from '@/components/BookSpine.vue'
import { useDiaries } from '@/composables/useDiaries'
import type { Diary } from '@/composables/useDiaries'

const SHELF_THICKNESS = 28
const SHELF_GAP = 48
const BOOK_GAP = 0
const MIN_BOOKSHELF_HEIGHT = 320

const router = useRouter()
const { getAllDiaries } = useDiaries()
const diaries = ref<Diary[]>([])
const randomizedDiaries = ref<Diary[]>([])
const bookLayouts = ref<Array<{ left: number; bottom: number }>>([])
const shelfPositions = ref<number[]>([])
const bookshelfHeight = ref(MIN_BOOKSHELF_HEIGHT)
const bookshelfRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const shuffleDiaries = (items: Diary[]) => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const recalcLayout = () => {
  const container = bookshelfRef.value
  const diariesList = randomizedDiaries.value

  if (!container || diariesList.length === 0) {
    bookLayouts.value = []
    shelfPositions.value = []
    bookshelfHeight.value = MIN_BOOKSHELF_HEIGHT
    return
  }

  const containerWidth = container.clientWidth
  if (containerWidth === 0) {
    return
  }

  const positions: Array<{ left: number; bottom: number }> = new Array(diariesList.length)
  const shelves: Array<{ base: number; height: number }> = []

  let shelfIndex = 0
  let currentX = 0
  let currentBase = 0

  shelves[0] = { base: currentBase, height: 0 }

  diariesList.forEach((diary, index) => {
    const bookWidth = Math.max(diary.width, 1)
    const bookHeight = Math.max(diary.height, 1)

    if (currentX > 0 && currentX + bookWidth > containerWidth) {
      currentBase += shelves[shelfIndex].height + SHELF_THICKNESS + SHELF_GAP
      shelfIndex += 1
      currentX = 0
      shelves[shelfIndex] = { base: currentBase, height: 0 }
    }

    const shelf = shelves[shelfIndex]
    shelf.height = Math.max(shelf.height, bookHeight)

    positions[index] = {
      left: currentX,
      bottom: shelf.base + SHELF_THICKNESS
    }

    currentX += bookWidth + BOOK_GAP
  })

  const populatedShelves = shelves.slice(0, shelfIndex + 1)
  shelfPositions.value = populatedShelves.map(({ base }) => base)

  const lastShelf = populatedShelves[populatedShelves.length - 1]
  if (lastShelf) {
    const computedHeight = lastShelf.base + lastShelf.height + SHELF_THICKNESS
    bookshelfHeight.value = Math.max(computedHeight, MIN_BOOKSHELF_HEIGHT)
  } else {
    bookshelfHeight.value = MIN_BOOKSHELF_HEIGHT
  }

  bookLayouts.value = positions
}

onMounted(async () => {
  diaries.value = await getAllDiaries()
  randomizedDiaries.value = shuffleDiaries(diaries.value)
  await nextTick()
  recalcLayout()

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

watch(diaries, async (value) => {
  randomizedDiaries.value = shuffleDiaries(value)
  await nextTick()
  recalcLayout()
})

watch(randomizedDiaries, async () => {
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.settings-btn,
.add-diary-btn {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: white;
  transition: background 0.3s ease;
}

.settings-btn:hover,
.add-diary-btn:hover {
  background: #5a6268;
}

.settings-btn {
  background: #6c757d;
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

.shelf {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--shelf-thickness);
  background-image: url('/src/assets/wood.jpg');
  background-size: cover;
  background-repeat: repeat;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.35),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35),
    0 12px 20px rgba(0, 0, 0, 0.25);
  z-index: 1;
}
</style>
