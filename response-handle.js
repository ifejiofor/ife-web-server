/**
 * A handle that can be used to send responses to clients
 * @class
 */
class ResponseHandle {
  /**
   * Constructor
   * @param {net.Socket} connectionToClientInterface - socket that is connected to the client interface
   */
  constructor(connectionToClientInterface) {
    this.connectionToClientInterface = connectionToClientInterface;
    this.head = "";
    this.body = Buffer.from("");
    this.useTransferEncoding = true;
  }
  
  /**
   * Write the head of response that should be sent to client
   * @param {number} responseCode - HTTP response code of the response
   * @param {JSON} head - HTTP headers of the response
   */
  writeHead(responseCode, head) {
    this.head = `HTTP/1.1 ${responseCode} ${this.getMeaning(responseCode)}\r\n`;
    
    for (let option in head) {
        this.head += `${option}: ${head[option]}\r\n`;
    }
    
    //this.head += "Connection: close\r\n";
  }
  
  /**
   * Write the body of response that should be sent to client
   * @param {Buffer or String} data - data that should be in the body of response
   */
  writeBody(data) {
    // If data is not a buffer, then convert data to a buffer
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }
    
    // If useTransferEncoding is true, then write body using the transfer encoding format defined in RFC 2616
    // Otherwise, write body simply
    if (this.useTransferEncoding == true) {
      let hexadecimalLengthOfData = data.length.toString(16);
      this.body = Buffer.concat([this.body, Buffer.from(hexadecimalLengthOfData), Buffer.from("\r\n")]);
      this.body = Buffer.concat([this.body, data, Buffer.from("\r\n")]);
    }
    else {
      this.body = Buffer.concat([this.body, data]);
    }
  }
    
  end(data = "") {
    if (data != "") {
      this.writeBody(data);
    }
    
    // If useTransferEncoding is true,
    // then write the last chunk of transfer-encoding data into the body (according to RFC 2616)
    if (this.useTransferEncoding == true) {
      this.body = Buffer.concat([this.body, Buffer.from("0\r\n\r\n")]);
    }
    
    // If useTransferEncoding is true, then set the Transfer-Encoding header
    // Otherwise, set the Content-Length header
    if (this.useTransferEncoding == true) {
      this.head += "Transfer-Encoding: chunked\r\n";
    }
    else {
      this.head += `Content-Length: ${this.body.length}\r\n`;
    }
    
    // Write the last line of the header
    // According to RFC 2616, a line containing only "\r\n" (CRLF) indicates the last line of a header
    this.head += "\r\n";
    
    this.connectionToClientInterface.write(this.head, () => {
      this.connectionToClientInterface.write(this.body, () => {
        this.head = "";
        this.body = Buffer.from("");
      });
    });
  }
  
  getMeaning(responseCode) {
    if (responseCode == 404) {
      return "Not Found";
    }
    else {
      return "Success";
    }
  }
}

export default ResponseHandle;
