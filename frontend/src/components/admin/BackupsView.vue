<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex items-center justify-center py-12">
    <div class="text-gray-600">Lade Backups...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
    {{ error }}
  </div>

  <!-- Backups Dashboard -->
  <div v-else class="space-y-6">
    <!-- Header with Create Button -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Backups</h2>
        <p class="text-sm text-gray-600 mt-1">
          Erstelle und verwalte Backups deiner Daten
        </p>
      </div>
      <button
        @click="createBackup"
        :disabled="creating"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg v-if="creating" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ creating ? 'Erstelle Backup...' : 'Neues Backup' }}
      </button>
    </div>

    <!-- Scheduler Configuration -->
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Automatische Backups
        </h3>
      </div>

      <div class="px-6 py-4 space-y-4">
        <!-- Enable/Disable Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">Automatische Backups aktivieren</p>
            <p class="text-sm text-gray-600">Erstelle Backups nach Zeitplan</p>
          </div>
          <button
            @click="toggleScheduler"
            :disabled="scheduleLoading"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="schedule.enabled ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="schedule.enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <!-- Schedule Settings (nur wenn aktiviert) -->
        <div v-if="schedule.enabled" class="space-y-4 pt-4 border-t border-gray-200">
          <!-- Cron Schedule -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Zeitplan
            </label>
            <div class="flex gap-2">
              <select
                v-model="schedulePreset"
                @change="applySchedulePreset"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="custom">Benutzerdefiniert</option>
                <option value="0 2 * * *">Täglich um 2:00 Uhr</option>
                <option value="0 3 * * 0">Wöchentlich (Sonntag 3:00 Uhr)</option>
                <option value="0 4 1 * *">Monatlich (1. Tag, 4:00 Uhr)</option>
                <option value="0 * * * *">Stündlich</option>
              </select>
              <input
                v-if="schedulePreset === 'custom'"
                v-model="schedule.cronSchedule"
                @blur="validateSchedule"
                type="text"
                placeholder="0 2 * * *"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p v-if="cronDescription" class="text-sm text-gray-600 mt-1">
              📅 {{ cronDescription }}
            </p>
            <p v-if="cronValidationError" class="text-sm text-red-600 mt-1">
              ❌ {{ cronValidationError }}
            </p>
          </div>

          <!-- Provider Selection (für zukünftige GDrive Integration) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Backup-Ziel
            </label>
            <select
              v-model="schedule.provider"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="local">Lokal (Server)</option>
              <option value="gdrive" disabled>Google Drive (Coming Soon)</option>
              <option value="s3" disabled>S3 Storage (Coming Soon)</option>
            </select>
          </div>

          <!-- Retention Policy -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Aufbewahrungsdauer
            </label>
            <div class="flex items-center gap-4">
              <input
                v-model.number="schedule.retention"
                type="number"
                min="0"
                max="365"
                class="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <span class="text-sm text-gray-600">
                Tage (0 = unbegrenzt)
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Ältere automatische Backups werden automatisch gelöscht
            </p>
          </div>

          <!-- Last & Next Run -->
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p class="text-xs text-gray-500 uppercase">Letzter Durchlauf</p>
              <p class="text-sm font-medium text-gray-900">
                {{ schedule.lastRun ? formatDate(schedule.lastRun) : 'Noch nie' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 uppercase">Nächster Durchlauf</p>
              <p class="text-sm font-medium text-gray-900">
                {{ schedule.nextRun ? formatDate(schedule.nextRun) : 'Berechne...' }}
              </p>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-4 border-t border-gray-200">
            <button
              @click="saveSchedule"
              :disabled="scheduleLoading || !!cronValidationError"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ scheduleLoading ? 'Speichere...' : 'Zeitplan speichern' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Box -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm text-blue-800">
          <p class="font-medium mb-1">Backup-Inhalt:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Komplette Datenbank (Notizen, Ordner, Benutzer, etc.)</li>
            <li>Alle hochgeladenen Dateien (Bilder, Attachments)</li>
            <li>Metadaten und Statistiken</li>
          </ul>
          <p class="mt-2 text-xs text-blue-700">
            ⚠️ Backups enthalten keine App-Konfiguration (.env) aus Sicherheitsgründen
          </p>
        </div>
      </div>
    </div>

    <!-- Backups List -->
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="font-semibold text-gray-900">
          Vorhandene Backups ({{ backups.length }})
        </h3>
      </div>

      <div v-if="backups.length === 0" class="px-6 py-12 text-center text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <p class="text-lg font-medium mb-2">Noch keine Backups vorhanden</p>
        <p class="text-sm">Erstelle dein erstes Backup mit dem Button oben</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="backup in backups"
          :key="backup.id"
          class="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <!-- Status Icon -->
            <div class="flex-shrink-0">
              <div
                v-if="backup.status === 'COMPLETED'"
                class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div
                v-else-if="backup.status === 'IN_PROGRESS'"
                class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <div class="font-medium text-gray-900">
                  {{ formatDate(backup.createdAt) }}
                </div>
                <span
                  class="px-2 py-0.5 text-xs rounded-full"
                  :class="backup.type === 'MANUAL' ? 'bg-gray-100 text-gray-700' : 'bg-purple-100 text-purple-700'"
                >
                  {{ backup.type === 'MANUAL' ? 'Manuell' : 'Automatisch' }}
                </span>
              </div>

              <div class="text-sm text-gray-600 mt-1">
                {{ formatSize(backup.size) }}
                <template v-if="backup.metadata?.statistics">
                  • {{ backup.metadata.statistics.notes }} Notizen
                  • {{ backup.metadata.statistics.users }} Benutzer
                  • {{ backup.metadata.statistics.folders }} Ordner
                </template>
              </div>

              <div v-if="backup.error" class="text-sm text-red-600 mt-1">
                ❌ {{ backup.error }}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                v-if="backup.status === 'COMPLETED'"
                @click="downloadBackup(backup)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Herunterladen"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <button
                @click="deleteBackup(backup)"
                :disabled="deleting === backup.id"
                class="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                title="Löschen"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { backupsApi, type Backup, type BackupSchedule } from '../../api/backups';

const backups = ref<Backup[]>([]);
const loading = ref(false);
const error = ref('');
const creating = ref(false);
const deleting = ref<string | null>(null);

// Scheduler State
const schedule = ref<BackupSchedule>({
  id: '',
  enabled: false,
  cronSchedule: '0 2 * * *',
  provider: 'local',
  retention: 30,
  lastRun: null,
  nextRun: null,
  createdAt: '',
  updatedAt: '',
});
const scheduleLoading = ref(false);
const schedulePreset = ref<string>('0 2 * * *');
const cronDescription = ref<string>('');
const cronValidationError = ref<string>('');

onMounted(async () => {
  await loadBackups();
  await loadSchedule();
});

async function loadBackups() {
  loading.value = true;
  error.value = '';

  try {
    backups.value = await backupsApi.getAll();
  } catch (err: any) {
    console.error('Error loading backups:', err);
    error.value = err.response?.data?.error || 'Fehler beim Laden der Backups';
  } finally {
    loading.value = false;
  }
}

async function createBackup() {
  creating.value = true;
  error.value = '';

  try {
    await backupsApi.create();
    await loadBackups();
  } catch (err: any) {
    console.error('Error creating backup:', err);
    error.value = err.response?.data?.error || 'Fehler beim Erstellen des Backups';
  } finally {
    creating.value = false;
  }
}

async function downloadBackup(backup: Backup) {
  try {
    const blob = await backupsApi.download(backup.id);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.path || `backup_${backup.id}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Error downloading backup:', err);
    alert(err.response?.data?.error || 'Fehler beim Herunterladen des Backups');
  }
}

async function deleteBackup(backup: Backup) {
  if (!confirm(`Möchtest du das Backup vom ${formatDate(backup.createdAt)} wirklich löschen?`)) {
    return;
  }

  deleting.value = backup.id;

  try {
    await backupsApi.delete(backup.id);
    await loadBackups();
  } catch (err: any) {
    console.error('Error deleting backup:', err);
    alert(err.response?.data?.error || 'Fehler beim Löschen des Backups');
  } finally {
    deleting.value = null;
  }
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

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Scheduler Functions
async function loadSchedule() {
  try {
    const data = await backupsApi.getSchedule();
    schedule.value = data;

    // Erkenne Preset
    detectSchedulePreset();

    // Validiere und hole Beschreibung
    if (data.cronSchedule) {
      await validateSchedule();
    }
  } catch (err: any) {
    console.error('Error loading schedule:', err);
  }
}

function detectSchedulePreset() {
  const presets = ['0 2 * * *', '0 3 * * 0', '0 4 1 * *', '0 * * * *'];
  if (presets.includes(schedule.value.cronSchedule)) {
    schedulePreset.value = schedule.value.cronSchedule;
  } else {
    schedulePreset.value = 'custom';
  }
}

function applySchedulePreset() {
  if (schedulePreset.value !== 'custom') {
    schedule.value.cronSchedule = schedulePreset.value;
    validateSchedule();
  }
}

async function validateSchedule() {
  cronValidationError.value = '';
  cronDescription.value = '';

  if (!schedule.value.cronSchedule) {
    return;
  }

  try {
    const result = await backupsApi.validateCron(schedule.value.cronSchedule);

    if (result.valid) {
      cronDescription.value = result.description || '';
    } else {
      cronValidationError.value = 'Ungültige Cron-Expression';
    }
  } catch (err: any) {
    console.error('Error validating cron:', err);
    cronValidationError.value = 'Fehler bei der Validierung';
  }
}

async function toggleScheduler() {
  scheduleLoading.value = true;

  try {
    await backupsApi.updateSchedule({
      enabled: !schedule.value.enabled,
    });

    await loadSchedule();
    await loadBackups(); // Refresh backups list
  } catch (err: any) {
    console.error('Error toggling scheduler:', err);
    alert(err.response?.data?.error || 'Fehler beim Aktivieren/Deaktivieren');
  } finally {
    scheduleLoading.value = false;
  }
}

async function saveSchedule() {
  scheduleLoading.value = true;
  cronValidationError.value = '';

  try {
    await backupsApi.updateSchedule({
      enabled: schedule.value.enabled,
      cronSchedule: schedule.value.cronSchedule,
      provider: schedule.value.provider,
      retention: schedule.value.retention,
    });

    await loadSchedule();

    // Success feedback
    alert('Zeitplan erfolgreich gespeichert!');
  } catch (err: any) {
    console.error('Error saving schedule:', err);
    cronValidationError.value = err.response?.data?.error || 'Fehler beim Speichern';
  } finally {
    scheduleLoading.value = false;
  }
}
</script>
