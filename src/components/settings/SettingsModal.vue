<script setup>
import { computed } from 'vue';
import Modal from '../Modal.vue';

const props = defineProps({
  encryptionAvailable: {
    type: Boolean,
    required: true,
  },
  hideDock: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'update:hideDock']);

const dockHidden = computed({
  get: () => props.hideDock,
  set: value => emit('update:hideDock', value),
});
</script>

<template>
  <Modal title="设置" @close="emit('close')">
    <template #icon>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </template>
    <label>本地加密</label>
    <div class="security-row">
      <span>{{ encryptionAvailable ? '系统加密已启用' : '系统加密不可用' }}</span>
      <span :class="['security-dot', encryptionAvailable ? 'ok' : 'bad']"></span>
    </div>
    <div class="hint">密钥由系统钥匙串/凭据存储保护，界面层不会直接读取明文密钥。</div>

    <div class="toggle-row">
      <span class="toggle-label">隐藏 Dock 图标</span>
      <label class="toggle-switch">
        <input v-model="dockHidden" type="checkbox" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" @click="emit('close')">取消</button>
      <button class="btn-confirm" @click="emit('close')">完成</button>
    </div>
  </Modal>
</template>
