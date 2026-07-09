import { onUnmounted, shallowRef } from 'vue';

export function useToast() {
  const message = shallowRef('');
  const visible = shallowRef(false);
  let timerId = 0;

  function showToast(nextMessage) {
    message.value = nextMessage;
    visible.value = true;
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => {
      visible.value = false;
    }, 2000);
  }

  onUnmounted(() => {
    window.clearTimeout(timerId);
  });

  return {
    message,
    visible,
    showToast,
  };
}
