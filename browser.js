var BrowserSchema = new mongoose.Schema({
    ic: { type: String, required: true},
    iv: { type: String, required: true},
    encrypted_password: { type: String},
    salt: { type: String},
    useragent: { type: String, required: true},
    created: { type: Date },
    modified: { type: Date, default: Date.now },
    clients: [Client.schema]
});

BrowserSchema.pre('init', function(next) {
    this.created = Date.now();
    next();
});

function encryptedPassword(password, salt) {
    var shasum = require('crypto').createHash('sha256');
    shasum.update(password + '#' + salt);
    var hex = shasum.digest('hex');
    return hex;
}

module.exports.encryptedPassword = encryptedPassword;

BrowserSchema.pre('save', function(next) {
    if (this.password) {
        var crypto = require('crypto');
        var salt = crypto.createHash('sha256');
        salt.update(crypto.randomBytes(16));
        this.salt = salt.digest('hex');

        this.encrypted_password = encryptedPassword(this.password, this.salt);
    }

    for (var i = 0; i < this.clients.length; i++) {
        var client = this.clients[i];
        var error = Client.Model.validate(client);
        if (error) {
            next(error);
            return;
        };
    };

    if (!this.encrypted_password) {
        next(new Error('no password'));
    } else {
        next();
    }
});

BrowserSchema.statics.authenticatedBrowser = function(username, password, next) {
    if (!username.match(/^b_/)) {
        next(new Error('invalid username'));
    };

    return this.model('Browser').findById(username.replace(/^b_/, ''), function(err, browser) {
        if (!browser) {
            next(new Error('invalid username or password'));
            return;            
        };

        if (browser.encrypted_password != encryptedPassword(password, browser.salt)) {
            next(new Error('invalid username or password'));
        } else {
            next(null, browser);
        }

    });
};

BrowserSchema.statics.authenticatedClient = function(username, password, next) {
    if (!username.match(/^c_/)) {
        next(new Error('invalid username'));
    };

    var clientId = username.replace(/^c_/, '');
    return this.model('Browser').findOne({ 'clients._id': mongoose.Types.ObjectId(clientId) }, function(err, browser) {
        if (!browser) {
            next(new Error('invalid username or password'));
            return;            
        };

        for (var i = 0; i < browser.clients.length; i++) {
            if (browser.clients[i]._id == clientId) {
                browser.currentClient = browser.clients[i];
            }
        }

        if (browser.currentClient.encrypted_password != encryptedPassword(password, browser.currentClient.salt)) {
            next(new Error('invalid username or password'));
        } else {
            next(null, browser);
        }

    });
}

BrowserSchema.methods.username = function() {
    return 'b_' + this.id;
};

module.exports.Schema = BrowserSchema;

BrowserModel = mongoose.model('Browser', BrowserSchema);
module.exports.Model = BrowserModel;
