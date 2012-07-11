
function TabulatabsEncryption(hexKey) {
	this.forcedIv = null;

	var generateRandomByteArray = function(length) {
		var bytes = new Uint8Array(length);
		window.crypto.getRandomValues(bytes);
		return bytes;
	};

	var generateKey = function() {
		return generateRandomByteArray(32);
	};

	var generateIv = function() {
		return generateRandomByteArray(16);
	}

	var key = null;
	if ((new String(hexKey)).length != 64) {
		key = generateKey();
	} else {
		key = GibberishAES.h2a(hexKey);
	}

	this.generateHexKey = function() {
		var key = GibberishAES.a2h(generateKey());
		return key;
	}

	this.hexKey = function() {
		return GibberishAES.a2h(key);
	}

    this.generatePassword = function() {
        return this.generateHexKey().substr(0, 32);
    }

	this.encrypt = function(payload) {
		var iv = this.forcedIv || generateIv();
		var ic = GibberishAES.Base64.encode(GibberishAES.rawEncrypt(GibberishAES.s2a(JSON.stringify(payload)), key, iv), false);
		return {iv: GibberishAES.a2h(iv), ic: ic};
	};

	this.decrypt = function(encryptedObject) {
		var iv = GibberishAES.h2a(encryptedObject.iv);
		var json = GibberishAES.rawDecrypt(GibberishAES.Base64.decode(encryptedObject.ic), key, iv, false);
		return JSON.parse(json);
	};
}
