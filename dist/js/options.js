var Selector = (function () {
    function Selector(elementId) {
        this._element = document.getElementById(elementId);
        this._options = [];
    }
    Selector.prototype.clear = function () {
        while (this._element.hasChildNodes()) {
            this._element.removeChild(this._element.firstChild);
        }
    };
    Selector.prototype.render = function () {
        for (var i = 0; i < this._options.length; i++) {
            this._element.appendChild(this._options[i]);
        }
    };
    Selector.prototype.refresh = function () {
        this.clear();
        this.render();
    };
    Selector.prototype.add = function (option) {
        this._options.push(option);
        this.refresh();
    };
    Selector.prototype.addEventListener = function (event, callback) {
        this._element.addEventListener(event, callback);
    };
    Selector.prototype.getByText = function (text) {
        for (var i = 0; i < this._options.length; i++) {
            if (this._options[i].text === text) {
                return this._options[i];
            }
        }
        return null;
    };
    Selector.prototype.getByValue = function (value) {
        for (var i = 0; i < this._options.length; i++) {
            if (this._options[i].value === value) {
                return this._options[i];
            }
        }
        return null;
    };
    Selector.prototype.empty = function () {
        this._options = [];
        this.refresh();
    };
    Selector.prototype.remove = function (option) {
        this._options.splice(this._options.indexOf(option), 1);
        this.refresh();
    };
    Selector.prototype.removeByText = function (text) {
        for (var i = 0; i < this._options.length; null) {
            if (this._options[i].text == text) {
                this._options.splice(i, 1);
            }
            else {
                i++;
            }
        }
        this.refresh();
    };
    Selector.prototype.removeByValue = function (value) {
        for (var i = 0; i < this._options.length; null) {
            if (this._options[i].value == value) {
                this._options.splice(i, 1);
            }
            else {
                i++;
            }
        }
        this.refresh();
    };
    Object.defineProperty(Selector.prototype, "activeOption", {
        get: function () {
            return this._activeOption;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "defaultOption", {
        get: function () {
            return this._defaultOption;
        },
        set: function (defaultOption) {
            this._defaultOption = defaultOption;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "text", {
        get: function () {
            return this._element.children[this._element.selectedIndex].text;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "value", {
        get: function () {
            return this._element.value;
        },
        enumerable: true,
        configurable: true
    });
    return Selector;
}());
var Options;
(function (Options) {
    var optionCreateNewProfile;
    var optionNoneProfile;
    var profiles;
    var defaultProfileName;
    var element = {};
    var toastTime = 2000;
    var profileSelector;
    function initData() {
        function initSelectProfile(response) {
            optionCreateNewProfile = document.createElement('option');
            optionCreateNewProfile.text = '-- Create New Profile --';
            optionCreateNewProfile.value = '\nCreateNewProfile';
            profileSelector.add(optionCreateNewProfile);
            for (var profileName in response.data.profiles) {
                var option = document.createElement('option');
                option.value = profileName;
                option.text = profileName;
                if (profileName === response.data.activeProfileName) {
                    option.text = '(Active) ' + option.text;
                    option.selected = true;
                }
                if (profileName === response.data.defaultProfileName) {
                    option.text = '(Default) ' + option.text;
                    profileSelector.defaultOption = option;
                }
                profileSelector.add(option);
            }
            return response;
        }
        Blinds.sendMessage({ category: 'getProfiles', data: {} })
            .then(function (response) {
            profiles = response.data.profiles;
            defaultProfileName = response.data.defaultProfileName;
            return response;
        })
            .then(initSelectProfile)
            .then(function (response) {
            selectProfile();
        })
            .catch(function (e) {
            console.error(e);
        });
    }
    function initElementListeners() {
        profileSelector.addEventListener('change', selectProfile);
        element.button.createProfile.addEventListener('click', createProfile);
        element.button.deleteProfile.addEventListener('click', deleteProfile);
        element.button.saveProfile.addEventListener('click', saveProfile);
        element.button.setDefaultProfile.addEventListener('click', setDefaultProfile);
    }
    function initElements() {
        profileSelector = new Selector('selectProfile');
        element.button = {
            createProfile: document.getElementById('buttonCreateProfile'),
            deleteProfile: document.getElementById('buttonDeleteProfile'),
            saveProfile: document.getElementById('buttonSaveProfile'),
            setDefaultProfile: document.getElementById('buttonSetDefaultProfile')
        };
        element.div = {
            newProfile: document.getElementById('divNewProfile'),
            selectProfile: document.getElementById('divSelectProfile')
        };
        element.input = {
            newProfileName: document.getElementById('inputNewProfileName')
        };
        element.textArea = {
            profile: document.getElementById('textAreaProfile')
        };
        Object.freeze(element);
    }
    function createProfile() {
        Blinds.sendMessage({
            category: 'createProfile',
            data: { profileName: element.input.newProfileName.value }
        })
            .then(function (response) {
            var optionProfile = document.createElement('option');
            optionProfile.value = response.data.profileName;
            optionProfile.text = response.data.profileName;
            optionProfile.selected = true;
            profileSelector.add(optionProfile);
            selectProfile();
            element.input.newProfileName.value = '';
            Materialize.toast('Profile Created', 1000);
        })
            .catch(function (response) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }
    function deleteProfile() {
        Blinds.sendMessage({
            category: 'deleteProfile',
            data: {
                profileName: profileSelector.value
            }
        })
            .then(function (response) {
            profileSelector.removeByValue(response.data.profileName);
            selectProfile();
            Materialize.toast('Profile \'' + response.data.profileName + '\' Deleted', toastTime);
        })
            .catch(function (response) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }
    function loadProfile(profileName) {
        if (profileName == '\nCreateNewProfile')
            return;
        var profileString = '';
        Blinds.sendMessage({
            category: 'getProfiles',
            data: {}
        }).then(function (response) {
            response.data.profiles[profileName].items.forEach(function (item) {
                profileString += item + '\n';
            });
            element.textArea.profile.value = profileString;
        })
            .catch(function (response) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }
    function saveProfile() {
        var profileName = profileSelector.value;
        var profile = new Blinds.Profile(profileName);
        profile.items = Blinds.parseProfile(element.textArea.profile.value);
        Blinds.sendMessage({
            category: 'setProfile',
            data: {
                profileName: profileName,
                profile: profile
            }
        })
            .then(function () {
            Materialize.toast('Saved!', toastTime);
        })
            .catch(function (response) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }
    function selectProfile() {
        console.log(element);
        if (profileSelector.value === '\nCreateNewProfile') {
            element.div.newProfile.style.height = "120px";
            element.textArea.profile.disabled = true;
            element.textArea.profile.value = 'Select or Create a Black List';
            element.textArea.profile.classList.remove('white');
            element.textArea.profile.classList.add('amber', 'lighten-4');
        }
        else {
            element.div.newProfile.style.height = "0px";
            if (profileSelector.value === 'Unrestricted') {
                element.textArea.profile.disabled = true;
                element.textArea.profile.classList.remove('white');
                element.textArea.profile.classList.add('amber', 'lighten-4');
                element.textArea.profile.value = 'THIS PROFILE CANNOT BE EDITED OR DELETED';
            }
            else {
                loadProfile(profileSelector.value);
                element.textArea.profile.disabled = false;
                element.textArea.profile.classList.remove('amber', 'lighten-4');
                element.textArea.profile.classList.add('white');
            }
        }
    }
    function setDefaultProfile() {
        var prevDefaultProfileOption = profileSelector.defaultOption;
        Blinds.sendMessage({
            category: 'setDefaultProfile',
            data: {
                profileName: profileSelector.value
            }
        }).then(function (response) {
            var newDefaultProfileOption = profileSelector.getByValue(response.data.defaultProfileName);
            newDefaultProfileOption.text = '(Default) ' + newDefaultProfileOption.text;
            profileSelector.defaultOption = newDefaultProfileOption;
            prevDefaultProfileOption.text = prevDefaultProfileOption.text.replace('(Default) ', '');
            Materialize.toast('Default Profile set!', toastTime);
        }).catch(function (response) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }
    (function () {
        initElements();
        initData();
        initElementListeners();
    })();
})(Options || (Options = {}));

//# sourceMappingURL=options.js.map
