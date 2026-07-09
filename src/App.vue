<script setup>
import { onMounted, shallowRef, watch } from 'vue';
import AppTitlebar from './components/app/AppTitlebar.vue';
import InfoModal from './components/app/InfoModal.vue';
import SettingsModal from './components/settings/SettingsModal.vue';
import AddKeyModal from './components/totp/AddKeyModal.vue';
import KeyList from './components/totp/KeyList.vue';
import { useSecuritySettings } from './composables/useSecuritySettings';
import { useToast } from './composables/useToast';
import { useTotpKeys } from './composables/useTotpKeys';
import { electronApi } from './services/electronApi';

const showAddKey = shallowRef(false);
const showSettings = shallowRef(false);
const showAbout = shallowRef(false);
const showFeedback = shallowRef(false);
const addKeyError = shallowRef('');
const avatarData = shallowRef('');

const { keys, codes, addKey, removeKey } = useTotpKeys();
const { message: toastMessage, visible: toastVisible, showToast } = useToast();
const {
  encryptionAvailable,
  hideDock,
  loadSettings,
  setDockHidden,
} = useSecuritySettings();

watch(showSettings, isOpen => {
  if (isOpen) {
    loadSettings().catch(() => {});
  }
});

onMounted(() => {
  electronApi.getAvatar()
    .then(savedAvatar => {
      avatarData.value = savedAvatar || '';
    })
    .catch(() => {});
});

async function handleAddKey(payload) {
  addKeyError.value = '';
  try {
    await addKey(payload);
    showAddKey.value = false;
  } catch (error) {
    addKeyError.value = error.message || '添加失败';
  }
}

async function handleRemoveKey(id) {
  try {
    await removeKey(id);
  } catch (_) {}
}

async function handleDockUpdate(nextValue) {
  try {
    await setDockHidden(nextValue);
  } catch (_) {}
}

function openFeedbackLink() {
  electronApi.openFeedbackIssues().catch(() => {});
}

function minimizeWindow() {
  electronApi.minimizeWindow().catch(() => {});
}

function closeWindow() {
  electronApi.closeWindow().catch(() => {});
}
</script>

<template>
  <div class="app">
    <AppTitlebar
      :key-count="keys.length"
      :avatar-data="avatarData"
      @account-click="showToast('登录功能开发中')"
      @close-window="closeWindow"
      @minimize-window="minimizeWindow"
      @open-about="showAbout = true"
      @open-feedback="showFeedback = true"
      @open-settings="showSettings = true"
    />

    <KeyList
      :codes="codes"
      :key-count="keys.length"
      @remove="handleRemoveKey"
    />

    <button class="fab" @click="showAddKey = true">+</button>

    <AddKeyModal
      v-if="showAddKey"
      :error="addKeyError"
      @close="showAddKey = false"
      @submit="handleAddKey"
    />

    <SettingsModal
      v-if="showSettings"
      :encryption-available="encryptionAvailable"
      :hide-dock="hideDock"
      @close="showSettings = false"
      @update:hide-dock="handleDockUpdate"
    />

    <InfoModal
      v-if="showAbout"
      kind="about"
      @close="showAbout = false"
    />

    <InfoModal
      v-if="showFeedback"
      kind="feedback"
      @close="showFeedback = false"
      @open-feedback-link="openFeedbackLink"
    />
  </div>

  <transition name="toast-fade">
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </transition>
</template>

<style>
/* ═══════════════════════════════ Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --app-bg-start: #eef5ff;
  --app-bg-mid: #f7fbf7;
  --app-bg-end: #fff7ef;
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-bg-strong: rgba(255, 255, 255, 0.78);
  --glass-bg-soft: rgba(255, 255, 255, 0.42);
  --glass-border: rgba(255, 255, 255, 0.68);
  --glass-border-subtle: rgba(148, 163, 184, 0.18);
  --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  --glass-shadow: 0 18px 46px rgba(31, 41, 55, 0.11), 0 3px 12px rgba(31, 41, 55, 0.06);
  --glass-shadow-soft: 0 10px 28px rgba(31, 41, 55, 0.08), 0 1px 4px rgba(31, 41, 55, 0.05);
  --text-primary: #1f2937;
  --text-secondary: #64748b;
  --primary: #1677ff;
  --primary-soft: rgba(22, 119, 255, 0.1);
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}

html,
body,
#app {
  background: transparent;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  background:
    linear-gradient(145deg, rgba(238,245,255,0.78) 0%, rgba(247,251,247,0.7) 48%, rgba(255,247,239,0.76) 100%);
  color: var(--text-primary);
  user-select: none;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.48), rgba(255,255,255,0.12));
  backdrop-filter: blur(10px) saturate(118%);
  -webkit-backdrop-filter: blur(10px) saturate(118%);
}

/* ─── Titlebar ─── */
.titlebar {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  overflow: visible;
  z-index: 20;
  -webkit-app-region: drag;
  background: var(--glass-bg-soft);
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border-bottom: 1px solid var(--glass-border-subtle);
  box-shadow: var(--glass-highlight);
}

.titlebar-drag {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 6px 16px;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 12px 6px 0;
  -webkit-app-region: no-drag;
}

.ctl-btn {
  width: 36px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: background 0.15s;
}
.ctl-btn:hover { background: rgba(255,255,255,0.58); color: var(--text-primary); }
.ctl-close:hover { background: rgba(239,68,68,0.9); color: #fff; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.menu-wrapper {
  position: relative;
  -webkit-app-region: no-drag;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border-radius: 8px;
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  border: 1px solid var(--glass-border);
  min-width: 100px;
  z-index: 100;
  overflow: visible;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

.dropdown::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  margin-left: -4px;
  width: 8px;
  height: 8px;
  background: rgba(255,255,255,0.82);
  border-left: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-border);
  transform: rotate(45deg);
}

.dropdown-item {
  padding: 9px 16px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s;
  -webkit-app-region: no-drag;
}

.dropdown-item:hover {
  background: rgba(22,119,255,0.08);
  color: var(--primary);
}

.dropdown-item + .dropdown-item {
  border-top: 1px solid var(--glass-border-subtle);
}

.brand-icon {
  width: 26px; height: 26px;
  background: linear-gradient(135deg, rgba(22,119,255,0.92), rgba(64,150,255,0.82));
  box-shadow: var(--glass-highlight), 0 8px 20px rgba(22,119,255,0.18);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 0.75rem; font-weight: 700;
}


.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.badge {
  font-size: 0.7rem; color: var(--text-secondary);
  background: rgba(255,255,255,0.54); padding: 2px 10px; border-radius: 8px;
  border: 1px solid var(--glass-border-subtle);
  box-shadow: var(--glass-highlight);
}

.header-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: 8px; cursor: pointer; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all 0.15s;
  -webkit-app-region: no-drag;
}
.header-btn:hover { background: rgba(255,255,255,0.58); color: var(--text-primary); }

.avatar-btn {
  width: 30px; height: 30px; border-radius: 50%;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; color: var(--text-secondary);
  transition: all 0.15s; overflow: hidden; margin-left: 2px;
  background: none;
  -webkit-app-region: no-drag;
}
.avatar-btn:hover { color: var(--primary); background: var(--primary-soft); }
.avatar-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.avatar-btn.disabled:hover { color: var(--text-secondary); background: none; }
.avatar-btn.logged { }

.avatar-thumb {
  width: 100%; height: 100%; object-fit: cover;
}

/* ═══════════════════════════════ Body / Scroll */
.body-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 10px;
}
.body-scroll::-webkit-scrollbar { width: 4px; }
.body-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.25); border-radius: 2px; }

.card-list {
  padding: 8px 16px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ═══════════════════════════════ Empty */
.empty {
  text-align: center;
  padding: 56px 20px;
  margin: 10px 16px;
  color: var(--text-secondary);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  backdrop-filter: blur(16px) saturate(145%);
  -webkit-backdrop-filter: blur(16px) saturate(145%);
}
.empty-icon { font-size: 2.6rem; margin-bottom: 10px; display: flex; justify-content: center; }
.empty p { font-size: 0.85rem; }

/* ═══════════════════════════════ FAB */
.fab {
  position: fixed;
  bottom: 20px; right: 20px;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(22,119,255,0.9), rgba(64,150,255,0.78));
  border: 1px solid rgba(255,255,255,0.46); color: #fff;
  font-size: 1.5rem; font-weight: 300;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(22,119,255,0.26), var(--glass-highlight);
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
  z-index: 5;
}
.fab:hover { transform: scale(1.06); box-shadow: 0 18px 38px rgba(22,119,255,0.34), var(--glass-highlight); }

/* ═══════════════════════════════ Modal overlay + glass */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,0.22);
  backdrop-filter: blur(8px) saturate(120%);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal-box {
  position: relative;
  border-radius: 8px;
  padding: 24px 22px 18px;
  width: 340px;
  max-width: 90vw;
  animation: modalIn 0.25s ease;

  background: var(--glass-bg-strong);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  overflow: hidden;
}

@keyframes modalIn {
  from { transform: scale(0.95) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-box h2 {
  font-size: 1.05rem; font-weight: 600;
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 8px;
  position: relative;
  z-index: 1;
}

.modal-box label {
  display: block;
  font-size: 0.78rem; font-weight: 500;
  color: var(--text-secondary); margin-bottom: 4px;
  position: relative;
  z-index: 1;
}

.modal-box input, .modal-box textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  font-size: 0.88rem;
  outline: none;
  margin-bottom: 14px;
  transition: border-color 0.2s;
  font-family: inherit;
  position: relative;
  z-index: 1;
  background: rgba(255,255,255,0.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
}

.modal-box textarea {
  resize: vertical; min-height: 50px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.82rem;
}

.security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: rgba(255,255,255,0.48);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  position: relative;
  z-index: 1;
}

.security-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.security-dot.ok { background: var(--success); }
.security-dot.bad { background: var(--danger); }

.modal-box input:focus, .modal-box textarea:focus {
  border-color: rgba(22,119,255,0.58);
  box-shadow: 0 0 0 3px rgba(22,119,255,0.1);
}

.modal-box .hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: -8px;
  margin-bottom: 14px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
}

.modal-box .hint strong { color: var(--text-primary); }
.modal-box .err {
  font-size: 0.75rem;
  color: var(--danger);
  margin-top: -8px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

/* Toggle switch */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.toggle-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input { display: none; }

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(100,116,139,0.22);
  border-radius: 8px;
  transition: 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  bottom: 2px;
  background: rgba(255,255,255,0.88);
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle-switch input:checked + .toggle-slider { background: var(--primary); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

.modal-actions {
  display: flex; gap: 10px; margin-top: 2px;
  position: relative;
  z-index: 1;
}

.modal-actions button {
  flex: 1; padding: 9px; border-radius: 8px;
  font-size: 0.85rem; font-weight: 500;
  cursor: pointer; border: none;
  transition: all 0.15s;
}

.btn-cancel {
  background: rgba(255,255,255,0.54);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border-subtle);
}
.btn-cancel:hover { background: rgba(255,255,255,0.72); color: var(--text-primary); }
.btn-confirm {
  background: linear-gradient(135deg, rgba(22,119,255,0.92), rgba(64,150,255,0.82));
  color: #fff;
  box-shadow: 0 8px 20px rgba(22,119,255,0.18), var(--glass-highlight);
}
.btn-confirm:hover { background: linear-gradient(135deg, rgba(22,119,255,0.96), rgba(64,150,255,0.9)); }

.modal-footer-link {
  text-align: center;
  margin-top: 12px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.modal-footer-link:hover { color: var(--primary); }

/* Avatar section */
.avatar-section { text-align: center; padding: 4px 0 12px; position: relative; z-index: 1; }

.avatar-edit {
  position: relative;
  width: 60px; height: 60px;
  margin: 0 auto 4px;
  cursor: pointer;
  display: inline-block;
}

.avatar-img {
  width: 60px; height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(22,119,255,0.92), rgba(64,150,255,0.82));
  display: flex; align-items: center; justify-content: center;
  transition: filter 0.2s;
}

.avatar-img img {
  width: 100%; height: 100%; object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;
  font-size: 1.2rem;
}

.avatar-edit:hover .avatar-overlay { opacity: 1; }
.avatar-edit:hover .avatar-img { filter: brightness(0.85); }

.avatar-hint { font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 8px; }
.avatar-email { font-weight: 600; font-size: 0.9rem; }
.avatar-status { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }

.avatar-links {
  margin-top: 14px;
  display: flex; gap: 8px; justify-content: center;
  font-size: 0.75rem;
}
.avatar-links span { cursor: pointer; color: var(--primary); }
.avatar-links .sep { color: rgba(100,116,139,0.28); cursor: default; }
.avatar-links .logout { color: var(--danger); }

.info-panel {
  text-align: center;
  padding: 8px 0;
  position: relative;
  z-index: 1;
}

.info-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
}

.info-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.info-paragraph {
  line-height: 1.6;
  margin-bottom: 14px;
}

.info-copy {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.info-link {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(22,119,255,0.82);
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  border: 1px solid rgba(255,255,255,0.42);
  color: #fff;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.85rem;
  box-shadow: 0 14px 30px rgba(22,119,255,0.24), var(--glass-highlight);
  z-index: 200;
  white-space: nowrap;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
