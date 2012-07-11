var apiv0url = 'https://apiv0.tabulatabs.com';
var _ = require('underscore');
var https = require('https');
var url = require('url');


function getRequest(getURL, username, password, callback) {
    var options = url.parse(getURL);
    options.auth = username + ':' + password;
    var req = https.get(options, function(res) {
        var data = '';

        if (res.statusCode == 401) {
            callback(callback(new Error('401')));
            req.end();
        } else if (res.statusCode == 200) {

            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                var obj = null;
                try {
                    obj = JSON.parse(data);
                } catch (err) {
                    callback(err);
                }

                if (obj) {
                    callback(null, obj);
                }
            });
        }
    });
}

module.exports = {

    verifyCredentials: function(username, password, callback) {
        var options = url.parse(getURL);
        options.auth = username + ':' + password;
        var req = https.get(options, function(res) {
            req.end();
            callback(res.status == 200);
        });
    },

    isBrowserUsername: function(username) {
        return username.match(/^b_/);
    },

    isClientUsername: function(username) {
        return username.match(/^c_/);
    },

    importTabs: function(username, password, callback) {
        getRequest(apiv0url + '/browsers/tabs.json', username, password, callback);
    },

    importBrowserDetails: function(username, password, callback) {
        getRequest(apiv0url + '/browsers.json', username, password, callback);
    },

    importClients: function(username, password, callback) {
        getRequest(apiv0url + '/browsers/clients.json', username, password, callback);
    },

    importBrowser: function(username, password, callback) {
        var completedRequests = 0;
        var tabs, details, clients = null;
        var self = this;

        var requestsComplete = function() {
            if (!tabs || !details || !clients) {
                callback();
                return;
            }

            var browser = new Browser.Model({
                uniquename: 'b_' + details.id,
                iv: details.iv,
                ic: details.ic,
                useragent: details.useragent,
                encrypted_password: '_'
            });

            browser.clients = _.map(clients, function(client) {
                return new Client.Model({
                    claimed: true,
                    uniquename: 'c_' + client.id,
                    iv: client.iv,
                    ic: client.ic,
                    useragent: client.useragent,
                    accessed: client.accessed_at,
                    encrypted_password: '_'
                });
            });

            browser.tabs = _.map(tabs, function(tab) {
                return new Tab.Model({
                    identifier: tab.identifier,
                    iv: tab.iv,
                    ic: tab.ic
                });
            });

            if (self.isBrowserUsername(username)) {
                browser.setPassword(password);
            } else if (self.isClientUsername(username)) {
                var client = browser.client(username);

                if (client) {
                    client.setPassword(client);
                } else {
                    throw new Error('client was correctly authorized but could not be found in the imported browser');
                }
            } else {
                throw new Error('user was correctly authorized but is neither a browser nor a client');
            }

            callback(browser);
        }

        this.importTabs(username, password, function(err, loadedTabs) {
            if (err) throw err;

            completedRequests++;
            tabs = loadedTabs;

            if (completedRequests == 3) requestsComplete();
        });

        this.importBrowserDetails(username, password, function(err, loadedDetails) {
            if (err) throw err;

            completedRequests++;
            details = loadedDetails;

            if (completedRequests == 3) requestsComplete();
        });

        this.importClients(username, password, function(err, loadedClients) {
            if (err) throw err;

            completedRequests++;
            clients = loadedClients;

            if (completedRequests == 3) requestsComplete();
        });
    }
};