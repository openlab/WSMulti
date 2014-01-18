var config = require('./config');
var util = require('util');
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');

var app = express();
app.use(express.static(__dirname + '/public'));

var server = http.createServer(app);
server.listen(process.env.PORT);
//server.listen(9999);

var wsSrc = new WebSocket(config.sourceSocket);
var wsDst = new WebSocketServer({server: server});

wsSrc.on('open', function() {
    console.log('Connected to ' + config.sourceSocket);
});

var wtf = [];

wsSrc.on('message', function(data, flags) {
  var message = new Buffer(data).toString('base64');
  wtf.push(message);
});

var allSocks = [];

wsDst.on('connection', function(ws) {
  console.log("Welcome, " + ws.id);
  allSocks.push(ws);
});

var loop = setInterval(function() {
  var one = wtf.pop();
  if (typeof one == 'string') {
    for(var i = allSocks.length - 1; i >= 0; i--) {
      if(allSocks[i].readyState == 'WebSocket.OPEN') {
        allSocks[i].send(new Buffer(one, "base64"));
      }
    }
  }
}, 50);
