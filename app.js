var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require("mongoose");
require('express-namespace');

var app = express.createServer().listen(4242);

require('./hello.js').extend(app, express);
