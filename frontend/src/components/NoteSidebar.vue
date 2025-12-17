<template>
  <aside class="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
    <!-- Metadata Section -->
    <div class="p-6 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-900 mb-4">Metadaten</h3>
      <div class="space-y-3 text-sm">
        <div>
          <div class="text-gray-500 mb-1">Erstellt von</div>
          <div class="text-gray-900 font-medium">{{ note.owner?.displayName || note.owner?.username || 'Unbekannt' }}</div>
        </div>
        <div>
          <div class="text-gray-500 mb-1">Erstellt am</div>
          <div class="text-gray-900">{{ formatDate(note.createdAt) }}</div>
        </div>
        <div>
          <div class="text-gray-500 mb-1">Geändert am</div>
          <div class="text-gray-900">{{ formatDate(note.updatedAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Share Section -->
    <div class="p-6 border-b border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900">Teilen</h3>
        <button
          @click="openShareDialog"
          class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Teilen
        </button>
      </div>

      <!-- Share Status -->
      <div v-if="shares.length > 0" class="space-y-2">
        <div class="text-xs font-medium text-gray-700 mb-2">Geteilt mit:</div>
        <button
          v-for="share in shares"
          :key="share.id"
          @click="openShareDialog"
          class="w-full flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="flex-1 text-left">{{ share.user.displayName || share.user.username }}</span>
          <span class="text-blue-600 font-medium">{{ share.permission === 'READ' ? 'Lesen' : 'Bearbeiten' }}</span>
        </button>
      </div>
      <p v-else class="text-xs text-gray-500">
        Notiz mit anderen Benutzern teilen
      </p>
    </div>

    <!-- Attachments Section -->
    <div class="flex-1 p-6">
      <h3 class="text-sm font-semibold text-gray-900 mb-4">Anhänge</h3>

      <!-- File Upload Area -->
      <div class="mb-6">
        <label
          class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          :class="{ 'border-blue-500 bg-blue-50': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div class="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              class="w-8 h-8 mb-2 text-gray-400"
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
            <p class="mb-2 text-sm text-gray-600">
              <span class="font-semibold">Klicken</span> oder Drag & Drop
            </p>
            <p class="text-xs text-gray-500">Bis zu 50MB pro Datei</p>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            multiple
            @change="handleFileSelect"
          />
        </label>

        <!-- Upload Progress -->
        <div v-if="uploading" class="mt-4">
          <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Hochladen...</span>
            <span>{{ uploadProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: `${uploadProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Upload Error -->
        <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {{ uploadError }}
        </div>
      </div>

      <!-- Attachments List -->
      <div v-if="attachments.length > 0" class="space-y-2">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- File Icon -->
            <div class="flex-shrink-0">
              <svg
                v-if="isImage(attachment.mimeType)"
                class="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg
                v-else
                class="w-8 h-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>

            <!-- File Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">
                {{ attachment.filename }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatFileSize(attachment.size) }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click="downloadAttachment(attachment)"
              class="p-1 text-blue-600 hover:text-blue-900"
              title="Herunterladen"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
            <button
              @click="deleteAttachment(attachment.id)"
              class="p-1 text-red-600 hover:text-red-900"
              title="Löschen"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-gray-500 text-sm">
        Noch keine Anhänge vorhanden
      </div>
    </div>

    <!-- Share Dialog -->
    <ShareDialog
      :is-open="shareDialogOpen"
      type="note"
      :item-id="note.id"
      :item-name="note.title"
      @close="closeShareDialog"
      @shareAdded="handleShareAdded"
      @shareRemoved="handleShareRemoved"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '../api/client';
import ShareDialog from './ShareDialog.vue';

interface Note {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    username: string;
    displayName?: string;
  };
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const props = defineProps<{
  note: Note;
}>();

const emit = defineEmits<{
  attachmentAdded: [];
  attachmentDeleted: [];
}>();

const attachments = ref<Attachment[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadError = ref('');
const shareDialogOpen = ref(false);
const shares = ref<any[]>([]);

onMounted(async () => {
  await loadAttachments();
  await loadShares();
});

async function loadAttachments() {
  try {
    const response = await apiClient.get<{ success: boolean; data: Attachment[] }>(
      `/notes/${props.note.id}/attachments`
    );
    attachments.value = response.data.data;
  } catch (error) {
    console.error('Error loading attachments:', error);
  }
}

async function loadShares() {
  try {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      `/shares/notes/${props.note.id}/shares`
    );
    shares.value = response.data.data;
  } catch (error) {
    console.error('Error loading shares:', error);
    shares.value = [];
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadFiles(Array.from(target.files));
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    uploadFiles(Array.from(event.dataTransfer.files));
  }
}

async function uploadFiles(files: File[]) {
  uploadError.value = '';
  uploading.value = true;
  uploadProgress.value = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Größenprüfung (50MB)
      if (file.size > 50 * 1024 * 1024) {
        uploadError.value = `Datei ${file.name} ist zu groß (max. 50MB)`;
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      await apiClient.post(`/notes/${props.note.id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            uploadProgress.value = Math.round(((i + percentCompleted / 100) / files.length) * 100);
          }
        },
      });
    }

    // Attachments neu laden
    await loadAttachments();
    emit('attachmentAdded');

    // Input zurücksetzen
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    uploadError.value = error.response?.data?.error || 'Fehler beim Hochladen';
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

async function downloadAttachment(attachment: Attachment) {
  try {
    const response = await apiClient.get(`/attachments/${attachment.id}`, {
      responseType: 'blob',
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: attachment.mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Download error:', error);
    alert(error.response?.data?.error || 'Fehler beim Herunterladen');
  }
}

async function deleteAttachment(attachmentId: string) {
  if (!confirm('Möchten Sie diesen Anhang wirklich löschen?')) {
    return;
  }

  try {
    await apiClient.delete(`/attachments/${attachmentId}`);
    await loadAttachments();
    emit('attachmentDeleted');
  } catch (error: any) {
    console.error('Delete error:', error);
    alert(error.response?.data?.error || 'Fehler beim Löschen');
  }
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function openShareDialog() {
  shareDialogOpen.value = true;
}

function closeShareDialog() {
  shareDialogOpen.value = false;
}

async function handleShareAdded() {
  // Dialog bleibt offen, damit User sieht mit wem geteilt wurde
  // Shares neu laden
  await loadShares();
}

async function handleShareRemoved() {
  // Dialog bleibt offen
  // Shares neu laden
  await loadShares();
}
</script>
