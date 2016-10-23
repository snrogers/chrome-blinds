/**
 * Created by USER on 3/6/2016.
 */
class Toggle {
    //  TODO: It would be nice to have Toggle figure out if it should be disabled on its own
    private _element:HTMLInputElement;
    private _state:boolean;
    private _options:{[options:string]:string};

    constructor(elementId:string, onChange:Function) {
        this._element = <HTMLInputElement> document.getElementById(elementId);
        this._element.addEventListener('change', <EventListener>onChange.bind(this, this._element));
    }

    set disabled(value:boolean) {
        this._element.disabled = value;
    }

    set state(value:boolean) {
        this._element.checked = value;
    }
}
namespace PopUp {
    function isChanged(){
        port.postMessage({isChanged: true})
    }
    
    var port:chrome.runtime.Port;
    // var isChanged:boolean = false;

    var profiles:Blinds.Profile[];
    var currentTab:chrome.tabs.Tab;
    var toggleBlock:Toggle;

    var selectProfile: HTMLSelectElement;

    function initData() {
        var deferred = Q.defer();
        //  Get active TabID for future messages
        Blinds.getActiveTab()
            .then(function (tab:chrome.tabs.Tab) {
                Blinds.debug('PopUp\'s activeTabId:[' + tab.id + ']');
                currentTab = tab;
            })
            //  Populate Profile Selector
            .then(function () {
                return Blinds.sendMessage({category: 'getProfiles'})
            })
            .then(function (response:Blinds.IResponse) {
                var selectProfile = <HTMLSelectElement>document.getElementById('selectProfile');

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
            //  Configure Toggle
            .then(function () {
                Blinds.sendMessage({
                        category: 'checkIfBlocked',
                        data: {
                            url: currentTab.url,
                            windowId: currentTab.windowId
                        }
                    })
                    .then(function (response:Blinds.IResponse) {
                        toggleBlock = new Toggle('toggleBlock', function (element:HTMLInputElement) {
                            if (element.disabled) return;

                            if (element.checked) {
                                Blinds.sendMessage({
                                        category: 'removeSiteFromProfile',
                                        data: {
                                            url: currentTab.url, profileName: selectProfile.value //TODO: Make add/remove site function have same signature
                                        }
                                    })
                                    .then(function (response:Blinds.IResponse) {
                                        isChanged();
                                        element.checked = true;
                                    })
                                    .catch(function (response:Blinds.IResponse) {
                                        console.error(response);
                                    });
                            } else {
                                Blinds.sendMessage({
                                        category: 'addSiteToProfile',
                                        data: {windowId: currentTab.windowId, profileName: selectProfile.value}
                                    })
                                    .then(function (response:Blinds.IResponse) {
                                        isChanged();
                                        element.checked = false;
                                    })
                                    .catch(function (response:Blinds.IResponse) {
                                        console.error(response);
                                    });
                            }
                        });
                        toggleBlock.disabled = selectProfile.value === 'Unrestricted';
                        toggleBlock.state = !response.data.isBlocked;
                    })
            })
            .then(function () {
                //  TODO: Figure out a way to prevent sliding on load without using this setTimeout
                setTimeout(function(){
                    (<HTMLElement>document.querySelector('.onoffswitch-switch')).style.transition = 'all 0.3s ease-in 0s';
                    (<HTMLElement>document.querySelector('.onoffswitch-inner')).style.transition = 'margin 0.3s ease-in 0s';
                },50);
                deferred.resolve();
            });
        return deferred.promise;
    }

    function initListeners() {
        var deferred = Q.defer();

        //	Profile Selector
        selectProfile = <HTMLSelectElement>document.getElementById('selectProfile');
        selectProfile.addEventListener('change', function () {
            Blinds.sendMessage({
                    category: 'setActiveProfile',
                    data: {
                        profileName: selectProfile.value
                    }
                })
                .then(function (response:Blinds.IResponse) {
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
                    })
                })
                .then(function (response:Blinds.IResponse) {
                    toggleBlock.state = !response.data.isBlocked;
                }).then(function () {
            });
        });
        deferred.resolve();
        return deferred.promise;
    }


    /** INITIALIZE **/
    (function () {
        initData()
            .then(initListeners)
            .then(function () {
                port = chrome.runtime.connect({name: currentTab.id.toString()});
            });
    })();
}

