var _ = require('underscore')

var BrowserSchema = new mongoose.Schema({
    uniquename: { type: String, required: true, unique: true },
    ic: { type: String, required: true},
    iv: { type: String, required: true},
    encrypted_password: { type: String, required: true},
    salt: { type: String, required: true},
    useragent: { type: String, required: true},
    created: { type: Date },
    modified: { type: Date, default: Date.now },
    clients: [Client.Schema],
    tabs: [Tab.Schema]
});

BrowserSchema.pre('init', function(next) {
    this.created = Date.now();

    var self = this;
    next();
});

BrowserSchema.pre('save', function(next) {
    for (var i = 0; i < this.clients.length; i++) {
        var client = this.clients[i];
        var error = Client.Model.validate(client);
        if (error) {
            next(error);
            return;
        };
    };

    next();
});

function encryptedPassword(password, salt) {
    var shasum = require('crypto').createHash('sha256');
    shasum.update(password + '#' + salt);
    var hex = shasum.digest('hex');
    return hex;
}

module.exports.encryptedPassword = encryptedPassword;

BrowserSchema.methods.setPassword = function(password) {
    var crypto = require('crypto');
    var salt = crypto.createHash('sha256');
    salt.update(crypto.randomBytes(16));
    this.salt = salt.digest('hex');

    this.encrypted_password = encryptedPassword(password, this.salt);
}

BrowserSchema.methods.client = function(uniquename) {
    return _.find(this.clients, function(client) {
       return client.uniquename == uniquename;
    });
}

BrowserSchema.methods.tabWithIdentifier = function(identifier) {
    return _.find(this.tabs, function(tab) {
        return tab.identifier == identifier;
    });
}

BrowserSchema.statics.authenticatedBrowser = function(username, password, next) {
    if (!username.match(/^(b_|B__)/)) {
        next(new Error('invalid username'));
        return;
    };

    return this.model('Browser').findOne({ uniquename: username}, function(err, browser) {
        if (!browser) {
            next(new Error('invalid username or password'));
            return;            
        };

        if (password.length != 32) {
            next(new Error('invalid username or password'));
            return;
        }

        if (browser.encrypted_password != encryptedPassword(password, browser.salt)) {
            next(new Error('invalid username or password'));
            return;
        }

        next(null, browser);
    });
};

BrowserSchema.statics.authenticatedClient = function(username, password, next) {
    if (!username.match(/^(c_|C__)/)) {
        next(new Error('invalid username'));
        return;
    };

    return BrowserModel.findOne({ 'clients.uniquename':username }, function(err, browser) {
        if (!browser) {
            next(new Error('invalid username or password'));
            return;
        };

        browser.currentClient = _.find(browser.clients, function(client) {
            return client.uniquename == username;
        });

        if (password.length != 32) {
            next(new Error('invalid username or password'));
            return;
        }

        if (browser.currentClient.encrypted_password != encryptedPassword(password, browser.currentClient.salt)) {
            next(new Error('invalid username or password'));
            return
        }


        next(null, browser);
    });
}

module.exports.Schema = BrowserSchema;

BrowserModel = mongoose.model('Browser', BrowserSchema);
module.exports.Model = BrowserModel;
