import { SheetLayout, SheetSettings, PackedPart, CuttingInstruction } from '../types';
import { convertMmToUnit } from './packer';

const CarpentryTerms = {
  TRIM_CUT: "टोको (सफाई कट)",
  RIP_CUT: "खड़ा कट (पट्टी कट)",
  CROSS_CUT: "आड़ा कट (गुनिया कट)"
};

/**
 * Generates highly realistic, workshop-ready step-by-step cutting instructions
 * for a given sheet layout, taking into account Guillotine Flow, Trim Margin (Toko),
 * and Blade Kerf.
 */
export function generateSahiraSteps(
  sheet: SheetLayout,
  settings: SheetSettings
): CuttingInstruction[] {
  const instructions: CuttingInstruction[] = [];
  const K = settings.bladeTh; // Kerf in mm
  const T = settings.trimMargin; // Trim margin in mm
  const unit = settings.unit;

  const rawL = settings.sheetL;
  const rawW = settings.sheetW;

  const parts = sheet.parts;
  if (parts.length === 0) return [];

  let stepCounter = 1;

  // Find Usable bounds
  const binW = sheet.width;  // Already Math.max(1, S_L - 2*T) in packer
  const binH = sheet.height; // Already Math.max(1, S_W - 2*T) in packer

  // Find all continuous vertical cut lines (guillotine cuts along X-axis)
  const vCuts: number[] = [];
  for (const part of parts) {
    const X = part.x + part.w;
    if (X > 0 && X < binW) {
      // Check if X is a continuous vertical cut
      let isContinuous = true;
      for (const other of parts) {
        if (other.x < X && other.x + other.w > X) {
          isContinuous = false;
          break;
        }
      }
      if (isContinuous && !vCuts.includes(X)) {
        vCuts.push(X);
      }
    }
  }

  // Find all continuous horizontal cut lines (guillotine cuts along Y-axis)
  const hCuts: number[] = [];
  for (const part of parts) {
    const Y = part.y + part.h;
    if (Y > 0 && Y < binH) {
      // Check if Y is a continuous horizontal cut
      let isContinuous = true;
      for (const other of parts) {
        if (other.y < Y && other.y + other.h > Y) {
          isContinuous = false;
          break;
        }
      }
      if (isContinuous && !hCuts.includes(Y)) {
        hCuts.push(Y);
      }
    }
  }

  // Sort cut lines
  vCuts.sort((a, b) => a - b);
  hCuts.sort((a, b) => a - b);

  // Decide cutting direction
  const useVerticalStrips = vCuts.length >= hCuts.length;

  if (vCuts.length === 0 && hCuts.length === 0) {
    // FALLBACK: Non-guillotine / Complex layout
    // Sort parts top-to-bottom, left-to-right
    const sortedParts = [...parts].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
      return a.x - b.x;
    });

    let pieceIdx = 0;
    for (const part of sortedParts) {
      const displaySize = `${convertMmToUnit(part.cutL, unit).toFixed(0)} x ${convertMmToUnit(part.cutW, unit).toFixed(0)} ${unit}`;
      const firstPartText = pieceIdx === 0 
        ? `चलिए, पहला पीस "${part.name}" तैयार करते हैं।` 
        : `अब अगले पीस "${part.name}" की तरफ बढ़ते हैं। इस पीस का फाइनल साइज ${displaySize} है।`;

      // Rip Cut
      let ripAdvice = "";
      if (T > 0) {
        ripAdvice = `${firstPartText} सबसे पहले किनारे को साफ़ और सीधा करने के लिए ${T} ${unit} का टोको (Trim Cut) मारें। इसके बाद, पट्टी निकालने के लिए फेंस को ${convertMmToUnit(part.w, unit).toFixed(0)} ${unit} पर सेट करें और सीधा खड़ा कट लगाएं।`;
      } else {
        ripAdvice = `${firstPartText} पट्टी निकालने के लिए फेंस को ${convertMmToUnit(part.w, unit).toFixed(0)} ${unit} पर सेट करें और सीधा खड़ा कट लगाएं।`;
      }

      instructions.push({
        stepId: stepCounter++,
        type: 'RIP_CUT',
        direction: 'VERTICAL',
        position: part.x + part.w,
        fenceSetting: part.w,
        localName: `पट्टी कट (${part.name})`,
        advice: ripAdvice,
        affectedPartIds: [part.id],
        triggerVoice: true
      });

      // Cross Cut
      let crossAdvice = "";
      if (T > 0) {
        crossAdvice = `अब इस कटी हुई पट्टी के कोने को एकदम 90 डिग्री पर गुनिया मिलाने के लिए ${T} ${unit} का टोको (सफाई कट) लगाएं। इसके बाद, पुर्जा "${part.name}" तैयार करने के लिए फेंस को ${convertMmToUnit(part.h, unit).toFixed(0)} ${unit} पर सेट करके आड़ा कट लगाएं।`;
      } else {
        crossAdvice = `अब इसी पट्टी पर फेंस को ${convertMmToUnit(part.h, unit).toFixed(0)} ${unit} पर सेट करके आड़ा (गुनिया) कट लगाएं ताकि पुर्जा "${part.name}" तैयार हो जाए।`;
      }

      instructions.push({
        stepId: stepCounter++,
        type: 'CROSS_CUT',
        direction: 'HORIZONTAL',
        position: part.y + part.h,
        fenceSetting: part.h,
        localName: `गुनिया कट (${part.name})`,
        advice: crossAdvice,
        affectedPartIds: [part.id],
        triggerVoice: true
      });
      pieceIdx++;
    }
  } else if (useVerticalStrips) {
    // VERTICAL STRIPS (RIP Cuts along X, then Cross Cuts along Y)
    const xBounds = [0, ...vCuts, binW];
    
    for (let i = 1; i < xBounds.length; i++) {
      const xStart = xBounds[i - 1];
      const xEnd = xBounds[i];
      const stripWidth = xEnd - xStart;

      // Find parts belonging to this strip
      const stripParts = parts.filter(p => p.x >= xStart - 1 && (p.x + p.w) <= xEnd + 1);
      if (stripParts.length === 0) continue;

      // Rip Cut to get the strip
      const fenceVal = stripWidth;
      const displayFence = convertMmToUnit(fenceVal, unit).toFixed(0);
      const affectedIds = stripParts.map(p => p.id);

      let ripAdvice = "";
      if (T > 0) {
        ripAdvice = `अब शीट की कटिंग साइड से पहले ${T} ${unit} का टोको (Trim Cut) मारकर किनारा एकदम सीधा कर लें। इसके बाद, पट्टी निकालने के लिए फेंस को ${displayFence} ${unit} पर सेट करें और सीधा खड़ा कट (पट्टी कट) लगाएं।`;
      } else {
        ripAdvice = `अब शीट से पट्टी निकालने के लिए फेंस को ${displayFence} ${unit} पर सेट करें और सीधा खड़ा कट (पट्टी कट) लगाएं।`;
      }

      instructions.push({
        stepId: stepCounter++,
        type: 'RIP_CUT',
        direction: 'VERTICAL',
        position: xEnd,
        fenceSetting: fenceVal,
        localName: CarpentryTerms.RIP_CUT,
        advice: ripAdvice,
        affectedPartIds: affectedIds,
        triggerVoice: true
      });

      // Sort strip parts from top to bottom
      const sortedStripParts = [...stripParts].sort((a, b) => a.y - b.y);

      for (let j = 0; j < sortedStripParts.length; j++) {
        const part = sortedStripParts[j];
        const displayH = convertMmToUnit(part.h, unit).toFixed(0);
        const displaySize = `${convertMmToUnit(part.cutL, unit).toFixed(0)} x ${convertMmToUnit(part.cutW, unit).toFixed(0)} ${unit}`;

        let adviceText = "";
        if (j === 0) {
          if (T > 0) {
            adviceText = `अब इस कटी हुई पट्टी से पहला पीस "${part.name}" (${displaySize}) तैयार करेंगे। इसके लिए सबसे पहले कोने का गुनिया मिलाने के लिए ${T} ${unit} का टोको (गुनिया सफाई कट) लगाएं। फिर फेंस को ${displayH} ${unit} पर सेट करके आड़ा (गुनिया) कट लगाएं।`;
          } else {
            adviceText = `अब इस कटी हुई पट्टी से पहला पीस "${part.name}" तैयार करेंगे। पीस का साइज ${displaySize} है। इसके लिए फेंस को ${displayH} ${unit} पर सेट करके आड़ा (गुनिया) कट लगाएं।`;
          }
        } else {
          if (T > 0) {
            adviceText = `अब अगले पीस "${part.name}" (${displaySize}) की तरफ बढ़ते हैं। कोना साफ़ करने के लिए पहले ${T} ${unit} का छोटा टोको कट लगाएं, फिर फेंस को ${displayH} ${unit} पर सेट करके आड़ा कट लगाएं।`;
          } else {
            adviceText = `अब अगले पीस "${part.name}" की तरफ बढ़ते हैं। इस पीस का साइज ${displaySize} है। इसके लिए फेंस को ${displayH} ${unit} पर सेट करके आड़ा (गुनिया) कट लगाएं।`;
          }
        }

        instructions.push({
          stepId: stepCounter++,
          type: 'CROSS_CUT',
          direction: 'HORIZONTAL',
          position: part.y + part.h,
          fenceSetting: part.h,
          localName: CarpentryTerms.CROSS_CUT,
          advice: adviceText,
          affectedPartIds: [part.id],
          triggerVoice: true
        });
      }
    }
  } else {
    // HORIZONTAL STRIPS (RIP Cuts along Y, then Cross Cuts along X)
    const yBounds = [0, ...hCuts, binH];

    for (let i = 1; i < yBounds.length; i++) {
      const yStart = yBounds[i - 1];
      const yEnd = yBounds[i];
      const stripHeight = yEnd - yStart;

      // Find parts belonging to this strip
      const stripParts = parts.filter(p => p.y >= yStart - 1 && (p.y + p.h) <= yEnd + 1);
      if (stripParts.length === 0) continue;

      // Rip Cut to get the strip
      const fenceVal = stripHeight;
      const displayFence = convertMmToUnit(fenceVal, unit).toFixed(0);
      const affectedIds = stripParts.map(p => p.id);

      let ripAdvice = "";
      if (T > 0) {
        ripAdvice = `अब शीट की कटिंग साइड से पहले ${T} ${unit} का टोको (Trim Cut) मारकर किनारा एकदम सीधा कर लें। इसके बाद, पट्टी निकालने के लिए फेंस को ${displayFence} ${unit} पर सेट करें और सीधा आड़ा (पट्टी कट) लगाएं।`;
      } else {
        ripAdvice = `अब शीट से पट्टी निकालने के लिए फेंस को ${displayFence} ${unit} पर सेट करें और सीधा खड़ा (आड़ा पट्टी) कट लगाएं।`;
      }

      instructions.push({
        stepId: stepCounter++,
        type: 'RIP_CUT',
        direction: 'HORIZONTAL',
        position: yEnd,
        fenceSetting: fenceVal,
        localName: CarpentryTerms.RIP_CUT,
        advice: ripAdvice,
        affectedPartIds: affectedIds,
        triggerVoice: true
      });

      // Sort strip parts from left to right
      const sortedStripParts = [...stripParts].sort((a, b) => a.x - b.x);

      for (let j = 0; j < sortedStripParts.length; j++) {
        const part = sortedStripParts[j];
        const displayW = convertMmToUnit(part.w, unit).toFixed(0);
        const displaySize = `${convertMmToUnit(part.cutL, unit).toFixed(0)} x ${convertMmToUnit(part.cutW, unit).toFixed(0)} ${unit}`;

        let adviceText = "";
        if (j === 0) {
          if (T > 0) {
            adviceText = `अब इस कटी हुई पट्टी से पहला पीस "${part.name}" (${displaySize}) तैयार करेंगे। इसके लिए सबसे पहले कोने का गुनिया मिलाने के लिए ${T} ${unit} का टोको (गुनिया सफाई कट) लगाएं। फिर फेंस को ${displayW} ${unit} पर सेट करके आड़ा कट लगाएं।`;
          } else {
            adviceText = `अब इस कटी हुई पट्टी से पहला पीस "${part.name}" तैयार करेंगे। पीस का साइज ${displaySize} है। इसके लिए फेंस को ${displayW} ${unit} पर सेट करके आड़ा कट लगाएं।`;
          }
        } else {
          if (T > 0) {
            adviceText = `अब अगले पीस "${part.name}" (${displaySize}) की तरफ बढ़ते हैं। कोना साफ़ करने के लिए पहले ${T} ${unit} का छोटा टोको कट लगाएं, फिर फेंस को ${displayW} ${unit} पर सेट करके आड़ा कट लगाएं।`;
          } else {
            adviceText = `अब अगले पीस "${part.name}" की तरफ बढ़ते हैं। इस पीस का साइज ${displaySize} है। इसके लिए फेंस को ${displayW} ${unit} पर सेट करके आड़ा कट लगाएं।`;
          }
        }

        instructions.push({
          stepId: stepCounter++,
          type: 'CROSS_CUT',
          direction: 'VERTICAL',
          position: part.x + part.w,
          fenceSetting: part.w,
          localName: CarpentryTerms.CROSS_CUT,
          advice: adviceText,
          affectedPartIds: [part.id],
          triggerVoice: true
        });
      }
    }
  }

  // Dynamic friendly voice variations to make Sahira sound encouraging and organic without being robotic!
  const variations = [
    (base: string) => base,
    (base: string) => `बहुत अच्छे! ${base}`,
    (base: string) => base,
    (base: string) => `चलिए, ${base}`
  ];

  return instructions.map((inst, index) => {
    const variationFunc = variations[index % variations.length];
    return {
      ...inst,
      advice: variationFunc(inst.advice)
    };
  });
}
