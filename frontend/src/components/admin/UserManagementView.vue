<template>
  <div class="space-y-6">
    <!-- Header mit Add Button -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Benutzer-Verwaltung</h2>
        <p class="text-sm text-gray-600 mt-1">Verwalten Sie Benutzerkonten und Berechtigungen</p>
      </div>
      <button
        @click="openCreateDialog"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Neuer Benutzer
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-gray-600">Lade Benutzer...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
      {{ error }}
    </div>

    <!-- Users Table -->
    <div v-else class="bg-white rounded-lg shadow border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benutzer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erstellt</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold text-sm">{{ getUserInitials(user.username) }}</span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.displayName || user.username }}</div>
                    <div class="text-sm text-gray-500">@{{ user.username }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ user.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  :class="user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'"
                >
                  {{ user.isAdmin ? 'Admin' : 'Benutzer' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="openEditDialog(user)"
                  class="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Bearbeiten
                </button>
                <button
                  @click="openDeleteDialog(user)"
                  class="text-red-600 hover:text-red-900"
                >
                  Löschen
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="users.length === 0" class="text-center py-12 text-gray-500">
        Keine Benutzer gefunden
      </div>
    </div>

    <!-- Create/Edit User Dialog -->
    <div
      v-if="userDialog.isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeUserDialog"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ userDialog.mode === 'create' ? 'Neuer Benutzer' : 'Benutzer bearbeiten' }}
          </h3>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              v-model="userDialog.formData.email"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              v-model="userDialog.formData.username"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
            <input
              v-model="userDialog.formData.displayName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Passwort {{ userDialog.mode === 'edit' ? '(leer lassen für keine Änderung)' : '*' }}
            </label>
            <input
              v-model="userDialog.formData.password"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="userDialog.formData.isAdmin"
              type="checkbox"
              id="isAdmin"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="isAdmin" class="ml-2 text-sm text-gray-700">
              Admin-Berechtigung
            </label>
          </div>

          <div v-if="userDialog.error" class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {{ userDialog.error }}
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            @click="closeUserDialog"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="saveUser"
            :disabled="userDialog.saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ userDialog.saving ? 'Speichere...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div
      v-if="deleteDialog.isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeDeleteDialog"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Benutzer löschen</h3>
        </div>

        <div class="px-6 py-4">
          <p class="text-gray-700">
            Möchten Sie den Benutzer <strong>{{ deleteDialog.user?.username }}</strong> wirklich löschen?
          </p>
          <p class="text-sm text-gray-600 mt-2">
            Alle Notizen, Ordner und Daten dieses Benutzers werden unwiderruflich gelöscht.
          </p>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            @click="closeDeleteDialog"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="confirmDelete"
            :disabled="deleteDialog.deleting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {{ deleteDialog.deleting ? 'Löschen...' : 'Löschen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '../../api/client';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');

const userDialog = ref<{
  isOpen: boolean;
  mode: 'create' | 'edit';
  user: User | null;
  formData: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    isAdmin: boolean;
  };
  saving: boolean;
  error: string;
}>({
  isOpen: false,
  mode: 'create',
  user: null,
  formData: {
    email: '',
    username: '',
    displayName: '',
    password: '',
    isAdmin: false,
  },
  saving: false,
  error: '',
});

const deleteDialog = ref<{
  isOpen: boolean;
  user: User | null;
  deleting: boolean;
}>({
  isOpen: false,
  user: null,
  deleting: false,
});

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  loading.value = true;
  error.value = '';

  try {
    const response = await apiClient.get<{ success: boolean; data: User[] }>('/admin/users');
    users.value = response.data.data;
  } catch (err: any) {
    console.error('Error loading users:', err);
    error.value = err.response?.data?.error || 'Fehler beim Laden der Benutzer';
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  userDialog.value = {
    isOpen: true,
    mode: 'create',
    user: null,
    formData: {
      email: '',
      username: '',
      displayName: '',
      password: '',
      isAdmin: false,
    },
    saving: false,
    error: '',
  };
}

function openEditDialog(user: User) {
  userDialog.value = {
    isOpen: true,
    mode: 'edit',
    user,
    formData: {
      email: user.email,
      username: user.username,
      displayName: user.displayName || '',
      password: '',
      isAdmin: user.isAdmin,
    },
    saving: false,
    error: '',
  };
}

function closeUserDialog() {
  userDialog.value.isOpen = false;
}

async function saveUser() {
  userDialog.value.error = '';

  // Validierung
  if (!userDialog.value.formData.email || !userDialog.value.formData.username) {
    userDialog.value.error = 'Email und Username sind erforderlich';
    return;
  }

  if (userDialog.value.mode === 'create' && !userDialog.value.formData.password) {
    userDialog.value.error = 'Passwort ist erforderlich';
    return;
  }

  userDialog.value.saving = true;

  try {
    if (userDialog.value.mode === 'create') {
      await apiClient.post('/admin/users', userDialog.value.formData);
    } else {
      const updateData: any = {
        email: userDialog.value.formData.email,
        username: userDialog.value.formData.username,
        displayName: userDialog.value.formData.displayName || null,
        isAdmin: userDialog.value.formData.isAdmin,
      };

      if (userDialog.value.formData.password) {
        updateData.password = userDialog.value.formData.password;
      }

      await apiClient.put(`/admin/users/${userDialog.value.user!.id}`, updateData);
    }

    closeUserDialog();
    await loadUsers();
  } catch (err: any) {
    console.error('Error saving user:', err);
    userDialog.value.error = err.response?.data?.error || 'Fehler beim Speichern';
  } finally {
    userDialog.value.saving = false;
  }
}

function openDeleteDialog(user: User) {
  deleteDialog.value = {
    isOpen: true,
    user,
    deleting: false,
  };
}

function closeDeleteDialog() {
  deleteDialog.value.isOpen = false;
}

async function confirmDelete() {
  if (!deleteDialog.value.user) return;

  deleteDialog.value.deleting = true;

  try {
    await apiClient.delete(`/admin/users/${deleteDialog.value.user.id}`);
    closeDeleteDialog();
    await loadUsers();
  } catch (err: any) {
    console.error('Error deleting user:', err);
    alert(err.response?.data?.error || 'Fehler beim Löschen des Benutzers');
  } finally {
    deleteDialog.value.deleting = false;
  }
}

function getUserInitials(username: string): string {
  return username.substring(0, 2).toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
</script>
