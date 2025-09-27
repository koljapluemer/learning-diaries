<template>
  <div
    class="book-spine"
    :style="spineStyle"
    @click="$emit('click')"
  >
    <div class="spine-text" :style="textStyle">
      {{ diary.title }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Diary } from '@/composables/useDiaries'

interface Props {
  diary: Diary
}

const props = defineProps<Props>()
defineEmits<{
  click: []
}>()

const spineWidth = computed(() => {
  const baseWidth = 40
  const extraDays = Math.max(0, props.diary.minDays - 20)
  return baseWidth + (extraDays * 2)
})

const spineHeight = computed(() => {
  const minHeight = 240
  const maxHeight = 600
  const heightRange = maxHeight - minHeight
  const priorityRatio = props.diary.priority / 100
  return minHeight + (heightRange * priorityRatio)
})

const spineStyle = computed(() => ({
  width: `${spineWidth.value}px`,
  height: `${spineHeight.value}px`,
  backgroundColor: props.diary.color,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  borderRadius: '0 4px 4px 0',
  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.2), 2px 2px 8px rgba(0,0,0,0.3)',
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const textStyle = computed(() => ({
  color: props.diary.fontColor,
  fontFamily: props.diary.fontFamily,
  fontWeight: props.diary.bold ? 'bold' : 'normal',
  fontStyle: props.diary.italic ? 'italic' : 'normal',
  fontSize: `${props.diary.fontSize}px`,
  writingMode: 'vertical-rl' as const,
  textOrientation: 'mixed' as const,
  transform: 'rotate(180deg)',
  textAlign: 'center' as const,
  lineHeight: '1.2',
  padding: '8px 4px',
  wordBreak: 'break-word' as const,
  maxHeight: '90%',
  overflow: 'hidden'
}))
</script>

<style scoped>
.book-spine {
  flex-shrink: 0;
}

.book-spine:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: inset -2px 0 4px rgba(0,0,0,0.3), 4px 4px 12px rgba(0,0,0,0.4);
}

.spine-text {
  user-select: none;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}
</style>