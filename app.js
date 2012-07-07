var application_root = __dirname,
    path = require("path");

express = require("express"),
mongoose = require("mongoose");
require('express-namespace');

mongoose.connect('mongodb://localhost/tabulatabs');
app = express.createServer().listen(4242);

app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(application_root, 'public')));
    app.use(express.errorHandler( { dumpExceptions: true, showStack: true} ));
});

require('./hello');
var browser = require('./browser');