import http from './ife-http-manager.js'; // this is my alternative to `import http from 'node:http'`
import Router from './router.js';
import * as GenericFunctions from './generic-functions.js';

/**
 * High-level HTTP server that can listen on a specific port
 * @class
 */
class HighLevelServer {
  /**
   * Constructor
   */
  constructor() {
    this.router = null;
  }
  
  /**
   * Set the routing table of this high-level server
   * @param {JSON} routingTable - the routing table
   */
  setRoutingTable(routingTable) {
    this.router = new Router()
    this.router.setRoutingTable(routingTable);
  }
  
  /**
   * Start the server listen on a specific port and serve files from a specific file path
   * @param {string} path - the entry point of the path where the files that the server is supposed to deliver are located
   * @param {number} port - a port number (between 1024–49151)
   */
  start(path, port = 8080) {
    let router = this.router;
    
    let functionForProcessingClientRequests = function (requestHandle, responseHandle) {
      processClientRequest(requestHandle, responseHandle, path, router);
    }
    
    let server = http.createServer(functionForProcessingClientRequests);
    server.listen(port);
  }
}

/**
 * Process client request
 * @param {object} requestHandle - object that contains details about the client's request
 * @param {object} responseHandle - object that can be used to send response to the client
 * @param {string} path - the entry point of the path where the files that the server is supposed to deliver are located
 * @param {object} router - the router that is used to route client's request to an appropriate controller
 */
function processClientRequest(requestHandle, responseHandle, path, router) {
  let fullUrl = path + requestHandle.url;
  fullUrl = GenericFunctions.removeDoubleSlashesIfAny(fullUrl);
  console.log(`urlRequestedByClient: ${fullUrl}`);
  
  if (router == null) {
    GenericFunctions.sendResponseToClientWithoutRouter(requestHandle, responseHandle, fullUrl);
  }
  else {
    router.sendResponseToClient(requestHandle, responseHandle, fullUrl);
  }
}

export default HighLevelServer;
