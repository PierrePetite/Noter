<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Noter</h1>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ user?.displayName || user?.username }}</span>
          <button
            @click="handleLogout"
            class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Willkommen bei Noter!</h2>
        <div class="space-y-4">
          <div class="p-4 bg-blue-50 rounded-lg">
            <h3 class="font-medium text-blue-900 mb-2">Backend läuft erfolgreich!</h3>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>✅ Setup abgeschlossen</li>
              <li>✅ Authentifizierung funktioniert</li>
              <li>✅ API ist erreichbar</li>
              <li>✅ 35+ Endpoints verfügbar</li>
              <li>✅ TipTap Editor integriert</li>
            </ul>
          </div>

          <div class="p-4 bg-green-50 rounded-lg">
            <h3 class="font-medium text-green-900 mb-2">Schnellzugriff</h3>
            <div class="space-y-2">
              <button
                @click="$router.push('/notes')"
                class="w-full text-left px-4 py-3 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <div class="font-medium text-green-900">📝 Notizen verwalten</div>
                <div class="text-sm text-green-700">Erstelle und bearbeite deine Notizen</div>
              </button>
            </div>
          </div>

          <div class="p-4 bg-gray-50 rounded-lg">
            <h3 class="font-medium text-gray-900 mb-2">Nächste Features</h3>
            <ul class="text-sm text-gray-700 space-y-1">
              <li>→ Ordner-Verwaltung UI</li>
              <li>→ Freigabe-Funktionen UI</li>
              <li>→ Tags und Kategorien</li>
            </ul>
          </div>

          <div v-if="stats" class="grid grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 rounded-lg text-center">
              <div class="text-3xl font-bold text-gray-900">{{ stats.notes }}</div>
              <div class="text-sm text-gray-600">Notizen</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center">
              <div class="text-3xl font-bold text-gray-900">{{ stats.folders }}</div>
              <div class="text-sm text-gray-600">Ordner</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center">
              <div class="text-3xl font-bold text-gray-900">{{ stats.users }}</div>
              <div class="text-sm text-gray-600">Benutzer</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../api/client';

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'));
const stats = ref<any>(null);

onMounted(async () => {
  try {
    const response = await apiClient.get('/setup/status');
    stats.value = response.data.data.stats;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
});

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}
</script>
