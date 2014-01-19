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
//server.listen(process.env.PORT);
server.listen(80);

var wsSrc = new WebSocket(config.sourceSocket);
var wsDst = new WebSocketServer({server: server});

wsSrc.on('open', function() {
    console.log('Connected to: ' + config.sourceSocket);
});

var msg = [];

wsSrc.on('message', function(data, flags) {
  var message = new Buffer(data).toString('base64');
  msg.push(message);
  console.log("Messages: " + msg.length);
});

wsSrc.on('close', function(ws) {
    console.log('Disconnected from: ' + config.sourceSocket);
});

var allSocks = [];

wsDst.on('connection', function(ws) {
  console.log("Client Connected: " + ws.id);
  allSocks.push(ws);
});

wsDst.on('close', function(ws) {
    console.log('Client Disconnected:' + ws.id);
});

var loop = setInterval(function() {
  var one = msg.pop();
  if (typeof one == 'string') {
    for(var i = allSocks.length - 1; i >= 0; i--) {
      if(allSocks[i].readyState == 1) {
        allSocks[i].send(new Buffer(one, "base64"));
      }
    }
  }
}, 50);
