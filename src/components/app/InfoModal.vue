<script setup>
import { computed } from 'vue';
import Modal from '../Modal.vue';

const props = defineProps({
  kind: {
    type: String,
    required: true,
    validator: value => ['about', 'feedback'].includes(value),
  },
});

const emit = defineEmits(['close', 'open-feedback-link']);

const isAbout = computed(() => props.kind === 'about');
const title = computed(() => (isAbout.value ? '关于' : '反馈'));
</script>

<template>
  <Modal :title="title" @close="emit('close')">
    <template #icon>
      <svg v-if="isAbout" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </template>

    <div v-if="isAbout" class="info-panel">
      <div class="info-title">OTP.2FA</div>
      <div class="info-subtitle">版本 1.0.0</div>
      <div class="info-copy">
        基于时间的一次性密码 (TOTP) 桌面工具<br>
        使用 Electron + Vue 3 构建<br>
        支持 Windows / macOS / Linux
      </div>
    </div>

    <div v-else class="info-panel">
      <div class="info-title">反馈与建议</div>
      <div class="info-subtitle info-paragraph">
        如果你遇到问题或有功能建议，请通过以下方式联系我们
      </div>
      <button class="info-link" @click="emit('open-feedback-link')">GitHub Issues</button>
    </div>
  </Modal>
</template>
