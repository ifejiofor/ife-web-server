
export class ResponseHandle {
  constructor(standardInputOfServerBackend) {
    this.standardInputOfServerBackend = standardInputOfServerBackend;
    this.head = '';
    this.body = '';
  }
    
  writeHead(responseCode, head) {
    this.head = `HTTP/1.1 ${responseCode} ${this.getMeaning(responseCode)}\n`;
    
    for (let option in head) {
        this.head += `${option}: ${head[option]}\n`;
    }
  }
    
  writeBody(body) {
    this.body += body;
  }
    
  end(data = '') {
    this.writeBody(data);
    
    this.head += `Content-Length: ${this.body.length}\n`;
    this.head += '\r\n';
    
    this.standardInputOfServerBackend.write(this.head, () => {
        this.head = '';
        this.standardInputOfServerBackend.write(this.body, () => { this.body = ''});
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
