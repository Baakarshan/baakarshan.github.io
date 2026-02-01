export function stripExtension(name: string): string;
export function toSlugSegment(name: string): string;
export function getFrontmatterSlugSegment(
  data: Record<string, unknown>
): string | null;
export function normalizeSlugSegments(segments: string[]): string[];
export function normalizeDate(value: unknown): string;
