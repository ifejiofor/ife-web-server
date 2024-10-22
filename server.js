import http from 'node:http';
import fs from 'node:fs';
import MIME_TYPES from './mime-types.js';

/**
 * Create an HTTP server listening to a specific port.
 * @class
 */
export class Server {
  /**
   * Start the server from a specific entry point and on a specific user port.
   * @param {string} path - the entry point of the files the server is supposed to deliver.
   * @param {number} port - a port number (between 1024–49151).
   */
  start(path, port = 8080) {
    var callbackForProcessingClientRequests = function (request, response) {
      var fileRequestedByClient = path + request.url;
      
      console.log(`fileRequestedByClient: ${fileRequestedByClient}`);
      
      fs.readFile(fileRequestedByClient, function (error, data) {
        var mimeType = getMimeType(fileRequestedByClient);
        
        var responseHeaders = {
          'Content-Type': mimeType == undefined ? 'text/plain' : mimeType
        };
      
        if (error) {
          var statusCode = 404;
          var responseBody = '404 Not Found';
        }
        else {
          var statusCode = 200;
          var responseBody = data;
        }
      
        response.writeHeader(statusCode, responseHeaders);
        response.write(responseBody);
        response.end();
      });
    }
    
    var serverObject = http.createServer(callbackForProcessingClientRequests);
    serverObject.listen(port);
    console.log(`Server is started on port ${port}`);
  }
}

function getMimeType(filename) {
  var fileExtension = extractFileExtension(filename);
  return MIME_TYPES[fileExtension];
}

function extractFileExtension(filename) {
  var fileExtension = '';
    
  for (var i = filename.length - 1; i > 0 && filename[i] != '.' && filename[i] != '/'; i--) {
    fileExtension = filename[i] + fileExtension;
  }
  
  if (i > 0 && filename[i] == '.') {
    return fileExtension;
  }
  else {
    return '';
  }
}

export default Server;
