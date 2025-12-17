import apiClient from './client';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  notes?: any[];
}

export interface CreateFolderDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: string | null;
}

/**
 * Folder API Service
 */
export const foldersApi = {
  /**
   * Alle Ordner abrufen (flache Liste)
   */
  async getAll(): Promise<Folder[]> {
    const response = await apiClient.get('/folders');
    return response.data.data;
  },

  /**
   * Ordner-Baum abrufen (hierarchisch)
   */
  async getTree(): Promise<Folder[]> {
    const response = await apiClient.get('/folders/tree');
    return response.data.data;
  },

  /**
   * Einzelnen Ordner mit Notizen abrufen
   */
  async getById(id: string): Promise<Folder> {
    const response = await apiClient.get(`/folders/${id}`);
    return response.data.data;
  },

  /**
   * Neuen Ordner erstellen
   */
  async create(data: CreateFolderDto): Promise<Folder> {
    const response = await apiClient.post('/folders', data);
    return response.data.data;
  },

  /**
   * Ordner aktualisieren (umbenennen/verschieben)
   */
  async update(id: string, data: UpdateFolderDto): Promise<Folder> {
    const response = await apiClient.put(`/folders/${id}`, data);
    return response.data.data;
  },

  /**
   * Ordner löschen
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/folders/${id}`);
  },
};
