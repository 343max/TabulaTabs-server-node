module.exports.shortNames = function(identifier, mongoogse) {
    var schema = new mongoogse.Schema({
        identifier: { type: String, undique: true },
        next: { type: Number, required: true, default: 0}
    });

    schema.statics.findAndModify = function (query, sort, doc, options, callback) {
        return this.collection.findAndModify(query, sort, doc, options, callback);
    };
    var Model = mongoogse.model('Counters', schema);

    var digits = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRTUVWXYZ';
    var digitCount = digits.length;

    var forNumber = function(i) {
        var name = '';

        do {
            name += digits[i % digitCount];
            i = (i - i % digitCount) / digitCount;
        } while(i > 0);

        return name;
    }

    Model.findOne({ identifier: identifier }, function(err, doc) {
        if (!doc) {
            doc = new Model({
                identifier: identifier
            }).save();
        }
    })

    var shortName = {
        forNumber: forNumber,
        generate: function(next) {
            Model.findAndModify({ identifier: identifier }, [], { $inc: { next: 1 } }, { new: true }, function (err, doc) {
                if (err) throw err;
                next(forNumber(doc.next));
            });
        }
    }

    return shortName;
};