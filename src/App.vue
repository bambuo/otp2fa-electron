<template>
  <div class="app">
    <!-- Header -->
    <div class="header">
        <div class="brand-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
      <div class="header-right">
        <span class="badge">{{ keys.length }} 个密钥</span>
        <button class="header-btn" title="设置" @click="showSettings = true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="avatar-btn" :class="{ logged: avatarData }" title="账号" @click="showLogin = true">
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

    <!-- Key List -->
    <div class="body-scroll">
      <div v-if="keys.length === 0" class="empty">
        <div class="empty-icon">🔐</div>
        <p>暂无密钥，点击右下角 + 添加</p>
      </div>
      <div v-else class="card-list">
        <KeyCard
          v-for="code in codes"
          :key="code.id"
          :code="code"
          @remove="removeKey(code.id)"
        />
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="showAddKey = true">+</button>

    <!-- Modal: Add Key -->
    <Modal v-if="showAddKey" title="添加密钥" @close="showAddKey = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5M20 7l-3-3"></path>
        </svg>
      </template>
      <label>名称</label>
      <input v-model="addName" placeholder="例如: GitHub" @keydown.enter="$refs.addSecret?.focus()" />
      <label>密钥 (Base32)</label>
      <input ref="addSecret" v-model="addSecret" placeholder="例如: 5NCZCPKP66WZQYNT" @keydown.enter="confirmAdd" />
      <div v-if="addError" class="err">{{ addError }}</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showAddKey = false">取消</button>
        <button class="btn-confirm" @click="confirmAdd">确认</button>
      </div>
    </Modal>

    <!-- Modal: Settings -->
    <Modal v-if="showSettings" title="设置" @close="showSettings = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </template>
      <label>本地加密盐 (Salt)</label>
      <textarea v-model="saltValue" rows="2" placeholder="32位以上十六进制字符串"></textarea>
      <div class="hint">
        <strong>盐的作用：</strong>密钥用 AES-256-GCM 加密后保存。即使文件泄露，没有 salt 也无法还原。<br />
        <strong>⚠️ 盐仅保存在本机，不会上传。</strong> 更换设备时需手动迁移。
      </div>
      <div v-if="saltError" class="err">{{ saltError }}</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showSettings = false">取消</button>
        <button class="btn-confirm" @click="confirmSalt">保存</button>
      </div>
    </Modal>

    <!-- Modal: Login (not logged) -->
    <Modal v-if="showLogin && !loggedIn" title="账号" @close="showLogin = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </template>
      <label>邮箱</label>
      <input v-model="loginEmail" placeholder="you@example.com" />
      <label>密码</label>
      <input type="password" v-model="loginPass" placeholder="输入密码" @keydown.enter="mockLogin" />
      <div class="hint">登录后可跨设备同步密钥。本地盐值不上传。</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showLogin = false">取消</button>
        <button class="btn-confirm" @click="mockLogin">登录</button>
      </div>
      <div class="modal-footer-link" @click="showRegister = true; showLogin = false">还没有账号？注册</div>
    </Modal>

    <!-- Modal: Login (logged in) -->
    <Modal v-if="showLogin && loggedIn" title="账号" @close="showLogin = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </template>
      <div class="avatar-section">
        <div class="avatar-edit" @click="triggerAvatarInput">
          <div class="avatar-img"><img v-if="avatarData" :src="avatarData" alt="" /></div>
          <div class="avatar-overlay">📷</div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarChange" />
        <div class="avatar-hint">点击头像更换图片</div>
        <div class="avatar-email">{{ loginEmail || 'user@example.com' }}</div>
        <div class="avatar-status">已登录 · 同步已开启</div>
        <div class="avatar-links">
          <span @click="showChangePass = true; showLogin = false">修改密码</span>
          <span class="sep">|</span>
          <span class="logout" @click="mockLogout">退出登录</span>
        </div>
      </div>
    </Modal>

    <!-- Modal: Register -->
    <Modal v-if="showRegister" title="注册" @close="showRegister = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      </template>
      <label>邮箱</label>
      <input v-model="regEmail" placeholder="you@example.com" />
      <label>密码</label>
      <input type="password" v-model="regPass" placeholder="至少 8 位" />
      <label>确认密码</label>
      <input type="password" v-model="regPass2" placeholder="再次输入" @keydown.enter="mockRegister" />
      <div class="hint">注册后跨设备同步密钥。本地盐始终不上传。</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showRegister = false">取消</button>
        <button class="btn-confirm" @click="mockRegister">注册</button>
      </div>
      <div class="modal-footer-link" @click="showLogin = true; showRegister = false">已有账号？登录</div>
    </Modal>

    <!-- Modal: Change Password -->
    <Modal v-if="showChangePass" title="修改密码" @close="showChangePass = false">
      <template #icon>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </template>
      <label>当前密码</label>
      <input type="password" v-model="changeOld" placeholder="当前密码" />
      <label>新密码</label>
      <input type="password" v-model="changeNew" placeholder="至少 8 位新密码" />
      <label>确认新密码</label>
      <input type="password" v-model="changeNew2" placeholder="再次输入" @keydown.enter="showChangePass = false" />
      <div class="modal-actions">
        <button class="btn-cancel" @click="showChangePass = false">取消</button>
        <button class="btn-confirm" @click="showChangePass = false">保存</button>
      </div>
    </Modal>
  </div>
</template>

<script>
import KeyCard from './components/KeyCard.vue'
import Modal from './components/Modal.vue'

export default {
  components: { KeyCard, Modal },
  data() {
    return {
      keys: [],
      codes: [],
      timer: null,

      // Add key
      showAddKey: false,
      addName: '',
      addSecret: '',
      addError: '',

      // Settings
      showSettings: false,
      saltValue: '',
      saltError: '',

      // Login / Account
      showLogin: false,
      loggedIn: false,
      loginEmail: '',
      loginPass: '',
      avatarData: null,

      // Register
      showRegister: false,
      regEmail: '',
      regPass: '',
      regPass2: '',

      // Change password
      showChangePass: false,
      changeOld: '',
      changeNew: '',
      changeNew2: '',
    }
  },

  async mounted() {
    await this.loadData()
    this.startTimer()

    // Load avatar
    try {
      const av = await window.api.getAvatar()
      if (av) this.avatarData = av
    } catch (_) {}
  },

  beforeUnmount() {
    if (this.timer) clearInterval(this.timer)
  },

  methods: {
    async loadData() {
      try {
        this.keys = await window.api.getKeys()
        const allCodes = await window.api.getCodes()
        this.codes = allCodes
      } catch (_) {}
    },

    startTimer() {
      this.timer = setInterval(async () => {
        try {
          this.codes = await window.api.getCodes()
        } catch (_) {}
      }, 1000)
    },

    async removeKey(id) {
      await window.api.removeKey(id)
      await this.loadData()
    },

    // Add key
    async confirmAdd() {
      this.addError = ''
      if (!this.addName.trim()) { this.addError = '请输入名称'; return }
      if (!this.addSecret.trim()) { this.addError = '请输入密钥'; return }
      try {
        await window.api.addKey(this.addName.trim(), this.addSecret.trim())
        this.showAddKey = false
        this.addName = ''
        this.addSecret = ''
        await this.loadData()
      } catch (e) {
        this.addError = e.message
      }
    },

    // Salt
    async confirmSalt() {
      this.saltError = ''
      if (!/^[a-f0-9]{32,}$/i.test(this.saltValue.trim())) {
        this.saltError = 'Salt 需为 32 位以上十六进制字符 (0-9 a-f)'
        return
      }
      try {
        await window.api.saveSalt(this.saltValue.trim())
        this.showSettings = false
        await this.loadData()
      } catch (e) {
        this.saltError = e.message
      }
    },

    async loadSalt() {
      try {
        this.saltValue = await window.api.getSalt()
      } catch (_) {}
    },

    // Avatar
    triggerAvatarInput() {
      this.$refs.avatarInput?.click()
    },
    async onAvatarChange(e) {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        this.avatarData = ev.target.result
        try { await window.api.saveAvatar(ev.target.result) } catch (_) {}
      }
      reader.readAsDataURL(file)
    },

    // Mock auth
    mockLogin() {
      this.loggedIn = true
      if (!this.loginEmail) this.loginEmail = 'user@example.com'
    },
    mockLogout() {
      this.loggedIn = false
      this.loginPass = ''
    },
    mockRegister() {
      this.loggedIn = true
      this.loginEmail = this.regEmail || 'user@example.com'
      this.showRegister = false
      this.showLogin = false
    },
  },

  watch: {
    showSettings(v) {
      if (v) this.loadSalt()
    },
  },
}
</script>

<style>
/* ═══════════════════════════════ Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  background: #f0f2f5;
  color: #1a1a1a;
  user-select: none;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
}

/* ═══════════════════════════════ Header */
.header {
  padding: 16px 16px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.brand-icon {
  width: 26px; height: 26px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
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
  font-size: 0.7rem; color: #8c8c8c;
  background: #f5f5f5; padding: 2px 10px; border-radius: 10px;
}

.header-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: 8px; cursor: pointer; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  color: #8c8c8c; transition: all 0.15s;
}
.header-btn:hover { background: #e5e8eb; color: #595959; }

.avatar-btn {
  width: 30px; height: 30px; border-radius: 50%;
  border: 2px solid #e5e8eb; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; color: #8c8c8c;
  transition: all 0.15s; overflow: hidden; margin-left: 2px;
  background: linear-gradient(135deg, #e5e8eb, #d9d9d9);
}
.avatar-btn:hover { border-color: #1677ff; color: #1677ff; }
.avatar-btn.logged { border-color: #1677ff; }

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
.body-scroll::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }

.card-list {
  padding: 8px 16px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ═══════════════════════════════ Empty */
.empty {
  text-align: center; padding: 60px 20px; color: #bfbfbf;
}
.empty-icon { font-size: 2.6rem; margin-bottom: 10px; }
.empty p { font-size: 0.85rem; }

/* ═══════════════════════════════ FAB */
.fab {
  position: fixed;
  bottom: 20px; right: 20px;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  border: none; color: #fff;
  font-size: 1.5rem; font-weight: 300;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(22,119,255,0.4);
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
  z-index: 5;
}
.fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(22,119,255,0.5); }

/* ═══════════════════════════════ Modal overlay + glass */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal-box {
  position: relative;
  border-radius: 20px;
  padding: 24px 22px 18px;
  width: 340px;
  max-width: 90vw;
  animation: modalIn 0.25s ease;

  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
  overflow: hidden;
}

.modal-box::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 22%, rgba(255,255,255,0.35) 0px, transparent 4px),
    radial-gradient(circle at 72% 15%, rgba(255,255,255,0.20) 0px, transparent 3px),
    radial-gradient(circle at 85% 55%, rgba(255,255,255,0.25) 0px, transparent 5px),
    radial-gradient(circle at 30% 70%, rgba(255,255,255,0.15) 0px, transparent 3px),
    radial-gradient(circle at 40% 35%, rgba(255,255,255,0.30) 0px, transparent 2px),
    radial-gradient(circle at 60% 75%, rgba(255,255,255,0.18) 0px, transparent 2px),
    radial-gradient(circle at 12% 50%, rgba(255,255,255,0.22) 0px, transparent 2px),
    radial-gradient(circle at 50% 88%, rgba(255,255,255,0.15) 0px, transparent 2px),
    radial-gradient(circle at 78% 35%, rgba(255,255,255,0.20) 0px, transparent 2px),
    radial-gradient(circle at 55% 45%, rgba(255,255,255,0.12) 0px, transparent 1px),
    radial-gradient(circle at 90% 80%, rgba(255,255,255,0.18) 0px, transparent 2px),
    linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.05) 100%);
  z-index: -1;
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
  color: #595959; margin-bottom: 4px;
  position: relative;
  z-index: 1;
}

.modal-box input, .modal-box textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #d9d9d9;
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
  margin-bottom: 14px;
  transition: border-color 0.2s;
  font-family: inherit;
  position: relative;
  z-index: 1;
  background: rgba(255,255,255,0.6);
}

.modal-box textarea {
  resize: vertical; min-height: 50px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.82rem;
}

.modal-box input:focus, .modal-box textarea:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22,119,255,0.1);
}

.modal-box .hint {
  font-size: 0.72rem;
  color: #8c8c8c;
  margin-top: -8px;
  margin-bottom: 14px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
}

.modal-box .hint strong { color: #595959; }
.modal-box .err {
  font-size: 0.75rem;
  color: #ff4d4f;
  margin-top: -8px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.modal-actions {
  display: flex; gap: 10px; margin-top: 2px;
  position: relative;
  z-index: 1;
}

.modal-actions button {
  flex: 1; padding: 9px; border-radius: 10px;
  font-size: 0.85rem; font-weight: 500;
  cursor: pointer; border: none;
  transition: all 0.15s;
}

.btn-cancel { background: #f5f5f5; color: #595959; }
.btn-cancel:hover { background: #ebebeb; }
.btn-confirm { background: #1677ff; color: #fff; }
.btn-confirm:hover { background: #4096ff; }

.modal-footer-link {
  text-align: center;
  margin-top: 12px;
  font-size: 0.75rem;
  color: #8c8c8c;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.modal-footer-link:hover { color: #1677ff; }

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
  background: linear-gradient(135deg, #1677ff, #4096ff);
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

.avatar-hint { font-size: 0.72rem; color: #8c8c8c; margin-bottom: 8px; }
.avatar-email { font-weight: 600; font-size: 0.9rem; }
.avatar-status { font-size: 0.75rem; color: #8c8c8c; margin-top: 2px; }

.avatar-links {
  margin-top: 14px;
  display: flex; gap: 8px; justify-content: center;
  font-size: 0.75rem;
}
.avatar-links span { cursor: pointer; color: #1677ff; }
.avatar-links .sep { color: #d9d9d9; cursor: default; }
.avatar-links .logout { color: #ff4d4f; }
</style>
