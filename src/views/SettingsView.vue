<template>
  <div class="settings-view">
    <div class="header">
      <router-link to="/" class="back-btn fire-button fire-button--small">← Back to Bookshelf</router-link>
      <h1 class="fire-heading fire-heading--md">Settings</h1>
      <div></div>
    </div>

    <div class="settings-container">
      <!-- Dexie Cloud Sync Section -->
      <section class="settings-section">
        <h2>Cloud Sync</h2>

        <div v-if="!isLoggedIn" class="auth-section">
          <p>Sign in to sync your learning diaries across devices.</p>
          <button @click="handleLogin" :disabled="isLoading" class="connect-btn fire-button">
            {{ isLoading ? 'Connecting...' : 'Sign In' }}
          </button>
        </div>

        <div v-else class="connected-section">
          <div class="account-info">
            <div class="account-details">
              <p><strong>Signed in as:</strong> {{ currentUser?.email || 'User' }}</p>
              <p><strong>Status:</strong> <span class="sync-status">{{ syncStatus }}</span></p>
            </div>
            <button @click="handleLogout" :disabled="isLoading" class="disconnect-btn fire-button fire-button--small">
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
          <button @click="exportToFile" :disabled="isLoading" class="export-btn fire-button">
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
            <button @click="fileInput?.click()" :disabled="isLoading" class="import-btn fire-button">
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/composables/useDiaries'
import { backupService } from '@/services/backup'
import type { UserLogin, SyncState } from 'dexie-cloud-addon'
import type { BehaviorSubject, Subscription } from 'rxjs'

const router = useRouter()

type CloudAuthStreams = {
  currentUser: BehaviorSubject<UserLogin | null>
  syncState: BehaviorSubject<SyncState>
}

const cloud = db.cloud as typeof db.cloud & CloudAuthStreams

type CloudUser = UserLogin | null

const currentUser = ref<CloudUser>(cloud.currentUser?.value ?? null)
const currentUserId = ref<string | null>(currentUser.value?.userId ?? null)
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
  const phase = cloud.syncState?.value?.phase
  if (phase === 'error') return 'Error'
  if (phase === 'pushing' || phase === 'pulling' || phase === 'not-in-sync') return 'Syncing...'
  if (phase === 'offline') return 'Offline'
  return 'Connected'
})

const refreshAuthState = () => {
  currentUser.value = cloud.currentUser?.value ?? null
  currentUserId.value = currentUser.value?.userId ?? null
}

const subscriptions: Subscription[] = []

const subscribeToAuth = () => {
  subscriptions.push(
    cloud.currentUser.subscribe(user => {
      currentUser.value = user ?? null
      currentUserId.value = user?.userId ?? null
    })
  )
}

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
    await cloud.login()
    refreshAuthState()
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
    await cloud.logout()
    refreshAuthState()
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
  refreshAuthState()
  subscribeToAuth()
  await loadStats()
})

onBeforeUnmount(() => {
  subscriptions.forEach(sub => sub.unsubscribe())
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
