if (isSafari()) {
	nextTabIdenitifier = 1;
	safari.application.addEventListener("popover", function(e) {
		if (e.target.identifier == 'syncPopover') {
			collectAllTabs();
			$popover('p#options').unbind().click(function() {
				openOptions();
				safari.extension.popovers[0].hide();
			});
		}
	}, true);
}

if (isSafari()) {
	safari.extension.settings.addEventListener("change", function (e) {
		// console.dir(e);
		if (e.key === 'showOptionsCheckbox' && safari.extension.settings.showOptionsCheckbox === true) {
			openOptions();
			safari.extension.settings.showOptionsCheckbox = false;
		};
	}, false);
}

function iconAnimation(path, imageCount) {
	var i = 0;
	return window.setInterval(function() {
		i++;
		if(i > imageCount) i = 1;
		if (isSafari()) {
			safari.extension.toolbarItems[0].image = safari.extension.baseURI + path + '/' + i + '.png';
		}

		if (isChrome()) {
			chrome.browserAction.setIcon({path: path + '/' + i + '.png'});
		}

	}, 75);
}

var progressAnimation;
var syncInProgress = false;

function startProgressAnimation() {
	syncInProgress = true;
	if (isSafari()) {
		$popover('p#progress').addClass('inprogress').text('Synchronizing tabs');
	}
	progressAnimation = iconAnimation('img/chasingArrows', 6);
}

function stopProgressAnimation() {
	syncInProgress = false;
	if (isSafari()) {
		$popover('p#progress').removeClass('inprogress').text('Synchronization complete');
		window.clearTimeout(progressAnimation);
		safari.extension.toolbarItems[0].image = safari.extension.baseURI + 'img/toolbar-icon-safari.png';

		window.setTimeout(function() {
			safari.extension.popovers[0].hide();
		}, 10000);
	} else {
		window.clearTimeout(progressAnimation);
		chrome.browserAction.setIcon({path: 'img/toolbar-icon-chrome.png'});
        
        $.each(chrome.extension.getViews(), function (index, view) {
        	if (view.document.onTabsSaved) {
        		view.document.onTabsSaved();
            }
        });
	}
}

function $popover(el) {
	return safari.extension.popovers[0].contentWindow.$(el);
}

function favIconColorsForTabulatab(tabulatab) {
	if (tabulatab.favIconURL) {
		var favIconURL = tabulatab.favIconURL;

		if (isChrome()) {
			favIconURL = 'chrome://favicon/' + tabulatab.URL;
		}

		imageColors(favIconURL, function(colors, totalPixelCount) {
			var colorPalette = [];
			for(var i = 0; i < Math.min(5, colors.length); i++) {
				colorPalette.push([colors[i].red, colors[i].green, colors[i].blue]);
			}

			tabulatab.colorPalette = colorPalette;
		});
	}
}

function tabulatabForTab(tab, id) {
	if (!tab.url) {
		return null;
	}

	if (!tab.url.match(/^https?:\/\//)) {
		return null;
	}

	var tabulatab = {
		identifier: id,
		title: tab.title,
		URL: tab.url,
		favIconURL: tab.favIconUrl
	};

	findMetaInPageTitle(tabulatab);

	if (isSafari()) {
		var messageListener = function(msgEvent) {
			tab.removeEventListener('message', messageListener);			

			$.extend(tabulatab, msgEvent.message.collection);

			favIconColorsForTabulatab(tabulatab);
		};

		tab.addEventListener('message', messageListener, false);
		tab.page.dispatchMessage('collectMeta', {tabId: id});
	};

	if (isChrome()) {
		favIconColorsForTabulatab(tabulatab);

		chrome.tabs.sendRequest(tab.id, {method: 'collectMeta'}, function(collection) {
			if (collection == undefined) {
				// try injecting the javascript if it was not injected during the loading of the page
				chrome.tabs.executeScript(tab.id, {file: "js/content-script.js"}, function() {
					chrome.tabs.sendRequest(tab.id, {method: 'tabinfo'}, function(collection) {
						$.extend(tabulatab, collection);
					});
				});
			} else {
				$.extend(tabulatab, collection);
			}
		});
	}


	return tabulatab;
}

function collectAllTabs() {
	if (syncInProgress) {
		return;
	};

	startProgressAnimation();
	var tabulatabs = [];

	if (isChrome()) {
		chrome.windows.getAll({populate: true}, function(chromeWindows) {
			$.each(chromeWindows, function(index, chromeWindow) {
				if (!chromeWindow.incognito && chromeWindow.type == 'normal') {
					$.each(chromeWindow.tabs, function(index, chromeTab) {
						var tabulatab = tabulatabForTab(chromeTab, chromeTab.id);
						if (tabulatab) {
							tabulatab.windowFocused = chromeWindow.focused;
							tabulatab.windowId = chromeTab.windowId;
							tabulatab.index = chromeTab.index;
							tabulatabs.push(tabulatab);
						}
					});
				}
			});
		});
	}

	if (isSafari()) {
		$.each(safari.application.browserWindows, function(i, browserWindow) {
			var isActiveWindow = browserWindow == safari.application.activeBrowserWindow;
			var windowId = 'window' + i;
	
			$.each(browserWindow.tabs, function(j, tab) {
				var isActiveTab = tab == browserWindow.activeTab;

				if (!tab.id) {
					tab.id = nextTabIdenitifier++;
				}

				var tabulatab = tabulatabForTab(tab, tab.id);
				if (tabulatab) {
					tabulatab.selected = isActiveTab;
					tabulatab.windowFocused = isActiveWindow;
					tabulatab.index = j;
					tabulatab.windowId = windowId;
	
					tabulatabs.push(tabulatab);
				};
			});
		});
	}

	window.setTimeout(function() {
		thisBrowser().whenReady(function() {
			thisBrowser().saveTabs(tabulatabs, function() {
				stopProgressAnimation();
	        }, function() {
	        	stopProgressAnimation();
	        });
		});
	}, 2000);
}

var uploadTabTimout = null;

autosync = false;

function startUploadTabsTimeout() {
	if (!autosync) {
		return;
	}

	if (uploadTabTimout != null) {
		return;
	}

	uploadTabTimout = window.setTimeout(function() {
		collectAllTabs();
		uploadTabTimout = null;
	}, 30000);
}

if (isChrome()) {
	chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
		startUploadTabsTimeout();
	});

	chrome.tabs.onCreated.addListener(function(tab) {
		startUploadTabsTimeout();
	});

	chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
		startUploadTabsTimeout();
	});

	chrome.tabs.onRemoved.addListener(function(tabId) {
		startUploadTabsTimeout();
	});

	chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
		startUploadTabsTimeout();
	});

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
		startUploadTabsTimeout();
	});
};

if (isSafari()) {
	safari.application.addEventListener('open', function(e) {
		startUploadTabsTimeout();
	}, true);

	safari.application.addEventListener('close', function(e) {
		startUploadTabsTimeout();
	}, true);

	safari.application.addEventListener('activate', function(e) {
		startUploadTabsTimeout();
	}, true);

	safari.application.addEventListener('navigate', function(e) {
		startUploadTabsTimeout();
	}, true);
};

function openOptions(firstTime) {
	var url = "options.html";
	if (firstTime)
		url += "?firstTime=true";

	if (isSafari()) {
		thisBrowser().whenReady(function() {
			var fullUrl = safari.extension.baseURI + url;
			var tabFound = false;

			$.each(safari.application.browserWindows, function(i, browserWindow) {
				$.each(browserWindow.tabs, function(i, tab) {
					if (tab.url == fullUrl) {
						tabFound = true;
						tab.browserWindow.activate();
						tab.activate();
					}
				});
			});

			if (tabFound) {
				return;
			};

			var win;
			if (safari.application.activeBrowserWindow) {
				win = safari.application.activeBrowserWindow;
			} else if (safari.application.browserWindows.length > 0) {
				win = safari.application.browserWindows[0];
				win.activate();
			} else {
				win = safari.application.openBrowserWindow();
			}

			var tab = win.openTab();
			tab.url = fullUrl;
			tab.addEventListener('message', function() {
				tab.page.dispatchMessage('settings', {
					key: thisBrowser().encryption.hexKey(),
					username: thisBrowser().username,
					password: thisBrowser().password
				}, false);
			}, false);
			win.activate();
		});
	}

	if (isChrome()) {
		var fullUrl = chrome.extension.getURL(url);
		chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i in tabs) { // check if Options page is open already
				var tab = tabs[i];
				if (tab.url == fullUrl || tab.url.substring(0, fullUrl.length) == fullUrl) {
					chrome.tabs.update(tab.id, { selected: true }); // select the tab
					return;
				}
			}
			chrome.tabs.getSelected(null, function(tab) { // open a new tab next to currently selected tab
				chrome.tabs.create({
					url: url,
					index: tab.index + 1
				});
			});
		});
	}
}

thisBrowser().whenReady(function() {
	if (settingsStorage.getItem('installed') != 'true') {
		settingsStorage.setItem('installed', 'true');
		openOptions(true);

		window.setTimeout(function() {
			collectAllTabs();
		}, 5000);
	};
});

function totalReset() {
	settingsStorage.removeItem('installed');
	settingsStorage.removeSecureItem('key');
	settingsStorage.removeSecureItem('username');
	settingsStorage.removeSecureItem('password');
}