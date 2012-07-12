var TabSchema = new mongoose.Schema({
    identifier: {type: String, required: true},
    iv: {type: String, required: true},
    ic: {type: String, required: true}
});

TabSchema.methods.jsonObject = function() {
    return {
        identifier: this.identifier,
        iv: this.iv,
        ic: this.ic
    };
}

module.exports.Schema = TabSchema;

var TabModel = mongoose.model('Tabs', TabSchema);
module.exports.Model = TabModel;