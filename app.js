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
Client = require('./client');
Browser = require('./browser');

browserAuth = express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedBrowser(username, password, function(err, browser) {
        next(null, browser);
    });
});

clientAuth = express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedClient(username, password, function(err, browser) {
        next(null, browser);
    });
})

app.post('/browsers.json', function(req, res) {
    var browser = new BrowserModel({
        useragent: req.body.useragent,
        iv: req.body.iv,
        ic: req.body.ic
    });
    browser.password = req.body.password;
    browser.save();
    res.send({ username: browser.username(), id: browser.id });
});

app.get('/browsers.json', browserAuth, function(req, res) {
    res.send({
        id: req.remoteUser._id,
        useragent: req.remoteUser.useragent,
        iv: req.remoteUser.iv,
        ic: req.remoteUser.ic
    });
});

app.post('/browsers/update.json', browserAuth, function(req, res) {
    req.remoteUser.iv = req.body.iv;
    req.remoteUser.ic = req.body.ic;
    req.remoteUser.save();
    res.send({ success: true });
});

app.post('/browsers/clients.json', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    var client = new Client.Model();
    client.password = req.body.password;

    browser.clients.push(client);
    browser.save();

    res.send({
        username: client.username(),
        client_id: client._id
    });
});

app.put('/browsers/clients/claim.json', clientAuth, function(req, res) {
    var browser = req.remoteUser;
    var client = browser.currentClient;
    if (client.claimed) {
        throw new NotFound();
        return;
    }

    client.iv = req.body.iv;
    client.ic = req.body.ic;
    client.useragent = req.body.useragent;
    client.password = req.body.password;
    client.claimed = true;

    browser.save();

	res.send({
		id: client.id
	});
});



