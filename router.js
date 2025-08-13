import * as GenericFunctions from './generic-functions.js';
import { firstCharacterOf, lastCharacterOf, refersToResourceFromAssetFolder, thereIsMatch } from './generic-functions.js';
import { NAME_OF_ASSET_FOLDER } from './constants.js';

/**
 * Router that can route client requests to appropriate controller functions
 * @class
 */
class Router {
  /**
   * Constructor
   */
  constructor() {
    this.routingTable = null;
  }
  
  /**
   * Set the routing table of this router
   * @param {JSON} routingTable - the routing table
   */
  setRoutingTable(routingTable) {
    this.routingTable = routingTable;
    GenericFunctions.replacePathParametersWithRegularExpressions(this.routingTable);
    GenericFunctions.capitalizeAllMethodNames(this.routingTable);
    console.log('\nROUTING TABLE');
    console.log(this.routingTable);
    console.log('\n');
  }
  
  /**
   * Send response to a client
   * @param {object} requestHandle - object that contains details about the client's request
   * @param {object} responseHandle - object that can be used to send response to the client
   * @param {string} urlRequestedByClient - url of resource that was requested by the client
   */
  sendResponseToClient(requestHandle, responseHandle, urlRequestedByClient) {
    let path = null, matchingPath = null, matchHasBeenFound = false, matchNotFound = true;
    let httpMethodRequestedByClient = requestHandle.method;
    let controller = null;
    let urlToRedirectTo = null;
    let resourcePartOfUrl = null, resource = null;
    
    if (firstCharacterOf(urlRequestedByClient) == '.') { // TODO: Need to remind myself why this if-statement is here; it seems unnecessary
      urlRequestedByClient = urlRequestedByClient.substring(1);
    }
    
    for (path in this.routingTable) {
      if (thereIsMatch(path, urlRequestedByClient)) {
        matchHasBeenFound = true;
        matchingPath = path;
        break;
      }
    }
    
    console.log(`   matchingPath: ${matchingPath}, httpMethodRequestedByClient: ${httpMethodRequestedByClient}`);
    
    if (matchHasBeenFound && this.routingTable[matchingPath][httpMethodRequestedByClient] == null) {
      responseHandle.writeHead(405, { 'Content-Type': 'text/plain' });
      responseHandle.end('405 Method Not Allowed');
      return;
    }
    else if (matchHasBeenFound && this.routingTable[matchingPath][httpMethodRequestedByClient] != null) {
      controller = this.routingTable[matchingPath][httpMethodRequestedByClient];
    }
    
    matchNotFound = !matchHasBeenFound;
    
    if (matchHasBeenFound && typeof(controller) == 'function') {
      controller(requestHandle, responseHandle);
    }
    else if (matchNotFound && lastCharacterOf(urlRequestedByClient) == '/') {
      urlToRedirectTo = urlRequestedByClient.substring(0, urlRequestedByClient.length - 1);
      GenericFunctions.redirectTo(urlToRedirectTo, responseHandle);
    }
    else if (matchNotFound && refersToResourceFromAssetFolder(urlRequestedByClient)) {
      resourcePartOfUrl = urlRequestedByClient.indexOf(NAME_OF_ASSET_FOLDER);
      resource = urlRequestedByClient.substring(resourcePartOfUrl);
      GenericFunctions.sendResponseToClientWithoutRouter(requestHandle, responseHandle, resource);
    }
    else {
      responseHandle.writeHead(404, { 'Content-Type': 'text/plain' });
      responseHandle.end('404 not found.');
    }
  }
}

export default Router;
