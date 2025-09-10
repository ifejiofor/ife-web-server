import http from "./ife-http-manager.js"; // this is my alternative to import http from "node:http"
import Router from "./router.js";
import { sendResponseToClientWithoutRouter } from "./generic-functions.js";

/**
 * High-level server that collaborates with a low-level server to serve HTTP requests
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
    this.router = new Router();
    this.router.setRoutingTable(routingTable);
  }
  
  /**
   * Start this high-level server to listen on a specific port and serve files from a specific root path
   * @param {number} port - port number (between 1024–49151)
   * @param {string} rootPath - the root of the path where files that this server will serve are located
   */
  start(port = 8080, rootPath = "./") {
    let router = this.router;
    
    let functionToCallWheneverThereIsHttpRequest = function (requestHandle, responseHandle) {
      processHttpRequest(requestHandle, responseHandle, rootPath, router);
    }
    
    let server = http.createServer(functionToCallWheneverThereIsHttpRequest);
    server.listen(port);
  }
}

/**
 * Process an HTTP request
 * @param {object} requestHandle - object that contains details about the HTTP request
 * @param {object} responseHandle - object that should be used to send HTTP response to client
 * @param {string} rootPath - the root of the path where files that the server will serve are located
 * @param {object} router - the router that should be used to route the HTTP request to an appropriate controller
 */
function processHttpRequest(requestHandle, responseHandle, rootPath, router) {
  if (router == null) {
    sendResponseToClientWithoutRouter(requestHandle, responseHandle, rootPath);
  }
  else {
    router.sendResponseToClient(requestHandle, responseHandle, rootPath);
  }
}

export default HighLevelServer;
