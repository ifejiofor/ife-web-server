import {sendResponseToClientWithoutRouter, thereIsMatch} from './utility-functions.js';

class Router {
  /**
   * Constructor
   * @param {JSON} routingTable - the routing table of this router
   */
  constructor(routingTable) {
    this.routingTable = routingTable;
    
    for (var key in this.routingTable) {
      this.routingTable[key] = key.replace(key.match(/(:[a-zA-Z_]+)/g), '([a-zA-Z_]+)');
    }
  }
  
  /**
   * 
   */
  sendResponseToClient(requestHandle, responseHandle, resourceRequestedByClient) {
    var controller, firstPartOfControllerPath, controllerParameter;
    var controllerPath = resourceRequestedByClient.substring(1);
    var matchingKey = '';
    
    for (var key in this.routingTable) {
       console.log(`Within the router, thereIsMatch(key, controllerPath) is ${thereIsMatch(key, controllerPath)}`);
       if (thereIsMatch(key, controllerPath) === true) {
          matchingKey = key;
          console.log(`...Since thereisMatch I set matchingkey to ${matchingKey}`);
          break;
       }
    }
    
    console.log(`...As at this point, matchingKey is ${matchingKey}`);
    
    if (matchingKey != '') {
      console.log(this.routingTable);
      controller = this.routingTable[matchingKey];
      firstPartOfControllerPath = controllerPath.match(/^\/[a-zA-Z_]+(\/)*/g);
      controllerParameter = controllerPath.replace(firstPartOfControllerPath, '');
    }
    
    if (typeof(controller) != 'function' && controllerPath[controllerPath.length - 1] == '/') {
      var responseCode = 302;  // This response code is for HTTP "temporary" redirect
      var responseHeader = { 'Location': controllerPath.substring(0, controllerPath.length - 1) };
      responseHandle.writeHead(responseCode, responseHeader);
      responseHandle.end();
      return;
    }
    
    if (typeof(controller) == 'function') {
      if (controllerParameter == '') {
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
