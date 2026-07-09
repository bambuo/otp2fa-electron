<script setup>
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';

defineProps({
  keyCount: {
    type: Number,
    required: true,
  },
  avatarData: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'account-click',
  'close-window',
  'minimize-window',
  'open-about',
  'open-feedback',
  'open-settings',
]);

const menuOpen = shallowRef(false);
const menuRef = useTemplateRef('menu');

function closeMenu() {
  menuOpen.value = false;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function handleDocumentClick(event) {
  if (!menuRef.value?.contains(event.target)) {
    closeMenu();
  }
}

function emitMenuAction(eventName) {
  closeMenu();
  emit(eventName);
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <div class="brand-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <span class="badge">{{ keyCount }} 个密钥</span>
      <div class="header-actions">
        <div ref="menu" class="menu-wrapper">
          <button class="header-btn" title="更多" @click.stop="toggleMenu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
          <div v-if="menuOpen" class="dropdown" @click.stop>
            <div class="dropdown-item" @click="emitMenuAction('open-about')">关于</div>
            <div class="dropdown-item" @click="emitMenuAction('open-feedback')">反馈</div>
          </div>
        </div>
        <button class="header-btn" title="设置" @click="emit('open-settings')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="avatar-btn disabled" title="账号 (开发中)" @click="emit('account-click')">
          <template v-if="avatarData">
            <img :src="avatarData" alt="avatar" class="avatar-thumb" />
          </template>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      </div>
    </div>
    <div class="titlebar-controls">
      <button class="ctl-btn" title="最小化" @click="emit('minimize-window')">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor"/></svg>
      </button>
      <button class="ctl-btn ctl-close" title="关闭" @click="emit('close-window')">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5"/></svg>
      </button>
    </div>
  </div>
</template>
