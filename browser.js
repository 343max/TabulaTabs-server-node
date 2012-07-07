var BrowserSchema = new mongoose.Schema({
    ic: { type: String, required: true},
    iv: { type: String, required: true},
    encrypted_password: { type: String},
    salt: { type: String},
    useragent: { type: String, required: true},
    modified: { type: Date, default: Date.now }
});

BrowserSchema.pre('save', function(next) {
    if (this.password) {
        var crypto = require('crypto');
        var salt = crypto.createHash('sha256');
        salt.update(crypto.randomBytes(16));
        this.salt = salt.digest('hex');

        var shasum = crypto.createHash('sha256');
        shasum.update(this.password + '#' + this.salt);
        this.encrypted_password = shasum.digest('hex');
        this.passsword = undefined;
    }

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

        var crypto = require('crypto');
        var shasum = crypto.createHash('sha256');
        shasum.update(password + '#' + browser.salt);
        if (browser.encrypted_password != shasum.digest('hex')) {
            next(new Error('invalid username or password'));
        } else {
            next(null, browser);
        }

    });
};

BrowserSchema.methods.username = function() {
    return 'b_' + this.id;
};

BrowserSchema.methods.hasPassword = function(password) {

};

module.exports.BrowserSchema = BrowserSchema;

BrowserModel = mongoose.model('Browser', BrowserSchema);
module.exports.BrowserModel = BrowserModel;

browserAuth = express.basicAuth(function(username, password, next) {
    BrowserModel.authenticatedBrowser(username, password, function(err, browser) {
        next(null, browser);
    });
});

app.post('/browsers.json', function(req, res) {
    console.dir(req.body);
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




