import { readonly, shallowRef } from 'vue';
import { electronApi } from '../services/electronApi';

export function useSecuritySettings() {
  const encryptionAvailable = shallowRef(false);
  const hideDock = shallowRef(true);

  async function loadSettings() {
    const [securityStatus, dockHidden] = await Promise.all([
      electronApi.getSecurityStatus(),
      electronApi.getDockHide(),
    ]);
    encryptionAvailable.value = !!securityStatus.encryptionAvailable;
    hideDock.value = !!dockHidden;
  }

  async function setDockHidden(nextValue) {
    hideDock.value = nextValue;
    await electronApi.setDockHide(nextValue);
  }

  return {
    encryptionAvailable: readonly(encryptionAvailable),
    hideDock: readonly(hideDock),
    loadSettings,
    setDockHidden,
  };
}
