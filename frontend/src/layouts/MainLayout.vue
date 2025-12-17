<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900">Noter</h1>
        <div class="mt-2 text-sm text-gray-600">
          {{ currentUser?.displayName || currentUser?.username }}
        </div>
      </div>

      <!-- Folder Tree -->
      <div class="flex-1 overflow-y-auto p-4">
        <FolderTree
          ref="folderTreeRef"
          :selected-view="selectedView"
          :selected-folder-id="selectedFolderId"
          @select-view="handleSelectView"
          @select-folder="handleSelectFolder"
          @create-folder="handleCreateFolder"
          @rename-folder="handleRenameFolder"
          @delete-folder="handleDeleteFolder"
        />
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-200 space-y-2">
        <!-- Admin Panel (nur für Admins) -->
        <button
          v-if="currentUser?.isAdmin"
          @click="router.push('/admin')"
          class="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Admin
        </button>
        <button
          @click="router.push('/import')"
          class="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import
        </button>
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Abmelden
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden flex flex-col">
      <!-- Search Header -->
      <div class="bg-white border-b border-gray-200 p-4">
        <div class="max-w-2xl">
          <SearchBar />
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden">
        <slot
          :selected-view="selectedView"
          :selected-folder-id="selectedFolderId"
          :refresh-folders="refreshFolders"
        />
      </div>
    </main>

    <!-- Folder Dialog (Create/Rename) -->
    <FolderDialog
      :is-open="folderDialog.isOpen"
      :mode="folderDialog.mode"
      :folder="folderDialog.folder"
      :parent-id="folderDialog.parentId"
      :parent-folder-name="folderDialog.parentFolderName"
      @close="folderDialog.isOpen = false"
      @success="handleFolderDialogSuccess"
    />

    <!-- Delete Confirmation -->
    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      title="Ordner löschen?"
      :message="`Möchten Sie den Ordner '${deleteDialog.folder?.name}' wirklich löschen? Alle enthaltenen Notizen werden in 'Ohne Ordner' verschoben.`"
      confirm-text="Löschen"
      cancel-text="Abbrechen"
      variant="danger"
      @confirm="handleConfirmDelete"
      @cancel="deleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FolderTree from '../components/FolderTree.vue';
import FolderDialog from '../components/FolderDialog.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import SearchBar from '../components/SearchBar.vue';
import { foldersApi, type Folder } from '../api/folders';

const router = useRouter();
const folderTreeRef = ref<InstanceType<typeof FolderTree> | null>(null);

const currentUser = ref<any>(null);
const selectedView = ref<string>('all');
const selectedFolderId = ref<string | null>(null);

const folderDialog = ref<{
  isOpen: boolean;
  mode: 'create' | 'rename';
  folder: Folder | null;
  parentId: string | null;
  parentFolderName: string | null;
}>({
  isOpen: false,
  mode: 'create',
  folder: null,
  parentId: null,
  parentFolderName: null,
});

const deleteDialog = ref<{
  isOpen: boolean;
  folder: Folder | null;
}>({
  isOpen: false,
  folder: null,
});

onMounted(() => {
  const userJson = localStorage.getItem('user');
  if (userJson) {
    currentUser.value = JSON.parse(userJson);
  }
});

function handleSelectView(view: string) {
  selectedView.value = view;
  selectedFolderId.value = null;
  router.push('/notes');
}

function handleSelectFolder(folderId: string) {
  selectedView.value = '';
  selectedFolderId.value = folderId;
  router.push('/notes');
}

function handleCreateFolder(parentId: string | null) {
  folderDialog.value = {
    isOpen: true,
    mode: 'create',
    folder: null,
    parentId,
    parentFolderName: null, // TODO: Lookup parent name if needed
  };
}

function handleRenameFolder(folder: Folder) {
  folderDialog.value = {
    isOpen: true,
    mode: 'rename',
    folder,
    parentId: null,
    parentFolderName: null,
  };
}

function handleDeleteFolder(folder: Folder) {
  deleteDialog.value = {
    isOpen: true,
    folder,
  };
}

async function handleConfirmDelete() {
  if (!deleteDialog.value.folder) return;

  try {
    await foldersApi.delete(deleteDialog.value.folder.id);
    deleteDialog.value.isOpen = false;
    deleteDialog.value.folder = null;
    refreshFolders();
  } catch (error) {
    console.error('Failed to delete folder:', error);
    alert('Fehler beim Löschen des Ordners');
  }
}

function handleFolderDialogSuccess() {
  refreshFolders();
}

function refreshFolders() {
  folderTreeRef.value?.reload();
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}
</script>
