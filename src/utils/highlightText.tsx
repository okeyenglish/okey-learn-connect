import React from 'react';

/**
 * Highlights matching text in a string by wrapping matches in a styled span
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns React nodes with highlighted matches
 */
export function highlightSearchText(
  text: string,
  query: string
): React.ReactNode {
  if (!query || query.length < 2 || !text) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Find all match positions
  const matches: Array<{ start: number; end: number }> = [];
  let pos = 0;
  
  while (pos < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, pos);
    if (index === -1) break;
    matches.push({ start: index, end: index + query.length });
    pos = index + 1;
  }

  if (matches.length === 0) {
    return text;
  }

  // Build the result with highlighted spans
  const result: React.ReactNode[] = [];
  let lastEnd = 0;

  matches.forEach((match, i) => {
    // Add text before the match
    if (match.start > lastEnd) {
      result.push(text.slice(lastEnd, match.start));
    }
    
    // Add the highlighted match
    result.push(
      <mark
        key={`highlight-${i}`}
        className="bg-yellow-300 text-yellow-900 rounded-sm px-0.5 font-medium"
      >
        {text.slice(match.start, match.end)}
      </mark>
    );
    
    lastEnd = match.end;
  });

  // Add remaining text after the last match
  if (lastEnd < text.length) {
    result.push(text.slice(lastEnd));
  }

  return <>{result}</>;
}
