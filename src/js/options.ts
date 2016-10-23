class Selector {

    private _element:HTMLSelectElement;
    private _options:HTMLOptionElement[];
    private _activeOption:HTMLOptionElement;
    private _defaultOption:HTMLOptionElement;

    constructor(elementId:string) {
        this._element = <HTMLSelectElement> document.getElementById(elementId);
        this._options = [];
    }

    private clear() {
        while (this._element.hasChildNodes()) {
            this._element.removeChild(this._element.firstChild);
        }
    }

    private render() {
        for (let i = 0; i < this._options.length; i++) {
            this._element.appendChild(this._options[i]);
        }
    }

    private refresh() {
        this.clear();
        this.render();
    }

    public add(option:HTMLOptionElement) {
        this._options.push(option);
        this.refresh();
    }

    public addEventListener(event:string, callback:EventListener) {
        this._element.addEventListener(event, callback);
    }

    public getByText(text:string) {
        for (let i = 0; i < this._options.length; i++) {
            if (this._options[i].text === text) {
                return this._options[i];
            }
        }
        return null;
    }

    public getByValue(value:string) {
        for (let i = 0; i < this._options.length; i++) {
            if (this._options[i].value === value) {
                return this._options[i];
            }
        }
        return null;
    }

    public empty() {
        this._options = [];
        this.refresh();
    }

    public remove(option:HTMLOptionElement) {
        this._options.splice(this._options.indexOf(option), 1);
        this.refresh();
    }

    public removeByText(text:string) {
        for (let i = 0; i < this._options.length; null) {
            if (this._options[i].text == text) {
                this._options.splice(i, 1);
            } else {
                i++;
            }
        }
        this.refresh();
    }

    public removeByValue(value:string) {
        for (let i = 0; i < this._options.length; null) {
            if (this._options[i].value == value) {
                this._options.splice(i, 1);
            } else {
                i++;
            }
        }
        this.refresh();
    }

    get activeOption() {
        return this._activeOption;
    }

    get defaultOption() {
        return this._defaultOption;
    }

    get text() {
        return (<HTMLOptionElement>this._element.children[this._element.selectedIndex]).text;
    }

    get value() {
        return this._element.value;
    }

    set defaultOption(defaultOption:HTMLOptionElement) {
        this._defaultOption = defaultOption;
    }
}

namespace Options {
    var optionCreateNewProfile:HTMLOptionElement;
    var optionNoneProfile:HTMLOptionElement;

    var profiles:{[profileName:string]:Blinds.Profile};
    var defaultProfileName:string;

    var element:any = {};
    var toastTime:number = 2000;

    //var defaultprofileSelector: Selector;
    var profileSelector:Selector;


    /*
     ************************************ INITIALIZATION METHODS ************************************
     */
    function initData() {
        function initSelectProfile(response:Blinds.IResponse) {
            //profileSelector = new Selector('selectProfile');

            optionCreateNewProfile = document.createElement('option');
            optionCreateNewProfile.text = '-- Create New Profile --';
            optionCreateNewProfile.value = '\nCreateNewProfile';
            profileSelector.add(optionCreateNewProfile);

            for (var profileName in response.data.profiles) {								//	Iterate over profiles
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

        Blinds.sendMessage({category: 'getProfiles', data: {}})
            .then(function (response:Blinds.IResponse) {
                profiles = response.data.profiles;
                defaultProfileName = response.data.defaultProfileName;

                return response;
            })
            .then(initSelectProfile)
            .then(function (response:Blinds.IResponse) {
                selectProfile();    //  Initializes the color/message if 'Unrestricted' is selected
            })
            .catch(function (e:Error) {
                console.error(e);
            });
    }

    function initElementListeners() {
        //	Select Profile
        profileSelector.addEventListener('change', selectProfile);


        //	==== Buttons ====
        //	Create Profile
        element.button.createProfile.addEventListener('click', createProfile);

        //	DeleteProfile
        element.button.deleteProfile.addEventListener('click', deleteProfile);

        //	SaveProfile
        element.button.saveProfile.addEventListener('click', saveProfile);

        //	Set DefaultProfile
        element.button.setDefaultProfile.addEventListener('click', setDefaultProfile);

    }

    function initElements() {
        profileSelector = new Selector('selectProfile');

        element.button = {
            createProfile: <HTMLButtonElement> document.getElementById('buttonCreateProfile'),
            deleteProfile: <HTMLButtonElement> document.getElementById('buttonDeleteProfile'),
            saveProfile: <HTMLButtonElement> document.getElementById('buttonSaveProfile'),
            setDefaultProfile: <HTMLButtonElement> document.getElementById('buttonSetDefaultProfile')
        };
        element.div = {
            newProfile: <HTMLDivElement> document.getElementById('divNewProfile'),
            selectProfile: <HTMLDivElement> document.getElementById('divSelectProfile')
        };
        element.input = {
            newProfileName: <HTMLInputElement> document.getElementById('inputNewProfileName')
        };
        element.textArea = {
            profile: <HTMLTextAreaElement> document.getElementById('textAreaProfile')
        };

        Object.freeze(element);
    }

    /*
     ************************************ UTILITY METHODS ************************************
     */


    /*
     ************************************ ACTION METHODS ************************************
     */

    function createProfile() {
        Blinds.sendMessage({
                category: 'createProfile',
                data: {profileName: element.input.newProfileName.value}
            })
            .then(function (response:Blinds.IResponse) {
                //  Add to profileSelector
                var optionProfile = document.createElement('option');
                optionProfile.value = response.data.profileName;
                optionProfile.text = response.data.profileName;
                optionProfile.selected = true;
                profileSelector.add(optionProfile);

                // //  Add to selectDefaultProfile
                // optionProfile = document.createElement('option');
                // optionProfile.value = response.data.profileName;
                // optionProfile.text = response.data.profileName;
                // element.select.defaultProfile.appendChild(optionProfile);


                selectProfile();

                element.input.newProfileName.value = '';

                Materialize.toast('Profile Created', 1000);
            })
            .catch(function (response:Blinds.IResponse) {
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
            .then(function (response:Blinds.IResponse) {
                profileSelector.removeByValue(response.data.profileName);
                selectProfile();
                Materialize.toast('Profile \'' + response.data.profileName + '\' Deleted', toastTime);
            })
            .catch(function (response:Blinds.IResponse) {
                Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
                console.error(response);
            });
    }

    /**
     * Loads blacklist into the textarea
     */
    function loadProfile(profileName:string) {

        if (profileName == '\nCreateNewProfile') return; //	Bail if you try to load the create option

        //	Load default blacklist into
        var profileString = '';


        Blinds.sendMessage({
            category: 'getProfiles',
            data: {}
        }).then(function (response:Blinds.IResponse) {
                response.data.profiles[profileName].items.forEach(function (item:string) {
                    profileString += item + '\n';
                });

                element.textArea.profile.value = profileString;
            })
            .catch(function (response:Blinds.IResponse) {
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
            .catch(function (response:Blinds.IResponse) {
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
        } else {
            element.div.newProfile.style.height = "0px";

            if (profileSelector.value === 'Unrestricted') {
                element.textArea.profile.disabled = true;
                element.textArea.profile.classList.remove('white');
                element.textArea.profile.classList.add('amber', 'lighten-4');
                element.textArea.profile.value = 'THIS PROFILE CANNOT BE EDITED OR DELETED';
            } else {
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
        }).then(function (response:Blinds.IResponse) {
            var newDefaultProfileOption = profileSelector.getByValue(response.data.defaultProfileName);
            newDefaultProfileOption.text = '(Default) ' + newDefaultProfileOption.text;
            profileSelector.defaultOption = newDefaultProfileOption;

            prevDefaultProfileOption.text = prevDefaultProfileOption.text.replace('(Default) ', '');

            Materialize.toast('Default Profile set!', toastTime);
        }).catch(function (response:Blinds.IResponse) {
            Materialize.toast('ERROR: ' + response.data.errorMessage, toastTime);
            console.error(response);
        });
    }

    /**
     ************************************ INITIALIZE ************************************
     */

    (function () {
        initElements();

        initData();

        initElementListeners();

    })();
}



