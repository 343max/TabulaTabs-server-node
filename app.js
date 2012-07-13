var application_root = __dirname,
    path = require("path");

express = require("express"),
mongoose = require("mongoose");
require('express-namespace');
_ = require('underscore');

nodeEnvironment = process.env.NODE_ENV || 'development';

mongoose.connect('mongodb://localhost/tabulatabs');
app = express.createServer().listen(4242);
var io = require('socket.io').listen(app);

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(application_root, 'public')));
});

app.configure('development', function() {
    app.use(express.static(path.join(application_root, 'public_development')));
    app.use(express.static('/Users/max/Documents/TabulaTabs/browser-extensions/TabulaTabs.safariextension'));
    app.use(express.errorHandler( { dumpExceptions: true, showStack: true} ));
})

app.configure('production', function(){
    app.use(express.errorHandler());
});

// dirty hack to work with clients with invalid request content-types.
express.bodyParser.parse['application/x-www-form-urlencoded'] = express.bodyParser.parse['application/json'];

require('./hello');
shortNames = require('./shortnames').shortNames('usernames', mongoose);

Tab = require('./tab');
Client = require('./client');
Browser = require('./browser');
var notifications = require('./notifications').init(io);

/*
express.basicAuth has problems with base64 encoded strings of some lengths.
fixAuth works around this problem in a dirty way.
 */
function fixAuth(auth) {
    return function(req, res, next) {
        req.headers.authorization += '======';
        return auth(req, res, next);
    }
}

browserAuth = fixAuth(express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedBrowser(username, password, next);
}));


clientAuth = fixAuth(express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedClient(username, password, next);
}));

browserOrClientAuth = fixAuth(express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedBrowserOrClient(username, password, next);
}));

app.get('/reset', function(req, res) {
    var browser = new Browser.Model;
    if (nodeEnvironment == 'development') {
        browser.collection.drop();
        shortNames.drop();
        res.send({
            success: true
        });
    } else {
        res.send({
            success: false
        });
    }
});

// create browser
app.post('/browsers.json', function(req, res) {
    var browser = new Browser.Model({
        useragent: req.body.useragent,
        iv: req.body.iv,
        ic: req.body.ic
    });

    shortNames.generate(function(name) {
        browser.uniquename = 'B__' + name;
        browser.setPassword(req.body.password);
        browser.save(function(err) {
            if (err) {
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
app.get('/browsers.json', browserOrClientAuth, function(req, res) {
    res.send(req.remoteUser.jsonObject());
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
        notifications.browserUpdated(browser);
    });
});

// create unclaimed client
app.post('/browsers/clients.json', browserAuth, function(req, res) {
    var browser = req.remoteUser;

    var client = new Client.Model();
    shortNames.generate(function(name) {
        client.uniquename = 'C__' + name;
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
            success: true,
            id: client.uniquename
        });

        notifications.claimClient(browser, client);
    });
});

// get a list of all claimed clients of an browser
app.get('/browsers/clients.json', browserAuth, function(req, res) {
    var clients = [];

    _.each(req.remoteUser.clients, function(client) {
        if (client.claimed) {
            clients.push(client.jsonObject());
        }
    });

    res.send(clients);
});

// delete a client
app.delete('/browsers/clients/:clientId.json', browserOrClientAuth, function(req, res) {
    var browser = req.remoteUser;

    var client = browser.client(req.params.clientId);

    if(!client) {
        throw new Error('client does not exists');
    }

    if (browser.currentClient && (browser.currentClient.uniquename != client.uniquename)) {
        throw new Error('not permitted');
    }

    client.remove();
    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
        notifications.clientRemoved(browser, client);
    });
});

// save browser tabs
var postTabs = function(req, res) {
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
        notifications.tabsReplaced(browser);
    });
};

app.post('/browsers/tabs/', browserAuth, postTabs);
app.post('/browsers/tabs.json', browserAuth, postTabs);

// get all tabs
app.get('/browsers/tabs.json', clientAuth, function(req, res) {
    var browser = req.remoteUser;

    res.send(_.map(browser.tabs, function(tab) {
        return tab.jsonObject();
    }));

    if (browser.currentClient) {
        browser.currentClient.updateAccessTime();
        browser.save();
        notifications.clientSeen(browser, browser.currentClient);
    }
});

// update some tabs
app.put('/browsers/tabs/update', browserAuth, function(req, res) {
    var browser = req.remoteUser;
    var tabs = [];

    _.each(req.body, function(update) {
        var tab = browser.tabWithIdentifier(update.identifier);

        if (tab) {
            tab.iv = update.iv;
            tab.ic = update.ic;
        }

        tabs.push(tab);
    });

    browser.save(function(err) {
        if (err) {
            throw err;
        }

        res.send({ success: true });
        notifications.tabsUpdated(browser, tabs);
    });
});

