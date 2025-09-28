<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Add New Entry</h3>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>

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
                    class="upload-btn"
                  >
                    📁 Choose Image
                  </button>
                  <p class="upload-hint">Max 2MB • JPEG, PNG, WebP</p>
                </div>
                <div v-else class="image-preview">
                  <img :src="block.content" alt="Entry image" class="preview-image" />
                  <button type="button" @click="removeImage(index)" class="remove-image-btn">Remove Image</button>
                  <input
                    v-model="block.caption"
                    placeholder="Add a caption (optional)"
                    class="caption-input"
                  />
                </div>
              </div>
            </div>

            <div class="add-block-controls">
              <button type="button" @click="addTextBlock" class="add-block-btn">
                📝 Add Text
              </button>
              <button type="button" @click="addImageBlock" class="add-block-btn">
                🖼️ Add Image
              </button>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
          <button type="submit" :disabled="entryBlocks.length === 0" class="save-btn">Save Entry</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEntries } from '@/composables/useEntries'
import { ImageUtils } from '@/utils/imageUtils'
import type { EntryBlock } from '@/composables/useDiaries'

interface Props {
  diaryId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  entryAdded: []
}>()

const { createEntry } = useEntries()

const entryDate = ref('')
const entryBlocks = ref<EntryBlock[]>([])
const isUploading = ref(false)

onMounted(() => {
  const today = new Date()
  entryDate.value = today.toISOString().split('T')[0]
  // Start with one text block
  entryBlocks.value = [{ type: 'text', content: '' }]
})

const closeModal = () => {
  emit('close')
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

    await createEntry({
      diaryId: props.diaryId,
      date: entryDate.value,
      blocks: validBlocks
    })
    emit('entryAdded')
  } catch (error) {
    console.error('Failed to create entry:', error)
    alert('Failed to save entry. Please try again.')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #666;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.entry-form {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
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
  border-color: var(--accent-color);
}

.image-upload {
  text-align: center;
  padding: 2rem;
  border: 2px dashed #ddd;
  border-radius: 6px;
  background: #fafafa;
}

.upload-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.upload-btn:hover {
  background: #5a6268;
}

.upload-hint {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
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

.remove-image-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.remove-image-btn:hover {
  background: #c82333;
}

.caption-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-style: italic;
  text-align: center;
}

.caption-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.add-block-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.add-block-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.3s ease;
}

.add-block-btn:hover {
  background: #218838;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-btn,
.save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
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

.save-btn {
  background: var(--accent-color);
  color: white;
}

.save-btn:hover {
  background: #5a6268;
}
</style>