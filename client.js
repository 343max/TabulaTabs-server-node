var ClientSchema = new mongoose.Schema({
    ic: { type: String },
    iv: { type: String },
    encrypted_password: { type: String},
    salt: { type: String },
    useragent: { type: String },
    created: { type: Date },
    modified: { type: Date, default: Date.now },
    claimed: { type: Boolean, default: false }
});

ClientSchema.pre('save', function(next) {
    this.validate(next);
});

ClientSchema.statics.validate = function(client, next) {
    if (!next) {
        next = function () {};
    }

    if (client.password) {
        var crypto = require('crypto');
        var salt = crypto.createHash('sha256');
        salt.update(crypto.randomBytes(16));
        client.salt = salt.digest('hex');

        var shasum = crypto.createHash('sha256');
        console.log('saving client');
        client.encrypted_password = Browser.encryptedPassword(client.password, client.salt);
        client.password = undefined;
    }

    if (!client.encrypted_password) {
        next(new Error('no password'));
        return new Error('no password');
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
}

ClientSchema.methods.username = function() {
    return 'c_' + this.id;
};

module.exports.Schema = ClientSchema;

ClientModel = mongoose.model('Client', ClientSchema);
module.exports.Model = ClientModel;
