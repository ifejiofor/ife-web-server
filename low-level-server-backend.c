#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <netdb.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>

#define TRUE 1
#define FALSE 0
#define ERROR -1
#define SUCCESS 0
#define CHILD_PROCESS 0
#define DEFAULT_PORT_NUMBER 8080
#define MAXIMUM_LENGTH_OF_BACKLOG 1
#define MAXIMUM_ALLOWED_NUMBER_OF_CHILD_PROCESSES 1
#define SMALLEST_BUFFER_SIZE 32
#define ADDITIONAL_BYTES_TO_ADD_TO_BUFFER_WHEN_NEEDED 32
#define MAXIMUM_ALLOWED_BUFFER_SIZE 2048
#define MAXIMUM_POSSIBLE_LENGTH_OF_A_URL 1024
#define MAXIMUM_POSSIBLE_LENGTH_OF_HTTP_METHOD_NAME 6
#define MAXIMUM_POSSIBLE_LENGTH_OF_HTTP_VERSION_STRING 9
#define STDIN 0

// TODO: Change architecture so that multiple child processes exists throughout the lifetime of app and all bind to the same socket address with different socket file descriptors and listen
// Function declarations
int there_is_a_child_process_that_recently_finished_executing();
void wait_for_a_child_process_to_finish_executing();
void manage_client_requests(int socket);
char *get_peer_host_name(int socket);
char *get_peer_port_number(int socket);
void process_client_request(const char *http_method, const char *url);
void send_response_to_client(int socket_connected_to_client);
void convert_to_lowercase(char *string);
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
    
    // If port number was provided in the command line, then use what was provided in the command line
    if (argc == 2) {
        sscanf(argv[1], "--port-number=%hu", &port_number);
    }
    
    // Set the listening socket address that would be used to listen for incoming connections
    listening_socket_address.sin_family = AF_INET;
    listening_socket_address.sin_port = htons(port_number);
    listening_socket_address.sin_addr.s_addr = inet_addr("0.0.0.0");
    
    // Create the listening socket
    listening_socket = socket(AF_INET, SOCK_STREAM, 0);
    
    if (listening_socket == ERROR) {
        perror("low-level-server-backend (socket-creation error)");
        exit(ERROR);
    }
    
    // Make the listening socket address to be reusable
    address_should_be_reusable = TRUE;
    result = setsockopt(listening_socket, SOL_SOCKET, SO_REUSEADDR, &address_should_be_reusable, sizeof(address_should_be_reusable));
    
    if (result == ERROR) {
        perror("low-level-server-backend (reuse-address-setting error)");
        exit(ERROR);
    }

    // Bind the listening socket to its address
    result = bind(listening_socket, (struct sockaddr *) &listening_socket_address, sizeof(listening_socket_address));
    
    if (result == ERROR) {
        perror("low-level-server-backend (socket-binding error)");
        exit(ERROR);
    }
    
    // Listen for incoming connection
    result = listen(listening_socket, MAXIMUM_LENGTH_OF_BACKLOG);
    
    if (result == ERROR) {
        perror("low-level-server-backend (socket-listening error)");
        exit(ERROR);
    }
    
    printf("low-level-server-backend: Listening on port %hu\n", port_number);
    
    // Initialise the number of child processes that are alive
    number_of_child_processes_alive = 0;
    
    for (;;) {
        // Accept an incoming connection
        accepted_socket = accept(listening_socket, NULL, NULL);
        
        if (accepted_socket == ERROR) {
            perror("low-level-server-backend (incoming-connection-acceptance error)");
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
        
        // Fork a child process that would be used to process client requests on the accepted socket
        result = fork();
        
        if (result == ERROR) {
            perror("low-level-server-backend (fork error)");
            exit(ERROR);
        }
        else if (result == CHILD_PROCESS) {
            close(listening_socket);
            manage_client_requests(accepted_socket);
            exit(SUCCESS);
        }
        
        number_of_child_processes_alive += 1;
        close(accepted_socket);
    }
    
    return SUCCESS;
}

/**
 * Return true if there is a child process that recently finished executing
 * Return false otherwise
 */
int there_is_a_child_process_that_recently_finished_executing() {
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
 * Manage client requests that are received through a socket
 * @param socket_connected_to_client - the socket through which client requests are received
 */
void manage_client_requests(int socket_connected_to_client) {
    char *line_of_client_request = NULL;
    size_t line_size = 0;
    int line_number = 0;
    int result;
    char url[MAXIMUM_POSSIBLE_LENGTH_OF_A_URL];
    char http_method[MAXIMUM_POSSIBLE_LENGTH_OF_HTTP_METHOD_NAME];
    char http_version[MAXIMUM_POSSIBLE_LENGTH_OF_HTTP_VERSION_STRING];
    char *client_host_name, *client_port_number;
    
    client_host_name = get_peer_host_name(socket_connected_to_client);
    client_port_number = get_peer_port_number(socket_connected_to_client);
    printf("low-level-server-backend: Accepted connection from %s:%s\n", client_host_name, client_port_number);
    
    result = read_line(socket_connected_to_client, &line_of_client_request, &line_size);
    
    while (result != EOF) {
        printf("low-level-server-backend: From %s:%s, read the following line: '%s'\n",
            client_host_name, client_port_number, line_of_client_request);
        ++line_number;
        
        if (line_number == 1) {
            sscanf(line_of_client_request, "%s %s %s", http_method, url, http_version);
        }
        
        if (strcmp(line_of_client_request, "\r\n") == 0) { // According to RFC 2616, "\r\n" (CRLF) indicates the last line of client request
            // Process client request
            process_client_request(http_method, url);
            
            // Send response to client
            send_response_to_client(socket_connected_to_client);
            
            // Reinitialise line number
            line_number = 0;
        }
        
        printf("About to read another line from socket connected to client...\n");
        result = read_line(socket_connected_to_client, &line_of_client_request, &line_size);
        printf("Just finished reading another line from socket connected to client.\n");
    }
    
    printf("low-level-server-backend: %s:%s has closed connection\n", client_host_name, client_port_number);
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
        perror("low-level-server-backend (peer-name-retrieval error)");
        exit(ERROR);
    }
    
    result = getnameinfo((struct sockaddr *) &peer_address, sizeof(peer_address),
        host_name, number_of_characters, NULL, 0, NI_NUMERICHOST);
    
    if (result == ERROR) {
        perror("low-level-server-backend (name-info-retrieval error)");
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
        perror("low-level-server-backend (peer-name-retrieval error)");
        exit(ERROR);
    }
    
    result = getnameinfo((struct sockaddr *) &peer_address, sizeof(peer_address),
        NULL, 0, port_number, number_of_characters, NI_NUMERICSERV);
    
    if (result == ERROR) {
        perror("low-level-server-backend (name-info-retrieval error)");
        exit(ERROR);
    }
    
    return port_number;
}

/**
 * 
 */
void process_client_request(const char *http_method, const char *url) {
    fprintf(stdout,
        "requestHandle: { \
            \"method\": \"%s\", \
            \"url\": \"%s\", \
            \"headers\": { \
                \"content-type\": \"text/html\", \
                \"cookie\": \"\" \
            } \
        } \
        \n", http_method, url
    );
}

/**
 * 
 */
void send_response_to_client(int socket_connected_to_client) {
    char *line_from_response_header = NULL;
    size_t line_size = 0;
    int content_length = 0;
    char *transfer_encoding = malloc(MAXIMUM_ALLOWED_BUFFER_SIZE);
    transfer_encoding[0] = '\0';
    
    // Read lines from response header, send the lines to the client, and parse some information from the lines
    do {
        read_line(STDIN, &line_from_response_header, &line_size);
        printf("Scanned the following line from response header: '%s'\n", line_from_response_header);
        send(socket_connected_to_client, line_from_response_header, strlen(line_from_response_header), 0);
        convert_to_lowercase(line_from_response_header);
        sscanf(line_from_response_header, "content-length: %d", &content_length);
        sscanf(line_from_response_header, "transfer-encoding: %s", transfer_encoding);
    } while (strcmp(line_from_response_header, "\r\n") != 0);
    
    // Free memory allocated for lines from response header
    free(line_from_response_header);
    
    if (strstr(transfer_encoding, "chunked") != NULL) {
        char *line_from_response_body = NULL;
        char *chunk = NULL;
        size_t line_size = 0;
        unsigned int chunk_size = 0;
        
        for (;;) {
            read_line(STDIN, &line_from_response_body, &line_size);
            send(socket_connected_to_client, line_from_response_body, strlen(line_from_response_body), 0);
            sscanf(line_from_response_body, "%x", &chunk_size);
            
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
                read_one_byte(STDIN, &chunk[i]);
            }
            
            printf("Finished obtaining chunk; now sending the chunk to client...\n");
            send(socket_connected_to_client, chunk, chunk_size, 0);
            free(chunk);
            chunk_size = 0;
        }
        
        // Send the trailer to the client
        do {
            read_line(STDIN, &line_from_response_body, &line_size);
            send(socket_connected_to_client, line_from_response_body, strlen(line_from_response_body), 0);
        } while (strcmp(line_from_response_body, "\r\n") != 0);
        
        // Free memory allocated for lines from response body
        free(line_from_response_body);
    }
    else if (content_length != 0) {
        char *response_body = NULL;
        
        // Allocate memory for the response body
        response_body = malloc(content_length);
        
        // Obtain the response body
        printf("Started obtaining response body...\n");
        
        for (int i = 0; i < content_length; i++) {
            read_one_byte(STDIN, &response_body[i]);
        }
        
        printf("Finished obtaining response body; now sending response body to client...\n");
        
        // Send the response body to the client
        send(socket_connected_to_client, response_body, content_length, 0);
        
        // Free memory allocated for the response body
        free(response_body);
    }
    
    printf("Finished sending response body to client.\n");
    
    // Free memory allocated for trasfer encoding
    free(transfer_encoding);
}

/**
 * 
 */
void convert_to_lowercase(char *string) {
    for (int i = 0; i < strlen(string); i++) {
        string[i] = tolower(string[i]);
    }
}

/**
 * 
 */
size_t read_line(int socket, char **pointer_to_buffer, size_t *buffer_size) {
    char *buffer;
    int byte_index, count_of_bytes_read;
    
    if (pointer_to_buffer == NULL || buffer_size == NULL) {
        char *error_message = "Called read_line with a pointer_to_buffer value or buffer_size value of NULL";
        fprintf(stderr, "low-level-server-backend: %s\n", error_message);
        exit(ERROR);
    }
    
    buffer = *pointer_to_buffer;
    
    if (buffer == NULL) {
        *buffer_size = SMALLEST_BUFFER_SIZE;
        *pointer_to_buffer = malloc(SMALLEST_BUFFER_SIZE);
        buffer = *pointer_to_buffer;
        
        if (buffer == NULL) {
            perror("low-level-server-backend (memory-allocation error)");
            exit(ERROR);
        }
    }
    
    for (byte_index = 0; byte_index < MAXIMUM_ALLOWED_BUFFER_SIZE - 1; byte_index++) {
        if (byte_index >= *buffer_size - 1) {
            *buffer_size += ADDITIONAL_BYTES_TO_ADD_TO_BUFFER_WHEN_NEEDED;
            *pointer_to_buffer = realloc(*pointer_to_buffer, *buffer_size);
            buffer = *pointer_to_buffer;
            
            if (buffer == NULL) {
                perror("low-level-server-backend (memory-reallocation error)");
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
        fprintf(stderr, "low-level-server-backend: %s\n", error_message);
        buffer[MAXIMUM_ALLOWED_BUFFER_SIZE - 1] = '\0'; fprintf(stderr, "See: '%s'\n", buffer);
        exit(ERROR);
    }
}

/**
 *
 */
size_t read_one_byte(int socket, char *buffer_that_can_contain_one_byte) {
    size_t count_of_bytes_read;
    
    do {
        count_of_bytes_read = read(socket, buffer_that_can_contain_one_byte, 1);
    } while (count_of_bytes_read == ERROR && errno == EINTR);
    
    if (count_of_bytes_read == ERROR) {
        perror("low-level-server-backend (read error)");
        exit(ERROR);
    }
    
    return count_of_bytes_read;
}
