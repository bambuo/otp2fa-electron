<script setup>
import { shallowRef, useTemplateRef } from 'vue';
import Modal from '../Modal.vue';

defineProps({
  error: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'submit']);

const name = shallowRef('');
const secret = shallowRef('');
const localError = shallowRef('');
const secretInputRef = useTemplateRef('secretInput');

function focusSecretInput() {
  secretInputRef.value?.focus();
}

function submit() {
  localError.value = '';
  if (!name.value.trim()) {
    localError.value = '请输入名称';
    return;
  }
  if (!secret.value.trim()) {
    localError.value = '请输入密钥';
    return;
  }
  emit('submit', {
    name: name.value,
    secret: secret.value,
  });
}
</script>

<template>
  <Modal title="添加密钥" @close="emit('close')">
    <template #icon>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5M20 7l-3-3"></path>
      </svg>
    </template>
    <label>名称</label>
    <input v-model="name" placeholder="例如: GitHub" @keydown.enter="focusSecretInput" />
    <label>密钥 (Base32)</label>
    <input ref="secretInput" v-model="secret" placeholder="例如: 5NCZCPKP66WZQYNT" @keydown.enter="submit" />
    <div v-if="localError || error" class="err">{{ localError || error }}</div>
    <div class="modal-actions">
      <button class="btn-cancel" @click="emit('close')">取消</button>
      <button class="btn-confirm" @click="submit">确认</button>
    </div>
  </Modal>
</template>
