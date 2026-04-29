export function normalizeImages(images: unknown): string[] {
  if (!images) return [];

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (images.startsWith('/api/uploads/')) {
        return [images];
      }
      return [];
    }
  }

  if (Array.isArray(images)) {
    return images.filter((url): url is string => typeof url === 'string' && url.length > 0);
  }

  return [];
}
