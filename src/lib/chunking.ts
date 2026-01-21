
/**
 * Splits a large string of text into smaller chunks of a specified size.
 * Tries to split along paragraph breaks or sentence breaks to maintain semantic context.
 *
 * @param text The input text to be chunked.
 * @param chunkSize The target maximum size for each chunk (in characters).
 * @param chunkOverlap The number of characters to overlap between chunks.
 * @returns An array of text chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  if (!text) return [];

  // 1. Clean up the text
  const cleanedText = text.replace(/\s+/g, ' ').trim();

  // 2. Handle short text
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  // 3. Define potential split points (in order of preference)
  const sentenceEndings = new RegExp(/[.!?]/);

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    const endIndex = Math.min(startIndex + chunkSize, cleanedText.length);
    let chunk = cleanedText.substring(startIndex, endIndex);

    // If this isn't the last chunk, find a good split point
    if (endIndex < cleanedText.length) {
      let splitIndex = -1;
      
      // Try to find the last sentence ending within the chunk
      for (let i = chunk.length - 1; i >= 0; i--) {
        if (sentenceEndings.test(chunk[i])) {
          splitIndex = i + 1;
          break;
        }
      }

      // If no sentence ending is found, just split at the chunkSize
      if (splitIndex !== -1) {
        chunk = chunk.substring(0, splitIndex);
      }
    }

    chunks.push(chunk);

    // Move to the next chunk start, considering the overlap
    startIndex += chunk.length - Math.min(chunk.length, chunkOverlap);
    
    // Safety break for infinite loops
    if (chunk.length === 0) break;
  }

  return chunks.filter(c => c.trim().length > 0);
}
