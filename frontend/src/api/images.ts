import apiClient from './client';

export interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Image Upload API Service
 */
export const imagesApi = {
  /**
   * Bild für Editor hochladen
   */
  async upload(file: File): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ success: boolean; data: UploadedImage }>(
      '/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  /**
   * Validiere Bildgröße und Format
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    // Maximal 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Das Bild ist zu groß. Maximal 10MB erlaubt.',
      };
    }

    // Erlaubte Formate
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Ungültiges Bildformat. Erlaubt sind: JPG, PNG, GIF, WebP, SVG',
      };
    }

    return { valid: true };
  },
};
