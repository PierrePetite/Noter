<template>
  <MainLayout>
    <template #default>
      <div class="h-full flex flex-col">
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Notizen importieren</h1>
              <p class="text-sm text-gray-600 mt-1">
                Importiere deine Notizen aus Synology NoteStation
              </p>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-6">
          <div class="max-w-3xl mx-auto">
            <!-- Import-Status: Success -->
            <div
              v-if="importResult && importResult.success"
              class="mb-6 bg-green-50 border border-green-200 rounded-lg p-6"
            >
              <div class="flex items-start">
                <svg
                  class="w-6 h-6 text-green-600 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-green-900 mb-4">Import erfolgreich abgeschlossen!</h3>
                  <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="bg-white rounded-lg p-4 text-center border border-green-200">
                      <div class="text-3xl font-bold text-green-700">{{ importResult.notesCreated }}</div>
                      <div class="text-sm text-gray-600 mt-1">Notizen importiert</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 text-center border border-green-200">
                      <div class="text-3xl font-bold text-green-700">{{ importResult.foldersCreated }}</div>
                      <div class="text-sm text-gray-600 mt-1">Ordner erstellt</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 text-center border border-green-200">
                      <div class="text-3xl font-bold text-green-700">{{ importResult.attachmentsImported }}</div>
                      <div class="text-sm text-gray-600 mt-1">Bilder hochgeladen</div>
                    </div>
                  </div>
                  <p v-if="importResult.errors.length > 0" class="text-orange-700 text-sm mb-4">
                    ⚠️ {{ importResult.errors.length }} Fehler aufgetreten (siehe Details unten)
                  </p>
                  <button
                    @click="resetImport"
                    class="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Weiteren Import durchführen
                  </button>
                  <router-link
                    to="/notes"
                    class="ml-2 inline-block px-4 py-2 bg-white text-green-700 border border-green-300 rounded-md hover:bg-green-50"
                  >
                    Zu meinen Notizen
                  </router-link>
                </div>
              </div>

              <!-- Fehler-Details -->
              <div v-if="importResult.errors.length > 0" class="mt-4 pt-4 border-t border-green-200">
                <details class="text-sm">
                  <summary class="cursor-pointer font-medium text-green-900 hover:text-green-700">
                    Fehler-Details anzeigen
                  </summary>
                  <ul class="mt-2 space-y-1 text-orange-700">
                    <li v-for="(error, index) in importResult.errors" :key="index" class="truncate">
                      <strong>{{ error.file }}:</strong> {{ error.error }}
                    </li>
                  </ul>
                </details>
              </div>
            </div>

            <!-- Import-Status: Error -->
            <div
              v-if="importError"
              class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
            >
              <div class="flex items-start">
                <svg
                  class="w-5 h-5 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 class="font-semibold">Import fehlgeschlagen</h3>
                  <p class="text-sm mt-1">{{ importError }}</p>
                </div>
              </div>
            </div>

            <!-- File Upload Area -->
            <div v-if="!isUploading && !importResult" class="bg-white rounded-lg shadow p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Backup-Datei auswählen</h2>

              <!-- Drag & Drop Zone -->
              <div
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                :class="[
                  'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400',
                ]"
              >
                <svg
                  class="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p class="text-lg text-gray-700 mb-2">
                  Ziehe deine Backup-Datei hierher oder
                  <button
                    @click="$refs.fileInput.click()"
                    class="text-blue-600 hover:text-blue-800 underline"
                  >
                    durchsuche deine Dateien
                  </button>
                </p>
                <p class="text-sm text-gray-500">Nur .nsx Dateien (Synology NoteStation Backup)</p>

                <input
                  ref="fileInput"
                  type="file"
                  accept=".nsx"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </div>

              <!-- Selected File Info -->
              <div v-if="selectedFile" class="mt-4 p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <svg
                      class="w-8 h-8 text-gray-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
                      <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                    </div>
                  </div>
                  <button
                    @click="selectedFile = null"
                    class="text-gray-400 hover:text-gray-600"
                    title="Datei entfernen"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Import Options -->
              <div v-if="selectedFile" class="mt-6">
                <h3 class="text-md font-semibold text-gray-900 mb-3">Import-Optionen</h3>
                <div class="space-y-3">
                  <label class="flex items-center">
                    <input
                      v-model="preserveTimestamps"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="ml-2 text-sm text-gray-700">
                      Originale Zeitstempel beibehalten (Erstellungs- und Änderungsdatum)
                    </span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="skipErrors"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="ml-2 text-sm text-gray-700">
                      Fehlerhafte Notizen überspringen (Import fortsetzen bei Fehlern)
                    </span>
                  </label>
                </div>
              </div>

              <!-- Import Button -->
              <div v-if="selectedFile" class="mt-6 flex justify-end">
                <button
                  @click="startImport"
                  class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  Import starten
                </button>
              </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="isUploading" class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center justify-center mb-4">
                <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Import läuft...</h3>
              <p class="text-sm text-gray-600 text-center">
                Bitte warten, während deine Notizen importiert werden.
              </p>
            </div>

            <!-- Info Box -->
            <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-blue-900 mb-2">Hinweise zum Import:</h3>
              <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Unterstützt werden Synology NoteStation Backup-Dateien (.nsx)</li>
                <li>Alle Notizen, Ordner und Bilder werden importiert</li>
                <li>HTML-Formatierung wird automatisch in TipTap-Format konvertiert</li>
                <li>Tags werden ebenfalls übernommen (falls vorhanden)</li>
                <li>Der Import kann je nach Größe einige Minuten dauern</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import apiClient from '../api/client';

const router = useRouter();

const selectedFile = ref<File | null>(null);
const isDragging = ref(false);
const isUploading = ref(false);
const preserveTimestamps = ref(true);
const skipErrors = ref(true);
const importResult = ref<any>(null);
const importError = ref('');

function handleDrop(event: DragEvent) {
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.nsx')) {
      selectedFile.value = file;
    } else {
      importError.value = 'Nur .nsx Dateien werden unterstützt';
    }
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (files && files.length > 0) {
    selectedFile.value = files[0];
  }
}

async function startImport() {
  if (!selectedFile.value) return;

  isUploading.value = true;
  importError.value = '';
  importResult.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const response = await apiClient.post('/import/synology', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      importResult.value = response.data.data;
    } else {
      importError.value = response.data.error || 'Import fehlgeschlagen';
    }
  } catch (error: any) {
    console.error('Import error:', error);
    importError.value = error.response?.data?.error || 'Ein Fehler ist aufgetreten';
  } finally {
    isUploading.value = false;
  }
}

function resetImport() {
  selectedFile.value = null;
  importResult.value = null;
  importError.value = '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
</script>
