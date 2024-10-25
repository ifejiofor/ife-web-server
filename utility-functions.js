import fs from 'node:fs';
import MIME_TYPES from './mime-types.js';

/**
 *
 */
export function processClientRequest(requestHandle, responseHandle, path, router) {
  var resourceRequestedByClient = removeDoubleSlashesIfAny(path + requestHandle.url);
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
export function thereIsMatch(regularExpression, string) {
  console.log(`regularExpression is "${regularExpression}"`);
  regularExpression = RegExp('^' + regularExpression + '$', 'g');
  //console.log(`Again, regularExpression is "${regularExpression}", testing with ${string}, result is ${regularExpression.test(string)}`);
  return regularExpression.test(string);
}

/**
 *
 */
export function removeDoubleSlashesIfAny(originalString) {
  var resultString = '';
  var previousCharacter = '';
  var currentCharacter;
  
  for (var i = 0; i < originalString.length; i++, previousCharacter = originalString[i - 1]) {
    currentCharacter = originalString[i];
    
    if (currentCharacter != '/' || previousCharacter != '/') {
      resultString += currentCharacter;
    }
  }
  
  return resultString;
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
