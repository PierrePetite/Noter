<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Noter Setup</h1>
        <p class="text-gray-600">Willkommen! Erstelle deinen Administrator-Account</p>
      </div>

      <form @submit.prevent="handleSetup" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Benutzername
          </label>
          <input
            v-model="form.username"
            type="text"
            required
            minlength="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            E-Mail
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@noter.local"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Anzeigename (optional)
          </label>
          <input
            v-model="form.displayName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Administrator"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Passwort
          </label>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mindestens 8 Zeichen"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Passwort bestätigen
          </label>
          <input
            v-model="form.passwordConfirm"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Passwort wiederholen"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Wird erstellt...' : 'Administrator-Account erstellen' }}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        <p>Dieser Account erhält Admin-Rechte und kann später weitere Benutzer anlegen.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../api/client';

const router = useRouter();

const form = ref({
  username: '',
  email: '',
  displayName: '',
  password: '',
  passwordConfirm: '',
});

const loading = ref(false);
const error = ref('');

async function handleSetup() {
  error.value = '';

  // Validierung
  if (form.value.password !== form.value.passwordConfirm) {
    error.value = 'Passwörter stimmen nicht überein';
    return;
  }

  if (form.value.password.length < 8) {
    error.value = 'Passwort muss mindestens 8 Zeichen lang sein';
    return;
  }

  loading.value = true;

  try {
    const response = await apiClient.post('/setup/init', {
      username: form.value.username,
      email: form.value.email,
      displayName: form.value.displayName || undefined,
      password: form.value.password,
    });

    // Token und User speichern
    localStorage.setItem('token', response.data.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));

    // Zur Hauptseite weiterleiten
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Setup fehlgeschlagen';
  } finally {
    loading.value = false;
  }
}
</script>
