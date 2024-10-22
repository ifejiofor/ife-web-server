import fs from 'node:fs';
import MIME_TYPES from './mime-types.js';

/**
 *
 */
export function processClientRequest(requestHandle, responseHandle, path, router) {
  var resourceRequestedByClient = path + requestHandle.url;
  console.log(`resourceRequestedByClient: ${resourceRequestedByClient}`);
  
  if (router == null) {
    sendResponseToClientWithoutRouter(requestHandle, responseHandle, resourceRequestedByClient);
  }
  else {
    router.sendResponseToClient(requestHandle, responseHandle, resourceRequestedByClient);
  }
}

/**
 *
 */
export function sendResponseToClientWithoutRouter(requestHandle, responseHandle, fileRequestedByClient) {
  var callbackForSendingResponseToClient = function (error, data) {
    var responseCode = getResponseCode(fileRequestedByClient, error, data);
    var responseHeaders = getResponseHeader(fileRequestedByClient, error, data);
    var responseBody = getResponseBody(fileRequestedByClient, error, data);
    responseHandle.writeHeader(responseCode, responseHeaders);
    responseHandle.end(responseBody);
  }
  
  fs.readFile(fileRequestedByClient, callbackForSendingResponseToClient);
}

/**
 *
 */
export function getResponseCode(fileRequestedByClient, error, data) {
  if (error) {
    var responseCode = 404;
  }
  else {
    var responseCode = 200;
  }
  
  return responseCode;
}

/**
 *
 */
export function getResponseHeader(fileRequestedByClient, error, data) {
  var mimeType = getMimeType(fileRequestedByClient);

  var responseHeader = {
    'Content-Type': mimeType == undefined ? 'text/plain' : mimeType
  };
  
  return responseHeader;
}

/**
 *
 */
export function getResponseBody(fileRequestedByClient, error, data) {
  if (error) {
    var responseBody = '404 Not Found';
  }
  else {
    var responseBody = data;
  }
  
  return responseBody;
}

/**
 * Return the MIME type of a file
 * @param {string} filename - the filename of the file
 */
export function getMimeType(filename) {
  var fileExtension = getFileExtension(filename);
  return MIME_TYPES[fileExtension];
}

/**
 * Extract the file extension of a file
 * @param {string} filename - the filename of the file
 */
export function getFileExtension(filename) {
  var fileExtension = '';
    
  for (var i = filename.length - 1; i > 0 && filename[i] != '.' && filename[i] != '/'; i--) {
    fileExtension = filename[i] + fileExtension;
  }
  
  if (i > 0 && filename[i] == '.') {
    return fileExtension;
  }
  else {
    return '';
  }
}
