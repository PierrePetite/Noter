<template>
  <div class="folder-tree">
    <!-- Special Views -->
    <div class="space-y-1 mb-4">
      <button
        @click="$emit('select-view', 'all')"
        :class="[
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
          selectedView === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="font-medium">Alle Notizen</span>
      </button>

      <button
        @click="$emit('select-view', 'favorites')"
        :class="[
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
          selectedView === 'favorites' ? 'bg-yellow-50 text-yellow-700' : 'hover:bg-gray-100'
        ]"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span class="font-medium">Favoriten</span>
      </button>

      <button
        @click="$emit('select-view', 'shared')"
        :class="[
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
          selectedView === 'shared' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span class="font-medium">Mit mir geteilt</span>
      </button>
    </div>

    <!-- Folders Section -->
    <div class="border-t pt-4">
      <div class="flex items-center justify-between mb-2 px-3">
        <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ordner</h3>
        <button
          @click="$emit('create-folder', null)"
          class="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
          title="Neuer Ordner"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="px-3 py-2 text-sm text-gray-500">
        Lade Ordner...
      </div>

      <div v-else-if="folders.length === 0" class="px-3 py-2 text-sm text-gray-500">
        Noch keine Ordner
      </div>

      <div v-else class="space-y-0.5">
        <FolderTreeItem
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          :selected-folder-id="selectedFolderId"
          :level="0"
          @select="$emit('select-folder', $event)"
          @create-subfolder="$emit('create-folder', $event)"
          @rename="$emit('rename-folder', $event)"
          @delete="$emit('delete-folder', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FolderTreeItem from './FolderTreeItem.vue';
import { foldersApi, type Folder } from '../api/folders';

defineProps<{
  selectedView?: string;
  selectedFolderId?: string | null;
}>();

defineEmits<{
  'select-view': [view: string];
  'select-folder': [folderId: string];
  'create-folder': [parentId: string | null];
  'rename-folder': [folder: Folder];
  'delete-folder': [folder: Folder];
}>();

const folders = ref<Folder[]>([]);
const loading = ref(false);

async function loadFolders() {
  loading.value = true;
  try {
    folders.value = await foldersApi.getTree();
  } catch (error) {
    console.error('Failed to load folders:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadFolders();
});

// Expose reload method for parent
defineExpose({
  reload: loadFolders,
});
</script>

<style scoped>
.folder-tree {
  @apply h-full overflow-y-auto;
}
</style>
