#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <netdb.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>

#define ERROR -1
#define SUCCESS 0
#define CHILD_PROCESS 0
#define DEFAULT_PORT_NUMBER 8080
#define MAXIMUM_LENGTH_OF_BACKLOG 4096
#define MAXIMUM_ALLOWED_NUMBER_OF_CHILD_PROCESSES 1024

// Function declarations
char *retrieve_host_name(const struct sockaddr_in *socket_address);
char *retrieve_port_number(const struct sockaddr_in *socket_address);
void process_client_requests(int socket);
void wait_for_a_child_process_to_finish_executing();
int there_is_a_child_process_that_recently_finished_executing();

int main(int argc, char *argv[]) {
    int result;
    int number_of_child_processes_alive;
    unsigned short port_number = DEFAULT_PORT_NUMBER;
    int listening_socket, accepted_socket;
    struct sockaddr_in listening_socket_address, accepted_socket_address;
    
    // Create a socket that would be used to listen for incoming connections
    listening_socket = socket(AF_INET, SOCK_STREAM, 0);
    
    if (listening_socket == ERROR) {
        perror("low-level-server (socket-creation error)");
        exit(ERROR);
    }
    
    // If port number was provided in the command line, then use what was provided in the command line
    if (argc == 2) {
        sscanf(argv[1], "--port-number=%hu", &port_number);
    }
    
    // Set the listening socket address
    listening_socket_address.sin_family = AF_INET;
    listening_socket_address.sin_port = htons(port_number);
    listening_socket_address.sin_addr.s_addr = inet_addr("0.0.0.0");

    // Bind the listening socket to the socket address
    result = bind(listening_socket, (struct sockaddr *) &listening_socket_address, sizeof(listening_socket_address));
    
    if (result == ERROR) {
        int cause_of_error = errno;
        perror("low-level-server (socket-binding error)");
        
        if (cause_of_error == EADDRINUSE) {
            fprintf(stderr, "Please, wait a few seconds and try again.\n");
        }
        
        exit(ERROR);
    }
    
    // Listen for incoming connection
    result = listen(listening_socket, MAXIMUM_LENGTH_OF_BACKLOG);
    
    if (result == ERROR) {
        perror("low-level-server (socket-listening error)");
        exit(ERROR);
    }
    
    printf("low-level-server: Listening on port %hu\n", port_number);
    
    // Initialise the number of child processes that are alive
    number_of_child_processes_alive = 0;
    
    for (;;) {
        // Determine what would be the size of an accepted socket address
        int size_of_accepted_socket_address = sizeof(accepted_socket_address);
        
        // Accept an incoming connection via the listening socket
        accepted_socket = accept(listening_socket,
            (struct sockaddr *) &accepted_socket_address, &size_of_accepted_socket_address);
        
        if (accepted_socket == ERROR) {
            perror("low-level-server (incoming-connection-acceptance error)");
            exit(ERROR);
        }
        
        char *host_name = retrieve_host_name(&accepted_socket_address);
        char *port_number = retrieve_port_number(&accepted_socket_address);
        
        printf("low-level-server: Accepted connection from %s:%s\n", host_name, port_number);
        
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
            perror("low-level-server (fork error)");
            exit(ERROR);
        }
        else if (result == CHILD_PROCESS) {
            process_client_requests(accepted_socket);
            exit(SUCCESS);
        }
        
        number_of_child_processes_alive += 1;
        close(accepted_socket);
    }
    
    return SUCCESS;
}


/**
 * Retrieve the host name associated with a given socket address
 */
char *retrieve_host_name(const struct sockaddr_in *socket_address) {
    int number_of_characters = NI_MAXHOST;
    char *host_name = calloc(number_of_characters, sizeof(char));
    
    getnameinfo((struct sockaddr *) socket_address, sizeof(*socket_address), host_name, number_of_characters, NULL, 0,
        NI_NUMERICHOST);
    
    return host_name;
}

/**
 * Retrieve the port number associated with a given socket address
 */
char *retrieve_port_number(const struct sockaddr_in *socket_address) {
    int number_of_characters = NI_MAXSERV;
    char *port_number = calloc(number_of_characters, sizeof(char));
    
    getnameinfo((struct sockaddr *) socket_address, sizeof(*socket_address), NULL, 0, port_number, number_of_characters,
        NI_NUMERICSERV);
    
    return port_number;
}

/**
 * Return true if there is a child process that recently finished executing
 * Return false otherwise
 */
int there_is_a_child_process_that_recently_finished_executing() {
    return waitpid(-1, NULL, WNOHANG) > 0;
}

/**
 * Block the current process to make it wait for one of its child processes to finish executing
 */
void wait_for_a_child_process_to_finish_executing() {
    wait(NULL);
}

/**
 * Process client requests that are received through a given socket
 * @param socket - the socket through which client requests are received
 */
void process_client_requests(int socket) {
    printf("low-level-server: Ready to process client request!\n");
    sleep(60);
}
