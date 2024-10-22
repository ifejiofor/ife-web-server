import http from 'node:http';
import Router from './router.js';
import {processClientRequest} from './utility-functions.js';

/**
 * Create an HTTP server listening to a specific port.
 * @class
 */
export class Server {
  /**
   * Constructor
   */
  constructor() {
    this.router = null;
  }
  
  /**
   * Set the routing table
   * @param {JSON} routingTable - the routing table in JSON format
   */
  setRoutingTable(routingTable) {
    this.router = new Router(routingTable);
  }
  
  /**
   * Start the server from a specific entry point and on a specific user port.
   * @param {string} path - the entry point of the files the server is supposed to deliver.
   * @param {number} port - a port number (between 1024–49151).
   */
  start(path, port = 8080) {
    var router = this.router;
    
    var callbackForProcessingClientRequests = function (requestHandle, responseHandle) {
      processClientRequest(requestHandle, responseHandle, path, router);
    }
    
    var serverObject = http.createServer(callbackForProcessingClientRequests);
    serverObject.listen(port);
    console.log(`Server is started on port ${port}`);
  }
}

export default Server;
