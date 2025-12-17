<template>
  <div class="relative" ref="searchContainer">
    <!-- Search Input -->
    <div class="relative">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Suche... (⌘K / Ctrl+K)"
        class="w-full px-4 py-2 pl-10 pr-4 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @input="handleInput"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectResult"
        @keydown.esc="closeDropdown"
        @focus="showDropdown = true"
      />
      <svg
        class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="showDropdown && (searchResults.length > 0 || (searchQuery.length > 0 && !isLoading))"
      class="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
    >
      <!-- Loading State -->
      <div v-if="isLoading" class="px-4 py-3 text-gray-500 text-center">
        <svg
          class="animate-spin h-5 w-5 mx-auto text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      <!-- No Results -->
      <div v-else-if="searchResults.length === 0 && searchQuery.length > 0" class="px-4 py-3 text-gray-500 text-center">
        Keine Notizen gefunden
      </div>

      <!-- Results List -->
      <div v-else>
        <button
          v-for="(result, index) in searchResults"
          :key="result.id"
          @click="openNote(result.id)"
          @mouseenter="selectedIndex = index"
          :class="[
            'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0',
            selectedIndex === index ? 'bg-blue-50' : ''
          ]"
        >
          <div class="font-medium text-gray-900" v-html="highlightMatch(result.title)"></div>
          <div class="text-sm text-gray-500 mt-1 truncate" v-if="result.folder">
            📁 {{ result.folder.name }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {{ formatDate(result.updatedAt) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { notesApi } from '../api/notes';

const router = useRouter();
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const showDropdown = ref(false);
const isLoading = ref(false);
const selectedIndex = ref(0);
const searchContainer = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

let debounceTimeout: number | null = null;

// Handle input with debouncing
const handleInput = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  if (searchQuery.value.trim().length === 0) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }

  isLoading.value = true;
  showDropdown.value = true;

  debounceTimeout = setTimeout(async () => {
    try {
      const results = await notesApi.search(searchQuery.value);
      searchResults.value = results;
      selectedIndex.value = 0;
    } catch (error) {
      console.error('Search error:', error);
      searchResults.value = [];
    } finally {
      isLoading.value = false;
    }
  }, 300);
};

// Keyboard navigation
const navigateDown = () => {
  if (selectedIndex.value < searchResults.value.length - 1) {
    selectedIndex.value++;
  }
};

const navigateUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
};

const selectResult = () => {
  if (searchResults.value.length > 0 && selectedIndex.value >= 0) {
    openNote(searchResults.value[selectedIndex.value].id);
  }
};

const closeDropdown = () => {
  showDropdown.value = false;
  searchQuery.value = '';
  searchResults.value = [];
};

// Open note
const openNote = (noteId: string) => {
  router.push(`/notes/${noteId}`);
  closeDropdown();
  searchInput.value?.blur();
};

// Highlight matching text
const highlightMatch = (text: string) => {
  if (!searchQuery.value) return text;

  const regex = new RegExp(`(${escapeRegex(searchQuery.value)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
};

const escapeRegex = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Format date
const formatDate = (dateString: string) => {
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
};

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
};

// Global keyboard shortcut (Cmd/Ctrl + K)
const handleGlobalShortcut = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    searchInput.value?.focus();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleGlobalShortcut);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleGlobalShortcut);
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
