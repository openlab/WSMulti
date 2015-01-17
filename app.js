var config = require('./config');
var util = require('util');
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var app = express();
app.use(express.static(__dirname + '/public'));
var server = http.createServer(app);
var clientport = process.env.PORT || 8080;
server.listen(clientport);
var buffMax = 1000;
var buffer =[];

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
  //start new connections with a full buffer
   for(var i=0; i < buffer.length; i++){
     ws.send(buffer[i]);
    }
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
    updateBuffer(data);
    
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

//simple buffer treated as queue.
//this queue shift is really O(n) but
//since this is such a small array it shouldn't matter
function updateBuffer(msg){
  var packetFound=false;
  //check for dupes. Only need to look at the tail end of buffer
  for(var i=buffer.length -6; i< buffer.length; i++){
    if(msg == buffer[i]){
      packetFound=true;
      break;
    }
  }
  if(!packetFound){
    buffer.push(msg);
  }
  while(buffer.length > buffMax ){
    buffer.shift();
  }
  
  // console.log(buffer);
}