import { replacePathParametersWithRegularExpressions } from './utility-functions.js';
import { sendResponseToClientWithoutRouter } from './utility-functions.js';
import { refersToResourceFromAssetFolder } from './utility-functions.js';
import { NAME_OF_ASSET_FOLDER } from './utility-constants.js';
import { firstCharacterOf } from './utility-functions.js';
import { lastCharacterOf } from './utility-functions.js';
import { thereIsMatch } from './utility-functions.js';
import { redirectTo } from './utility-functions.js';

/**
 * Create a router to route client requests to appropriate controller functions.
 * @class
 */
class Router {
  /**
   * Constructor.
   * @param {JSON} routingTableOfThisRouter - the routing table of this router.
   */
  constructor(routingTableOfThisRouter) {
    this.routingTable = routingTableOfThisRouter;
    replacePathParametersWithRegularExpressions(this.routingTable);
    
    console.log(this.routingTable);
  }
  
  /**
   * Send response to a client.
   * @param {object} requestHandle - object that contains details about the client's request.
   * @param {object} responseHandle - object that can be used to send response to the client.
   * @param {string} urlRequestedByClient - url of resource that was requested by the client.
   */
  sendResponseToClient(requestHandle, responseHandle, urlRequestedByClient) {
    let path = null, matchingPath = null, matchHasBeenFound = false;
    let controller = null;
    let firstPartOfUrl = null, secondPartOfUrl = null, urlToRedirectTo = null;
    let indexOfAssetFolder = null;
    
    if (firstCharacterOf(urlRequestedByClient) == '.') {
      urlRequestedByClient = urlRequestedByClient.substring(1);
    }
    
    for (path in this.routingTable) {
      if (thereIsMatch(path, urlRequestedByClient)) {
        matchHasBeenFound = true;
        matchingPath = path;
        break;
      }
    }
    
    if (matchHasBeenFound) {
      controller = this.routingTable[matchingPath];
      console.log(`   matchingPath: ${matchingPath}`);
    }
    
    if (typeof(controller) == 'function') {
      controller(requestHandle, responseHandle);
    }
    else if (typeof(controller) != 'function' && lastCharacterOf(urlRequestedByClient) == '/') {
      urlToRedirectTo = urlRequestedByClient.substring(0, urlRequestedByClient.length - 1);
      redirectTo(urlToRedirectTo, responseHandle);
    }
    else if (typeof(controller) != 'function' && refersToResourceFromAssetFolder(urlRequestedByClient)) {
      indexOfAssetFolder = urlRequestedByClient.indexOf(NAME_OF_ASSET_FOLDER);
      urlRequestedByClient = '.' + urlRequestedByClient.substring(indexOfAssetFolder);
      sendResponseToClientWithoutRouter(requestHandle, responseHandle, urlRequestedByClient);
    }
    else {
      responseHandle.writeHead(404, { 'Content-Type': 'text/plain' });
      responseHandle.end('404 not found.');
    }
  }
}

export default Router;
