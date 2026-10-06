/** Max characters sent to the model in a single request. */
export const CHUNK_SIZE = 60_000;

/** Splits text on paragraph/line boundaries into pieces of at most `size` characters. */
export function chunkText(text: string, size: number = CHUNK_SIZE): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let current = '';
  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };
  for (const line of text.split('\n')) {
    // A single line longer than the limit is hard-split.
    if (line.length > size) {
      flush();
      for (let i = 0; i < line.length; i += size) chunks.push(line.slice(i, i + size));
      continue;
    }
    if (current.length + line.length + 1 > size) flush();
    current += (current ? '\n' : '') + line;
  }
  flush();
  return chunks;
}
