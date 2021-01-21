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

// Import Spectrum CSS components
import '@spectrum-css/typography/dist/index-vars.css';
import '@spectrum-css/icon/dist/index-vars.css';
import '@spectrum-css/button/dist/index-vars.css';
import '@spectrum-css/actionbutton/dist/index-vars.css';
import '@spectrum-css/asset/dist/index-vars.css';
import '@spectrum-css/breadcrumb/dist/index-vars.css';
import '@spectrum-css/pagination/dist/index-vars.css';
import '@spectrum-css/card/dist/index-vars.css';
import '@adobe/focus-ring-polyfill/index.js';

import actionWebInvoke from '../utils';
import actions from '../config.json';
import './AssetsCollection.css';

// Use custom-elements to define a component
customElements.define(
  'assets-collection',
  class AssetsCollection extends HTMLElement {
    constructor() {
      super();

      document.addEventListener('exc-app:ready', async ({ detail }) => {
        this._headers = {
          'x-gw-ims-org-id': detail.imsOrg,
          authorization: `Bearer ${detail.imsToken}`
        };

        await this.render();
      });

      this.addEventListener('click', (event) => {
        const el = event.target.closest('[data-params]');
        if (el && el !== this) {
          event.preventDefault();

          // This will trigger a rendering with the new params
          this.dataset.params = el.dataset.params;
        }
      });
    }

    // Render on every data-param attribute value change
    async attributeChangedCallback() {
      const params = JSON.parse(this.dataset.params);
      this._init(params);

      await this.render();
    }

    static get observedAttributes() {
      // We're only observing changes for the data-params attribute
      return ['data-params'];
    }

    _init(params) {
      const { aem, path = '', page = 1, limit = 20 } = params;

      this._aem = aem;
      this._path = path;
      this._page = page;
      this._limit = limit;
      this._offset = (this._page - 1) * this._limit;
      this._items = [];
    }

    async render() {
      if (!(this._headers && this._aem && this.isConnected)) {
        return;
      }

      document.documentElement.scrollTop = 0;

      this.classList.add('is-loading');

      const { entities, properties } = await actionWebInvoke(actions['assets-collection'], this._headers, {
        aem: this._aem,
        path: this._path,
        offset: this._offset,
        limit: this._limit
      });

      this.classList.remove('is-loading');

      if (!entities) {
        // Open the file in the AEM asset viewer
        window.open(
          `${this._aem}assets.html/content/dam/${this._path.replace(new RegExp('/renditions/.*', 'g'), '')}`,
          '_blank'
        );
        return;
      }

      // The items are sorted alphabetically by name
      this._items = entities;
      this._total = properties['srn:paging'].total;

      const pages = Math.ceil(this._total / this._limit);
      const currentPage = Math.ceil(this._offset / this._limit) + 1;
      // Used to render the pagination
      const renderPages = () => {
        const pageLinks = [];
        for (let i = 1; i <= pages; i++) {
          pageLinks.push(`
          <a href="#" data-params='${buildParams({
            page: i
          })}' class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet ${
            i === currentPage ? 'is-selected' : ''
          }"><span class="spectrum-ActionButton-label">${i}</span></a>
        `);
        }
        return pageLinks.join('');
      };

      // Used to render the breadcrump navigation
      const nav = [
        {
          name: 'Assets',
          path: ''
        }
      ];
      let partial = [];
      this._path.split('/').forEach((item) => {
        partial.push(item);
        nav.push({
          name: item,
          path: partial.join('/')
        });
      });

      // Holds all thumbnail requests
      const thumbnailPromises = [];

      // To build params with new data that can be actioned to navigate through the assets
      const buildParams = ({ aem = this._aem, path = this._path, page = this._page }) =>
        JSON.stringify({ aem, path, page });

      // Render the HTML
      this.innerHTML = `
      <!-- Breadcrumbs navigation -->
      <nav>
        <ul class="spectrum-Breadcrumbs">
          ${
            this._path === ''
              ? `
            <li class="spectrum-Breadcrumbs-item">
              <a href="#" class="spectrum-Breadcrumbs-itemLink" aria-current="page" data-params='${buildParams({
                page: 1
              })}'>Assets</a>
            </li>
          `
              : `
            ${nav
              .map(({ name, path }, index) =>
                index !== nav.length
                  ? `
              <li class="spectrum-Breadcrumbs-item">
                <a href="#" class="spectrum-Breadcrumbs-itemLink" data-params='${buildParams({
                  path,
                  page: 1
                })}'>${name}</a>
                <svg class="spectrum-Icon spectrum-UIIcon-ChevronRight75 spectrum-Breadcrumbs-itemSeparator" focusable="false" aria-hidden="true">
                  <path d="M3.833 11.578a1.05 1.05 0 01-.742-1.793L6.876 6 3.091 2.215A1.05 1.05 0 114.575.73l4.529 4.527a1.05 1.05 0 010 1.486L4.575 11.27a1.047 1.047 0 01-.742.308z" class="spectrum-UIIcon--large"></path><path d="M7.482 4.406l-.001-.001L3.86.783a.84.84 0 00-1.188 1.188L5.702 5l-3.03 3.03A.84.84 0 003.86 9.216l3.621-3.622h.001a.84.84 0 000-1.19z" class="spectrum-UIIcon--medium"></path>
                </svg>
              </li>
            `
                  : `
              <li class="spectrum-Breadcrumbs-item">
                <a href="#" class="spectrum-Breadcrumbs-itemLink" aria-current="page" data-params='${buildParams({
                  path,
                  page: 1
                })}'>${name}</a>
              </li>
            `
              )
              .join('')}
          `
          }
        </ul>
      </nav>
      
      <!-- Assets collection in card grid -->
      <div role="grid">
        <div role="row" class="grid">
          ${this._items
            .map((item) => {
              const name = item.properties.name;
              const path = this._path === '' ? name : `${this._path}/${name}`;

              // Store the thumbnail requests for resolution after rendering the HTML
              thumbnailPromises.push(
                actionWebInvoke(actions['assets-thumbnail'], this._headers, {
                  aem: this._aem,
                  path
                })
              );

              return `<div role="gridcell" class="grid-item">
                        <a href="#" data-params='${buildParams({
                          path,
                          page: 1
                        })}' class="spectrum-Card spectrum-Card--quiet" role="figure">
                          <div class="spectrum-Card-preview">
                            <div class="spectrum-Asset"></div>
                          </div>
                          <div class="spectrum-Card-body">
                            <div class="spectrum-Card-header">
                              <div class="spectrum-Card-title spectrum-Heading spectrum-Heading--sizeXS">${
                                item.properties.title ?? item.properties.name
                              }</div>
                            </div>
                            <div class="spectrum-Card-content">
                              <div class="spectrum-Card-subtitle spectrum-Detail spectrum-Detail--sizeS">${
                                item.class[0] === 'assets/folder' ? 'folder' : 'file'
                              }</div>
                            </div>
                          </div>
                        </a>
                      </div>`;
            })
            .join('')}
        </div>
      </div>
      
      <!-- Pagination -->
      <nav class="spectrum-Pagination spectrum-Pagination--listing">
        ${
          currentPage > 1
            ? `<a href="#" data-params='${buildParams({
                page: currentPage - 1
              })}' class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary spectrum-Button--quiet spectrum-Pagination-prevButton"><span class="spectrum-Button-label">Previous</span></a>`
            : ''
        }
        
        ${renderPages()}
        
        ${
          currentPage < pages
            ? `<a href="#" data-params='${buildParams({
                page: currentPage + 1
              })}' class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary spectrum-Button--quiet spectrum-Pagination-nextButton"><span class="spectrum-Button-label">Next</span></a>`
            : ''
        }
      </nav>
      `;

      // Load the thumbnails in parallel
      const thumbnails = await Promise.all(thumbnailPromises);

      // Render the thumbnails
      Array.from(this.querySelectorAll('.spectrum-Asset')).forEach((thumbnail, index) => {
        const { type = 'file', base64 } = thumbnails[index];
        if (type === 'thumbnail') {
          thumbnail.innerHTML = `<img class="spectrum-Asset-image fade-in" src="data:image/png;base64,${base64}"/>`;
        } else if (type === 'folder') {
          thumbnail.innerHTML = `<svg viewBox="0 0 32 32" class="spectrum-Asset-folder fade-in" aria-hidden="true" focusable="false" aria-label="Folder">
          <path class="spectrum-Asset-folderBackground"
                d="M3,29.5c-1.4,0-2.5-1.1-2.5-2.5V5c0-1.4,1.1-2.5,2.5-2.5h10.1c0.5,0,1,0.2,1.4,0.6l3.1,3.1c0.2,0.2,0.4,0.3,0.7,0.3H29c1.4,0,2.5,1.1,2.5,2.5v18c0,1.4-1.1,2.5-2.5,2.5H3z"></path>
          <path class="spectrum-Asset-folderOutline"
                d="M29,6H18.3c-0.1,0-0.2,0-0.4-0.2l-3.1-3.1C14.4,2.3,13.8,2,13.1,2H3C1.3,2,0,3.3,0,5v22c0,1.6,1.3,3,3,3h26c1.7,0,3-1.4,3-3V9C32,7.3,30.7,6,29,6z M31,27c0,1.1-0.9,2-2,2H3c-1.1,0-2-0.9-2-2V7h28c1.1,0,2,0.9,2,2V27z"></path>
        </svg>`;
        } else {
          thumbnail.innerHTML = `<svg viewBox="0 0 128 128" class="spectrum-Asset-file fade-in" aria-hidden="true" focusable="false" aria-label="File">
          <path class="spectrum-Asset-fileBackground"
              d="M24,126c-5.5,0-10-4.5-10-10V12c0-5.5,4.5-10,10-10h61.5c2.1,0,4.1,0.8,5.6,2.3l20.5,20.4c1.5,1.5,2.4,3.5,2.4,5.7V116c0,5.5-4.5,10-10,10H24z"></path>
          <path class="spectrum-Asset-fileOutline"
              d="M113.1,23.3L92.6,2.9C90.7,1,88.2,0,85.5,0H24c-6.6,0-12,5.4-12,12v104c0,6.6,5.4,12,12,12h80c6.6,0,12-5.4,12-12V30.4C116,27.8,114.9,25.2,113.1,23.3z M90,6l20.1,20H92c-1.1,0-2-0.9-2-2V6z M112,116c0,4.4-3.6,8-8,8H24c-4.4,0-8-3.6-8-8V12c0-4.4,3.6-8,8-8h61.5c0.2,0,0.3,0,0.5,0v20c0,3.3,2.7,6,6,6h20c0,0.1,0,0.3,0,0.4V116z"></path>
        </svg>`;
        }
      });
    }
  }
);
