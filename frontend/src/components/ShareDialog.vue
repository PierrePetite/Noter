<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ type === 'note' ? 'Notiz' : 'Ordner' }} teilen
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-600 mt-1">{{ itemName }}</p>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <!-- Add Share Section -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Benutzer hinzufügen
          </label>

          <!-- User Search -->
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              type="text"
              placeholder="Benutzer suchen..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <!-- Search Results Dropdown -->
            <div
              v-if="searchResults.length > 0 && searchQuery"
              class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              <button
                v-for="user in searchResults"
                :key="user.id"
                @click="selectUser(user)"
                class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
              >
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">
                    {{ user.username.substring(0, 2).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900">
                    {{ user.displayName || user.username }}
                  </div>
                  <div class="text-xs text-gray-500">{{ user.email }}</div>
                </div>
              </button>
            </div>

            <!-- No results -->
            <div
              v-if="searchQuery && searchResults.length === 0 && !searching"
              class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2"
            >
              <p class="text-sm text-gray-500">Keine Benutzer gefunden</p>
            </div>
          </div>

          <!-- Selected User & Permission -->
          <div v-if="selectedUser" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">
                    {{ selectedUser.username.substring(0, 2).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">
                    {{ selectedUser.displayName || selectedUser.username }}
                  </div>
                </div>
              </div>
              <button @click="clearSelection" class="text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Permission Selection -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-gray-700">Berechtigung</label>
              <div class="flex gap-2">
                <button
                  @click="selectedPermission = 'READ'"
                  class="flex-1 px-3 py-2 text-sm rounded-md transition-colors"
                  :class="selectedPermission === 'READ'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'"
                >
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Lesen
                  </div>
                </button>
                <button
                  @click="selectedPermission = 'WRITE'"
                  class="flex-1 px-3 py-2 text-sm rounded-md transition-colors"
                  :class="selectedPermission === 'WRITE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'"
                >
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Bearbeiten
                  </div>
                </button>
              </div>
            </div>

            <!-- Add Button -->
            <button
              @click="addShare"
              :disabled="adding"
              class="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ adding ? 'Hinzufügen...' : 'Hinzufügen' }}
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {{ error }}
          </div>
        </div>

        <!-- Current Shares -->
        <div v-if="shares.length > 0">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Geteilt mit ({{ shares.length }})
          </label>
          <div class="space-y-2">
            <div
              v-for="share in shares"
              :key="share.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center gap-3 flex-1">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">
                    {{ share.user.username.substring(0, 2).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900">
                    {{ share.user.displayName || share.user.username }}
                  </div>
                  <!-- Permission Selector -->
                  <div class="flex gap-1 mt-1">
                    <button
                      @click="updatePermission(share, 'READ')"
                      :disabled="updating === share.id"
                      class="px-2 py-0.5 text-xs rounded transition-colors"
                      :class="share.permission === 'READ'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'"
                    >
                      Lesen
                    </button>
                    <button
                      @click="updatePermission(share, 'WRITE')"
                      :disabled="updating === share.id"
                      class="px-2 py-0.5 text-xs rounded transition-colors"
                      :class="share.permission === 'WRITE'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'"
                    >
                      Bearbeiten
                    </button>
                  </div>
                </div>
              </div>
              <button
                @click="removeShare(share)"
                :disabled="removing === share.id"
                class="p-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                title="Freigabe entfernen"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-4 text-gray-500 text-sm">
          {{ type === 'note' ? 'Notiz' : 'Ordner' }} ist noch nicht geteilt
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button
          @click="close"
          class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { sharesApi, type ShareUser, type NoteShare, type FolderShare } from '../api/shares';

const props = defineProps<{
  isOpen: boolean;
  type: 'note' | 'folder';
  itemId: string;
  itemName: string;
}>();

const emit = defineEmits<{
  close: [];
  shareAdded: [];
  shareRemoved: [];
}>();

const searchQuery = ref('');
const searchResults = ref<ShareUser[]>([]);
const searching = ref(false);
const selectedUser = ref<ShareUser | null>(null);
const selectedPermission = ref<'READ' | 'WRITE'>('READ');
const shares = ref<Array<NoteShare | FolderShare>>([]);
const adding = ref(false);
const removing = ref<string | null>(null);
const updating = ref<string | null>(null);
const error = ref('');

let searchTimeout: number | null = null;

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await loadShares();
    clearSelection();
  }
});

async function loadShares() {
  try {
    if (props.type === 'note') {
      shares.value = await sharesApi.getNoteShares(props.itemId);
    } else {
      shares.value = await sharesApi.getFolderShares(props.itemId);
    }
  } catch (err) {
    console.error('Failed to load shares:', err);
  }
}

function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    return;
  }

  searching.value = true;
  searchTimeout = window.setTimeout(async () => {
    try {
      const results = await sharesApi.searchUsers(searchQuery.value);
      // Filter out users who already have access
      const existingUserIds = new Set(shares.value.map(s => s.userId));
      searchResults.value = results.filter(u => !existingUserIds.has(u.id));
    } catch (err) {
      console.error('Search error:', err);
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 300);
}

function selectUser(user: ShareUser) {
  selectedUser.value = user;
  searchQuery.value = '';
  searchResults.value = [];
}

function clearSelection() {
  selectedUser.value = null;
  selectedPermission.value = 'READ';
  searchQuery.value = '';
  searchResults.value = [];
  error.value = '';
}

async function addShare() {
  if (!selectedUser.value) return;

  adding.value = true;
  error.value = '';

  try {
    if (props.type === 'note') {
      await sharesApi.shareNote(props.itemId, {
        userId: selectedUser.value.id,
        permission: selectedPermission.value,
      });
    } else {
      await sharesApi.shareFolder(props.itemId, {
        userId: selectedUser.value.id,
        permission: selectedPermission.value,
      });
    }

    await loadShares();
    clearSelection();
    emit('shareAdded');
  } catch (err: any) {
    console.error('Failed to add share:', err);
    error.value = err.response?.data?.error || 'Fehler beim Teilen';
  } finally {
    adding.value = false;
  }
}

async function updatePermission(share: NoteShare | FolderShare, newPermission: 'READ' | 'WRITE') {
  // Wenn die Berechtigung gleich ist, nichts tun
  if (share.permission === newPermission) {
    return;
  }

  updating.value = share.id;
  error.value = '';

  try {
    // Berechtigung durch erneutes Teilen mit neuer Permission aktualisieren
    if (props.type === 'note') {
      await sharesApi.shareNote(props.itemId, {
        userId: share.userId,
        permission: newPermission,
      });
    } else {
      await sharesApi.shareFolder(props.itemId, {
        userId: share.userId,
        permission: newPermission,
      });
    }

    await loadShares();
    emit('shareAdded'); // Signal für Sidebar-Update
  } catch (err: any) {
    console.error('Failed to update permission:', err);
    error.value = err.response?.data?.error || 'Fehler beim Aktualisieren der Berechtigung';
  } finally {
    updating.value = null;
  }
}

async function removeShare(share: NoteShare | FolderShare) {
  if (!confirm('Möchten Sie diese Freigabe wirklich entfernen?')) {
    return;
  }

  removing.value = share.id;

  try {
    if (props.type === 'note') {
      await sharesApi.unshareNote(props.itemId, share.userId);
    } else {
      await sharesApi.unshareFolder(props.itemId, share.userId);
    }

    await loadShares();
    emit('shareRemoved');
  } catch (err: any) {
    console.error('Failed to remove share:', err);
    alert(err.response?.data?.error || 'Fehler beim Entfernen der Freigabe');
  } finally {
    removing.value = null;
  }
}

function close() {
  emit('close');
}
</script>
