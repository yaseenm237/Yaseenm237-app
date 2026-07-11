/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPhoneticText } from './PhoneticDictionary';

export interface VoiceConfig {
  preferredVoiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  enablePhoneticHumanizer: boolean;
  enableNaturalBreathing: boolean;
  customFillerProbability: number;
  debugMode: boolean;
  
  // Eco-Lazer (Equalizer) Settings
  eqEnabled: boolean;
  eqBass: number;       // Gain in dB (-12 to +12)
  eqMid: number;        // Gain in dB (-12 to +12)
  eqTreble: number;     // Gain in dB (-12 to +12)
  eqPreset: string;     // 'flat' | 'warm' | 'bright' | 'bass-boost' | 'vocal-clarity' | 'custom'
}

const STORAGE_KEY = 'sahira_voice_config_v1';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  preferredVoiceName: '', // Empty means auto-detect Google Hindi or first Hindi voice
  rate: 0.85,             // Slower and clearer speech for noisy workshop environment
  pitch: 1.05,            // Slightly warmer, natural friendly pitch
  volume: 1.0,            // Full volume
  enablePhoneticHumanizer: true,
  enableNaturalBreathing: true,
  customFillerProbability: 0.25, // 25% chance to prefix sentences with warm carpenter fillers
  debugMode: false,
  
  // Equalizer Defaults to off
  eqEnabled: false,
  eqBass: 0,
  eqMid: 0,
  eqTreble: 0,
  eqPreset: 'flat',
};

// Warm Hindi workshop fillers to sound like a natural human supervisor/partner
const HUMAN_INTRO_FILLERS = [
  "लीजिए, ",
  "अच्छा, ",
  "अब ध्यान दें, ",
  "चलो भाई, ",
  "बहुत बढ़िया, ",
];

export function getStoredVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined') return DEFAULT_VOICE_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading voice config:', e);
  }
  return DEFAULT_VOICE_CONFIG;
}

export function saveVoiceConfig(config: VoiceConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving voice config:', e);
  }
}

/**
 * Humanizes text by transforming numbers, units, symbols, and formatting
 * into natural-sounding spoken Hindi. It replaces robotic/English phrasing with warm carpenter terms,
 * and adds natural pauses (using commas and ellipses) so the speech feels human.
 */
export function humanizeHindiText(text: string, config: VoiceConfig): string {
  let cleanText = text.trim();

  if (config.enablePhoneticHumanizer) {
    // 1. Replace measurements like "1220 x 2440" with "1220 बाई 2440"
    cleanText = cleanText.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1 बाई $2');

    // 2. Humanize standard units to natural Hindi pronunciation (handling connected numbers like 18mm)
    cleanText = cleanText.replace(/(\d+)\s*mm/gi, '$1 मिलीमीटर ');
    cleanText = cleanText.replace(/\bmm\b/gi, ' मिलीमीटर ');
    cleanText = cleanText.replace(/(\d+)\s*Inch/gi, '$1 इंच ');
    cleanText = cleanText.replace(/\bInch\b/gi, ' इंच ');
    cleanText = cleanText.replace(/(\d+)\s*CM/gi, '$1 सेंटीमीटर ');
    cleanText = cleanText.replace(/\bCM\b/gi, ' सेंटीमीटर ');
    cleanText = cleanText.replace(/\bMica\b/gi, ' माइका ');
    cleanText = cleanText.replace(/\bTrim Cut\b/gi, ' टोको यानी सफाई कट ');
    cleanText = cleanText.replace(/\bRip Cut\b/gi, ' पट्टी कट ');
    cleanText = cleanText.replace(/\bCross Cut\b/gi, ' आड़ा कट ');

    // 3. Make instruction text more conversational
    cleanText = cleanText.replace(/सबसे पहले/g, 'सबसे पहले आराम से, ');
    cleanText = cleanText.replace(/इसके बाद/g, 'इसके बाद, ');
    cleanText = cleanText.replace(/बढ़ते हैं/g, 'बढ़ते हैं जी, ');
    cleanText = cleanText.replace(/तैयार करते हैं/g, 'तैयार करते हैं। बहुत अच्छे!');

    // 4. Advanced Phonetic Breaking (रेडियो एनाउंसर सफाई)
    // Ensures Hindi TTS clearly pronounces complex or English-origin technical words
    cleanText = getPhoneticText(cleanText);
  }

  // Remove common punctuation/icons that can cause speech hiccups
  cleanText = cleanText.replace(/[🎙️📏⚙️🛠️🔧🧱●⚠️🚨✅❌]/g, '');

  // 4. Inject natural human breathing fillers at the start of sentences
  if (config.enableNaturalBreathing && config.customFillerProbability > 0) {
    // Only add filler if it is a main instruction (length > 15 characters) and randomly based on probability
    if (cleanText.length > 20 && Math.random() < config.customFillerProbability) {
      const randomFiller = HUMAN_INTRO_FILLERS[Math.floor(Math.random() * HUMAN_INTRO_FILLERS.length)];
      // Prevent double intro if already starts with one
      if (!cleanText.startsWith("अब") && !cleanText.startsWith("चलो") && !cleanText.startsWith("लीजिए")) {
        cleanText = randomFiller + cleanText;
      }
    }
  }

  // Standardize spacing and return
  return cleanText.replace(/\s+/g, ' ').trim();
}
