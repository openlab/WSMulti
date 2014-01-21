WSMulti
=======
Node.js Application to "Multiplex" a WebSocket:
* Connects to a Source socket, creates its own WebSocket for clients to connect. 
* Reconnects to Source socket (in case of source server/service restart).
* Manages clients, connects/disconnect status and total connected (and lifetime) clients

Lightweight, few dependencies, easy to configure for multiple multiplexors in a network/cluster for massive scale. 
