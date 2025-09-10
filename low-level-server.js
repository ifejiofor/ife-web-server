import net from "node:net";
import { spawn } from "node:child_process";
import { lastCharacterOf } from "./generic-functions.js";
import ResponseHandle from "./response-handle.js";

/**
 * Low-level server that can listen for, and interpret, HTTP requests
 * @class
 */
class LowLevelServer {
  /**
   * Constructor
   * @param {function} functionToCallWheneverThereIsHttpRequest - function to call whenever there is an HTTP request
   */
  constructor(functionToCallWheneverThereIsHttpRequest) {
    this.functionToCallWheneverThereIsHttpRequest = functionToCallWheneverThereIsHttpRequest;
  }
  
  /**
   * Listen on a specific port
   * @param {number} portNumber - port number (between 1024–49151)
   */
  listen(portNumber = 8080) {
    console.log(`low-level-server: About to start listening on port ${portNumber}...`);
    let functionToCallWheneverThereIsHttpRequest = this.functionToCallWheneverThereIsHttpRequest;
    let clientInterface = spawn("node_modules/mosig-server/bin/client-interface", [`--port-number=${portNumber}`]);
    
    let functionToCallWheneverThereIsNewConnectionToClientInterface = function (newConnectionToClientInterface) {
      manageHttpRequests(newConnectionToClientInterface, functionToCallWheneverThereIsHttpRequest);
    };
    
    let server = net.createServer(functionToCallWheneverThereIsNewConnectionToClientInterface);
    server.listen("/tmp/client-interface.sock");
    
    clientInterface.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    
    clientInterface.stderr.on("data", (data) => {
        console.error(data.toString());
    });
    
    clientInterface.on("error", (error) => {
        console.error("low-level-server: Unfortunately, there is an error on the client interface");
        console.error(error.toString());
    });
  }
}

/**
 * Function that manages HTTP requests that are received through a client interface
 * @param {net.Socket} connectionToClientInterface - socket that is connected to the client interface
 * @param {function} functionToCallWheneverThereIsHttpRequest - function to call whenever there is an HTTP request
 */
function manageHttpRequests(connectionToClientInterface, functionToCallWheneverThereIsHttpRequest) {
  let lineNumber = 0;
  let lines = [];
  let buffer = "";
  let httpMethod = "", url = "", httpVersion = "";
  let requestHandle = { headers: {} };
  let responseHandle = new ResponseHandle(connectionToClientInterface);
  
  connectionToClientInterface.on("data", (data) => {
    buffer += data.toString();
    lines = buffer.split("\n");
    buffer = lines.pop(); // keep the last partial line in the buffer
    
    for (let line of lines) {
      line = `${line}\n`;
      lineNumber++;
      
      if (lineNumber == 1) {
        [httpMethod, url, httpVersion] = line.split(/\s+/);
        requestHandle.method = httpMethod;
        requestHandle.url = url;
      }
      
      if (lineNumber > 1 && line != "\r\n") { // this means that this line contains a key-value pair (according to RFC 2616)
        let delimiter = line.indexOf(":");
        let key = line.substring(0, delimiter).trim().toLowerCase();
        let value = line.substring(delimiter + 1).trim();
        requestHandle.headers[key] = value;
      }
      
      if (line == "\r\n") { // According to RFC 2616, "\r\n" (CRLF) indicates the last line of an HTTP request
        functionToCallWheneverThereIsHttpRequest(requestHandle, responseHandle);
        lineNumber = 0;
      }
    }
  });
}

export default LowLevelServer;
