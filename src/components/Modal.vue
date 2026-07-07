<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box">
        <h2>
          <slot name="icon"></slot>
          {{ title }}
        </h2>
        <slot />
      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  props: { title: String },
  emits: ['close'],

  mounted() {
    const handler = (e) => { if (e.key === 'Escape') this.$emit('close') }
    document.addEventListener('keydown', handler)
    this._escHandler = handler
  },

  beforeUnmount() {
    document.removeEventListener('keydown', this._escHandler)
  },
}
</script>
