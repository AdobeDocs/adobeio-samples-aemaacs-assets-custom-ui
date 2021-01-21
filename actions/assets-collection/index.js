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

const fetch = require('node-fetch');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils');

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action');

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params));

    // check for missing request input parameters and headers
    const requiredParams = ['aem', 'offset', 'limit'];
    const requiredHeaders = ['Authorization'];
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders);
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger);
    }

    const { aem, path = '', offset, limit } = params;

    // configid=ims is required by AEM to validate the IMS token else you'll get a 401 Unauthorized issue
    const url = `${aem}api/assets/${path}.json?configid=ims&offset=${offset}&limit=${limit}`;

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params);
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const res = await fetch(url, {
      headers
    });

    const body = await res.json();

    return {
      statusCode: 200,
      body
    };
  } catch (error) {
    // log any server errors
    logger.error(error);
    // return with 500
    return errorResponse(500, error.message, logger);
  }
}

exports.main = main;
