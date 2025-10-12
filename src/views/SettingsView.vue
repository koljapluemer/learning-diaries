<template>
  <div class="settings-view">
    <div class="header">
      <router-link to="/" class="back-btn">← Back to Bookshelf</router-link>
      <h1>Settings</h1>
      <div></div>
    </div>

    <div class="settings-container">
      <!-- Dexie Cloud Sync Section -->
      <section class="settings-section">
        <h2>Cloud Sync</h2>

        <div v-if="!isLoggedIn" class="auth-section">
          <p>Sign in to sync your learning diaries across devices.</p>
          <button @click="handleLogin" :disabled="isLoading" class="connect-btn">
            {{ isLoading ? 'Connecting...' : 'Sign In' }}
          </button>
        </div>

        <div v-else class="connected-section">
          <div class="account-info">
            <div class="account-details">
              <p><strong>Signed in as:</strong> {{ currentUser?.value?.email || 'User' }}</p>
              <p><strong>Status:</strong> <span class="sync-status">{{ syncStatus }}</span></p>
            </div>
            <button @click="handleLogout" :disabled="isLoading" class="disconnect-btn">
              Sign Out
            </button>
          </div>
          <p class="sync-info">Your data syncs automatically across all your devices.</p>
        </div>
      </section>

      <!-- Data Overview Section -->
      <section class="settings-section">
        <h2>Data Overview</h2>
        <div v-if="stats" class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{{ stats.diaries }}</span>
            <span class="stat-label">Learning Diaries</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.entries }}</span>
            <span class="stat-label">Journal Entries</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.databaseSize }}</span>
            <span class="stat-label">Database Size</span>
          </div>
        </div>
      </section>

      <!-- Local Backup Section -->
      <section class="settings-section">
        <h2>Local Backup</h2>
        <div class="local-backup-controls">
          <button @click="exportToFile" :disabled="isLoading" class="export-btn">
            Export to File
          </button>
          <div class="import-section">
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="importFromFile"
              style="display: none"
            />
            <button @click="fileInput?.click()" :disabled="isLoading" class="import-btn">
              Import from File
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="status-message" :class="statusType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/composables/useDiaries'
import { backupService } from '@/services/backup'

const router = useRouter()

const currentUser = ref(db.cloud.currentUser)
const currentUserId = ref(db.cloud.currentUserId)
const isLoggedIn = computed(() => !!currentUserId.value)

const stats = ref({
  diaries: 0,
  entries: 0,
  databaseSize: ''
})

const isLoading = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')
const fileInput = ref<HTMLInputElement>()

const syncStatus = computed(() => {
  if (db.cloud.syncState?.value?.phase === 'error') return 'Error'
  if (db.cloud.syncState?.value?.phase === 'pushing') return 'Syncing...'
  if (db.cloud.syncState?.value?.phase === 'pulling') return 'Syncing...'
  return 'Connected'
})

const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}

const loadStats = async () => {
  try {
    stats.value = await backupService.getStats()
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const handleLogin = async () => {
  isLoading.value = true
  try {
    await db.cloud.login()
    currentUser.value = db.cloud.currentUser
    currentUserId.value = db.cloud.currentUserId
    showStatus('Successfully signed in')
  } catch (error) {
    console.error('Login failed:', error)
    showStatus(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  isLoading.value = true
  try {
    await db.cloud.logout()
    showStatus('Signed out successfully')
  } catch (error) {
    console.error('Logout failed:', error)
    showStatus(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const exportToFile = async () => {
  isLoading.value = true
  try {
    await backupService.exportToFile()
    showStatus('Export completed successfully')
  } catch (error) {
    showStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const importFromFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!confirm('This will replace all your current data with the imported backup. Are you sure?')) {
    return
  }

  isLoading.value = true
  try {
    await backupService.importFromFile(file)
    await loadStats()
    showStatus('Import completed successfully')
    router.push('/')
  } catch (error) {
    showStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Watch for user state changes (Dexie Cloud handles this reactively)

onMounted(async () => {
  await loadStats()
})
</script>

<style scoped>
.settings-view {
  min-height: 100vh;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.back-btn {
  background: var(--accent-color);
  color: white;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.3s ease;
}

.back-btn:hover {
  background: #5a6268;
}

.header h1 {
  font-size: 2rem;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.settings-section h2 {
  margin-bottom: 1.5rem;
  color: var(--text-color);
  font-size: 1.5rem;
}

.auth-section {
  text-align: center;
}

.auth-section p {
  margin-bottom: 1.5rem;
  color: #666;
}

.connect-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.connect-btn:hover:not(:disabled) {
  background: #357ae8;
}

.connect-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.account-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.account-details p {
  margin-bottom: 0.5rem;
  color: #666;
}

.sync-status {
  color: #28a745;
  font-weight: 600;
}

.sync-info {
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
}

.disconnect-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.disconnect-btn:hover:not(:disabled) {
  background: #c82333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: var(--bg-color);
  border-radius: 8px;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: var(--accent-color);
}

.stat-label {
  display: block;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.local-backup-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.export-btn, .import-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.export-btn:hover:not(:disabled), .import-btn:hover:not(:disabled) {
  background: #5a6268;
}

.import-section {
  display: flex;
  align-items: center;
}

.status-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
}

.status-message.success {
  background: #28a745;
}

.status-message.error {
  background: #dc3545;
}

button:disabled {
  background: #ccc !important;
  cursor: not-allowed !important;
}

@media (max-width: 768px) {
  .account-info {
    flex-direction: column;
    gap: 1rem;
  }

  .local-backup-controls {
    flex-direction: column;
  }
}
</style>
