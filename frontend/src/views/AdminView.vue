<template>
  <MainLayout>
    <template #default>
      <div class="h-full flex flex-col">
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900">Admin-Panel</h1>
          <p class="text-sm text-gray-600 mt-1">System-Verwaltung und Überwachung</p>
        </header>

        <!-- Tabs -->
        <div class="bg-white border-b border-gray-200 px-6">
          <div class="flex gap-6">
            <button
              @click="activeTab = 'stats'"
              class="px-3 py-3 text-sm font-medium border-b-2 transition-colors"
              :class="
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              "
            >
              Statistiken
            </button>
            <button
              @click="activeTab = 'users'"
              class="px-3 py-3 text-sm font-medium border-b-2 transition-colors"
              :class="
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              "
            >
              Benutzer-Verwaltung
            </button>
            <button
              @click="activeTab = 'backups'"
              class="px-3 py-3 text-sm font-medium border-b-2 transition-colors"
              :class="
                activeTab === 'backups'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              "
            >
              Backups
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-6">
          <!-- Stats Tab -->
          <div v-if="activeTab === 'stats'">
            <StatsView />
          </div>

          <!-- Users Tab -->
          <div v-if="activeTab === 'users'">
            <UserManagementView />
          </div>

          <!-- Backups Tab -->
          <div v-if="activeTab === 'backups'">
            <BackupsView />
          </div>
        </main>
      </div>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MainLayout from '../layouts/MainLayout.vue';
import StatsView from '../components/admin/StatsView.vue';
import UserManagementView from '../components/admin/UserManagementView.vue';
import BackupsView from '../components/admin/BackupsView.vue';

const activeTab = ref<'stats' | 'users' | 'backups'>('stats');
</script>
