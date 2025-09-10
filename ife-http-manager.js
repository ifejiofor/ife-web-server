import LowLevelServer from "./low-level-server.js";

/**
 * An HTTP manager customised by me
 * The main job of this HTTP manager is to allow a high-level server to create a low-level server
 * @class
 */
class HttpManager {
  /**
   * Create a low-level server
   * @param {function} functionToCallWheneverThereIsHttpRequest - function that the low-level server should call whenever there is an HTTP request
   */
  createServer(functionToCallWheneverThereIsHttpRequest) {
    console.log("ife-http-manager: Creating server...");
    this.server = new LowLevelServer(functionToCallWheneverThereIsHttpRequest);
    return this.server;
  }
}

let http = new HttpManager();
export default http;
