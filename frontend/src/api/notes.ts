import apiClient from './client';

export interface Note {
  id: string;
  title: string;
  content: any; // TipTap JSON or string
  folderId?: string | null;
  folder?: {
    id: string;
    name: string;
  };
  isFavorite?: boolean;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  title: string;
  content?: string;
  folderId?: string;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  folderId?: string;
}

export const notesApi = {
  // Alle Notizen abrufen
  async getAll() {
    const response = await apiClient.get<{ success: boolean; data: Note[] }>('/notes');
    return response.data.data;
  },

  // Einzelne Notiz abrufen
  async getById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: Note }>(`/notes/${id}`);
    return response.data.data;
  },

  // Neue Notiz erstellen
  async create(data: CreateNoteDto) {
    const response = await apiClient.post<{ success: boolean; data: Note }>('/notes', data);
    return response.data.data;
  },

  // Notiz aktualisieren
  async update(id: string, data: UpdateNoteDto) {
    const response = await apiClient.put<{ success: boolean; data: Note }>(`/notes/${id}`, data);
    return response.data.data;
  },

  // Notiz löschen
  async delete(id: string) {
    await apiClient.delete(`/notes/${id}`);
  },

  // Notizen durchsuchen
  async search(query: string) {
    const response = await apiClient.get<{ success: boolean; data: Note[] }>(`/notes/search?q=${encodeURIComponent(query)}`);
    return response.data.data;
  },
};
