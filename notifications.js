var _ = require('underscore');

module.exports.init = function(io) {
    var allCategories = ['tabs', 'clients', 'browsers'];

    var roomName = function(username, category) {
        return username + '/' + category;
    }

    io.on('connection', function(socket) {
        socket.on('login', function(data, next) {
            Browser.Model.authenticatedBrowserOrClient(data.username, data.password, function(err, browser) {
                if (browser) {
                    _.each(data.categories, function(category) {
                        socket.join(roomName(data.username, category));
                    });
                    next({success: true});
                } else {
                    next({success: false});
                }
            });
        });

        socket.on('logout', function(data, next) {
            Browser.Model.authenticatedBrowserOrClient(data.username, data.password, function(err, browser) {
                if (browser) {
                    _.each(allCategories, function(category) {
                        socket.leave(roomName(data.username, category));
                    });
                    next({success: true});
                } else {
                    next({success: false});
                }
            });
        })
    });

    return {
        notify: function(browser, category, event, data) {
            var ids = [ browser.uniquename ];

            _.each(browser.clients, function(client) {
                if (client.claimed) {
                    ids.push(client.uniquename);
                }
            });

            _.each(ids, function(id) {
                var sendData = data;
                sendData.identifier = id;
                io.sockets.in(roomName(id, category)).emit(event, sendData);
            })
        },

        tabsReplaced: function(browser) {
            var tabs = _.map(browser.tabs, function(tab) {
                return tab.jsonObject();
            });
            this.notify(browser, 'tabs', 'tabsReplaced', { tabs: tabs });
        },

        tabsUpdated: function(browser, tabs) {
            tabs = _.map(browser.tabs, function(tab) {
                return tab.jsonObject();
            });
            this.notify(browser, 'tabs', 'tabsUpdated', { tabs: tabs });
        },

        claimClient: function(browser, client) {
            this.notify(browser, 'clients', 'claimClient', { client: client.jsonObject() });
        },

        clientSeen: function(browser, client) {
            this.notify(browser, 'clients', 'clientSeen', { client: client.jsonObject() });
        },

        clientRemoved: function(browser, client) {
            this.notify(browser, 'clients', 'clientRemoved', { client: client.jsonObject() });
        },

        browserUpdated: function(browser) {
            this.notify(browser, 'browsers', 'browserUpdated', { browser: browser.jsonObject() });
        }
    }
}