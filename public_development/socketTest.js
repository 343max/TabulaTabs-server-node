var application_root = __dirname,
    path = require("path");

express = require("express");

app = express.createServer().listen(4242);
var io = require('socket.io').listen(app);

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(application_root, 'public')));
});

io.on('connection', function(socket) {
    console.log('       connected');
    socket.join('ping700');
    socket.join('ping1000');
});

setInterval(function() {
    io.sockets.in('ping1000').emit('ping', 1000);

    console.log('every 1 secs');
}, 1000);

setInterval(function() {
    io.sockets.in('ping700').emit('ping', 700);

    console.log('every 0.7 secs');
}, 700);