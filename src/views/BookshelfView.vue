<template>
  <div class="bookshelf-view">
    <div class="header">
      <h1>Learning Diaries</h1>
      <div class="header-actions">
        <router-link to="/settings" class="settings-btn">Settings</router-link>
        <router-link to="/new-diary" class="add-diary-btn">Add New Diary</router-link>
      </div>
    </div>
    <div class="bookshelf-container">
      <div class="bookshelf">
        <BookSpine
          v-for="diary in diaries"
          :key="diary.id"
          :diary="diary"
          @click="openDiary(diary.id)"
        />
      </div>
      <div class="wooden-shelf"></div>
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

.settings-btn, .add-diary-btn {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: white;
  transition: background 0.3s ease;
}

.settings-btn:hover, .add-diary-btn:hover {
  background: #5a6268;
}

.settings-btn {
  background: #6c757d;
}

.bookshelf-container {
  position: relative;
  display: inline-block;
}

.bookshelf {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0;
  position: relative;
  z-index: 1;
}

.wooden-shelf {
  width: 100%;
  height: 80px;
  background-image: url('/src/assets/wood.jpg');
  background-repeat: repeat;
  background-size: 200px 200px;
  border-radius: 4px;
  box-shadow:
    0 4px 8px rgba(0,0,0,0.2),
    inset 0 2px 4px rgba(255,255,255,0.1),
    inset 0 -2px 4px rgba(0,0,0,0.2);
  position: relative;
  margin-top: -10px;
}
</style>