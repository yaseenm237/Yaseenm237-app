/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A comprehensive phonetic dictionary for technical carpentry terms in Hindi and English
// This breaks down words to improve TTS (Text-to-Speech) engine pronunciation.
export const CARPENTRY_PHONETIC_MAP: Record<string, string> = {
  // Measurements & Units
  'मिलीमीटर': 'मिलि-मीटर',
  'सेंटीमीटर': 'सेंटी-मीटर',
  'millimeter': 'milli-meter',
  'millimeters': 'milli-meters',
  'centimeter': 'centi-meter',
  'centimeters': 'centi-meters',
  
  // Tools & Machinery
  'मशीन': 'म-शीन',
  'ब्लेड': 'ब-लेड',
  'फेंस': 'फ़ेन-स',
  'machine': 'ma-sheen',
  'blade': 'b-lade',
  'fence': 'fen-s',
  'kerf': 'कर-फ़', // kerf in Hindi/English context
  
  // Materials
  'प्लाईवुड': 'प्लाई-वुड',
  'बोर्ड': 'बोर-ड',
  'माइका': 'माई-का',
  'plywood': 'ply-wood',
  'board': 'bor-d',
  'mica': 'my-ca',
  
  // Processes & Actions
  'सेटिंग': 'सेट-टिंग',
  'कटिंग': 'कट-टिंग',
  'पार्ट': 'पार-ट',
  'टोको': 'टो-को',
  'गुनिया': 'गु-निया',
  'optimizer': 'ऑप्टि-माइज़र',
  'optimize': 'ऑप्टि-माइज़',
  'optimization': 'ऑप्टिमाई-ज़ेशन',
  'setting': 'set-ting',
  'cutting': 'cut-ting',
  'layout': 'ले-आउट',
  'visualizer': 'विजुअ-लाइज़र',
};

/**
 * Applies phonetic breaking to technical terms in the text
 * to improve TTS engine pronunciation.
 */
export function applyPhoneticDictionary(text: string): string {
  let processedText = text;
  
  // Sort keys by length descending to replace longer phrases/words first
  const sortedKeys = Object.keys(CARPENTRY_PHONETIC_MAP).sort((a, b) => b.length - a.length);
  
  for (const word of sortedKeys) {
    const phonetic = CARPENTRY_PHONETIC_MAP[word];
    const isEnglish = /^[a-zA-Z]+$/.test(word);
    
    if (isEnglish) {
      // Use word boundaries for English words
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(regex, phonetic);
    } else {
      // Global replace for Hindi/Unicode words
      const regex = new RegExp(word, 'g');
      processedText = processedText.replace(regex, phonetic);
    }
  }
  
  return processedText;
}

export const getPhoneticText = applyPhoneticDictionary;
