<template>
  <div class="diary-view" :style="{ '--diary-color': diary?.color || '#ff6b6b' }">
    <PageHeader
      :title="diary?.title || 'Loading...'"
      :actions="[
        { label: '← Back', to: '/' },
        { label: 'Add Entry', to: `/diary/${diaryId}/add-entry` }
      ]"
    />

    <div class="notebook-container">
      <div class="notebook">
        <div class="page">
          <div class="page-header" v-if="currentPageEntry">
            <div class="date">{{ currentPageDate }}</div>
          </div>

          <div class="page-content" :class="{ 'has-content': currentPageEntry }">
            <div v-if="currentPageEntry" class="entry-blocks">
              <div
                v-for="(block, blockIndex) in currentPageEntry.blocks"
                :key="blockIndex"
                class="entry-block"
                :class="`block-${block.type}`"
              >
                <!-- Text Block -->
                <div v-if="block.type === 'text'" class="text-block">
                  <div
                    v-for="(line, lineIndex) in getTextLines(block.content)"
                    :key="lineIndex"
                    class="content-line"
                  >
                    {{ line }}
                  </div>
                </div>

                <!-- Image Block -->
                <div v-else-if="block.type === 'image'" class="image-block">
                  <div class="image-container">
                    <img :src="block.content" :alt="block.caption || 'Entry image'" class="entry-image" />
                    <div v-if="block.caption" class="image-caption">{{ block.caption }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="navigation">
        <button
          @click="goToPage(0)"
          :disabled="currentPage === 0"
          class="nav-btn nav-btn--edge fire-button fire-button--small"
          aria-label="First page"
        >
          <span class="nav-icon">⟪</span>
          <span class="nav-label">First</span>
        </button>
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 0"
          class="nav-btn nav-btn--arrow fire-button fire-button--small"
          aria-label="Previous page"
        >
          <span class="nav-icon">‹</span>
          <span class="nav-label">Prev</span>
        </button>
        <div class="page-info">
          <span class="page-current">{{ currentPage + 1 }}</span>
          <span class="page-separator">/</span>
          <span class="page-total">{{ totalPages }}</span>
        </div>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages - 1"
          class="nav-btn nav-btn--arrow fire-button fire-button--small"
          aria-label="Next page"
        >
          <span class="nav-label">Next</span>
          <span class="nav-icon">›</span>
        </button>
        <button
          @click="goToPage(totalPages - 1)"
          :disabled="currentPage >= totalPages - 1"
          class="nav-btn nav-btn--edge fire-button fire-button--small"
          aria-label="Last page"
        >
          <span class="nav-label">Last</span>
          <span class="nav-icon">⟫</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useDiaries } from '@/composables/useDiaries'
import { useEntries } from '@/composables/useEntries'
import type { Diary, Entry } from '@/composables/useDiaries'

const route = useRoute()
const router = useRouter()
const diaryId = route.params.id as string

const { getDiary } = useDiaries()
const { getEntriesForDiary } = useEntries()

const diary = ref<Diary | null>(null)
const entries = ref<Entry[]>([])

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

const totalPages = computed(() => sortedEntries.value.length)

const currentPage = computed(() => {
  const page = Number(route.query.page)
  if (!isNaN(page) && page >= 0 && page < totalPages.value) {
    return page
  }
  return Math.max(0, totalPages.value - 1)
})

const currentPageEntry = computed(() => {
  return sortedEntries.value[currentPage.value] || null
})

const currentPageDate = computed(() => {
  if (currentPageEntry.value) {
    return new Date(currentPageEntry.value.date).toLocaleDateString()
  }
  return ''
})

const getTextLines = (content: string) => {
  return content.split('\n').filter(line => line.trim().length > 0)
}

const goToPage = (page: number) => {
  if (page >= 0 && page < totalPages.value) {
    router.push({ query: { page: page.toString() } })
  }
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
    if (!route.query.page && totalPages.value > 0) {
      router.replace({ query: { page: (totalPages.value - 1).toString() } })
    }
  }
})
</script>

<style scoped>
.diary-view {
  min-height: 100vh;
  padding: 2rem;
}

@media (max-width: 768px) {
  .diary-view {
    padding: 1rem;
  }
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

.entry-blocks {
  line-height: 1.6;
}

.entry-block {
  margin-bottom: 1.5rem;
}

.entry-block:last-child {
  margin-bottom: 0;
}

.text-block .line {
  min-height: 1.6em;
  padding: 0.2rem 0;
  margin-left: 2rem;
  color: #333;
}

.image-block {
  margin: 2rem 0;
  text-align: center;
  width: 100%;
}

.image-container {
  display: inline-block;
  max-width: calc(100% - 3rem);
  margin: 0 auto;
}

.entry-image {
  max-width: 100%;
  max-height: 350px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: block;
  margin: 0 auto;
}

.image-caption {
  margin-top: 0.75rem;
  font-style: italic;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 0 1rem;
}

.navigation {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  flex-wrap: wrap;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  min-width: 44px;
  transition: all 0.2s ease;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.nav-btn:not(:disabled):active {
  transform: translateY(0);
}

.nav-icon {
  font-size: 1.2rem;
  line-height: 1;
  font-weight: bold;
}

.nav-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.page-info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #f5f5dc 0%, #faf8f3 100%);
  border-radius: 8px;
  margin: 0 0.5rem;
  font-weight: 600;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.08);
}

.page-current {
  font-size: 1.25rem;
  color: #ff6b6b;
  font-weight: 700;
}

.page-separator {
  font-size: 1rem;
  color: #999;
  font-weight: 400;
}

.page-total {
  font-size: 1rem;
  color: #666;
  font-weight: 600;
}

@media (max-width: 768px) {
  .navigation {
    padding: 0.75rem 0.5rem;
    gap: 0.35rem;
  }

  .nav-btn {
    padding: 0.5rem 0.75rem;
    min-width: 40px;
  }

  .nav-btn--edge .nav-label {
    display: none;
  }

  .nav-btn--arrow .nav-label {
    display: none;
  }

  .nav-icon {
    font-size: 1.1rem;
  }

  .page-info {
    padding: 0.5rem 1rem;
    margin: 0 0.25rem;
  }

  .page-current {
    font-size: 1.1rem;
  }

  .page-separator,
  .page-total {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .navigation {
    gap: 0.25rem;
    padding: 0.5rem;
  }

  .nav-btn {
    padding: 0.5rem;
    min-width: 36px;
  }

  .page-info {
    padding: 0.4rem 0.75rem;
    margin: 0;
  }
}
</style>
