var config = require('./config');
var azure = require('azure');
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

var msg = [];  // array for messages
var allSocks = {};  // associative array to store connections ; tried [] array but 'splice' doesn't seem to work.
var connectionIDCounter = 0;

function wsStart(){

  var wsSrc = new WebSocket(config.sourceSocket);
  wsSrc.on('open', function() {
      console.log(new Date() + ' Connected to: ' + config.sourceSocket);
  });

  wsSrc.on('message', function(data, flags) {
    var message = new Buffer(data).toString('base64');
    msg.push(message);
    //console.log("message received. Msg length: " + msg.length);
  });

  wsSrc.on('close', function(ws) {
      console.log(new Date() + ' Disconnected from: ' + config.sourceSocket);

      // try to reconnect
      setTimeout(wsStart(), 5000);
  });

  wsSrc.on('error', function(error) { console.log(error); setTimeout(wsStart(), 5000); });
}

var wsDst = new WebSocketServer({server: server});

wsDst.on('connection', function(ws) {
  ws.id = connectionIDCounter;  // set ID to counter
  ws.IP = ws._socket.remoteAddress + ':' + ws._socket.remotePort;
  allSocks[connectionIDCounter] = ws; // store socket in array object
  connectionIDCounter++; // increment counter
  //var index = allSocks.push(ws) - 1;
  console.log(new Date() + " Client Connected id: " + ws.id + " IP: " + ws.IP);
  console.log('Total Clients: ' + Object.size(allSocks));

  ws.on('close', function() {
    console.log(new Date() + ' Client Disconnected id: ' + ws.id + ' IP: '+ ws.IP);
    delete allSocks[ws.id];
    //allSocks.splice(index,1);   // oddly, SPLICE doesn't seem to work
    //allSocks.splice(allSocks.indexOf(x),1);
    console.log('Total Clients: ' + Object.size(allSocks));
  });

  ws.on('error', function(error) { console.log(error); });

});


// set a loop -- to send the last message in the msg[] array
var loop = setInterval(function() {
  var one = msg.pop();
  //console.log('Total Clients: ' + Object.size(allSocks) + ' typeof msg: ' + typeof one);
  if (typeof one == 'string') {
    for (var key in allSocks) {
      if(allSocks[key].readyState == 1) {
        allSocks[key].send(new Buffer(one, "base64"));
        //console.log('message sent to client ID: ' + allSocks[key].id );
      }
    }
  }
}, 50);

wsStart();

process.on('uncaughtException', function(err) {
  // try to reconnect
  if(err.code == 'ECONNREFUSED'){
    setTimeout(wsStart(), 5000);
  }
});

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};