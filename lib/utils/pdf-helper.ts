import { readFileSync } from 'fs';

/**
 * Normalizes a base64-encoded PDF string to ensure it can be properly processed.
 * Handles different formats of base64 data.
 */
export function normalizePdfBase64(base64Data: string): string {
  // If it's a data URL, extract just the base64 part
  if (base64Data.startsWith('data:application/pdf;base64,')) {
    return base64Data.replace('data:application/pdf;base64,', '');
  }
  
  // If it's a data URL with different content type, still try to extract the base64 part
  if (base64Data.startsWith('data:') && base64Data.includes(';base64,')) {
    return base64Data.split(';base64,')[1];
  }
  
  // Already normalized, return as is
  return base64Data;
}

/**
 * Validates if a string appears to be a valid base64-encoded PDF
 */
export function isValidPdfBase64(base64Data: string): boolean {
  // Check if it's a data URL for PDF
  if (base64Data.startsWith('data:application/pdf;base64,')) {
    return true;
  }
  
  // Check if it's any data URL with base64 encoding
  if (base64Data.startsWith('data:') && base64Data.includes(';base64,')) {
    return true;
  }
  
  // Check if it's a raw base64 string (should be a multiple of 4 chars with proper encoding)
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  return base64Pattern.test(base64Data);
}

/**
 * Alternative method to extract text from a PDF
 * Uses a simple regex-based approach that works for many PDFs
 * When pdf-parse is having issues, this can serve as a fallback
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    // Convert buffer to string
    const pdfContent = buffer.toString('utf8', 0, buffer.length);
    
    // Use a simple regex to extract text content from the PDF
    // This is a simplified approach and won't work for all PDFs
    const textMatches = pdfContent.match(/\/(T[^(]*)\s*\(/g) || [];
    
    // Extract and decode the text content
    let extractedText = '';
    for (const match of textMatches) {
      const text = match.substring(1, match.length - 2);
      try {
        extractedText += decodeURIComponent(text.replace(/\\\d{3}/g, (m) => {
          return '%' + parseInt(m.substring(1), 8).toString(16).padStart(2, '0');
        }));
      } catch (e) {
        // Skip invalid text
      }
    }
    
    return extractedText || 'Could not extract text using simplified method';
  } catch (error) {
    console.error('Error in simplified PDF extraction:', error);
    return 'Error extracting text using simplified method';
  }
} 