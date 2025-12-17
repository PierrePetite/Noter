<template>
  <div class="tiptap-editor">
    <!-- Toolbar -->
    <div v-if="editor" class="editor-toolbar">
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="toolbar-button"
          type="button"
          title="Fett"
        >
          <strong>B</strong>
        </button>
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="toolbar-button"
          type="button"
          title="Kursiv"
        >
          <em>I</em>
        </button>
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="toolbar-button"
          type="button"
          title="Durchgestrichen"
        >
          <s>S</s>
        </button>
        <button
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ 'is-active': editor.isActive('code') }"
          class="toolbar-button"
          type="button"
          title="Code"
        >
          &lt;/&gt;
        </button>
        <button
          @click="editor.chain().focus().toggleHighlight().run()"
          :class="{ 'is-active': editor.isActive('highlight') }"
          class="toolbar-button"
          type="button"
          title="Hervorheben"
        >
          H
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
          class="toolbar-button"
          type="button"
          title="Überschrift 1"
        >
          H1
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
          class="toolbar-button"
          type="button"
          title="Überschrift 2"
        >
          H2
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          class="toolbar-button"
          type="button"
          title="Überschrift 3"
        >
          H3
        </button>
        <button
          @click="editor.chain().focus().setParagraph().run()"
          :class="{ 'is-active': editor.isActive('paragraph') }"
          class="toolbar-button"
          type="button"
          title="Absatz"
        >
          P
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="toolbar-button"
          type="button"
          title="Aufzählungsliste"
        >
          •
        </button>
        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="toolbar-button"
          type="button"
          title="Nummerierte Liste"
        >
          1.
        </button>
        <button
          @click="editor.chain().focus().toggleTaskList().run()"
          :class="{ 'is-active': editor.isActive('taskList') }"
          class="toolbar-button"
          type="button"
          title="Aufgabenliste"
        >
          ✓
        </button>
        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          class="toolbar-button"
          type="button"
          title="Code-Block"
        >
          { }
        </button>
        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          class="toolbar-button"
          type="button"
          title="Zitat"
        >
          "
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="addLink"
          :class="{ 'is-active': editor.isActive('link') }"
          class="toolbar-button"
          type="button"
          title="Link"
        >
          🔗
        </button>
        <button
          @click="triggerImageUpload"
          class="toolbar-button"
          type="button"
          title="Bild einfügen"
        >
          🖼️
        </button>
        <button
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="toolbar-button"
          type="button"
          title="Horizontale Linie"
        >
          ―
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <!-- Table Controls -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
          class="toolbar-button"
          type="button"
          title="Tabelle einfügen (3x3)"
        >
          ⊞
        </button>
        <button
          @click="editor.chain().focus().addColumnBefore().run()"
          :disabled="!editor.can().addColumnBefore()"
          class="toolbar-button"
          type="button"
          title="Spalte links einfügen"
        >
          ⊳
        </button>
        <button
          @click="editor.chain().focus().addColumnAfter().run()"
          :disabled="!editor.can().addColumnAfter()"
          class="toolbar-button"
          type="button"
          title="Spalte rechts einfügen"
        >
          ⊲
        </button>
        <button
          @click="editor.chain().focus().addRowBefore().run()"
          :disabled="!editor.can().addRowBefore()"
          class="toolbar-button"
          type="button"
          title="Zeile oben einfügen"
        >
          ⊤
        </button>
        <button
          @click="editor.chain().focus().addRowAfter().run()"
          :disabled="!editor.can().addRowAfter()"
          class="toolbar-button"
          type="button"
          title="Zeile unten einfügen"
        >
          ⊥
        </button>
        <button
          @click="editor.chain().focus().deleteColumn().run()"
          :disabled="!editor.can().deleteColumn()"
          class="toolbar-button"
          type="button"
          title="Spalte löschen"
        >
          ⊟
        </button>
        <button
          @click="editor.chain().focus().deleteRow().run()"
          :disabled="!editor.can().deleteRow()"
          class="toolbar-button"
          type="button"
          title="Zeile löschen"
        >
          ━
        </button>
        <button
          @click="editor.chain().focus().deleteTable().run()"
          :disabled="!editor.can().deleteTable()"
          class="toolbar-button"
          type="button"
          title="Tabelle löschen"
        >
          ⊠
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="toolbar-button"
          type="button"
          title="Rückgängig"
        >
          ↶
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="toolbar-button"
          type="button"
          title="Wiederholen"
        >
          ↷
        </button>
      </div>
    </div>

    <!-- Editor Content -->
    <editor-content :editor="editor" class="editor-content" />

    <!-- Hidden File Input for Image Upload -->
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageSelect"
    />

    <!-- Upload Progress -->
    <div v-if="isUploading" class="upload-overlay">
      <div class="upload-spinner"></div>
      <span>Bild wird hochgeladen...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { common, createLowlight } from 'lowlight';
import { imagesApi } from '../api/images';

const lowlight = createLowlight(common);
const imageInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      codeBlock: false, // Wir verwenden CodeBlockLowlight stattdessen
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Schreibe deine Notiz...',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline hover:text-blue-800',
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg my-4',
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight.configure({
      multicolor: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'table-auto border-collapse',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none',
    },
    // Drag & Drop Handler für Bilder
    handleDrop(view, event, slice, moved) {
      if (!moved && event.dataTransfer?.files?.length) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          uploadImageFile(file);
          return true;
        }
      }
      return false;
    },
    // Paste Handler für Bilder aus Zwischenablage
    handlePaste(view, event) {
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) uploadImageFile(file);
            return true;
          }
        }
      }
      return false;
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML());
  },
});

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && editor.value.getHTML() !== newValue) {
      editor.value.commands.setContent(newValue, false);
    }
  }
);

function addLink() {
  if (!editor.value) return;

  const previousUrl = editor.value.getAttributes('link').href;
  const url = window.prompt('URL eingeben:', previousUrl);

  if (url === null) return;

  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

// Image Upload Functions
function triggerImageUpload() {
  imageInput.value?.click();
}

async function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    await uploadImageFile(file);
    // Reset input
    target.value = '';
  }
}

async function uploadImageFile(file: File) {
  if (!editor.value) return;

  // Validiere Bild
  const validation = imagesApi.validateImage(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  isUploading.value = true;

  try {
    const uploadedImage = await imagesApi.upload(file);

    // Bild in Editor einfügen
    editor.value
      .chain()
      .focus()
      .setImage({ src: uploadedImage.url, alt: uploadedImage.filename })
      .run();
  } catch (error: any) {
    console.error('Image upload failed:', error);
    alert(error.response?.data?.error || 'Fehler beim Hochladen des Bildes');
  } finally {
    isUploading.value = false;
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
.tiptap-editor {
  @apply border border-gray-300 rounded-lg overflow-hidden bg-white relative;
}

.editor-toolbar {
  @apply flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap;
}

.toolbar-group {
  @apply flex items-center gap-1;
}

.toolbar-divider {
  @apply w-px h-6 bg-gray-300 mx-1;
}

.toolbar-button {
  @apply px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors min-w-[32px] h-8 flex items-center justify-center;
}

.toolbar-button.is-active {
  @apply bg-blue-100 text-blue-700;
}

.toolbar-button:disabled {
  @apply opacity-30 cursor-not-allowed hover:bg-transparent;
}

.editor-content {
  @apply p-4 min-h-[300px] max-h-[600px] overflow-y-auto;
}

/* TipTap Styles */
:deep(.ProseMirror) {
  @apply focus:outline-none;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  @apply text-gray-400 float-left h-0 pointer-events-none;
}

:deep(.ProseMirror h1) {
  @apply text-3xl font-bold mt-6 mb-4;
}

:deep(.ProseMirror h2) {
  @apply text-2xl font-bold mt-5 mb-3;
}

:deep(.ProseMirror h3) {
  @apply text-xl font-bold mt-4 mb-2;
}

:deep(.ProseMirror ul) {
  @apply list-disc pl-6 my-3;
}

:deep(.ProseMirror ol) {
  @apply list-decimal pl-6 my-3;
}

:deep(.ProseMirror ul[data-type="taskList"]) {
  @apply list-none pl-0;
}

:deep(.ProseMirror ul[data-type="taskList"] li) {
  @apply flex items-start gap-2;
}

:deep(.ProseMirror ul[data-type="taskList"] li input) {
  @apply mt-1;
}

:deep(.ProseMirror code) {
  @apply bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono;
}

:deep(.ProseMirror pre) {
  @apply bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto;
}

:deep(.ProseMirror pre code) {
  @apply bg-transparent p-0 text-sm;
}

:deep(.ProseMirror blockquote) {
  @apply border-l-4 border-gray-300 pl-4 italic my-4;
}

:deep(.ProseMirror hr) {
  @apply my-6 border-t-2 border-gray-300;
}

:deep(.ProseMirror mark) {
  @apply bg-yellow-200;
}

:deep(.ProseMirror a) {
  @apply text-blue-600 underline hover:text-blue-800;
}

:deep(.ProseMirror img) {
  @apply max-w-full h-auto rounded-lg my-4 cursor-pointer;
}

:deep(.ProseMirror img:hover) {
  @apply ring-2 ring-blue-500;
}

/* Tables */
:deep(.ProseMirror table) {
  @apply border-collapse w-full my-4;
}

:deep(.ProseMirror table td),
:deep(.ProseMirror table th) {
  @apply border border-gray-300 px-3 py-2 text-left;
  min-width: 100px;
}

:deep(.ProseMirror table th) {
  @apply bg-gray-100 font-semibold;
}

:deep(.ProseMirror table .selectedCell) {
  @apply bg-blue-50;
}

:deep(.ProseMirror table .column-resize-handle) {
  @apply absolute top-0 right-0 w-1 h-full bg-blue-500 pointer-events-none;
}

/* Upload Overlay */
.upload-overlay {
  @apply absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-3 text-white rounded-lg z-10;
}

.upload-spinner {
  @apply w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin;
}
</style>
