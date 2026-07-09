/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CarpentryProvider } from './context/CarpentryContext';
import AppWorkspace from './components/AppWorkspace';

export default function App() {
  return (
    <CarpentryProvider>
      <AppWorkspace />
    </CarpentryProvider>
  );
}
