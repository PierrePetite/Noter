<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="cancel"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <svg
            class="w-10 h-10"
            :class="variant === 'danger' ? 'text-red-600' : 'text-yellow-600'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ title }}
          </h3>
          <p class="text-gray-600 text-sm">
            {{ message }}
          </p>
        </div>
      </div>

      <div class="flex gap-3 justify-end mt-6">
        <button
          type="button"
          @click="cancel"
          class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="confirm"
          :class="[
            'px-4 py-2 rounded-md focus:outline-none focus:ring-2 transition-colors',
            variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          ]"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
  }>(),
  {
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
    variant: 'danger',
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function confirm() {
  emit('confirm');
}

function cancel() {
  emit('cancel');
}
</script>
