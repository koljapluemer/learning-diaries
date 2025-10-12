<template>
  <div class="new-diary-view">
    <div class="container">
      <h1 class="fire-heading fire-heading--md">Create New Learning Diary</h1>

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
            <label for="width">Width: {{ form.width }}px</label>
            <input
              id="width"
              v-model.number="form.width"
              type="range"
              min="20"
              max="200"
              class="slider"
            />
          </div>

          <div class="form-group">
            <label for="height">Height: {{ form.height }}px</label>
            <input
              id="height"
              v-model.number="form.height"
              type="range"
              min="100"
              max="600"
              class="slider"
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

          <div class="form-group">
            <label for="fontSize">Font size: {{ form.fontSize }}px</label>
            <input
              id="fontSize"
              v-model.number="form.fontSize"
              type="range"
              min="6"
              max="48"
              class="slider"
            />
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
            <router-link to="/" class="cancel-btn fire-button fire-button--small">Cancel</router-link>
            <button type="submit" class="create-btn fire-button">Create Diary</button>
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

const generateRandomColor = () => {
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f',
    '#8e44ad', '#27ae60', '#c0392b', '#2980b9', '#d35400',
    '#7f8c8d', '#16a085', '#2c3e50', '#f39800', '#8b4513'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

const generateRandomFontColor = () => {
  const colors = ['#ffffff', '#000000', '#2c3e50', '#ecf0f1', '#34495e', '#f8f9fa']
  return colors[Math.floor(Math.random() * colors.length)]
}

const form = ref({
  title: '',
  width: 60,
  height: 300,
  color: generateRandomColor(),
  fontColor: generateRandomFontColor(),
  fontFamily: 'serif',
  fontSize: 14,
  bold: false,
  italic: false
})

const previewDiary = computed((): Diary => ({
  id: 'preview',
  title: form.value.title || 'Sample Title',
  width: form.value.width,
  height: form.value.height,
  color: form.value.color,
  fontColor: form.value.fontColor,
  fontFamily: form.value.fontFamily,
  fontSize: form.value.fontSize,
  bold: form.value.bold,
  italic: form.value.italic,
  createdAt: new Date()
}))

const createDiary = async () => {
  try {
    await saveDiary({
      title: form.value.title,
      width: form.value.width,
      height: form.value.height,
      color: form.value.color,
      fontColor: form.value.fontColor,
      fontFamily: form.value.fontFamily,
      fontSize: form.value.fontSize,
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
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2.5rem;
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
  border-color: var(--accent-color);
}

input[type="color"] {
  height: 50px;
  padding: 0.25rem;
}

input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  transition: background 0.3s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #5a6268;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  border: none;
  transition: background 0.3s ease;
}

.slider::-moz-range-thumb:hover {
  background: #5a6268;
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
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 200px;
  background: var(--border-color);
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
