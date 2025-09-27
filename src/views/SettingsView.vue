<template>
  <div class="settings-view">
    <div class="header">
      <router-link to="/" class="back-btn">← Back to Bookshelf</router-link>
      <h1>Settings</h1>
      <div></div>
    </div>

    <div class="settings-container">
      <!-- Google Drive Section -->
      <section class="settings-section">
        <h2>Google Drive Backup</h2>

        <div v-if="!authStatus.connected" class="auth-section">
          <p>Connect your Google account to backup your learning diaries to Google Drive.</p>
          <button @click="signIn" :disabled="isLoading" class="connect-btn">
            {{ isLoading ? 'Connecting...' : 'Connect Google Drive' }}
          </button>
        </div>

        <div v-else class="connected-section">
          <div class="account-info">
            <div class="account-details">
              <p><strong>Connected as:</strong> {{ authStatus.email }}</p>
              <p v-if="authStatus.lastBackup"><strong>Last backup:</strong> {{ authStatus.lastBackup }}</p>
              <p v-else><strong>Last backup:</strong> Never</p>
            </div>
            <button @click="signOut" :disabled="isLoading" class="disconnect-btn">
              Disconnect
            </button>
          </div>

          <div class="backup-controls">
            <div class="manual-controls">
              <button @click="backup" :disabled="isLoading" class="backup-btn">
                {{ isLoading ? 'Backing up...' : 'Backup Now' }}
              </button>
              <button @click="restore" :disabled="isLoading" class="restore-btn">
                {{ isLoading ? 'Restoring...' : 'Restore from Google Drive' }}
              </button>
            </div>

            <div class="auto-backup-control">
              <label class="toggle-label">
                <input
                  type="checkbox"
                  v-model="autoBackupEnabled"
                  @change="toggleAutoBackup"
                  :disabled="isLoading"
                />
                <span class="toggle-text">Enable automatic daily backups</span>
              </label>
            </div>
          </div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { googleAuth } from '@/services/googleAuth'
import { googleDrive } from '@/services/googleDrive'
import { backupService } from '@/services/backup'

const router = useRouter()

const authStatus = ref({
  connected: false,
  email: undefined as string | undefined,
  lastBackup: undefined as string | undefined,
  autoBackup: false
})

const stats = ref({
  diaries: 0,
  entries: 0,
  databaseSize: ''
})

const isLoading = ref(false)
const autoBackupEnabled = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')
const fileInput = ref<HTMLInputElement>()

const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}

const loadAuthStatus = async () => {
  try {
    const status = await googleAuth.getStatus()
    authStatus.value = {
      connected: status.connected,
      email: status.email,
      lastBackup: status.lastBackup,
      autoBackup: status.autoBackup || false
    }
    autoBackupEnabled.value = status.autoBackup || false
  } catch (error) {
    console.error('Failed to load auth status:', error)
  }
}

const loadStats = async () => {
  try {
    stats.value = await backupService.getStats()
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const signIn = async () => {
  isLoading.value = true
  try {
    await googleAuth.signIn()
    await loadAuthStatus()
    showStatus('Successfully connected to Google Drive')
  } catch (error) {
    showStatus(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const signOut = async () => {
  isLoading.value = true
  try {
    await googleAuth.signOut()
    await loadAuthStatus()
    showStatus('Disconnected from Google Drive')
  } catch (error) {
    showStatus(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const backup = async () => {
  isLoading.value = true
  try {
    await googleDrive.backup()
    await loadAuthStatus()
    showStatus('Backup completed successfully')
  } catch (error) {
    showStatus(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const restore = async () => {
  if (!confirm('This will replace all your current data with the backup from Google Drive. Are you sure?')) {
    return
  }

  isLoading.value = true
  try {
    await googleDrive.restore()
    await loadStats()
    showStatus('Restore completed successfully')
    router.push('/')
  } catch (error) {
    showStatus(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const toggleAutoBackup = async () => {
  try {
    await googleAuth.updateAutoBackup(autoBackupEnabled.value)
    showStatus(`Auto-backup ${autoBackupEnabled.value ? 'enabled' : 'disabled'}`)
  } catch (error) {
    showStatus(`Failed to update auto-backup: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    autoBackupEnabled.value = !autoBackupEnabled.value
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

onMounted(async () => {
  await Promise.all([loadAuthStatus(), loadStats()])
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
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.account-details p {
  margin-bottom: 0.5rem;
  color: #666;
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

.backup-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.manual-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.backup-btn, .restore-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.backup-btn:hover:not(:disabled), .restore-btn:hover:not(:disabled) {
  background: #5a6268;
}

.restore-btn {
  background: #28a745;
}

.restore-btn:hover:not(:disabled) {
  background: #218838;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-text {
  color: #666;
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

  .manual-controls {
    flex-direction: column;
  }

  .local-backup-controls {
    flex-direction: column;
  }
}
</style>