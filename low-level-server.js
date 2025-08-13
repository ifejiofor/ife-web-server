import { spawn } from 'node:child_process';
import ResponseHandle from './response-handle.js';

/**
 * Low-level HTTP server that can listen on a specific port
 * @class
 */
class LowLevelServer {
  /**
   * Constructor.
   * @param {function} functionForProcessingClientRequests - function that will be used to process client requests
   */
  constructor(functionForProcessingClientRequests) {
    this.functionForProcessingClientRequests = functionForProcessingClientRequests;
  }
  
  /**
   * Listen on a specific port
   * @param {number} portNumber - port number (between 1024–49151)
   */
  listen(portNumber = 8080) {
    console.log(`low-level-server: About to start listening on port ${portNumber}...`);
    
    let backend = spawn('./node_modules/mosig-server/bin/low-level-server-backend', [`--port-number=${portNumber}`]);
    this.responseHandle = new ResponseHandle(backend.stdin);
    
    backend.stdout.on('data', (data) => {
      data = data.toString();
      console.log(data);
      
      for (let line of data.split('\n')) {
        if (containsRequestHandle(line)) {
          console.log('low-level-server: A requestHandle has just been obtained from the backend');
          let requestHandle = extractRequestHandle(line);
          this.functionForProcessingClientRequests(requestHandle, this.responseHandle);
        }
      }
    });
    
    backend.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    
    backend.on('error', (error) => {
        console.error('low-level-server: Unfortunately, there is an error');
        console.error(`${error}`);
    });
  }
}

/**
 *
 */
function containsRequestHandle(string) {
  let endOfPreamble = string.indexOf(':');
  return string.slice(0, endOfPreamble) == 'requestHandle';
}

/**
 *
 */
function extractRequestHandle(string) {
  let endOfPreamble = string.indexOf(':');
  return JSON.parse(string.slice(endOfPreamble + 1));
}

export default LowLevelServer;
