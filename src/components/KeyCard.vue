<script setup>
import { computed, onUnmounted, shallowRef } from 'vue';
import { electronApi } from '../services/electronApi';

const props = defineProps({
  code: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['remove']);

const ACCENT_COLORS = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#fa541c'];

const qrOpen = shallowRef(false);
const qrData = shallowRef('');
const qrError = shallowRef('');
const copied = shallowRef(false);
let copiedTimerId = 0;

const pct = computed(() => (props.code.remaining / 30) * 100);

const barClass = computed(() => {
  if (pct.value < 20) return 'danger';
  if (pct.value < 40) return 'warning';
  return '';
});

const accent = computed(() => {
  const colorIndex = props.code.id?.charCodeAt(0) % ACCENT_COLORS.length;
  return ACCENT_COLORS[colorIndex] || ACCENT_COLORS[0];
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code.current);
    copied.value = true;
    window.clearTimeout(copiedTimerId);
    copiedTimerId = window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch (_) {}
}

async function generateQR() {
  if (qrData.value) return;
  qrError.value = '';
  try {
    qrData.value = await electronApi.getQrCode(props.code.id);
  } catch (error) {
    qrError.value = error.message || '生成失败';
  }
}

function toggleQR() {
  qrOpen.value = !qrOpen.value;
  if (qrOpen.value) {
    generateQR();
  }
}

onUnmounted(() => {
  window.clearTimeout(copiedTimerId);
});
</script>

<template>
  <div class="key-card" :style="{ borderLeftColor: accent }">
    <div class="card-header">
      <span class="card-name">{{ code.name }}</span>
      <button class="btn-del" @click="emit('remove')">✕</button>
    </div>
    <div class="card-code-row">
      <span class="card-code">{{ code.current }}</span>
      <button class="btn-copy" :title="copied ? '已复制' : '复制验证码'" @click="copyCode">
        <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
    <div class="card-timer">
      <div class="timer-track">
        <div class="timer-bar" :class="barClass" :style="{ width: `${pct}%` }"></div>
      </div>
      <span class="timer-text">{{ code.remaining }}s</span>
    </div>
    <div class="card-qr-toggle" @click="toggleQR">
      {{ qrOpen ? '收起二维码 ▲' : '展开二维码 ▼' }}
    </div>
    <div class="card-qr" :class="{ open: qrOpen }">
      <div class="qr-placeholder">
        <img v-if="qrData" :src="qrData" alt="QR Code" class="qr-img" />
        <span v-else-if="qrError" class="qr-error">{{ qrError }}</span>
        <span v-else class="qr-loading">生成中</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.key-card {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  border: 1px solid var(--glass-border);
  border-left: 4px solid #1677ff;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}
.key-card:hover {
  transform: translateY(-1px);
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
}

.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}

.card-name {
  font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);
}

.btn-del {
  background: rgba(255,255,255,0.32); border: 1px solid transparent; color: rgba(100,116,139,0.52);
  cursor: pointer; font-size: 1rem;
  padding: 2px 6px; border-radius: 6px;
  transition: all 0.15s;
}
.btn-del:hover {
  color: var(--danger);
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.14);
}

.card-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.card-code {
  font-size: 1.8rem; font-weight: 700;
  font-family: "SF Mono", "Fira Code", "Courier New", monospace;
  letter-spacing: 6px;
  color: var(--success);
  line-height: 1;
}

.btn-copy {
  background: rgba(255,255,255,0.32);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  padding: 4px;
  color: var(--text-secondary);
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  line-height: 1;
  display: flex;
  align-items: center;
}
.btn-copy:hover {
  color: var(--success);
  background: rgba(34,197,94,0.08);
  border-color: rgba(34,197,94,0.14);
}

.card-timer {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 4px;
}

.timer-track {
  flex: 1; height: 4px;
  background: rgba(100,116,139,0.14); border-radius: 2px; overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(15,23,42,0.06);
}

.timer-bar {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--primary), #4096ff);
  transition: width 1s linear;
}
.timer-bar.warning { background: linear-gradient(90deg, var(--warning), #fbbf24); }
.timer-bar.danger { background: linear-gradient(90deg, var(--danger), #fb7185); }

.timer-text {
  font-size: 0.75rem; font-weight: 500;
  color: var(--text-secondary); min-width: 28px; text-align: right;
}

.card-qr-toggle {
  font-size: 0.75rem; color: var(--primary);
  cursor: pointer; user-select: none; padding: 4px 0;
}

.card-qr {
  overflow: hidden; max-height: 0;
  transition: max-height 0.35s ease;
  display: flex; justify-content: center;
}
.card-qr.open { max-height: 150px; padding-top: 10px; }

.qr-placeholder {
  width: 120px; height: 120px;
  background: rgba(255,255,255,0.48);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}
.qr-img {
  width: 120px;
  height: 120px;
  border-radius: 8px;
}
.qr-loading,
.qr-error {
  font-size: 0.72rem;
  color: var(--text-secondary);
}
.qr-error {
  color: var(--danger);
}
</style>
