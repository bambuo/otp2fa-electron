<script setup>
import { onMounted, onUnmounted } from 'vue';

defineProps({
  title: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close']);

function handleKeydown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-box">
        <h2>
          <slot name="icon"></slot>
          {{ title }}
        </h2>
        <slot />
      </div>
    </div>
  </teleport>
</template>
