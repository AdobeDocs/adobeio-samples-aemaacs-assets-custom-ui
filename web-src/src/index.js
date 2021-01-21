/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Import Spectrum CSS global variables
import '@spectrum-css/vars/dist/spectrum-global.css';
import '@spectrum-css/vars/dist/spectrum-medium.css';
import '@spectrum-css/vars/dist/spectrum-light.css';
import '@spectrum-css/page/dist/index-vars.css';

import './index.css';

import 'regenerator-runtime';
import './utils.js';
import Runtime, { init } from '@adobe/exc-app';
import './components/AssetsCollection.js';

window.onload = () => {
  /* Here you can bootstrap your application and configure the integration with the Adobe Experience Cloud Shell */
  try {
    // attempt to load the Experience Cloud Runtime
    require('./exc-runtime');
    // if there are no errors, bootstrap the app in the Experience Cloud Shell
    init(initRuntime);
  } catch (e) {
    console.log('application not running in Adobe Experience Cloud Shell');
    // fallback mode, run the application without the Experience Cloud Runtime
  }
};

/**
 * Initialize runtime and get IMS profile
 */
function initRuntime() {
  // get the Experience Cloud Runtime object
  const runtime = Runtime();
  // ready event brings in authentication/user info
  runtime.on('ready', async (params) => {
    // tell the exc-runtime object we are done
    runtime.done();

    // Dispatch the 'exc-app:ready' event with params for the assets-collection
    document.dispatchEvent(new CustomEvent('exc-app:ready', { detail: params }));
  });
  // set solution info, shortTitle is used when window is too small to display full title
  runtime.solution = {
    icon: 'AdobeExperienceCloud',
    title: 'Adobe IO Sample Custom AEMaaCS Assets custom UI'
  };
  runtime.title = 'Adobe IO Sample AEMaaCS Assets custom UI';
}
