import apiClient from './client';

export interface ShareUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
}

export interface NoteShare {
  id: string;
  noteId: string;
  userId: string;
  permission: 'READ' | 'WRITE';
  createdAt: string;
  user: ShareUser;
}

export interface FolderShare {
  id: string;
  folderId: string;
  userId: string;
  permission: 'READ' | 'WRITE';
  createdAt: string;
  user: ShareUser;
}

export interface ShareInput {
  userId: string;
  permission: 'READ' | 'WRITE';
}

export interface SharedContent {
  notes: Array<{
    id: string;
    title: string;
    owner: ShareUser;
    permission: 'READ' | 'WRITE';
    sharedAt: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    owner: ShareUser;
    permission: 'READ' | 'WRITE';
    sharedAt: string;
  }>;
}

export const sharesApi = {
  // Benutzer suchen
  async searchUsers(query: string): Promise<ShareUser[]> {
    const response = await apiClient.get<{ success: boolean; data: ShareUser[] }>(
      `/shares/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data.data;
  },

  // Notiz teilen
  async shareNote(noteId: string, data: ShareInput): Promise<NoteShare> {
    const response = await apiClient.post<{ success: boolean; data: NoteShare }>(
      `/shares/notes/${noteId}/share`,
      data
    );
    return response.data.data;
  },

  // Notiz-Freigabe entfernen
  async unshareNote(noteId: string, userId: string): Promise<void> {
    await apiClient.delete(`/shares/notes/${noteId}/share/${userId}`);
  },

  // Ordner teilen
  async shareFolder(folderId: string, data: ShareInput): Promise<FolderShare> {
    const response = await apiClient.post<{ success: boolean; data: FolderShare }>(
      `/shares/folders/${folderId}/share`,
      data
    );
    return response.data.data;
  },

  // Ordner-Freigabe entfernen
  async unshareFolder(folderId: string, userId: string): Promise<void> {
    await apiClient.delete(`/shares/folders/${folderId}/share/${userId}`);
  },

  // Mit mir geteilte Inhalte
  async getSharedWithMe(): Promise<SharedContent> {
    const response = await apiClient.get<{ success: boolean; data: SharedContent }>(
      '/shares/with-me'
    );
    return response.data.data;
  },

  // Shares einer Notiz abrufen
  async getNoteShares(noteId: string): Promise<NoteShare[]> {
    const response = await apiClient.get<{ success: boolean; data: NoteShare[] }>(
      `/shares/notes/${noteId}/shares`
    );
    return response.data.data;
  },

  // Shares eines Ordners abrufen
  async getFolderShares(folderId: string): Promise<FolderShare[]> {
    const response = await apiClient.get<{ success: boolean; data: FolderShare[] }>(
      `/shares/folders/${folderId}/shares`
    );
    return response.data.data;
  },
};
