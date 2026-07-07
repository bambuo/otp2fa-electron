<template>
  <div class="key-card" :style="{ borderLeftColor: accent }">
    <div class="card-header">
      <span class="card-name">{{ code.name }}</span>
      <button class="btn-del" @click="$emit('remove')">✕</button>
    </div>
    <div class="card-code-row">
      <span class="card-code">{{ code.current }}</span>
      <button class="btn-copy" @click="copyCode" :title="copied ? '已复制' : '复制验证码'">
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
        <div class="timer-bar" :class="barClass" :style="{ width: pct + '%' }"></div>
      </div>
      <span class="timer-text">{{ code.remaining }}s</span>
    </div>
    <div class="card-qr-toggle" @click="toggleQR">
      {{ qrOpen ? '收起二维码 ▲' : '展开二维码 ▼' }}
    </div>
    <div class="card-qr" :class="{ open: qrOpen }">
      <div ref="qrContainer" class="qr-placeholder"></div>
    </div>
  </div>
</template>

<script>
export default {
  props: { code: Object },
  emits: ['remove'],

  data() {
    return { qrOpen: false, qrInstance: null, copied: false }
  },

  computed: {
    pct() {
      return (this.code.remaining / 30) * 100
    },
    barClass() {
      if (this.pct < 20) return 'danger'
      if (this.pct < 40) return 'warning'
      return ''
    },
    accent() {
      const colors = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#fa541c']
      return colors[this.code.id?.charCodeAt(0) % colors.length] || '#1677ff'
    },
  },

  methods: {
    copyCode() {
      navigator.clipboard.writeText(this.code.current).then(() => {
        this.copied = true
        setTimeout(() => { this.copied = false }, 1500)
      }).catch(() => {})
    },

    toggleQR() {
      this.qrOpen = !this.qrOpen
      if (this.qrOpen) this.generateQR()
    },

    async generateQR() {
      if (this.qrInstance) return
      await this.$nextTick()
      const container = this.$refs.qrContainer
      if (!container) return

      const encoded = this.code.id // key ID
      const keys = await window.api.getKeys()
      const key = keys.find(k => k.id === this.code.id)
      if (!key) return

      const secret = await window.api.decodeSecret(key.secret)
      const url = `otpauth://totp/${encodeURIComponent(key.name)}?secret=${secret}&issuer=2FA-App`

      // Generate QR as SVG using QRServer or a small inline generator
      // For now, use Google Charts API (works offline in Electron)
      const img = document.createElement('img')
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`
      img.alt = 'QR Code'
      img.width = 120
      img.height = 120
      img.style.borderRadius = '8px'
      container.innerHTML = ''
      container.appendChild(img)

      this.qrInstance = img
    },
  },
}
</script>

<style scoped>
.key-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
  border-left: 4px solid #1677ff;
  transition: transform 0.15s;
}
.key-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08);
}

.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}

.card-name {
  font-size: 0.82rem; font-weight: 600; color: #595959;
}

.btn-del {
  background: none; border: none; color: #d9d9d9;
  cursor: pointer; font-size: 1rem;
  padding: 2px 6px; border-radius: 6px;
  transition: all 0.15s;
}
.btn-del:hover { color: #ff4d4f; background: #fff1f0; }

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
  color: #22c55e;
  line-height: 1;
}

.btn-copy {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #8c8c8c;
  transition: color 0.15s;
  line-height: 1;
  display: flex;
  align-items: center;
}
.btn-copy:hover {
  color: #22c55e;
}

.card-timer {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 4px;
}

.timer-track {
  flex: 1; height: 4px;
  background: #f0f0f0; border-radius: 2px; overflow: hidden;
}

.timer-bar {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #1677ff, #4096ff);
  transition: width 1s linear;
}
.timer-bar.warning { background: linear-gradient(90deg, #faad14, #ffc53d); }
.timer-bar.danger { background: linear-gradient(90deg, #ff4d4f, #ff7875); }

.timer-text {
  font-size: 0.75rem; font-weight: 500;
  color: #8c8c8c; min-width: 28px; text-align: right;
}

.card-qr-toggle {
  font-size: 0.75rem; color: #1677ff;
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
  background: #f5f5f5;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
</style>
