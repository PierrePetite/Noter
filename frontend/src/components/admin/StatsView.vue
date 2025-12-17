<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex items-center justify-center py-12">
    <div class="text-gray-600">Lade Statistiken...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
    {{ error }}
  </div>

  <!-- Stats Dashboard -->
  <div v-else-if="stats" class="space-y-6">
    <!-- Benutzer & Content -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Benutzer & Inhalte</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.users.total }}</div>
            <div class="stat-label">Benutzer</div>
            <div class="stat-sub">{{ stats.users.active30Days }} aktiv (30d)</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-green-100 text-green-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.notes.total }}</div>
            <div class="stat-label">Notizen</div>
            <div class="stat-sub">{{ stats.notes.createdToday }} heute erstellt</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-yellow-100 text-yellow-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.folders.total }}</div>
            <div class="stat-label">Ordner</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bg-purple-100 text-purple-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.tags.total }}</div>
            <div class="stat-label">Tags</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Speicher -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Speicher</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="stat-card-large">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900">Verbrauchter Speicher</h3>
            <div class="text-2xl font-bold text-blue-600">{{ stats.storage.totalUsedFormatted }}</div>
          </div>
          <div class="text-sm text-gray-600">
            {{ stats.storage.fileCount }} Dateien hochgeladen
          </div>
        </div>

        <div class="stat-card-large">
          <h3 class="font-semibold text-gray-900 mb-3">Größte Dateien</h3>
          <div v-if="stats.storage.largestFiles.length > 0" class="space-y-2">
            <div v-for="file in stats.storage.largestFiles" :key="file.filename" class="flex items-center justify-between text-sm group">
              <div class="flex-1 min-w-0 mr-2">
                <div class="text-gray-700 truncate">{{ file.filename }}</div>
                <div v-if="file.noteId && file.noteTitle" class="text-xs text-gray-500 mt-0.5">
                  <router-link
                    :to="`/notes/${file.noteId}`"
                    class="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {{ file.noteTitle }}
                  </router-link>
                </div>
                <div v-else class="text-xs text-gray-400 mt-0.5">
                  (Notiz nicht gefunden)
                </div>
              </div>
              <span class="text-gray-500 font-mono flex-shrink-0">{{ file.sizeFormatted }}</span>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">Keine Dateien vorhanden</div>
        </div>
      </div>
    </section>

    <!-- System (LXC Container) -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">System (LXC Container)</h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- CPU -->
        <div class="stat-card-large">
          <h3 class="font-semibold text-gray-900 mb-3">CPU</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Auslastung</span>
              <span class="font-semibold text-gray-900">{{ stats.system.cpu.usage }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all"
                :style="{ width: `${stats.system.cpu.usage}%` }"
              ></div>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              {{ stats.system.cpu.cores }} Cores • {{ stats.system.cpu.model }}
            </div>
          </div>
        </div>

        <!-- RAM -->
        <div class="stat-card-large">
          <h3 class="font-semibold text-gray-900 mb-3">RAM</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Verwendet</span>
              <span class="font-semibold text-gray-900">{{ stats.system.memory.usedFormatted }} / {{ stats.system.memory.totalFormatted }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-green-600 h-2 rounded-full transition-all"
                :style="{ width: `${stats.system.memory.usagePercent}%` }"
              ></div>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              {{ stats.system.memory.usagePercent }}% Auslastung • {{ stats.system.memory.freeFormatted }} frei
            </div>
          </div>
        </div>

        <!-- Uptime -->
        <div class="stat-card-large">
          <h3 class="font-semibold text-gray-900 mb-3">System Info</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Uptime</span>
              <span class="font-semibold text-gray-900">{{ stats.system.uptimeFormatted }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Node.js</span>
              <span class="font-mono text-gray-900">{{ stats.system.nodeVersion }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Platform</span>
              <span class="text-gray-900 truncate ml-2">{{ stats.system.platform }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Aktivität -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
      <div class="stat-card-large">
        <h3 class="font-semibold text-gray-900 mb-3">Aktive Benutzer</h3>
        <div v-if="stats.activity.recentLogins.length > 0" class="space-y-3">
          <div
            v-for="user in stats.activity.recentLogins"
            :key="user.email"
            class="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-b-0"
          >
            <div>
              <div class="font-medium text-gray-900">{{ user.username }}</div>
              <div class="text-xs text-gray-500">{{ user.email }}</div>
            </div>
            <div class="text-xs text-gray-500">{{ formatDate(user.lastActivity) }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500">Keine Aktivitäten</div>
      </div>
    </section>

    <!-- Notizen-Aktivität -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Notizen-Aktivität</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="stat-value text-green-600">{{ stats.notes.createdToday }}</div>
          <div class="stat-label">Heute</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-blue-600">{{ stats.notes.createdThisWeek }}</div>
          <div class="stat-label">Diese Woche</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-purple-600">{{ stats.notes.createdThisMonth }}</div>
          <div class="stat-label">Dieser Monat</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '../../api/client';

interface SystemStats {
  users: { total: number; active30Days: number };
  notes: { total: number; createdToday: number; createdThisWeek: number; createdThisMonth: number };
  folders: { total: number };
  tags: { total: number };
  shares: { noteShares: number; folderShares: number };
  storage: {
    totalUsed: number;
    totalUsedFormatted: string;
    fileCount: number;
    largestFiles: Array<{ filename: string; size: number; sizeFormatted: string }>;
  };
  system: {
    platform: string;
    nodeVersion: string;
    uptime: number;
    uptimeFormatted: string;
    cpu: { model: string; cores: number; usage: number };
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
      totalFormatted: string;
      freeFormatted: string;
      usedFormatted: string;
    };
  };
  activity: {
    recentLogins: Array<{ username: string; email: string; lastActivity: string }>;
  };
}

const stats = ref<SystemStats | null>(null);
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  await loadStats();
});

async function loadStats() {
  loading.value = true;
  error.value = '';

  try {
    const response = await apiClient.get<{ success: boolean; data: SystemStats }>('/admin/stats');
    stats.value = response.data.data;
  } catch (err: any) {
    console.error('Error loading admin stats:', err);
    error.value = err.response?.data?.error || 'Fehler beim Laden der Statistiken';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Heute';
  } else if (diffDays === 1) {
    return 'Gestern';
  } else if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  } else {
    return date.toLocaleDateString('de-DE');
  }
}
</script>

<style scoped>
.stat-card {
  @apply bg-white rounded-lg shadow p-4 border border-gray-200 flex items-start gap-4;
}

.stat-card-large {
  @apply bg-white rounded-lg shadow p-6 border border-gray-200;
}

.stat-icon {
  @apply rounded-full p-3 flex-shrink-0;
}

.stat-content {
  @apply flex-1;
}

.stat-value {
  @apply text-3xl font-bold text-gray-900 mb-1;
}

.stat-label {
  @apply text-sm font-medium text-gray-600;
}

.stat-sub {
  @apply text-xs text-gray-500 mt-1;
}
</style>
