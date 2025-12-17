<template>
  <div>
    <div
      :class="[
        'group flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer transition-colors',
        isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100',
      ]"
      :style="{ paddingLeft: `${level * 16 + 12}px` }"
    >
      <!-- Expand/Collapse Icon -->
      <button
        v-if="folder.children && folder.children.length > 0"
        @click.stop="toggleExpanded"
        class="p-0.5 hover:bg-gray-200 rounded"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div v-else class="w-5"></div>

      <!-- Folder Icon -->
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>

      <!-- Folder Name -->
      <span
        @click="$emit('select', folder.id)"
        class="flex-1 text-sm font-medium truncate"
      >
        {{ folder.name }}
      </span>

      <!-- Actions Menu -->
      <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <button
          @click.stop="$emit('create-subfolder', folder.id)"
          class="p-1 hover:bg-gray-200 rounded"
          title="Unterordner erstellen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          @click.stop="showContextMenu = !showContextMenu"
          class="p-1 hover:bg-gray-200 rounded"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showContextMenu"
      class="ml-8 mt-1 bg-white border rounded-md shadow-lg py-1 text-sm z-10"
    >
      <button
        @click="handleRename"
        class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Umbenennen
      </button>
      <button
        @click="handleDelete"
        class="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Löschen
      </button>
    </div>

    <!-- Children (Recursive) -->
    <div v-if="isExpanded && folder.children && folder.children.length > 0">
      <FolderTreeItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :selected-folder-id="selectedFolderId"
        :level="level + 1"
        @select="$emit('select', $event)"
        @create-subfolder="$emit('create-subfolder', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Folder } from '../api/folders';

const props = defineProps<{
  folder: Folder;
  selectedFolderId?: string | null;
  level: number;
}>();

const emit = defineEmits<{
  select: [folderId: string];
  'create-subfolder': [parentId: string];
  rename: [folder: Folder];
  delete: [folder: Folder];
}>();

const isExpanded = ref(true);
const showContextMenu = ref(false);

const isSelected = computed(() => props.folder.id === props.selectedFolderId);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function handleRename() {
  showContextMenu.value = false;
  emit('rename', props.folder);
}

function handleDelete() {
  showContextMenu.value = false;
  emit('delete', props.folder);
}
</script>
