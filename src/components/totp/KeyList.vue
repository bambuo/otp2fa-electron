<script setup>
import KeyCard from '../KeyCard.vue';

defineProps({
  codes: {
    type: Array,
    required: true,
  },
  keyCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['remove']);
</script>

<template>
  <div class="body-scroll">
    <div v-if="keyCount === 0" class="empty">
      <div class="empty-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <p>暂无密钥，点击右下角 + 添加</p>
    </div>
    <div v-else class="card-list">
      <KeyCard
        v-for="code in codes"
        :key="code.id"
        :code="code"
        @remove="emit('remove', code.id)"
      />
    </div>
  </div>
</template>
