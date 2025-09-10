#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <ctype.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <netdb.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <sys/un.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>

#define TRUE 1
#define FALSE 0
#define ERROR -1
#define SUCCESS 0
#define CHILD_PROCESS 0
#define DEFAULT_PORT_NUMBER 8080
#define MAXIMUM_LENGTH_OF_BACKLOG 4096
#define MAXIMUM_ALLOWED_NUMBER_OF_CHILD_PROCESSES 16
#define SMALLEST_BUFFER_SIZE 32
#define ADDITIONAL_BYTES_TO_ADD_TO_BUFFER_WHEN_NEEDED 32
#define MAXIMUM_ALLOWED_BUFFER_SIZE 2048

// Function declarations
bool there_is_a_child_process_that_recently_finished_executing();
void wait_for_a_child_process_to_finish_executing();
void manage_communication(int socket);
void send_client_request_to_server(int socket_connected_to_client, int socket_connected_to_server);
void send_server_response_to_client(int socket_connected_to_server, int socket_connected_to_client);
char *get_peer_host_name(int socket);
char *get_peer_port_number(int socket);
void convert_to_lowercase(char *string);
bool transfer_encoding_is_chunked(const char *transfer_encoding);
size_t read_line(int socket, char **pointer_to_buffer, size_t *pointer_to_buffer_size);
size_t read_one_byte(int socket, char *buffer_that_can_contain_one_byte);

int main(int argc, char *argv[]) {
    int result;
    int number_of_child_processes_alive;
    int listening_socket, accepted_socket;
    struct sockaddr_in listening_socket_address;
    int address_should_be_reusable;
    unsigned short port_number = DEFAULT_PORT_NUMBER;
    
    // Do not buffer outputs destined for stdout
    setbuf(stdout, NULL);
    
    // If port number was provided in the command line, then use the port number from the command line
    if (argc == 2) {
        sscanf(argv[1], "--port-number=%hu", &port_number);
    }
    
    // Set the listening socket address that would be used to listen for incoming connections
    memset(&listening_socket_address, 0, sizeof(listening_socket_address));
    listening_socket_address.sin_family = AF_INET;
    listening_socket_address.sin_port = htons(port_number);
    listening_socket_address.sin_addr.s_addr = inet_addr("0.0.0.0");
    
    // Create the listening socket
    listening_socket = socket(AF_INET, SOCK_STREAM, 0);
    
    if (listening_socket == ERROR) {
        perror("client-interface (socket-creation error)");
        exit(ERROR);
    }
    
    // Make the listening socket address to be reusable
    address_should_be_reusable = TRUE;
    result = setsockopt(listening_socket, SOL_SOCKET, SO_REUSEADDR, &address_should_be_reusable, sizeof(address_should_be_reusable));
    
    if (result == ERROR) {
        perror("client-interface (reuse-address-setting error)");
        exit(ERROR);
    }

    // Bind the listening socket to its address
    result = bind(listening_socket, (struct sockaddr *) &listening_socket_address, sizeof(listening_socket_address));
    
    if (result == ERROR) {
        perror("client-interface (socket-binding error)");
        exit(ERROR);
    }
    
    // Listen for incoming connection
    result = listen(listening_socket, MAXIMUM_LENGTH_OF_BACKLOG);
    
    if (result == ERROR) {
        perror("client-interface (socket-listening error)");
        exit(ERROR);
    }
    
    printf("client-interface: Listening on port %hu\n", port_number);
    
    // Initialise the number of child processes that are alive
    number_of_child_processes_alive = 0;
    
    for (;;) {
        // Accept an incoming connection
        accepted_socket = accept(listening_socket, NULL, NULL);
        
        if (accepted_socket == ERROR) {
            perror("client-interface (incoming-connection-acceptance error)");
            exit(ERROR);
        }
        
        // Update the number of child processes that are alive
        while (there_is_a_child_process_that_recently_finished_executing()) {
            number_of_child_processes_alive -= 1;
        }
        
        // If there are too many child processes that are alive, then wait for some to finish executing
        while (number_of_child_processes_alive >= MAXIMUM_ALLOWED_NUMBER_OF_CHILD_PROCESSES) {
            wait_for_a_child_process_to_finish_executing();
            number_of_child_processes_alive -= 1;
        }
        
        // Fork a child process that will be used to manage communication on the accepted socket
        result = fork();
        number_of_child_processes_alive += 1;
        
        if (result == ERROR) {
            perror("client-interface (fork error)");
            exit(ERROR);
        }
        else if (result == CHILD_PROCESS) {
            close(listening_socket);
            manage_communication(accepted_socket);
            exit(SUCCESS);
        }
        
        close(accepted_socket);
    }
    
    return SUCCESS;
}

/**
 * Return true if there is a child process that recently finished executing
 * Return false otherwise
 */
bool there_is_a_child_process_that_recently_finished_executing() {
    return waitpid(-1, NULL, WNOHANG) > 0;
}

/**
 * Suspend execution of the current process to make it wait for one of its child processes to finish executing
 */
void wait_for_a_child_process_to_finish_executing() {
    int result;
    
    do {
        result = wait(NULL);
    } while (result == ERROR && errno == EINTR);
}

/**
 * Manage communication (i.e., requests and responses) on a socket that is connected to a client
 * @param client_socket - the socket
 */
void manage_communication(int client_socket) {
    int server_socket;
    int result;
    char *client_host_name, *client_port_number;
    struct sockaddr_un server_address;
    
    // Print the hostname and port number of the client
    client_host_name = get_peer_host_name(client_socket);
    client_port_number = get_peer_port_number(client_socket);
    printf("client-interface: Accepted connection from %s:%s\n", client_host_name, client_port_number);
    
    // Create a UNIX-domain socket that will be used to connect to the server
    server_socket = socket(AF_UNIX, SOCK_STREAM, 0);
    
    if (server_socket == ERROR) {
        perror("client-interface (UNIX-domain-socket-creation error)");
        exit(ERROR);
    }
    
    // Set the address of the UNIX-domain that will be used to connect to the server
    memset(&server_address, 0, sizeof(server_address));
    server_address.sun_family = AF_UNIX;
    strcpy(server_address.sun_path, "/tmp/client-interface.sock");
    
    // Connect to the server
    result = connect(server_socket, (struct sockaddr *) &server_address, sizeof(server_address));
    
    if (result == ERROR) {
        perror("client-interface (connection-to-UNIX-socket error)");
        exit(ERROR);
    }
    
    for (;;) {
        send_client_request_to_server(client_socket, server_socket);
        send_server_response_to_client(server_socket, client_socket);
    }
}

/**
 * Read an HTTP request from a client and send the request to a server
 * @param socket_connected_to_client - socket from where the request should be read from
 * @param socket_connected_to_server - socket where the request should be sent to
 */
void send_client_request_to_server(int socket_connected_to_client, int socket_connected_to_server) {
    char *line_of_request_header = NULL;
    size_t line_size = 0;
    int result;
    char *client_host_name, *client_port_number;
    
    client_host_name = get_peer_host_name(socket_connected_to_client);
    client_port_number = get_peer_port_number(socket_connected_to_client);
    
    // Read lines of request header from the client, send the lines to the server
    // If EOF is read, it means that the client has closed the connection
    // According to RFC 2616, "\r\n" (CRLF) indicates the last line of a request header
    do {
        result = read_line(socket_connected_to_client, &line_of_request_header, &line_size);
        
        if (result == EOF) {
            printf("client-interface: %s:%s has closed connection\n", client_host_name, client_port_number);
            exit(SUCCESS);
        }
        
        printf("client-interface: From %s:%s, read the following line: '%s'\n",
            client_host_name, client_port_number, line_of_request_header);
        
        send(socket_connected_to_server, line_of_request_header, strlen(line_of_request_header), 0);
    } while (strcmp(line_of_request_header, "\r\n") != 0);
    
    free(line_of_request_header);
    free(client_host_name);
    free(client_port_number);
}

/**
 * Read an HTTP response from a server and send the response to a client
 * @param socket_connected_to_server - socket from where th response should be read from
 * @param socket_connected_to_client - socket where the response should be sent to
 */
void send_server_response_to_client(int socket_connected_to_server, int socket_connected_to_client) {
    char *line_of_response_header = NULL;
    size_t line_size = 0;
    int content_length = 0;
    char *transfer_encoding = malloc(MAXIMUM_ALLOWED_BUFFER_SIZE);
    transfer_encoding[0] = '\0';
    
    // Read lines of response header, send the lines to the client, and parse some information from the lines
    // According to RFC 2616, "\r\n" (CRLF) indicates the last line of a response header
    do {
        read_line(socket_connected_to_server, &line_of_response_header, &line_size);
        printf("client-interface: Read the following line of response header: '%s'\n", line_of_response_header);
        send(socket_connected_to_client, line_of_response_header, strlen(line_of_response_header), 0);
        convert_to_lowercase(line_of_response_header);
        sscanf(line_of_response_header, "content-length: %d", &content_length);
        sscanf(line_of_response_header, "transfer-encoding: %s", transfer_encoding);
    } while (strcmp(line_of_response_header, "\r\n") != 0);
    
    // Free memory allocated for line of response header
    free(line_of_response_header);
    
    // If transfer encoding is "chunked", then send response body in chunks according to RFC 2616
    if (transfer_encoding_is_chunked(transfer_encoding)) {
        char *line_of_response_body = NULL;
        char *chunk = NULL;
        size_t line_size = 0;
        unsigned int chunk_size = 0;
        
        for (;;) {
            read_line(socket_connected_to_server, &line_of_response_body, &line_size);
            send(socket_connected_to_client, line_of_response_body, strlen(line_of_response_body), 0);
            sscanf(line_of_response_body, "%x", &chunk_size);
            
            if (chunk_size == 0) {
                break;
            }
            
            // Increment chunk size by 2 to accomodate the CRLF at the end of the chunk (according to RFC 2616)
            chunk_size += 2;
            
            // Allocate memory for the chunk
            chunk = malloc(chunk_size);
            
            printf("Started obtaining a chunk of size %d from response body...\n", chunk_size - 2);
            
            // Obtain the chunk
            for (int i = 0; i < chunk_size; i++) {
                read_one_byte(socket_connected_to_server, &chunk[i]);
            }
            
            printf("Finished obtaining chunk; now sending the chunk to client...\n");
            send(socket_connected_to_client, chunk, chunk_size, 0);
            free(chunk);
            chunk_size = 0;
        }
        
        // Send the trailer to the client
        do {
            read_line(socket_connected_to_server, &line_of_response_body, &line_size);
            send(socket_connected_to_client, line_of_response_body, strlen(line_of_response_body), 0);
        } while (strcmp(line_of_response_body, "\r\n") != 0);
        
        // Free memory allocated for lines from response body
        free(line_of_response_body);
    }
    else if (content_length != 0) {
        // Allocate memory for the response body
        char *response_body = malloc(content_length);
        
        printf("Started obtaining response body...\n");
        
        // Obtain the response body
        for (int i = 0; i < content_length; i++) {
            read_one_byte(socket_connected_to_server, &response_body[i]);
        }
        
        printf("Finished obtaining response body; now sending response body to client...\n");
        
        // Send the response body to the client
        send(socket_connected_to_client, response_body, content_length, 0);
        
        // Free memory allocated for the response body
        free(response_body);
    }
    
    printf("Finished sending response body to client.\n");
    
    // Free memory allocated for transfer encoding
    free(transfer_encoding);
}

/**
 * Retrieve the host name of the peer of a socket
 * @param socket - the socket whose peer's host name is to be retrieved
 */
char *get_peer_host_name(int socket) {
    int result;
    struct sockaddr_in peer_address;
    int size_of_peer_address = sizeof(peer_address);
    int number_of_characters = NI_MAXHOST;
    char *host_name = malloc(number_of_characters);
    
    result = getpeername(socket, (struct sockaddr *) &peer_address, &size_of_peer_address);
        
    if (result == ERROR) {
        perror("client-interface (peer-name-retrieval error)");
        exit(ERROR);
    }
    
    result = getnameinfo((struct sockaddr *) &peer_address, sizeof(peer_address),
        host_name, number_of_characters, NULL, 0, NI_NUMERICHOST);
    
    if (result == ERROR) {
        perror("client-interface (name-info-retrieval error)");
        exit(ERROR);
    }
    
    return host_name;
}

/**
 * Retrieve the port number of the peer of a socket
 * @param socket - the socket whose peer's port number is to be retrieved
 */
char *get_peer_port_number(int socket) {
    int result;
    struct sockaddr_in peer_address;
    int size_of_peer_address = sizeof(peer_address);
    int number_of_characters = NI_MAXSERV;
    char *port_number = malloc(number_of_characters);
    
    result = getpeername(socket, (struct sockaddr *) &peer_address, &size_of_peer_address);
        
    if (result == ERROR) {
        perror("client-interface (peer-name-retrieval error)");
        exit(ERROR);
    }
    
    result = getnameinfo((struct sockaddr *) &peer_address, sizeof(peer_address),
        NULL, 0, port_number, number_of_characters, NI_NUMERICSERV);
    
    if (result == ERROR) {
        perror("client-interface (name-info-retrieval error)");
        exit(ERROR);
    }
    
    return port_number;
}

/**
 * Convert a string to lowercase
 * @param string - the string
 */
void convert_to_lowercase(char *string) {
    for (int i = 0; i < strlen(string); i++) {
        string[i] = tolower(string[i]);
    }
}

/**
 * Return TRUE if transfer encoding is "chunked"
 * Return FALSE otherwise
 * @param transfer_encoding - the transfer encoding
 */
bool transfer_encoding_is_chunked(const char *transfer_encoding) {
    return strstr(transfer_encoding, "chunked") != NULL;
}

/**
 * Read a line from a socket
 * @param socket - the socket
 * @param pointer_to_buffer - pointer to the buffer where the line read should be placed
 *                            if the buffer is too small, it would be increased automaticially
 * @param buffer_size - size of the buffer
 * @return if a line was read, return the count of characters in the line; if end-of-file was encountered, return EOF
 */
size_t read_line(int socket, char **pointer_to_buffer, size_t *buffer_size) {
    char *buffer;
    int byte_index, count_of_bytes_read;
    
    if (pointer_to_buffer == NULL || buffer_size == NULL) {
        char *error_message = "Called read_line with a pointer_to_buffer value or buffer_size value of NULL";
        fprintf(stderr, "client-interface: %s\n", error_message);
        exit(ERROR);
    }
    
    buffer = *pointer_to_buffer;
    
    if (buffer == NULL) {
        *buffer_size = SMALLEST_BUFFER_SIZE;
        *pointer_to_buffer = malloc(SMALLEST_BUFFER_SIZE);
        buffer = *pointer_to_buffer;
        
        if (buffer == NULL) {
            perror("client-interface (memory-allocation error)");
            exit(ERROR);
        }
    }
    
    for (byte_index = 0; byte_index < MAXIMUM_ALLOWED_BUFFER_SIZE - 1; byte_index++) {
        if (byte_index >= *buffer_size - 1) {
            *buffer_size += ADDITIONAL_BYTES_TO_ADD_TO_BUFFER_WHEN_NEEDED;
            *pointer_to_buffer = realloc(*pointer_to_buffer, *buffer_size);
            buffer = *pointer_to_buffer;
            
            if (buffer == NULL) {
                perror("client-interface (memory-reallocation error)");
                exit(ERROR);
            }
        }
        
        count_of_bytes_read = read_one_byte(socket, &buffer[byte_index]);
        
        if (count_of_bytes_read == 0 && byte_index == 0) {
            return EOF;
        }
        
        if (count_of_bytes_read == 0 && byte_index > 0) {
            buffer[byte_index] = '\0';
            return byte_index;
        }
        
        if (count_of_bytes_read == 1 && buffer[byte_index] == '\n') {
            buffer[++byte_index] = '\0';
            return byte_index;
        }
    }
    
    if (byte_index >= MAXIMUM_ALLOWED_BUFFER_SIZE - 1) {
        char *error_message = "Attempting to read a line that is longer than the maximum allowed buffer size";
        fprintf(stderr, "client-interface: %s\n", error_message);
        buffer[MAXIMUM_ALLOWED_BUFFER_SIZE - 1] = '\0';
        fprintf(stderr, "Current line contents: '%s'\n", buffer);
        exit(ERROR);
    }
}

/**
 * Read one byte from a socket
 * @param socket - the socket
 * @param buffer_that_can_contain_one_byte - buffer where the byte read should be placed
 * @return count of bytes read, which is expected to be one; if count of bytes read is zero it means that end-of-file was encountered
 */
size_t read_one_byte(int socket, char *buffer_that_can_contain_one_byte) {
    size_t count_of_bytes_read;
    
    do {
        count_of_bytes_read = read(socket, buffer_that_can_contain_one_byte, 1);
    } while (count_of_bytes_read == ERROR && errno == EINTR);
    
    if (count_of_bytes_read == ERROR) {
        perror("client-interface (read error)");
        exit(ERROR);
    }
    
    return count_of_bytes_read;
}
