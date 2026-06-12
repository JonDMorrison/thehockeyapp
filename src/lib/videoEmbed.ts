/**
 * Convert a YouTube or Vimeo URL into an embeddable iframe src.
 * Returns null if the URL is not a recognized YouTube/Vimeo video link.
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube: watch?v=, youtu.be/, shorts/, embed/
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo: vimeo.com/<digits>
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

/**
 * Returns true if the URL is a recognized YouTube/Vimeo video link.
 */
export function isValidVideoUrl(url: string): boolean {
  return getVideoEmbedUrl(url) !== null;
}
