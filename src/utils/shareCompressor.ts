import { PartInput, SheetSettings } from '../types';

/**
 * Shortened keys representation to keep URL length under QR Code limits (usually 2000 chars)
 */
export function compressPayload(parts: PartInput[], settings: SheetSettings): string {
  const compressedParts = parts.map(p => ({
    i: p.id,
    n: p.name,
    l: p.length,
    w: p.width,
    g: p.grain,
    r: p.allowRot,
    q: p.quantity,
    e: p.edges,
    m: p.materialId,
    em: p.edgeMaterialId,
    dh: p.drillHoles ? p.drillHoles.map(h => ({
      i: h.id,
      x: h.x,
      y: h.y,
      d: h.diameter,
      lb: h.label
    })) : undefined
  }));

  const compressedSettings = {
    un: settings.unit,
    sl: settings.sheetL,
    sw: settings.sheetW,
    bt: settings.bladeTh,
    tm: settings.trimMargin,
    te: settings.trimEdges,
    et: settings.edgeTh,
    st: settings.stock,
    al: settings.algorithm,
    sc: settings.sheetCost,
    si: settings.stockItems,
    eb: settings.edgeBandItems
  };

  const payload = {
    _v: 2, // version identifier for compressed format
    p: compressedParts,
    s: compressedSettings
  };

  return encodeURIComponent(JSON.stringify(payload));
}

export function decompressPayload(paramValue: string): { parts?: PartInput[]; settings?: Partial<SheetSettings> } | null {
  try {
    const decodedStr = decodeURIComponent(paramValue);
    const parsed = JSON.parse(decodedStr);

    if (!parsed) return null;

    // Version 2: Compressed format
    if (parsed._v === 2 || (parsed.p && parsed.s)) {
      const parts: PartInput[] = (parsed.p || []).map((cp: any) => ({
        id: cp.i || String(Math.random()),
        name: cp.n || 'Unnamed Part',
        length: cp.l || 10,
        width: cp.w || 10,
        grain: cp.g || 'N',
        allowRot: cp.r !== undefined ? cp.r : true,
        quantity: cp.q || 1,
        edges: cp.e || { T: false, B: false, L: false, R: false },
        materialId: cp.m || 'mat-plywood',
        edgeMaterialId: cp.em,
        drillHoles: cp.dh ? cp.dh.map((ch: any) => ({
          id: ch.i || String(Math.random()),
          x: ch.x || 0,
          y: ch.y || 0,
          diameter: ch.d || 5,
          label: ch.lb
        })) : []
      }));

      const s = parsed.s || {};
      const settings: Partial<SheetSettings> = {
        unit: s.un,
        sheetL: s.sl,
        sheetW: s.sw,
        bladeTh: s.bt,
        trimMargin: s.tm,
        trimEdges: s.te,
        edgeTh: s.et,
        stock: s.st,
        algorithm: s.al,
        sheetCost: s.sc,
        stockItems: s.si,
        edgeBandItems: s.eb
      };

      // Remove undefined fields
      Object.keys(settings).forEach(key => {
        if ((settings as any)[key] === undefined) {
          delete (settings as any)[key];
        }
      });

      return { parts, settings };
    }

    // Version 1 / Uncompressed format
    if (parsed.parts || parsed.settings) {
      return {
        parts: parsed.parts,
        settings: parsed.settings
      };
    }

    return null;
  } catch (e) {
    console.error('Failed to decompress layout payload:', e);
    return null;
  }
}
