var Toggle = (function () {
    function Toggle(elementId, onChange) {
        this._element = document.getElementById(elementId);
        this._element.addEventListener('change', onChange.bind(this, this._element));
    }
    Object.defineProperty(Toggle.prototype, "disabled", {
        set: function (value) {
            this._element.disabled = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Toggle.prototype, "state", {
        set: function (value) {
            this._element.checked = value;
        },
        enumerable: true,
        configurable: true
    });
    return Toggle;
}());
var PopUp;
(function (PopUp) {
    function isChanged() {
        port.postMessage({ isChanged: true });
    }
    var port;
    var profiles;
    var currentTab;
    var toggleBlock;
    var selectProfile;
    function initData() {
        var deferred = Q.defer();
        Blinds.getActiveTab()
            .then(function (tab) {
            Blinds.debug('PopUp\'s activeTabId:[' + tab.id + ']');
            currentTab = tab;
        })
            .then(function () {
            return Blinds.sendMessage({ category: 'getProfiles' });
        })
            .then(function (response) {
            var selectProfile = document.getElementById('selectProfile');
            for (var profileName in response.data.profiles) {
                if (Object.hasOwnProperty.call(response.data.profiles, profileName)) {
                    var selectOption = document.createElement('option');
                    selectOption.text = profileName;
                    selectOption.value = profileName;
                    if (profileName === response.data.activeProfileName) {
                        selectOption.selected = true;
                    }
                    selectProfile.appendChild(selectOption);
                }
            }
        })
            .then(function () {
            Blinds.sendMessage({
                category: 'checkIfBlocked',
                data: {
                    url: currentTab.url,
                    windowId: currentTab.windowId
                }
            })
                .then(function (response) {
                toggleBlock = new Toggle('toggleBlock', function (element) {
                    if (element.disabled)
                        return;
                    if (element.checked) {
                        Blinds.sendMessage({
                            category: 'removeSiteFromProfile',
                            data: {
                                url: currentTab.url, profileName: selectProfile.value
                            }
                        })
                            .then(function (response) {
                            isChanged();
                            element.checked = true;
                        })
                            .catch(function (response) {
                            console.error(response);
                        });
                    }
                    else {
                        Blinds.sendMessage({
                            category: 'addSiteToProfile',
                            data: { windowId: currentTab.windowId, profileName: selectProfile.value }
                        })
                            .then(function (response) {
                            isChanged();
                            element.checked = false;
                        })
                            .catch(function (response) {
                            console.error(response);
                        });
                    }
                });
                toggleBlock.disabled = selectProfile.value === 'Unrestricted';
                toggleBlock.state = !response.data.isBlocked;
            });
        })
            .then(function () {
            setTimeout(function () {
                document.querySelector('.onoffswitch-switch').style.transition = 'all 0.3s ease-in 0s';
                document.querySelector('.onoffswitch-inner').style.transition = 'margin 0.3s ease-in 0s';
            }, 50);
            deferred.resolve();
        });
        return deferred.promise;
    }
    function initListeners() {
        var deferred = Q.defer();
        selectProfile = document.getElementById('selectProfile');
        selectProfile.addEventListener('change', function () {
            Blinds.sendMessage({
                category: 'setActiveProfile',
                data: {
                    profileName: selectProfile.value
                }
            })
                .then(function (response) {
                isChanged();
                toggleBlock.disabled = response.data.activeProfileName === 'Unrestricted';
            })
                .then(function () {
                return Blinds.sendMessage({
                    category: 'checkIfBlocked',
                    data: {
                        url: currentTab.url,
                        windowId: currentTab.windowId
                    }
                });
            })
                .then(function (response) {
                toggleBlock.state = !response.data.isBlocked;
            }).then(function () {
            });
        });
        deferred.resolve();
        return deferred.promise;
    }
    (function () {
        initData()
            .then(initListeners)
            .then(function () {
            port = chrome.runtime.connect({ name: currentTab.id.toString() });
        });
    })();
})(PopUp || (PopUp = {}));

//# sourceMappingURL=popup.js.map
