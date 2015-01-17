var config = require('./config');
var util = require('util');
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var app = express();
app.use(express.static(__dirname + '/public'));
var server = http.createServer(app);
var clientport = process.env.PORT || 9999;
server.listen(clientport);

console.log('Started serving on port: ' + clientport);

var allSocks = {};  // associative array to store connections ; tried [] array but 'splice' doesn't seem to work.
connectionIDCounter = 0;

var wsSrc;
var wsDst = new WebSocketServer({server: server});

wsDst.broadcast = function(data) {  // broadcast data to all connnections
	for(var key in allSocks) {
		if(allSocks[key].readyState == 1) {
			// allSocks[key].send(new Buffer(data, "base64"));
      allSocks[key].send(data);
		}
	}
};

wsDst.on('connection', function(ws) {  // on connecting 

  ws.id = connectionIDCounter;  // set ID to counter
  ws.IP = ws._socket.remoteAddress + ':' + ws._socket.remotePort;
  allSocks[connectionIDCounter] = ws; // store socket in array object
  connectionIDCounter++; // increment counter
  
  printClientStatus(ws, 'Connected');
  printClientCount();
  
  ws.on('close', function() {
    // Remove disconnected client from the array.
    delete allSocks[ws.id];
    printClientStatus(ws, 'Disconnected');
	  printClientCount();
  });

  ws.on('error', function(error) { 
	 console.log(error); 
  });

});

function wsStart(){  // put the source websocket logic in a function for easy reconnect

  wsSrc = new WebSocket(config.sourceSocket);
  wsSrc.on('open', function() {
    printSourceStatus('Connected');
  });

  wsSrc.on('message', function(data, flags) {
    //var message = new Buffer(data).toString('base64');
  	//wsDst.broadcast(message);
    wsDst.broadcast(data);
  });

  wsSrc.on('close', function(ws) {
	  printSourceStatus('Disconnected');
    // try to reconnect
    setTimeout(wsStart(), 5000);
  });

  wsSrc.on('error', function(error) { 
  	console.log(error); 
  	setTimeout(wsStart(), 5000); 
  });
}

wsStart();

process.on('uncaughtException', function(err) {
  // try to reconnect
  if(err.code == 'ECONNREFUSED'){
    setTimeout(wsStart(), 5000);
  }
});

function printClientCount() {
  console.log('Total Connected Clients:  ' + this.Object.size(allSocks));
  console.log('Total Clients (lifetime): ' + connectionIDCounter);
}

function printClientStatus(ws, status) {
	console.log(new Date() + ' Client ' + status + ' id: ' + ws.id + ' IP: '+ ws.IP);
}

function printSourceStatus(status) {
	console.log(new Date() + ' ' + status + ' from: ' + config.sourceSocket);
}

// prototype to return size of associative array
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};