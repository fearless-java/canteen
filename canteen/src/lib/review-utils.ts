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

const LIKE_WEIGHT = 10;
const GRAVITY = 1.5;
const HOUR_DIVISOR = 2;

export function calculateHotScore(likes: number, createdAt: Date | number): number {
  const ageMs = Date.now() - (createdAt instanceof Date ? createdAt.getTime() : createdAt);
  const ageHours = ageMs / (1000 * 60 * 60);
  const likeScore = Math.log(likes + 1) * LIKE_WEIGHT + 1;
  const decay = Math.pow(ageHours + HOUR_DIVISOR, GRAVITY);
  return likeScore / decay;
}
