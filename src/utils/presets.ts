/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PartInput } from '../types';

export interface Preset {
  id: string;
  nameEn: string;
  nameHi: string;
  parts: Omit<PartInput, 'id'>[];
}

export const CARPENTRY_PRESETS: Preset[] = [
  {
    id: 'wardrobe',
    nameEn: 'Standard Wardrobe Cabinet',
    nameHi: 'मानक अलमारी (Wardrobe)',
    parts: [
      {
        name: 'Side Panel (बायाँ/दायाँ)',
        length: 90.0,
        width: 24.0,
        grain: 'L',
        allowRot: false,
        quantity: 2,
        edges: { T: true, B: true, L: true, R: false },
      },
      {
        name: 'Top/Bottom Shelf (ऊपर/नीचे)',
        length: 36.0,
        width: 24.0,
        grain: 'L',
        allowRot: false,
        quantity: 2,
        edges: { T: true, B: false, L: true, R: true },
      },
      {
        name: 'Adjustable Shelves (खाँचे)',
        length: 34.5,
        width: 23.0,
        grain: 'L',
        allowRot: true,
        quantity: 4,
        edges: { T: true, B: false, L: false, R: false },
      },
      {
        name: 'Cabinet Doors (दरवाजे)',
        length: 84.0,
        width: 17.5,
        grain: 'L',
        allowRot: false,
        quantity: 2,
        edges: { T: true, B: true, L: true, R: true },
      },
      {
        name: 'Drawer Fronts (दराज बाहरी)',
        length: 11.5,
        width: 35.0,
        grain: 'W',
        allowRot: false,
        quantity: 3,
        edges: { T: true, B: true, L: true, R: true },
      },
    ],
  },
  {
    id: 'kitchen_set',
    nameEn: 'Modular Kitchen Base Cabinet',
    nameHi: 'किचन कैबिनेट (Base Unit)',
    parts: [
      {
        name: 'Side Gables (साइड पैनल)',
        length: 34.5,
        width: 24.0,
        grain: 'L',
        allowRot: false,
        quantity: 4,
        edges: { T: true, B: false, L: true, R: false },
      },
      {
        name: 'Cabinet Bottom (नीचे का बोर्ड)',
        length: 24.0,
        width: 24.0,
        grain: 'L',
        allowRot: true,
        quantity: 2,
        edges: { T: true, B: false, L: false, R: false },
      },
      {
        name: 'Base Drawer Fronts (दराज)',
        length: 7.2,
        width: 23.5,
        grain: 'L',
        allowRot: false,
        quantity: 3,
        edges: { T: true, B: true, L: true, R: true },
      },
      {
        name: 'Main Cabinet Doors (किवाड़)',
        length: 26.0,
        width: 11.5,
        grain: 'L',
        allowRot: false,
        quantity: 4,
        edges: { T: true, B: true, L: true, R: true },
      },
    ],
  },
  {
    id: 'bookshelf',
    nameEn: 'Tall Bookshelf Unit',
    nameHi: 'किताबों की रैक (Bookshelf)',
    parts: [
      {
        name: 'Tall Sides (साइड्स)',
        length: 72.0,
        width: 12.0,
        grain: 'L',
        allowRot: false,
        quantity: 2,
        edges: { T: true, B: true, L: true, R: false },
      },
      {
        name: 'Top & Bottom (ऊपर/नीचे)',
        length: 32.0,
        width: 12.0,
        grain: 'L',
        allowRot: false,
        quantity: 2,
        edges: { T: true, B: false, L: true, R: true },
      },
      {
        name: 'Book Shelves (अलमारी रैक)',
        length: 30.5,
        width: 11.5,
        grain: 'L',
        allowRot: true,
        quantity: 5,
        edges: { T: true, B: false, L: false, R: false },
      },
    ],
  },
];
