/**
 * Normalizes Unicode "fancy fonts" (mathematical, bold, italic, etc.) to plain ASCII/Latin characters.
 * This handles text copied from social media that uses special Unicode characters to appear as different fonts.
 */

// Map of Unicode mathematical/stylized characters to their plain equivalents
const unicodeToAsciiMap: Record<string, string> = {};

// Mathematical Bold (U+1D400 - U+1D433)
const mathBoldUpperStart = 0x1D400;
const mathBoldLowerStart = 0x1D41A;

// Mathematical Italic (U+1D434 - U+1D467)
const mathItalicUpperStart = 0x1D434;
const mathItalicLowerStart = 0x1D44E;

// Mathematical Bold Italic (U+1D468 - U+1D49B)
const mathBoldItalicUpperStart = 0x1D468;
const mathBoldItalicLowerStart = 0x1D482;

// Mathematical Script (U+1D49C - U+1D4CF)
const mathScriptUpperStart = 0x1D49C;
const mathScriptLowerStart = 0x1D4B6;

// Mathematical Bold Script (U+1D4D0 - U+1D503)
const mathBoldScriptUpperStart = 0x1D4D0;
const mathBoldScriptLowerStart = 0x1D4EA;

// Mathematical Fraktur (U+1D504 - U+1D537)
const mathFrakturUpperStart = 0x1D504;
const mathFrakturLowerStart = 0x1D51E;

// Mathematical Double-Struck (U+1D538 - U+1D56B)
const mathDoubleStruckUpperStart = 0x1D538;
const mathDoubleStruckLowerStart = 0x1D552;

// Mathematical Bold Fraktur (U+1D56C - U+1D59F)
const mathBoldFrakturUpperStart = 0x1D56C;
const mathBoldFrakturLowerStart = 0x1D586;

// Mathematical Sans-Serif (U+1D5A0 - U+1D5D3)
const mathSansUpperStart = 0x1D5A0;
const mathSansLowerStart = 0x1D5BA;

// Mathematical Sans-Serif Bold (U+1D5D4 - U+1D607)
const mathSansBoldUpperStart = 0x1D5D4;
const mathSansBoldLowerStart = 0x1D5EE;

// Mathematical Sans-Serif Italic (U+1D608 - U+1D63B)
const mathSansItalicUpperStart = 0x1D608;
const mathSansItalicLowerStart = 0x1D622;

// Mathematical Sans-Serif Bold Italic (U+1D63C - U+1D66F)
const mathSansBoldItalicUpperStart = 0x1D63C;
const mathSansBoldItalicLowerStart = 0x1D656;

// Mathematical Monospace (U+1D670 - U+1D6A3)
const mathMonospaceUpperStart = 0x1D670;
const mathMonospaceLowerStart = 0x1D68A;

// Build mapping for uppercase letters (A-Z)
const ranges = [
  mathBoldUpperStart,
  mathItalicUpperStart,
  mathBoldItalicUpperStart,
  mathScriptUpperStart,
  mathBoldScriptUpperStart,
  mathFrakturUpperStart,
  mathDoubleStruckUpperStart,
  mathBoldFrakturUpperStart,
  mathSansUpperStart,
  mathSansBoldUpperStart,
  mathSansItalicUpperStart,
  mathSansBoldItalicUpperStart,
  mathMonospaceUpperStart,
];

const lowerRanges = [
  mathBoldLowerStart,
  mathItalicLowerStart,
  mathBoldItalicLowerStart,
  mathScriptLowerStart,
  mathBoldScriptLowerStart,
  mathFrakturLowerStart,
  mathDoubleStruckLowerStart,
  mathBoldFrakturLowerStart,
  mathSansLowerStart,
  mathSansBoldLowerStart,
  mathSansItalicLowerStart,
  mathSansBoldItalicLowerStart,
  mathMonospaceLowerStart,
];

// Populate the map
for (const start of ranges) {
  for (let i = 0; i < 26; i++) {
    unicodeToAsciiMap[String.fromCodePoint(start + i)] = String.fromCharCode(65 + i); // A-Z
  }
}

for (const start of lowerRanges) {
  for (let i = 0; i < 26; i++) {
    unicodeToAsciiMap[String.fromCodePoint(start + i)] = String.fromCharCode(97 + i); // a-z
  }
}

// Add numbers (Mathematical Bold Digits, Sans-Serif Digits, etc.)
const digitRanges = [
  0x1D7CE, // Bold digits
  0x1D7D8, // Double-struck digits
  0x1D7E2, // Sans-serif digits
  0x1D7EC, // Sans-serif bold digits
  0x1D7F6, // Monospace digits
];

for (const start of digitRanges) {
  for (let i = 0; i < 10; i++) {
    unicodeToAsciiMap[String.fromCodePoint(start + i)] = String(i);
  }
}

// Fullwidth characters (U+FF01 - U+FF5E)
for (let i = 0; i < 94; i++) {
  unicodeToAsciiMap[String.fromCodePoint(0xFF01 + i)] = String.fromCharCode(33 + i);
}

// Circled letters (Ⓐ-Ⓩ, ⓐ-ⓩ)
for (let i = 0; i < 26; i++) {
  unicodeToAsciiMap[String.fromCodePoint(0x24B6 + i)] = String.fromCharCode(65 + i); // Ⓐ-Ⓩ
  unicodeToAsciiMap[String.fromCodePoint(0x24D0 + i)] = String.fromCharCode(97 + i); // ⓐ-ⓩ
}

// Squared letters
for (let i = 0; i < 26; i++) {
  unicodeToAsciiMap[String.fromCodePoint(0x1F130 + i)] = String.fromCharCode(65 + i); // 🄰-🅉
}

/**
 * Normalizes a string by replacing Unicode "fancy font" characters with their plain equivalents
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  let result = '';
  
  for (const char of text) {
    result += unicodeToAsciiMap[char] || char;
  }
  
  // Also normalize common ligatures and special characters
  result = result
    .normalize('NFKC') // Normalize compatibility characters
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
  
  return result;
}

/**
 * Normalizes an object's string values recursively
 */
export function normalizeObjectStrings<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  
  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = normalizeText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = normalizeObjectStrings(value as Record<string, unknown>);
    }
  }
  
  return result;
}
