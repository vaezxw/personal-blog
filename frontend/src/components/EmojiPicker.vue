<template>
  <div class="emoji-picker" ref="rootRef">
    <button
      type="button"
      class="emoji-trigger btn ghost small"
      :aria-expanded="open"
      :aria-label="label"
      :title="label"
      @click.stop="toggle"
    >
      🙂
    </button>
    <div v-if="open" class="emoji-panel geek-surface" role="dialog" :aria-label="label" @click.stop>
      <div class="emoji-grid">
        <button
          v-for="emoji in emojis"
          :key="emoji"
          type="button"
          class="emoji-btn"
          @click="pick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  label: { type: String, default: 'Emoji' },
})

const emit = defineEmits(['pick'])

const open = ref(false)
const rootRef = ref(null)

const emojis = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '🤩',
  '😎', '🤔', '😅', '😢', '😭', '😡', '👍', '👎',
  '👏', '🙏', '🔥', '✨', '🎉', '💯', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🖤', '🤍', '💪', '🤝',
  '👀', '💡', '📌', '✅', '❌', '⭐', '🌟', '🍀',
]

function toggle() {
  open.value = !open.value
}

function pick(emoji) {
  emit('pick', emoji)
  open.value = false
}

function onDocPointer(event) {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointer))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointer))
</script>

<style scoped>
.emoji-picker {
  position: relative;
  display: inline-flex;
}

.emoji-trigger {
  min-width: 2.4rem;
  padding: 0.3rem 0.55rem;
  font-size: 1.05rem;
  line-height: 1;
}

.emoji-panel {
  position: absolute;
  bottom: calc(100% + 0.45rem);
  left: 0;
  z-index: 30;
  width: min(280px, 72vw);
  padding: 0.55rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  background: var(--surface);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 0.2rem;
}

.emoji-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 0.35rem;
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.emoji-btn:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
</style>
