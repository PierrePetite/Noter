<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm flex-shrink-0">
      <div class="px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="text-gray-600 hover:text-gray-900"
            title="Zurück"
          >
            ← Zurück
          </button>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isNewNote ? 'Neue Notiz' : 'Notiz bearbeiten' }}
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="saving" class="text-sm text-gray-600">Speichert...</span>
          <span v-else-if="lastSaved" class="text-sm text-gray-600">
            Gespeichert: {{ lastSaved }}
          </span>
          <button
            @click="saveNote"
            :disabled="saving || !hasChanges"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Speichert...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content with Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Editor Area -->
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div v-if="loading" class="text-center py-12">
            <div class="text-gray-600">Lade Notiz...</div>
          </div>

          <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {{ error }}
          </div>

          <div v-else class="space-y-4">
            <!-- Title Input -->
            <div>
              <input
                v-model="form.title"
                @input="markAsChanged"
                type="text"
                placeholder="Titel der Notiz..."
                class="w-full px-4 py-3 text-2xl font-semibold border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
              />
            </div>

            <!-- Folder Selection -->
            <div class="bg-white p-4 rounded-lg border">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ordner
              </label>
              <select
                v-model="form.folderId"
                @change="markAsChanged"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option :value="null">Ohne Ordner</option>
                <option
                  v-for="folder in flatFolders"
                  :key="folder.id"
                  :value="folder.id"
                >
                  {{ folder.indent }}{{ folder.name }}
                </option>
              </select>
            </div>

            <!-- TipTap Editor -->
            <TipTapEditor
              v-model="form.content"
              @update:modelValue="markAsChanged"
              placeholder="Schreibe deine Notiz..."
            />

            <!-- Auto-save info -->
            <div class="text-sm text-gray-500 text-center">
              Änderungen werden automatisch alle 30 Sekunden gespeichert.
              Drücke Cmd/Strg + S für manuelles Speichern.
            </div>
          </div>
        </div>
      </main>

      <!-- Sidebar -->
      <NoteSidebar
        v-if="!isNewNote && !loading && currentNote"
        :note="currentNote"
        @attachmentAdded="handleAttachmentChange"
        @attachmentDeleted="handleAttachmentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { notesApi, type Note } from '../api/notes';
import { foldersApi, type Folder } from '../api/folders';
import TipTapEditor from '../components/TipTapEditor.vue';
import NoteSidebar from '../components/NoteSidebar.vue';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const hasChanges = ref(false);
const lastSaved = ref('');
const folders = ref<Folder[]>([]);
const currentNote = ref<Note | null>(null);

const form = ref({
  title: '',
  content: '',
  folderId: null as string | null,
});

const noteId = computed(() => route.params.id as string);
const isNewNote = computed(() => noteId.value === 'new');

// Flatten folder tree for dropdown (with indentation)
const flatFolders = computed(() => {
  const result: Array<Folder & { indent: string }> = [];

  function flatten(folders: Folder[], level = 0) {
    for (const folder of folders) {
      result.push({
        ...folder,
        indent: '  '.repeat(level) + (level > 0 ? '└ ' : ''),
      });
      if (folder.children && folder.children.length > 0) {
        flatten(folder.children, level + 1);
      }
    }
  }

  flatten(folders.value);
  return result;
});

let autoSaveInterval: number | null = null;

onMounted(async () => {
  // Load folders first
  await loadFolders();

  if (!isNewNote.value) {
    await loadNote();
  }

  // Auto-save every 30 seconds
  autoSaveInterval = window.setInterval(() => {
    if (hasChanges.value && !saving.value) {
      saveNote(true);
    }
  }, 30000);

  // Save on Cmd/Ctrl + S
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  window.removeEventListener('keydown', handleKeyDown);
});

async function loadFolders() {
  try {
    folders.value = await foldersApi.getTree();
  } catch (err) {
    console.error('Failed to load folders:', err);
  }
}

async function loadNote() {
  loading.value = true;
  error.value = '';
  try {
    const note = await notesApi.getById(noteId.value);
    currentNote.value = note;
    form.value.title = note.title;
    form.value.content = note.content;
    form.value.folderId = note.folderId || null;
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden der Notiz';
  } finally {
    loading.value = false;
  }
}

async function saveNote(isAutoSave = false) {
  if (saving.value) return;

  saving.value = true;
  error.value = '';

  try {
    if (isNewNote.value) {
      const newNote = await notesApi.create({
        title: form.value.title || 'Ohne Titel',
        content: form.value.content,
        folderId: form.value.folderId || undefined,
      });
      // Redirect to edit mode for the new note
      router.replace(`/notes/${newNote.id}`);
    } else {
      await notesApi.update(noteId.value, {
        title: form.value.title || 'Ohne Titel',
        content: form.value.content,
        folderId: form.value.folderId || undefined,
      });

      // Update currentNote after save
      if (currentNote.value) {
        currentNote.value.title = form.value.title;
        currentNote.value.content = form.value.content;
        currentNote.value.folderId = form.value.folderId;
        currentNote.value.updatedAt = new Date().toISOString();
      }
    }

    hasChanges.value = false;
    lastSaved.value = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!isAutoSave) {
      // Show success message briefly
      setTimeout(() => {
        if (!hasChanges.value) {
          lastSaved.value = '';
        }
      }, 3000);
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern der Notiz';
  } finally {
    saving.value = false;
  }
}

function markAsChanged() {
  hasChanges.value = true;
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (hasChanges.value && !saving.value) {
      saveNote();
    }
  }
}

function goBack() {
  if (hasChanges.value) {
    if (confirm('Du hast ungespeicherte Änderungen. Möchtest du wirklich zurück?')) {
      router.push('/notes');
    }
  } else {
    router.push('/notes');
  }
}

function handleAttachmentChange() {
  // Optional: Reload note to get updated attachment count
  // For now, just log it
  console.log('Attachment changed');
}
</script>
