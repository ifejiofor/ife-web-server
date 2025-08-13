import fs from 'node:fs';
import { NAME_OF_ASSET_FOLDER, MIME_TYPES } from './constants.js';

/**
 * Replace all path parameters in a routing table with regular expressions.
 * @param {JSON} routingTable - the routing table whose path parameters are to be replaced.
 */
export function replacePathParametersWithRegularExpressions(routingTable) {
  let path = null, pathBeingReplaced = null, pathParameters = null;
  let thereWasReplacement = false;
  
  for (path in routingTable) {
    pathBeingReplaced = path;
    pathParameters = pathBeingReplaced.match(RegExp(':[a-zA-Z0-9_]+', 'g'));
    
    if (pathParameters == null) {
      continue;
    }
    
    thereWasReplacement = false;
    
    for (let i = 0; i < pathParameters.length; i++) {
      pathBeingReplaced = pathBeingReplaced.replace(pathParameters[i], '[a-zA-Z0-9_]+');
      thereWasReplacement = true;
    }
    
    if (thereWasReplacement) {
      routingTable[pathBeingReplaced] = routingTable[path];
      delete routingTable[path];
    }
  }
}

/**
 * Capitalize all method names in a routing table.
 * @param {JSON} routingTable - the routing table.
 */
export function capitalizeAllMethodNames(routingTable) {
  for (let path in routingTable) {
    for (let originalMethodName in routingTable[path]) {
      let capitalizedMethodName = originalMethodName.toString().toUpperCase();
      
      if (capitalizedMethodName != originalMethodName) {
        routingTable[path][capitalizedMethodName] = routingTable[path][originalMethodName];
        delete routingTable[path][originalMethodName];
      }
    }
  }
}

/**
 * Return the first character of a string.
 * @param {string} string - the string whose first character is to be returned.
 */
export function firstCharacterOf(string) {
  return string.charAt(0);
}

/**
 * Return the last character of a string.
 * @param {string} string - the string whose last character is to be returned.
 */
export function lastCharacterOf(string) {
  return string.charAt(string.length - 1);
}

/**
 * Return true if there is a match between a regular expression and a string. Return false otherwise.
 * @param {string} regularExpression - the regular expression.
 * @param {string} string - the string.
 */
export function thereIsMatch(regularExpression, string) {
  regularExpression = RegExp('^' + regularExpression + '$');
  return regularExpression.test(string);
}

/**
 * Redirect a client to a URL.
 * @param {string} urlToRedirectTo - the URL to redirect to.
 * @param {object} responseHandle - object that can be used to send response to the client.
 */
export function redirectTo(urlToRedirectTo, responseHandle) {
  let codeOfResponse = 302;  // This code means HTTP temporary redirect
  let headOfResponse = { 'Location': urlToRedirectTo };
  responseHandle.writeHead(codeOfResponse, headOfResponse);
  responseHandle.end();
}

/**
 * Return true if a url refers to a resource from the asset folder. Return false otherwise.
 * @param {string} url - the url.
 */
export function refersToResourceFromAssetFolder(url) {
  return url.indexOf(NAME_OF_ASSET_FOLDER) != -1;
}

/**
 * Remove double slashes, if any, from a string.
 * @param {string} originalString - the string to remove double slashes from.
 */
export function removeDoubleSlashesIfAny(originalString) {
  return originalString.replace('//', '/');
}

/**
 * Send response to a client without using a router.
 * @param {object} requestHandle - object that contains details about the client's request.
 * @param {object} responseHandle - object that can be used to send response to the client.
 * @param {string} fileRequestedByClient - URL of file requested for by the client.
 */
export function sendResponseToClientWithoutRouter(requestHandle, responseHandle, fileRequestedByClient) {
  fs.readFile(fileRequestedByClient, function (error, data) {
    let codeOfResponse = getCodeOfResponse(fileRequestedByClient, error, data);
    let headOfResponse = getHeadOfResponse(fileRequestedByClient, error, data);
    let bodyOfResponse = getBodyOfResponse(fileRequestedByClient, error, data);
    responseHandle.writeHead(codeOfResponse, headOfResponse);
    responseHandle.end(bodyOfResponse);
  });
}

/**
 * Return the code of response to that should be sent to client.
 * @param {string} fileRequestedByClient - URL of file requested for by the client.
 * @param {object} error - object that indicates whether there was an error in reading the file requested for by the client.
 * @param {object} data - data from the file requested for by the client.
 */
function getCodeOfResponse(fileRequestedByClient, error, data) {
  let codeOfResponse = '';
  
  if (error) {
    codeOfResponse = 404;
  }
  else {
    codeOfResponse = 200;
  }
  
  return codeOfResponse;
}

/**
 * Return the head of response to that should be sent to client.
 * @param {string} fileRequestedByClient - URL of file requested for by the client.
 * @param {object} error - object that indicates whether there was an error in reading the file requested for by the client.
 * @param {object} data - data from the file requested for by the client.
 */
function getHeadOfResponse(fileRequestedByClient, error, data) {
  let headOfResponse = '';
  let mimeType = getMimeType(fileRequestedByClient);
  
  if (mimeType == undefined) {
    headOfResponse = { 'Content-Type': 'text/plain' };
  }
  else {
    headOfResponse = { 'Content-Type': mimeType };
  }
  
  return headOfResponse;
}

/**
 * Return the body of response to that should be sent to client.
 * @param {string} fileRequestedByClient - URL of file requested for by the client.
 * @param {object} error - object that indicates whether there was an error in reading the file requested for by the client.
 * @param {object} data - data from the file requested for by the client.
 */
function getBodyOfResponse(fileRequestedByClient, error, data) {
  let bodyOfResponse = '';
  
  if (error) {
    bodyOfResponse = '404 Not Found';
  }
  else {
    bodyOfResponse = data;
  }
  
  return bodyOfResponse;
}

/**
 * Return the MIME type of a file.
 * @param {string} filename - filename of the file.
 */
export function getMimeType(filename) {
  let fileExtension = getFileExtension(filename);
  return MIME_TYPES[fileExtension];
}

/**
 * Extract the file extension of a file.
 * @param {string} filename - filename of the file.
 */
export function getFileExtension(filename) {
  let fileExtension = filename.trim().match(RegExp('.[a-z]+$'));
  
  if (fileExtension != null) {
    fileExtension = fileExtension.toString().substring(1);
  }
  
  return fileExtension;
}
