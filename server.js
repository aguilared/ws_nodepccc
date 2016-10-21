var app = require('express')();
var http = require('http').Server(app),
    fs = require('fs'),
    connectionsArray = [],
    POLLING_INTERVAL = 10000,
    pollingTimer;
var io = require('socket.io')(http);

var nodepccc = require('nodepccc');
var conn = new nodepccc;
var doneReading = false;
var doneWriting = false;
var cuenta = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


var pollingLoop = function() {
    //Codigo de conexion al plc
    //conn.initiateConnection({port: 44818, host: '192.168.0.27' routing: [0x01,0x00,0x01,0x00] }, connected);
    var connection = conn.initiateConnection({port: 44818, host: '192.168.0.22', routing: [0x01,0x00,0x01,0x00] }, connected);
    function connected(err) {
        //console.log('lllllllllllllego1');
        if (typeof(err) !== "undefined") {
            // We have an error.  Maybe the PLC is not reachable.
            console.log(err);
            process.exit();
        }
        //console.log('lllllllllllllllego2');
        conn.setTranslationCB(tagLookup);
        //conn.addItems(['TEST1', 'TEST4']);
        //conn.addItems('KiloAmps_Actual');
        conn.addItems('air_pressure');
        conn.addItems('KiloAmps_Actual');
        conn.addItems('voltaje_de_linea');
        //console.log('addItems lllllllllllllllegoaddItems');
        conn.readAllItems(valuesReady);

    }

    function valuesReady(anythingBad, values) {
        //console.log('lllllllllllllllego3');
        users = [];
        if (anythingBad) { console.log("SOMETHING WENT WRONG READING VALUES!!!!"); }
        //console.log(values);
        cuenta = cuenta+1;
        values.cuenta = cuenta;
        users.push(values);
        //cuenta = 'cuenta:'+cuenta
        //users.push(cuenta);
        console.log(users);
       //console.log("Value is " + conn.findItem('air_pressure').value + " quality is " + conn.findItem('air_pressure').quality);
        doneReading = true;
        //console.log('lllllllllllllllego4');
        updateSockets({ users: users });
        if (doneWriting) { console.log('doneWriting lllllllllllllllego5'); process.exit(); }
        //cuenta = cuenta+1;
        console.log('CONTADOR='+cuenta);
    }

    function valuesWritten(anythingBad) {
        //console.log(' valuesWritten lllllllllllllllego7');
        if (anythingBad) { console.log("SOMETHING WENT WRONG WRITING VALUES!!!!"); }
        console.log("Done writing.");
        doneWriting = true;
        if (doneReading) { process.exit(); }
    }

    function tagLookup(tag) {
        //console.log(' tagLookup lllllllllllllllego8');
        switch (tag) {
        case 'air_pressure':
            return 'F7:0';              // Float
        case 'KiloAmps_Actual':
            return 'F8:0';              // Float
        case 'voltaje_de_linea':
            return 'L9:0';              // Integer
            default:
            return undefined;
        }
    }
      pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

};  //fin pollingLoop


io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    console.log('message: ' + msg);
  });
});

io.sockets.on('connection', function(socket) {

  console.log('Number of connections:' + connectionsArray.length);
  // starting the loop only if at least there is one user connected
  if (!connectionsArray.length) {
    pollingLoop();
  }

  socket.on('disconnect', function() {
    var socketIndex = connectionsArray.indexOf(socket);
    console.log('socketID = %s got disconnected', socketIndex);
    if (~socketIndex) {
      connectionsArray.splice(socketIndex, 1);
    }
  });

  console.log('A new socket is connected!');
  connectionsArray.push(socket);

});

var updateSockets = function(data) {
  // adding the time of the last update
  data.time = new Date();
  console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data.time);
  // sending new data to all the sockets connected
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('notification', data);
  });
};





http.listen(80, '0.0.0.0', function(){

  console.log('listening on *:80');
});
