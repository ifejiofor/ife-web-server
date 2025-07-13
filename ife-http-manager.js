import LowLevelServer from './low-level-server.js';

/**
 * HTTP manager customised by me
 * The main job of the HTTP manager is to allow a high-level server to create a low-level server
 * @class
 */
class HttpManager {
  /**
   * Create a low-level server
   * @param {function} functionForProcessingClientRequests - function that will be used to process client requests
   */
  createServer(functionForProcessingClientRequests) {
    console.log('ife-http: Creating server...');
    this.server = new LowLevelServer(functionForProcessingClientRequests);
    return this.server;
  }
}

let http = new HttpManager();
export default http;
