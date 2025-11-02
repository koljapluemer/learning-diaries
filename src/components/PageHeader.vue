<template>
  <header class="page-header">
    <h1 class="fire-heading fire-heading--md">{{ title }}</h1>
    <div class="header-actions">
      <router-link
        v-for="(action, index) in actions"
        :key="index"
        :to="action.to"
        class="fire-button"
      >
        {{ action.label }}
      </router-link>
    </div>
  </header>
</template>

<script setup lang="ts">
export interface HeaderAction {
  label: string
  to: string
}

interface Props {
  title: string
  actions: HeaderAction[]
}

defineProps<Props>()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #f5f5dc 0%, #faf8f3 100%);
  padding: 1.5rem 2rem;
  border-radius: 8px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions > * {
    width: 100%;
    text-align: center;
  }

  .page-header .fire-heading--md {
    font-size: 1.75rem;
  }
}
</style>
