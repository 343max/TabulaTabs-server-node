var BrowserSchema = new mongoose.Schema({
    ic: { type: String, required: true},
    iv: { type: String, required: true},
    encrypted_password: { type: String},
    salt: { type: String},
    usersagent: { type: String, required: true},
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

    return this.model('Browser').findById(username.replace(/^b_/), function(err, browser) {
        var crypto = require('crypto');
        var shasum = crypto.createHash('sha256');
        shasum.update(password + '#' + browser.salt);
        if (browser.encrypted_password != shasum.digest('hex')) {
            next(new Error('invalid username or password'));
        } else {
            next(browser);
        }

    });
};

function loadBrowser(req, next) {
    if(req.isAuthenticated()) {

    }
};

BrowserSchema.methods.username = function() {
    return 'b_' + this.id;
};

BrowserSchema.methods.hasPassword = function(password) {

};

module.exports.BrowserSchema = BrowserSchema;

BrowserModel = mongoose.model('Browser', BrowserSchema);

module.exports.BrowserModel = BrowserModel;

app.post('/browsers.json', function(req, res) {
    var browser = new BrowserModel({
        usersagent: req.body.useragent,
        iv: req.body.iv,
        ic: req.body.ic
    });
    browser.password = req.body.password;
    console.dir(browser);
    browser.save();
    res.send({ username: browser.username(), id: browser.id });
});

app.get('/browsers.json', function(req, res) {
});
