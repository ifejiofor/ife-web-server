import {sendResponseToClientWithoutRouter} from './utility-functions.js';

class Router {
  /**
   * Constructor
   * @param {JSON} routingTable - the routing table of this router
   */
  constructor(routingTable) {
    this.routingTable = routingTable;
  }
  
  /**
   * 
   */
  sendResponseToClient(requestHandle, responseHandle, resourceRequestedByClient) {
    var absolutePath = resourceRequestedByClient.substring(1);
    var controller = this.routingTable[absolutePath];
    
    if (typeof(controller) == 'function') {
      controller(requestHandle, responseHandle);
    }
    else {
      sendResponseToClientWithoutRouter(requestHandle, responseHandle, resourceRequestedByClient);
    }
  }
}

export default Router;
