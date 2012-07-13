
var currentDeviceCount = -1;
var normalListPollInterval = 20000;
var reducedListPollInvterval = 10 * 60 * 1000;
var highListPollInterval = 1500;
var clientListPollInterval = normalListPollInterval;

function setClientListPollIntervall(interval) {
	// console.log('new poll interval: ' + interval)
	clientListPollInterval = interval;
}

function registerNewClient() {
	thisBrowser().whenReady(function() {
		var client = thisBrowser().newClient();

		client.createWithBrowser(thisBrowser(), thisBrowser().encryption.generatePassword(), function() {
			// console.log(client.registrationURL());
			drawQrCode(client.registrationURL(), 1, $('#qrCode')[0]);
			$('.sendRegistrationMail').show().attr('href', 'mailto:?body=' + escape(client.registrationURL() + ' send your self an mail with this link and open it on your iPod.'));
			setClientListPollIntervall(highListPollInterval);
			registeredClients();
		});
	});

	$('#addDeviceModal').on('hide', function() {
		setClientListPollIntervall(normalListPollInterval);
	}).modal();
}

var clientListPollHandler = null;
function registeredClients() {
	var browser = thisBrowser();

	browser.loadClients(function() {
		if (currentDeviceCount != browser.clients.length) {
			currentDeviceCount = browser.clients.length;

			if (browser.clients.length == 0) {
				registerNewClient();
			} else {
				$('#addDeviceModal').modal('hide');
			}

			$('#clients').empty();

			browser.clients.sort(function(a, b) {
				return a.accessedAt - b.accessedAt;
			})

			$.each(browser.clients, function(i, client){
				var li = $('<li>');
				li.css('background-image', 'url(' + client.iconURL + ')');

				var a = moment(client.accessedAt);

				var left = $('<span>').addClass('left');
				left.append($('<span>').addClass('title').text(client.label));
				if (a) {
					var accessedAt = $('<span>').addClass("lastSeen").text('last seen ' + a.fromNow());
					left.append(accessedAt);
				};
				li.append(left);

				var deleteLink = $('<a>').text('Remove').addClass('delete').addClass('btn').addClass('btn-danger');
				deleteLink.click(function() {
					$('#removeClientModal .device').text(client.label);
					$('#removeClientModal .remove').unbind().click(function() {
						$('#removeClientModal').modal('hide');
						browser.destroyClient(client, function() {
							li.remove();
						});
					});
					$('#removeClientModal').modal();
				});

				li.append(deleteLink);

				$('#clients').prepend(li);
			});
		}

		window.clearTimeout(clientListPollHandler);
		clientListPollHandler = window.setTimeout(function() { registeredClients() }, clientListPollInterval);
	});
}

function prefillProperties() {
	var browser = thisBrowser();
	browser.load(function() {
		$('#label').val(browser.label);
		$('#description').val(browser.description);
		$('#save').attr("disabled", null);
	})
}

function docReady() {
	$('.container').css('display', 'block');

	if (isChrome()) {
		$('.browserName').text('Chrome');
	}

	if (isSafari()) {
		$('.browserName').text('Safari');
	}

    thisBrowser().whenReady(function() {
    	var client = thisBrowser().newClient();

	    prefillProperties();
		registeredClients();

		$('#propertiesForm').bind('submit', function() {
			var browser = thisBrowser();

			browser.label = $('#label').val();
			browser.description = $('#description').val();
			$('#save').attr('disabled', 'disabled').val('Saving…');
			browser.update(function() {
				window.setTimeout(function() {
					$('#save').attr("disabled", null).val('Save');
				}, 1500);
			});

			return false;
		});
    });

    $('.addDevice').click(function() {
    	registerNewClient();
    });

    $('#startOver').click(function() {
		$('#startOverModal .startOver').unbind().click(function() {
			$('#startOverModal').modal('hide');
			alert('meeep!');
		});
		$('#startOverModal').modal();
	});

    var reducedPollIntervalHandler = null;
    $('body').mousemove(function() {
    	if (clientListPollInterval > normalListPollInterval) {
    		setClientListPollIntervall(normalListPollInterval);
    	};

    	window.clearTimeout(reducedPollIntervalHandler);
    	reducedPollIntervalHandler = window.setTimeout(function() {
    		setClientListPollIntervall(reducedListPollInvterval);
    	}, 60000);
    });
};

if (isSafari()) {
	safari.self.addEventListener("message", function(msgEvent) {
		if (msgEvent.name == 'settings') {
			var params = msgEvent.message;
			var encryption = new TabulatabsEncryption(params.key);
	        _tabulatabsCurrentBrowser = new TabulatabsBrowser(encryption);
	        _tabulatabsCurrentBrowser.username = params.username;
	        _tabulatabsCurrentBrowser.password = params.password;
	        docReady();
		};
	}, false);
	safari.self.tab.dispatchMessage('settings', null);
} else {
	$(document).ready(function($) {
		docReady();
	});
}

















