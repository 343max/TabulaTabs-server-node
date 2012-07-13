var _ = require('underscore');

module.exports.init = function(io) {
    io.on('connection', function(socket) {
        socket.on('login', function(data, next) {
            Browser.Model.authenticatedBrowserOrClient(data.username, data.password, function(err, browser) {
                if (browser) {
                    _.each(data.categories, function(category) {
                        socket.join(data.username + '/' + category);
                    });
                    next({success: true});
                } else {
                    next({success: false});
                }
            });
        });
    })

    return {
        notify: function(browserId, category, event, data) {
            io.sockets.in(browserId + '/' + category).emit(event, data);
        },

        tabsReplaced: function(browser) {
            var tabs = _.map(browser.tabs, function(tab) {
                return tab.jsonObject();
            });
            this.notify(browser.uniquename, 'tabs', 'tabsReplaced', tabs);
        },

        tabsUpdated: function(browser, tabs) {
            tabs = _.map(browser.tabs, function(tab) {
                return tab.jsonObject();
            });
            this.notify(browser.uniquename, 'tabs', 'tabsUpdated', tabs);
        },

        claimClient: function(browser, client) {
            this.notify(browser.uniquename, 'clients', 'claimClient', client.jsonObject());
        },

        clientSeen: function(browser, client) {
            this.notify(browser.uniquename, 'clients', 'clientSeen', client.jsonObject());
        },

        clientRemoved: function(browser, client) {
            this.notify(browser.uniquename, 'clients', 'clientRemoved', client.jsonObject());
        },

        browserUpdated: function(browser) {
            this.notify(browser.uniquename, 'browsers', 'browserUpdated', browser.jsonObject());
        }
    }
}