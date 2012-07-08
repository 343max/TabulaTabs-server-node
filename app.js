var application_root = __dirname,
    path = require("path");

express = require("express"),
mongoose = require("mongoose");
require('express-namespace');
_ = require('underscore');

mongoose.connect('mongodb://localhost/tabulatabs');
app = express.createServer().listen(4242);

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(application_root, 'public')));
    app.use(express.errorHandler( { dumpExceptions: true, showStack: true} ));
});

// dirty hack to work with clients with invalid request content-types.
//express.bodyParser.parse['application/x-www-form-urlencoded'] = express.bodyParser.parse['application/json'];

require('./hello');
shortNames = require('./shortnames').shortNames('usernames', mongoose);

Tab = require('./tab');
Client = require('./client');
Browser = require('./browser');

browserAuth = express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedBrowser(username, password, function(err, browser) {
        if (err) {
            throw err;
        }
        next(err, browser);
    });
});

clientAuth = express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedClient(username, password, function(err, browser) {
        next(null, browser);
    });
})

// create browser
app.post('/browsers.json', function(req, res) {
    var browser = new Browser.Model({
        useragent: req.body.useragent,
        iv: req.body.iv,
        ic: req.body.ic
    });

    shortNames.generate(function(name) {
        browser.uniquename = 'B_' + name;
        browser.setPassword(req.body.password);
        browser.save(function(err) {
            if (err) {
                console.dir(browser);
                throw err;
            }

            res.send({
                username: browser.uniquename,
                id: browser.id
            });
        });
    });
});

// load browser info
app.get('/browsers.json', browserAuth, function(req, res) {
    res.send({
        id: req.remoteUser._id,
        useragent: req.remoteUser.useragent,
        iv: req.remoteUser.iv,
        ic: req.remoteUser.ic
    });
});

// modify existing browser
app.post('/browsers/update.json', browserAuth, function(req, res) {
    var browser = req.remoteUser;
    browser.iv = req.body.iv;
    browser.ic = req.body.ic;
    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
    });
});

// create unclaimed client
app.post('/browsers/clients.json', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    var client = new Client.Model();
    shortNames.generate(function(name) {
        client.uniquename = 'C_' + name;
        client.setPassword(req.body.password);

        browser.clients.push(client);
        browser.save(function(err) {
            if (err) {
                throw err;
            }

            res.send({
                username: client.uniquename,
                client_id: client._id
            });
        });
    });
});

// claim unclaimed client
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
    client.setPassword(req.body.password);
    client.claimed = true;
    client.updateAccessTime();

    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({
            id: client.id
        });
    });
});

// get a list of all claimed clients of an browser
app.get('/browsers/clients.json', browserAuth, function(req, res) {
    var clients = [];

    _.each(req.remoteUser.clients, function(client) {
        if (client.claimed) {
            clients.push({
                id: client._id,
                useragent: client.useragent,
                iv: client.iv,
                ic: client.ic,
                accessed_at: client.accessed
            });
        }
    });

    res.send(clients);
});

// delete a client
app.delete('/browsers/clients/:clientId.json', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    var client = browser.clientWithId(req.params.clientId);

    if(!client) {
        throw new Error('client does not exists');
    }

    client.remove();
    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
    });
});

// save browser tabs
app.post('/browsers/tabs/', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    browser.tabs = _.map(req.body, function(data) {
        var tab = new Tab.Model({
            identifier: data.identifier,
            iv: data.iv,
            ic: data.ic
        });

        return tab;
    });

    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
    });
});

// get all tabs
app.get('/browsers/tabs.json', clientAuth, function(req, res) {
    var browser = req.remoteUser;

    res.send(_.map(browser.tabs, function(tab) {
        return {
            identifier: tab.identifier,
            iv: tab.iv,
            ic: tab.ic
        };
    }));

    browser.currentClient.updateAccessTime();
});

// update some tabs
app.put('/browsers/tabs/update', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    _.each(req.body, function(update) {
        var tab = browser.tabWithIdentifier(update.identifier);

        if (tab) {
            tab.iv = update.iv;
            tab.ic = update.ic;
        }
    });

    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
    });
});
