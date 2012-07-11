
function isSafari() {
    return typeof(safari) != 'undefined';
}

function isChrome() {
    return typeof(chrome) != 'undefined';
}

settingsStorage = {
    getItem: function(key) {
        if (isSafari()) {
            return safari.extension.settings[key];
        } else {
            return localStorage.getItem(key);
        }
    },

    setItem: function(key, value) {
        if (isSafari()) {
            safari.extension.settings[key] = value;
        } else {
            localStorage.setItem(key, value);
        }
    },

    removeItem: function(key) {
        if (isSafari()) {
            safari.extension.settings.removeItem(key);
        } else {
            localStorage.removeItem(key);
        }
    },

   getSecureItem: function(key) {
        if (isSafari()) {
            return safari.extension.secureSettings[key];
        } else {
            return localStorage.getItem(key);
        }
    },

    setSecureItem: function(key, value) {
        if (isSafari()) {
            safari.extension.secureSettings[key] = value;
        } else {
            localStorage.setItem(key, value);
        }
    },

    removeSecureItem: function(key) {
        if (isSafari()) {
            safari.extension.secureSettings.removeItem(key);
        } else {
            localStorage.removeItem(key);
        }
    }
};

var _tabulatabsCurrentBrowser = null;

function thisBrowser(browserRegisteredCallback) {
    if (!_tabulatabsCurrentBrowser) {
        var encryption = new TabulatabsEncryption(settingsStorage.getSecureItem('key'));
        settingsStorage.setSecureItem('key', encryption.hexKey());

        _tabulatabsCurrentBrowser = new TabulatabsBrowser(encryption);
        _tabulatabsCurrentBrowser.username = settingsStorage.getSecureItem('username');
        _tabulatabsCurrentBrowser.password = settingsStorage.getSecureItem('password');

        if (!_tabulatabsCurrentBrowser.username || !_tabulatabsCurrentBrowser.username) {
            _tabulatabsCurrentBrowser.useragent = navigator.userAgent;
            if (typeof(safari) != 'undefined') _tabulatabsCurrentBrowser.label = 'Safari';
            if (typeof(chrome) != 'undefined') _tabulatabsCurrentBrowser.label = 'Chrome';
            _tabulatabsCurrentBrowser.description = '';

            _tabulatabsCurrentBrowser.register(encryption.generatePassword(), function(result) {
                settingsStorage.setSecureItem('username', _tabulatabsCurrentBrowser.username);
                settingsStorage.setSecureItem('password', _tabulatabsCurrentBrowser.password);
            });
        }
    }
    return _tabulatabsCurrentBrowser;
}