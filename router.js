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
    var controllerPath = resourceRequestedByClient.substring(1);
    
    var controller = this.routingTable[controllerPath];
    var controllerParameter = null;
    
    if (typeof(controller) != 'function' && controllerPath[controllerPath.length - 1] == '/') {
      var responseCode = 302;  // This response code is for HTTP "temporary" redirect
      var responseHeader = { 'Location': controllerPath.substring(0, controllerPath.length - 1) };
      responseHandle.writeHead(responseCode, responseHeader);
      responseHandle.end();
      return;
    }
    
    if (typeof(controller) != 'function' && /^\/categories\/([a-zA-Z0-9-]+)$/.test(controllerPath) == true) {
      controllerParameter = controllerPath.replace(/\/categories\//g, '').match(/([a-zA-Z0-9-]+)/g);
      controllerPath = controllerPath.match(/\/categories/g) + '/:categoryId';
      controller = this.routingTable[controllerPath];
    }
    
    if (typeof(controller) != 'function') {
      if (/^\/categories\/([a-zA-Z0-9-]+)$/.test(controllerPath) == true) {
        controllerParameter = controllerPath.replace(/\/categories\//g, '').match(/([a-zA-Z0-9-]+)/g);
        controllerPath = controllerPath.match(/\/categories/g) + '/:categoryId';
        controller = this.routingTable[controllerPath];
      }
      else if (/^\/change_currency\/([a-zA-Z0-9-]+)$/.test(controllerPath) == true) {
      console.log(`2, Regular Expression match! controllerPath is ${controllerPath}, controllerParameter is ${controllerParameter}`);
        controllerParameter = controllerPath.replace(/\/change_currency\//g, '').match(/([a-zA-Z0-9-]+)/g);
        controllerPath = controllerPath.match(/\/change_currency/g) + '/:currency';
        controller = this.routingTable[controllerPath];
      }
    }
    
    if (typeof(controller) == 'function') {
      if (controllerParameter == null) {
        controller(requestHandle, responseHandle);
      }
      else {
      console.log(`2, Regular Expression match! controllerPath is ${controllerPath}, controllerParameter is ${controllerParameter}`);
        controller(requestHandle, responseHandle, controllerParameter);
      }
    }
    else {
      sendResponseToClientWithoutRouter(requestHandle, responseHandle, resourceRequestedByClient);
    }
  }
}

export default Router;
