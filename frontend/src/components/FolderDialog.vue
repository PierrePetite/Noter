<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <h2 class="text-xl font-bold text-gray-900 mb-4">
        {{ mode === 'create' ? 'Neuer Ordner' : 'Ordner umbenennen' }}
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Ordner-Name
          </label>
          <input
            ref="nameInput"
            v-model="folderName"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Arbeit, Privat, Projekte"
          />
        </div>

        <div v-if="mode === 'create' && parentFolderName" class="text-sm text-gray-600">
          <span class="font-medium">Übergeordneter Ordner:</span> {{ parentFolderName }}
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div class="flex gap-3 justify-end">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            :disabled="loading || !folderName.trim()"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Wird gespeichert...' : (mode === 'create' ? 'Erstellen' : 'Speichern') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { foldersApi, type Folder } from '../api/folders';

const props = defineProps<{
  isOpen: boolean;
  mode: 'create' | 'rename';
  folder?: Folder | null;
  parentId?: string | null;
  parentFolderName?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const folderName = ref('');
const loading = ref(false);
const error = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    folderName.value = props.mode === 'rename' && props.folder ? props.folder.name : '';
    error.value = '';
    await nextTick();
    nameInput.value?.focus();
  }
});

async function handleSubmit() {
  if (!folderName.value.trim()) return;

  loading.value = true;
  error.value = '';

  try {
    if (props.mode === 'create') {
      await foldersApi.create({
        name: folderName.value.trim(),
        parentId: props.parentId || null,
      });
    } else if (props.mode === 'rename' && props.folder) {
      await foldersApi.update(props.folder.id, {
        name: folderName.value.trim(),
      });
    }

    emit('success');
    close();
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern des Ordners';
  } finally {
    loading.value = false;
  }
}

function close() {
  folderName.value = '';
  error.value = '';
  emit('close');
}
</script>
