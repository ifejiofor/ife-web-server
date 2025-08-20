/**
 * A handle that can be used to send responses to clients via the standard input of server backend
 * @class
 */
class ResponseHandle {
  constructor(standardInputOfServerBackend) {
    this.standardInputOfServerBackend = standardInputOfServerBackend;
    this.head = '';
    this.body = Buffer.from('');
    this.useTransferEncoding = true;
  }
    
  writeHead(responseCode, head) {
    this.head = `HTTP/1.1 ${responseCode} ${this.getMeaning(responseCode)}\r\n`;
    
    for (let option in head) {
        this.head += `${option}: ${head[option]}\r\n`;
    }
    
    this.head += 'Connection: close\r\n';
  }
    
  writeBody(data) {
    // If data is not a buffer, then convert data to a buffer
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }
    
    // If useTransferEncoding is true, then write body using the transfer encoding format defined in RFC 2616
    // Otherwise, write body simply
    if (this.useTransferEncoding == true) {
      let hexadecimalLengthOfData = data.length.toString(16);
      this.body = Buffer.concat([this.body, Buffer.from(hexadecimalLengthOfData), Buffer.from('\r\n'), data, Buffer.from('\r\n')]);
    }
    else {
      this.body = Buffer.concat([this.body, data]);
    }
  }
    
  end(data = '') {
    this.writeBody(data);
    
    // If useTransferEncoding is true, then set the Transfer-Encoding header
    // Otherwise, set the Content-Length header
    if (this.useTransferEncoding == true) {
      this.head += 'Transfer-Encoding: chunked\r\n';
    }
    else {
      this.head += `Content-Length: ${this.body.length}\r\n`;
    }
    
    // Write the last line of the header
    // According to RFC 2616, a line containing only '\r\n' (CRLF) indicates the last line of the header
    this.head += '\r\n';
    
    // Write the last chunk of transfer-encoding data into the body
    if (this.useTransferEncoding == true) {
      this.body = Buffer.concat([this.body, Buffer.from('0\r\n\r\n')]);
    }
    
    this.standardInputOfServerBackend.write(this.head, () => {
      this.standardInputOfServerBackend.write(this.body, () => {
        this.head = '';
        this.body = Buffer.from('');
      });
    });
  }
  
  getMeaning(responseCode) {
    if (responseCode == 404) {
      return 'Not Found';
    }
    else {
      return 'Success';
    }
  }
}

export default ResponseHandle;
