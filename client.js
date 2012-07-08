var ClientSchema = new mongoose.Schema({
    uniquename: { type: String, required: true },
    ic: { type: String },
    iv: { type: String },
    encrypted_password: { type: String, required: true },
    salt: { type: String, required: true },
    useragent: { type: String },
    modified: { type: Date, default: Date.now },
    accessed: { type: Date, default: Date.now },
    claimed: { type: Boolean, default: false }
});

ClientSchema.pre('save', function(next) {
    this.validate(next);
});

ClientSchema.methods.setPassword = function(password) {
    var crypto = require('crypto');
    var salt = crypto.createHash('sha256');
    salt.update(crypto.randomBytes(16));
    this.salt = salt.digest('hex');

    this.encrypted_password = Browser.encryptedPassword(password, this.salt);
}

ClientSchema.methods.updateAccessTime = function() {
    this.accessed = Date.now();
}

ClientSchema.statics.validate = function(client, next) {
    if (!next) {
        next = function () {};
    }

    if (client.claimed) {
        if (!client.ic) {
            next(new Error('no ic'));
            return new Error('no ic');
        }
        if (!client.iv) {
            next(new Error('no iv'));
            return new Error('no iv');
        }
        if (!client.useragent) {
            next(new Error('no useragent'));
            return new Error('no useragent');
        }
    };

    next();
}

ClientSchema.methods.username = function() {
    return 'c_' + this.id;
};

module.exports.Schema = ClientSchema;

ClientModel = mongoose.model('Client', ClientSchema);
module.exports.Model = ClientModel;
