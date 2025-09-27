<template>
  <div class="new-diary-view">
    <div class="container">
      <h1>Create New Learning Diary</h1>

      <div class="form-preview-layout">
        <form @submit.prevent="createDiary" class="diary-form">
          <div class="form-group">
            <label for="title">Title (max 64 characters)</label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              maxlength="64"
              required
            />
            <small>{{ form.title.length }}/64</small>
          </div>

          <div class="form-group">
            <label for="minDays">Minimum days (min 20)</label>
            <input
              id="minDays"
              v-model.number="form.minDays"
              type="number"
              min="20"
              required
            />
          </div>

          <div class="form-group">
            <label for="priority">Priority (0-100)</label>
            <input
              id="priority"
              v-model.number="form.priority"
              type="number"
              min="0"
              max="100"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="color">Book spine color</label>
              <input
                id="color"
                v-model="form.color"
                type="color"
              />
            </div>

            <div class="form-group">
              <label for="fontColor">Font color</label>
              <input
                id="fontColor"
                v-model="form.fontColor"
                type="color"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="fontFamily">Font family</label>
            <select id="fontFamily" v-model="form.fontFamily">
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
              <option value="monospace">Monospace</option>
              <option value="cursive">Cursive</option>
              <option value="fantasy">Fantasy</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="form.bold" />
                Bold
              </label>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" v-model="form.italic" />
                Italic
              </label>
            </div>
          </div>

          <div class="form-actions">
            <router-link to="/" class="cancel-btn">Cancel</router-link>
            <button type="submit" class="create-btn">Create Diary</button>
          </div>
        </form>

        <div class="preview-section">
          <h3>Preview</h3>
          <div class="preview-container">
            <BookSpine :diary="previewDiary" class="preview-spine" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import BookSpine from '@/components/BookSpine.vue'
import { useDiaries } from '@/composables/useDiaries'
import type { Diary } from '@/composables/useDiaries'

const router = useRouter()
const { createDiary: saveDiary } = useDiaries()

const form = ref({
  title: '',
  minDays: 20,
  priority: 50,
  color: '#8b4513',
  fontColor: '#ffffff',
  fontFamily: 'serif',
  bold: false,
  italic: false
})

const previewDiary = computed((): Diary => ({
  id: 0,
  title: form.value.title || 'Sample Title',
  minDays: form.value.minDays,
  priority: form.value.priority,
  color: form.value.color,
  fontColor: form.value.fontColor,
  fontFamily: form.value.fontFamily,
  bold: form.value.bold,
  italic: form.value.italic,
  createdAt: new Date()
}))

const createDiary = async () => {
  try {
    await saveDiary({
      title: form.value.title,
      minDays: form.value.minDays,
      priority: form.value.priority,
      color: form.value.color,
      fontColor: form.value.fontColor,
      fontFamily: form.value.fontFamily,
      bold: form.value.bold,
      italic: form.value.italic
    })
    router.push('/')
  } catch (error) {
    console.error('Failed to create diary:', error)
  }
}
</script>

<style scoped>
.new-diary-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f5dc 0%, #deb887 100%);
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #2c1810;
  margin-bottom: 2rem;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.form-preview-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 3rem;
  align-items: start;
}

.diary-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c1810;
}

input, select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus, select:focus {
  outline: none;
  border-color: #8b4513;
}

input[type="color"] {
  height: 50px;
  padding: 0.25rem;
}

input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

small {
  color: #666;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-btn, .create-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.create-btn {
  background: #8b4513;
  color: white;
  border: none;
  cursor: pointer;
}

.create-btn:hover {
  background: #654321;
}

.preview-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  position: sticky;
  top: 2rem;
}

.preview-section h3 {
  margin-bottom: 1.5rem;
  color: #2c1810;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 200px;
  background: linear-gradient(135deg, #8b4513 0%, #d2691e 100%);
  border-radius: 8px;
  padding: 2rem;
}

.preview-spine {
  transform-origin: bottom center;
}

@media (max-width: 768px) {
  .form-preview-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .preview-section {
    position: static;
  }
}
</style>