<template>
  <div class="add-entry-view">
    <PageHeader
      :title="diary?.title ? `${isEditMode ? 'Edit' : 'Add'} Entry ${isEditMode ? 'in' : 'to'} ${diary.title}` : isEditMode ? 'Edit Entry' : 'Add Entry'"
      :actions="[
        { label: '← Back', to: `/diary/${diaryId}` }
      ]"
    />

    <div class="entry-form-container">
      <form @submit.prevent="submitEntry" class="entry-form">
        <div class="form-group">
          <label for="date">Date</label>
          <input
            id="date"
            v-model="entryDate"
            type="date"
            required
          />
        </div>

        <div class="form-group">
          <label>Entry Content</label>
          <div class="blocks-editor">
            <div
              v-for="(block, index) in entryBlocks"
              :key="index"
              class="block-item"
            >
              <div class="block-header">
                <span class="block-type">{{ block.type === 'text' ? '📝' : '🖼️' }} {{ block.type }}</span>
                <button type="button" @click="removeBlock(index)" class="remove-block-btn">×</button>
              </div>

              <!-- Text Block -->
              <div v-if="block.type === 'text'" class="text-block">
                <textarea
                  v-model="block.content"
                  rows="4"
                  placeholder="Write your text here..."
                  class="block-textarea"
                ></textarea>
              </div>

              <!-- Image Block -->
              <div v-else-if="block.type === 'image'" class="image-block">
                <div v-if="!block.content" class="image-upload">
                  <input
                    :ref="`fileInput-${index}`"
                    type="file"
                    accept="image/*"
                    @change="handleImageUpload($event, index)"
                    style="display: none"
                  />
                  <button
                    type="button"
                    @click="($refs[`fileInput-${index}`] as HTMLInputElement[])?.[0]?.click()"
                    class="upload-btn fire-button"
                  >
                    📁 Choose Image
                  </button>
                  <p class="upload-hint">Max 2MB • JPEG, PNG, WebP</p>
                </div>
                <div v-else class="image-preview">
                  <img :src="block.content" alt="Entry image" class="preview-image" />
                  <button type="button" @click="removeImage(index)" class="remove-image-btn fire-button">Remove Image</button>
                  <input
                    v-model="block.caption"
                    placeholder="Add a caption (optional)"
                    class="caption-input"
                  />
                </div>
              </div>
            </div>

            <div class="add-block-controls">
              <button type="button" @click="addTextBlock" class="add-block-btn fire-button">
                📝 Add Text
              </button>
              <button type="button" @click="addImageBlock" class="add-block-btn fire-button">
                🖼️ Add Image
              </button>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="goBack" class="cancel-btn fire-button">Cancel</button>
          <button type="submit" :disabled="entryBlocks.length === 0" class="save-btn fire-button fire-button--primary">Save Entry</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useDiaries } from '@/composables/useDiaries'
import { useEntries } from '@/composables/useEntries'
import { ImageUtils } from '@/utils/imageUtils'
import type { Diary, EntryBlock, Entry } from '@/composables/useDiaries'

const route = useRoute()
const router = useRouter()
const diaryId = route.params.id as string
const editDate = route.params.date as string | undefined

const { getDiary } = useDiaries()
const { createEntry, getEntry, updateEntry } = useEntries()

const diary = ref<Diary | null>(null)
const entryDate = ref('')
const entryBlocks = ref<EntryBlock[]>([])
const isUploading = ref(false)
const existingEntry = ref<Entry | null>(null)

const isEditMode = computed(() => !!editDate)

onMounted(async () => {
  const foundDiary = await getDiary(diaryId)
  if (foundDiary) {
    diary.value = foundDiary
  }

  if (isEditMode.value && editDate) {
    // Edit mode: load existing entry
    const entry = await getEntry(diaryId, editDate)
    if (entry) {
      existingEntry.value = entry
      entryDate.value = entry.date
      entryBlocks.value = [...entry.blocks]
    } else {
      alert('Entry not found')
      router.push(`/diary/${diaryId}`)
    }
  } else {
    // Add mode: start with today's date and empty text block
    const today = new Date()
    entryDate.value = today.toISOString().split('T')[0]
    entryBlocks.value = [{ type: 'text', content: '' }]
  }
})

const goBack = () => {
  router.push(`/diary/${diaryId}`)
}

const addTextBlock = () => {
  entryBlocks.value.push({ type: 'text', content: '' })
}

const addImageBlock = () => {
  entryBlocks.value.push({ type: 'image', content: '' })
}

const removeBlock = (index: number) => {
  entryBlocks.value.splice(index, 1)
}

const removeImage = (index: number) => {
  if (entryBlocks.value[index]) {
    entryBlocks.value[index].content = ''
    entryBlocks.value[index].caption = undefined
  }
}

const handleImageUpload = async (event: Event, blockIndex: number) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!ImageUtils.validateImageFile(file)) {
    alert('Please select a valid image file (JPEG, PNG, WebP, GIF)')
    return
  }

  isUploading.value = true
  try {
    const compressedBase64 = await ImageUtils.compressImage(file)
    if (entryBlocks.value[blockIndex]) {
      entryBlocks.value[blockIndex].content = compressedBase64
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    alert(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isUploading.value = false
    // Reset the file input
    const input = event.target as HTMLInputElement
    input.value = ''
  }
}

const submitEntry = async () => {
  try {
    // Filter out empty blocks and convert to plain objects
    const validBlocks = entryBlocks.value
      .filter(block =>
        (block.type === 'text' && block.content.trim()) ||
        (block.type === 'image' && block.content)
      )
      .map(block => ({
        type: block.type,
        content: block.content,
        ...(block.caption && { caption: block.caption })
      }))

    if (validBlocks.length === 0) {
      alert('Please add some content to your entry')
      return
    }

    if (isEditMode.value && existingEntry.value?.id) {
      // Edit mode: update existing entry
      await updateEntry(existingEntry.value.id, {
        blocks: validBlocks,
        date: entryDate.value
      })
    } else {
      // Add mode: create new entry
      await createEntry({
        diaryId: diaryId,
        date: entryDate.value,
        blocks: validBlocks
      })
    }

    // Navigate back to diary view
    router.push(`/diary/${diaryId}`)
  } catch (error) {
    console.error(`Failed to ${isEditMode.value ? 'update' : 'create'} entry:`, error)
    alert(`Failed to ${isEditMode.value ? 'update' : 'save'} entry. Please try again.`)
  }
}
</script>

<style scoped>
.add-entry-view {
  min-height: 100vh;
  padding: 2rem;
}

@media (max-width: 768px) {
  .add-entry-view {
    padding: 1rem;
  }
}

.entry-form-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  padding: 2rem;
}

.entry-form {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #ff6b6b;
}

.blocks-editor {
  border: 2px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  background: #fafafa;
}

.block-item {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #eee;
}

.block-item:last-child {
  margin-bottom: 0;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.block-type {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
  text-transform: capitalize;
}

.remove-block-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.remove-block-btn:hover {
  background: #c82333;
}

.block-textarea {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.block-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
}

.image-upload {
  text-align: center;
  padding: 2rem;
  border: 2px dashed #ddd;
  border-radius: 6px;
  background: #fafafa;
}

.upload-hint {
  font-size: 0.875rem;
  color: #666;
  margin: 0.5rem 0 0 0;
}

.image-preview {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

.caption-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-style: italic;
  text-align: center;
  margin-top: 0.5rem;
}

.caption-input:focus {
  outline: none;
  border-color: #ff6b6b;
}

.add-block-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
