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
          <label for="content">Entry Content</label>
          <textarea
            id="content"
            v-model="entryContent"
            rows="8"
            placeholder="Write your learning entry here..."
            required
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save Entry</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEntries } from '@/composables/useEntries'

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
const entryContent = ref('')

onMounted(() => {
  const today = new Date()
  entryDate.value = today.toISOString().split('T')[0]
})

const closeModal = () => {
  emit('close')
}

const submitEntry = async () => {
  try {
    await createEntry({
      diaryId: props.diaryId,
      date: entryDate.value,
      content: entryContent.value
    })
    emit('entryAdded')
  } catch (error) {
    console.error('Failed to create entry:', error)
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
  color: #2c1810;
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
  color: #2c1810;
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
  border-color: #8b4513;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
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
  background: #8b4513;
  color: white;
}

.save-btn:hover {
  background: #654321;
}
</style>