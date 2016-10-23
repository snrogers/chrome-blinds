var Blinds;
(function (Blinds) {
    Blinds._isDebugging = true;
    Blinds.extensionId = chrome.runtime.id;
    Blinds.HtmlBlock = (function () {
        var htmlString = '<div id="getBackToWork" style="z-index:999999999999999; width: 100%; height: 100%; position: fixed;">' +
            '<img id="blockImage" src="chrome-extension://' + Blinds.extensionId + '/img/shutter.jpg" style="transform: translateY(-100%); transition: transform 3s linear; width: 100%;"/>' +
            '</div>';
        return htmlString;
    })();
    Blinds.PhysicsBlock = null;
    function debug(something) {
        if (Blinds._isDebugging)
            chrome.extension.getBackgroundPage().console.debug(something);
    }
    Blinds.debug = debug;
    function log(something) {
        chrome.extension.getBackgroundPage().console.log(something);
    }
    Blinds.log = log;
    function error(location, errorMessage) {
        chrome.extension.getBackgroundPage().console.error({
            location: location,
            errorMessage: errorMessage
        });
    }
    Blinds.error = error;
    function warn(something) {
        chrome.extension.getBackgroundPage().console.warn(something);
    }
    Blinds.warn = warn;
    function extractSubdomain(url) {
        url = url.slice(0);
        url = url.slice(url.indexOf('/') + 2);
        url = url.slice(0, url.indexOf('/'));
        return url;
    }
    Blinds.extractSubdomain = extractSubdomain;
    function extractRootDomain(url) {
        var subdomain = Blinds.extractSubdomain(url);
        var numDots = subdomain.match(/\./g).length;
        for (var i = 1; i < numDots; i++) {
            subdomain = subdomain.slice(subdomain.indexOf('.') + 1);
        }
        return subdomain;
    }
    Blinds.extractRootDomain = extractRootDomain;
    function getActiveTab() {
        var deferred = Q.defer();
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                deferred.resolve(tabs[0]);
            }
            else {
                console.error(tabs);
                deferred.reject('No Tabs found');
            }
        });
        return deferred.promise;
    }
    Blinds.getActiveTab = getActiveTab;
    function getActiveWindow() {
        var deferred = Q.defer();
        deferred.reject(new Error('Unimplemented Method'));
        return deferred.promise;
    }
    Blinds.getActiveWindow = getActiveWindow;
    function parseProfile(profileString) {
        return profileString.split('\n');
    }
    Blinds.parseProfile = parseProfile;
    function sendMessage(message) {
        var deferred = Q.defer();
        chrome.runtime.sendMessage(message, function (response) {
            if (response.isSuccessful) {
                deferred.resolve(response);
            }
            else {
                deferred.reject(response);
            }
        });
        return deferred.promise;
    }
    Blinds.sendMessage = sendMessage;
    var WindowConfig = (function () {
        WindowConfig.prototype = null;
        function WindowConfig() {
        }
        return WindowConfig;
    })();
    var Profile = (function () {
        function Profile(displayName) {
            this.displayName = displayName;
            this.items = [];
        }
        Profile.prototype.addItem = function (item) {
            this.items.push(item);
        };
        return Profile;
    }());
    Blinds.Profile = Profile;
    var Storage = (function () {
        function Storage() {
        }
        Storage.getData = function (data) {
            var deferred = Q.defer();
            chrome.storage.sync.get(null, function (items) {
                deferred.resolve(data ? items[data] : items);
            });
            return deferred.promise;
        };
        Storage.setData = function (object) {
            var deferred = Q.defer();
            chrome.storage.sync.set(object, function () {
                deferred.resolve();
            });
            return deferred.promise;
        };
        return Storage;
    }());
    Blinds.Storage = Storage;
})(Blinds || (Blinds = {}));

//# sourceMappingURL=blinds.js.map
