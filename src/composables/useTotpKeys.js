import { onMounted, onUnmounted, readonly, shallowRef } from 'vue';
import { electronApi } from '../services/electronApi';

const REFRESH_INTERVAL_MS = 1000;

export function useTotpKeys() {
  const keys = shallowRef([]);
  const codes = shallowRef([]);
  let timerId = 0;

  async function loadData() {
    const [nextKeys, nextCodes] = await Promise.all([
      electronApi.listKeys(),
      electronApi.getCodes(),
    ]);
    keys.value = nextKeys;
    codes.value = nextCodes;
  }

  async function refreshCodes() {
    codes.value = await electronApi.getCodes();
  }

  function startTimer() {
    window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      refreshCodes().catch(() => {});
    }, REFRESH_INTERVAL_MS);
  }

  async function addKey({ name, secret }) {
    await electronApi.addKey(name.trim(), secret.trim());
    await loadData();
  }

  async function removeKey(id) {
    await electronApi.removeKey(id);
    await loadData();
  }

  onMounted(() => {
    loadData().catch(() => {});
    startTimer();
  });

  onUnmounted(() => {
    window.clearInterval(timerId);
  });

  return {
    keys: readonly(keys),
    codes: readonly(codes),
    loadData,
    addKey,
    removeKey,
  };
}
