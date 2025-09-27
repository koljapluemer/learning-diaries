<template>
  <div class="diary-view">
    <div class="header">
      <router-link to="/" class="back-btn">← Back to Bookshelf</router-link>
      <h1>{{ diary?.title || 'Loading...' }}</h1>
      <button @click="showEntryModal = true" class="add-entry-btn">Add Entry</button>
    </div>

    <div class="notebook-container">
      <div class="notebook">
        <div class="page">
          <div class="page-header" v-if="currentPageEntry">
            <div class="date">{{ currentPageDate }}</div>
          </div>
          <div class="page-content">
            <div v-if="currentPageEntry" class="lines">
              <div
                v-for="line in pageLines"
                :key="line"
                class="line"
                :class="{ 'with-text': getLineContent(line) }"
              >
                {{ getLineContent(line) }}
              </div>
            </div>
            <div v-else class="empty-page">
              <div class="lines">
                <div v-for="line in pageLines" :key="line" class="line"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="navigation">
        <button @click="goToPage(0)" :disabled="currentPage === 0">First</button>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 0">Previous</button>
        <span class="page-info">Page {{ currentPage + 1 }} of {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages - 1">Next</button>
        <button @click="goToPage(totalPages - 1)" :disabled="currentPage >= totalPages - 1">Last</button>
      </div>
    </div>

    <EntryModal
      v-if="showEntryModal"
      :diary-id="diaryId"
      @close="showEntryModal = false"
      @entry-added="onEntryAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import EntryModal from '@/components/EntryModal.vue'
import { useDiaries } from '@/composables/useDiaries'
import { useEntries } from '@/composables/useEntries'
import type { Diary, Entry } from '@/composables/useDiaries'

const route = useRoute()
const diaryId = Number(route.params.id)

const { getDiary } = useDiaries()
const { getEntriesForDiary } = useEntries()

const diary = ref<Diary | null>(null)
const entries = ref<Entry[]>([])
const currentPage = ref(0)
const showEntryModal = ref(false)

const totalPages = computed(() => {
  if (!diary.value) return 0
  const entryDates = entries.value.map(e => e.date)
  const uniqueDates = new Set(entryDates)
  return Math.max(20, uniqueDates.size)
})

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

const currentPageEntry = computed(() => {
  if (currentPage.value < sortedEntries.value.length) {
    return sortedEntries.value[currentPage.value]
  }
  return null
})

const currentPageDate = computed(() => {
  if (currentPageEntry.value) {
    return new Date(currentPageEntry.value.date).toLocaleDateString()
  }
  return ''
})

const pageLines = computed(() => Array.from({ length: 25 }, (_, i) => i))

const getLineContent = (lineIndex: number) => {
  if (!currentPageEntry.value) return ''
  const lines = currentPageEntry.value.content.split('\n')
  return lines[lineIndex] || ''
}

const goToPage = (page: number) => {
  if (page >= 0 && page < totalPages.value) {
    currentPage.value = page
  }
}

const onEntryAdded = async () => {
  showEntryModal.value = false
  await loadEntries()
}

const loadEntries = async () => {
  if (diary.value?.id) {
    entries.value = await getEntriesForDiary(diary.value.id)
  }
}

onMounted(async () => {
  const foundDiary = await getDiary(diaryId)
  if (foundDiary) {
    diary.value = foundDiary
    await loadEntries()
  }
})
</script>

<style scoped>
.diary-view {
  min-height: 100vh;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.back-btn, .add-entry-btn {
  background: var(--accent-color);
  color: white;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.back-btn:hover, .add-entry-btn:hover {
  background: #5a6268;
}

.header h1 {
  font-size: 2rem;
}

.notebook-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.notebook {
  background: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.3);
  padding: 0;
  max-width: 600px;
  width: 100%;
}

.page {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-height: 500px;
  border-left: 4px solid #ff6b6b;
  position: relative;
}

.page::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ffeb3b;
  margin-left: 1.5rem;
}

.page-header {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #ddd;
}

.date {
  font-weight: bold;
  font-size: 1.1rem;
}

.lines {
  line-height: 1.6;
}

.line {
  min-height: 1.6em;
  border-bottom: 1px solid #e0e0e0;
  padding: 0.2rem 0;
  margin-left: 2rem;
  color: #333;
}

.line.with-text {
  border-bottom-color: transparent;
}

.empty-page {
  opacity: 0.5;
}

.navigation {
  display: flex;
  gap: 1rem;
  align-items: center;
  background: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.navigation button {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.navigation button:hover:not(:disabled) {
  background: #5a6268;
}

.navigation button:disabled {
  background: #666;
  cursor: not-allowed;
}

.page-info {
  font-weight: 600;
  margin: 0 1rem;
}
</style>