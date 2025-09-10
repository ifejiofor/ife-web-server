import * as GenericFunctions from "./generic-functions.js";
import { lastCharacterOf, thereIsMatch, couldBeFoundInAssetFolder } from "./generic-functions.js";
import { NAME_OF_ASSET_FOLDER } from "./constants.js";

/**
 * Router that can route HTTP requests to appropriate controller functions
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
    GenericFunctions.capitaliseAllMethodNames(this.routingTable);
    console.log("\n***Routing Table:***");
    console.log(this.routingTable);
    console.log("\n");
  }
  
  /**
   * Send response to a client
   * @param {object} requestHandle - object that contains details about the client's request
   * @param {object} responseHandle - object that should be used to send response to the client
   * @param {string} rootPath - the root of the path where files that the server will serve are located
   */
  sendResponseToClient(requestHandle, responseHandle, rootPath) {
    let controller = null;
    let matchingPath = null;
    let urlToRedirectTo = null;
    let matchHasBeenFound = false, matchNotFound = true;
    
    let httpMethodRequestedByClient = requestHandle.method;
    let urlRequestedByClient = requestHandle.url;
    
    for (let path in this.routingTable) {
      if (thereIsMatch(path, urlRequestedByClient)) {
        matchHasBeenFound = true;
        matchingPath = path;
        break;
      }
    }
    
    console.log(`urlRequestedByClient: ${urlRequestedByClient}`);
    console.log(`matchingPath: ${matchingPath}, httpMethodRequestedByClient: ${httpMethodRequestedByClient}`);
    
    if (matchHasBeenFound && this.routingTable[matchingPath][httpMethodRequestedByClient] == null) {
      responseHandle.writeHead(405, { "Content-Type": "text/plain" });
      responseHandle.end("405 Method Not Allowed");
      return;
    }
    else if (matchHasBeenFound && this.routingTable[matchingPath][httpMethodRequestedByClient] != null) {
      controller = this.routingTable[matchingPath][httpMethodRequestedByClient];
    }
    
    matchNotFound = !matchHasBeenFound;
    
    if (matchHasBeenFound && typeof(controller) == "function") {
      controller(requestHandle, responseHandle); // here, the controller is a function, so this statement calls the controller function
    }
    else if (matchNotFound && lastCharacterOf(urlRequestedByClient) == "/") {
      urlToRedirectTo = urlRequestedByClient.substring(0, urlRequestedByClient.length - 1);
      GenericFunctions.redirectTo(urlToRedirectTo, responseHandle);
    }
    else if (matchNotFound && couldBeFoundInAssetFolder(urlRequestedByClient)) {
      GenericFunctions.sendResponseToClientWithoutRouter(requestHandle, responseHandle, rootPath);
    }
    else {
      responseHandle.writeHead(404, { "Content-Type": "text/plain" });
      responseHandle.end("404 not found.");
    }
  }
}

export default Router;
