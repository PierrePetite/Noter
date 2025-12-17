<template>
  <MainLayout>
    <template #default="{ selectedView, selectedFolderId }">
      <div class="h-full flex flex-col">
        <!-- Header with Title and Actions -->
        <header class="bg-white border-b border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                {{ getViewTitle(selectedView, selectedFolderId) }}
              </h1>
              <p v-if="getFilteredNotes(selectedView, selectedFolderId).length > 0" class="text-sm text-gray-600 mt-1">
                {{ getFilteredNotes(selectedView, selectedFolderId).length }} {{ getFilteredNotes(selectedView, selectedFolderId).length === 1 ? 'Notiz' : 'Notizen' }}
              </p>
            </div>
            <button
              @click="createNewNote"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Neue Notiz
            </button>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto p-6">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="text-gray-600">Lade Notizen...</div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {{ error }}
          </div>

          <!-- Empty State -->
          <div v-else-if="getFilteredNotes(selectedView, selectedFolderId).length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <svg class="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Notizen vorhanden</h3>
            <p class="text-gray-600 mb-4">
              {{ selectedFolderId ? 'Dieser Ordner enthält noch keine Notizen' : 'Erstelle deine erste Notiz' }}
            </p>
            <button
              @click="createNewNote"
              class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Notiz erstellen
            </button>
          </div>

          <!-- Notes Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="note in getFilteredNotes(selectedView, selectedFolderId)"
              :key="note.id"
              @click="openNote(note.id)"
              class="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer p-5 border border-gray-200 hover:border-blue-300"
            >
              <!-- Title with Favorite Star -->
              <div class="flex items-start justify-between mb-2">
                <h3 class="text-lg font-semibold text-gray-900 truncate flex-1">
                  {{ note.title || 'Ohne Titel' }}
                </h3>
                <button
                  v-if="note.isFavorite"
                  @click.stop
                  class="flex-shrink-0 text-yellow-500"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              </div>

              <!-- Content Preview -->
              <div class="text-sm text-gray-600 mb-3 line-clamp-3">
                {{ getContentPreview(note.content) }}
              </div>

              <!-- Footer with Date and Actions -->
              <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>{{ formatDate(note.updatedAt) }}</span>
                <button
                  @click.stop="deleteNote(note.id)"
                  class="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import { notesApi, type Note } from '../api/notes';

const router = useRouter();

const notes = ref<Note[]>([]);
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  await loadNotes();
});

async function loadNotes() {
  loading.value = true;
  error.value = '';
  try {
    notes.value = await notesApi.getAll();
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden der Notizen';
  } finally {
    loading.value = false;
  }
}

function getFilteredNotes(view: string, folderId: string | null) {
  let filtered = [...notes.value];

  // Filter by view
  if (view === 'favorites') {
    filtered = filtered.filter(note => note.isFavorite);
  } else if (view === 'shared') {
    // TODO: Filter shared notes when API is ready
    filtered = [];
  }

  // Filter by folder
  if (folderId) {
    filtered = filtered.filter(note => note.folderId === folderId);
  } else if (view === 'all') {
    // Show all notes
  }

  // Sort by update date (newest first)
  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return filtered;
}

function getViewTitle(view: string, folderId: string | null): string {
  if (view === 'favorites') return 'Favoriten';
  if (view === 'shared') return 'Mit mir geteilt';
  if (folderId) return 'Ordner'; // TODO: Get folder name
  return 'Alle Notizen';
}

function createNewNote() {
  router.push('/notes/new');
}

function openNote(id: string) {
  router.push(`/notes/${id}`);
}

async function deleteNote(id: string) {
  if (!confirm('Möchtest du diese Notiz wirklich löschen?')) {
    return;
  }

  try {
    await notesApi.delete(id);
    notes.value = notes.value.filter(note => note.id !== id);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Löschen der Notiz';
  }
}

function getContentPreview(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  // TipTap JSON format - extract text
  if (content && content.content && Array.isArray(content.content)) {
    const text = content.content
      .map((node: any) => {
        if (node.content && Array.isArray(node.content)) {
          return node.content.map((n: any) => n.text || '').join('');
        }
        return '';
      })
      .join(' ');
    return text.substring(0, 150);
  }

  return 'Keine Vorschau verfügbar';
}

function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Heute';
  } else if (days === 1) {
    return 'Gestern';
  } else if (days < 7) {
    return `Vor ${days} Tagen`;
  } else {
    return d.toLocaleDateString('de-DE');
  }
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
