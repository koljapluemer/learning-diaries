<template>
  <div class="bookshelf-view">
    <div class="header">
      <h1>Learning Diaries</h1>
      <router-link to="/new-diary" class="add-diary-btn">Add New Diary</router-link>
    </div>
    <div class="bookshelf">
      <BookSpine
        v-for="diary in diaries"
        :key="diary.id"
        :diary="diary"
        @click="openDiary(diary.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookSpine from '@/components/BookSpine.vue'
import { useDiaries } from '@/composables/useDiaries'
import type { Diary } from '@/composables/useDiaries'

const router = useRouter()
const { getAllDiaries } = useDiaries()
const diaries = ref<Diary[]>([])

onMounted(async () => {
  diaries.value = await getAllDiaries()
})

const openDiary = (diaryId: number | undefined) => {
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

.add-diary-btn {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 8px;
}

.bookshelf {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0;
}
</style>