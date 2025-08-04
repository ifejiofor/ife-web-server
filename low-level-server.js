import { exec } from 'node:child_process';

/**
 * Low-level HTTP server that can listen on a specific port
 * @class
 */
export class LowLevelServer {
  /**
   * Constructor.
   * @param {function} functionForProcessingClientRequests - function that will be used to process client requests
   */
  constructor(functionForProcessingClientRequests) {
    this.functionForProcessingClientRequests = functionForProcessingClientRequests;
  }
  
  /**
   * Listen on a specific port
   * @param {number} port - port number (between 1024–49151)
   */
  listen(port = 8080) {
    console.log(`ife-http: About to start listening on port ${port}...`);
    
    // listen for incoming tcp connections, then loop through listening for client requests, and upon receiving a client request, parse it, create requestHandle and responseHandle, then call functionForProcessingClientRequests
    exec(`./node_modules/mosig-server/bin/low-level-server --port-number=${port}`, function (error, stdout, stderr) {
      if (error) {
        console.log('ife-http: Unfortunately, there is an error.');
        console.log(`${error}`);
      }
      else {
        console.log(`ife-http: Ha ha! Actual listening has started. See: ${stdout}`);
      }
    });
  }
}

export default LowLevelServer;
