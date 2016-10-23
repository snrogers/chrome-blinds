///**
// * Created by user on 2/29/16.
// */
/// <reference path="../../typings/main.d.ts"/>

namespace Background {

    var windowConfig:{[windowId:number]:string};
    var profiles:{[profileName:string]:Blinds.Profile};
    var defaultProfileName:string;


    /*
     ************************************ INITIALIZER METHODS ************************************
     */
    function initData() {

        function initProfiles(data:Blinds.IStorageData):Blinds.IStorageData|Q.Promise<Blinds.IStorageData> {
            if (data.profiles) {
                profiles = data.profiles;
                console.log('Using Pre-existing Set of Profiles');
                console.log(profiles);
                return data;
            } else {
                profiles = Object.create(null);		//  no default properties

                //  Generate Example Profile
                var exampleProfile = new Blinds.Profile('Example Profile');
                exampleProfile.addItem('facebook.com');
                exampleProfile.addItem('youtube.com');
                exampleProfile.addItem('reddit.com');
                profiles['Example Profile'] = exampleProfile;

                //  Generate Unrestricted Profile
                profiles['Unrestricted'] = new Blinds.Profile('Unrestricted');

                var deferred = Q.defer();
                chrome.storage.sync.set({profiles: profiles}, function () {
                    console.log('New Set of Profiles Initialized');
                    console.log(profiles);
                    deferred.resolve(data);
                });
                return deferred.promise;
            }
        }

        function initDefaultProfileName(data:Blinds.IStorageData):Blinds.IStorageData|Q.Promise<void> {
            console.log('Setting defaultProfileName.');
            if (data.defaultProfileName) {
                defaultProfileName = data.defaultProfileName;
                console.log('defaultProfileName found.');
                return data;
            } else {
                var deferred = Q.defer();
                defaultProfileName = 'Unrestricted';
                chrome.storage.sync.set({defaultProfileName: defaultProfileName}, function () {
                    deferred.resolve();
                    console.log('defaultProfileName not found. Creating new defaultProfileName.');
                });
                return deferred.promise;
            }
        }

        function initWindowConfig(data:Blinds.IStorageData):Blinds.IStorageData|Q.Promise<void> {
            windowConfig = Object.create(null);
            //	WindowSettings are not preserved between runs
            var deferred = Q.defer();
            chrome.windows.getAll(function (windows) {
                windows.forEach(function (window) {
                    windowConfig[window.id] = defaultProfileName.slice(0);	//	TODO: Figure out if I actually need to copy
                });

                console.log('New Set of WindowSettings Initialized');
                console.log(windowConfig);
                deferred.resolve(data);
            });
            return deferred.promise;
        }

        console.log('==================INITIALIZING===================');
        Blinds.Storage.getData()
            .then(initProfiles)
            .then(initDefaultProfileName)
            .then(initWindowConfig)
            .catch(function (e:Error) {
                console.error(e);
            }).finally(function () {
            console.log('=================================================')
        });
    }

    function initListeners() {
        //  Listen for connections
        chrome.runtime.onConnect.addListener(function (port) {
            var isChanged:boolean;
            port.onMessage.addListener(function (message: {isChanged:boolean}) {
                if (message.isChanged) {
                    isChanged = message.isChanged;
                }
            });

            port.onDisconnect.addListener(function (event) {
                if (isChanged) {
                    console.warn('==== Refreshing Tab ====');
                    var code = 'console.log(\'reloading\'); window.location.reload();';
                    chrome.tabs.executeScript(Number(port.name), {code: code});
                    console.warn(event);
                    console.warn('======================');
                } else {
                    console.warn('Popup close without changing. No refresh.');
                }
            });
            return true;	//	Keep listening forever
        });

        //  Listen for messages
        chrome.runtime.onMessage.addListener(
            function (request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
                switch (request.category) {
                    case 'addSiteToProfile':
                        addSiteToProfile(request, sender, sendResponse);
                        break;
                    case 'checkIfBlocked':
                        checkIfBlocked(request, sender, sendResponse);
                        break;
                    case 'createProfile':
                        createProfile(request, sender, sendResponse);
                        break;
                    case 'deleteProfile':
                        deleteProfile(request, sender, sendResponse);
                        break;
                    case 'getProfiles':
                        getProfiles(request, sender, sendResponse);
                        break;
                    case 'refreshTab':
                        console.debug('Got a refreshTab request, calling the function now');
                        refreshTab(request, sender, sendResponse);
                        break;
                    case 'removeSiteFromProfile':
                        removeSiteFromProfile(request, sender, sendResponse);
                        break;
                    case 'setActiveProfile':
                        setActiveProfile(request, sender, sendResponse);
                        break;
                    case 'setProfile':
                        saveProfile(request, sender, sendResponse);
                        break;
                    case 'setDefaultProfile':
                        setDefaultProfile(request, sender, sendResponse);
                        break;
                    default:
                        console.error('==== MALFORMED MESSAGE ====');
                        console.error('== Request ==');
                        console.error(request);
                        console.error('== Sender ==');
                        console.error(sender);
                        console.error('===========================');
                        break;
                }
                return true;	//	Keep listening forever
            });


        //	Listen for new windows
        chrome.windows.onCreated.addListener(function (window) {
            Blinds.debug('== Window Created ==');
            Blinds.debug(window);
            Blinds.debug('====================');

            windowConfig[window.id] = defaultProfileName;
        });

        //	Listen for removed windows
        chrome.windows.onRemoved.addListener(function (windowId) {
            delete windowConfig[windowId];
        });
    }

    /**
     ************************************ CALLBACK HANDLER METHODS ************************************
     */

    /**
     * Add a domain to a profile
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function addSiteToProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        //TODO: REFACTOR ME


        function getUrlFromTab(tab:chrome.tabs.Tab) {
            return tab.url;
        }

        function addSiteToProfle(url:string) {
            var domain = Blinds.extractRootDomain(url);
            Blinds.debug('domain: ' + domain);

            var profile = profiles[request.data.profileName];
            profile.items.push(domain);

            return Blinds.Storage.setData({profiles: profiles});
        }

        if (request.data.profileName == 'Unrestricted') {
            sendResponse({
                category: 'addSiteToProfle',
                isSuccessful: false,
                data: {
                    errorMessage: new Error('Cannot add item to blacklist: Unrestricted').message
                }
            });
            return;
        }

        Blinds.getActiveTab()
            .then(getUrlFromTab)
            .then(addSiteToProfle)
            .then(function () {
                sendResponse({category: 'addSiteToProfle', isSuccessful: true, data: {}});
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'addSiteToProfle', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    /**
     * Determine whether a URL should be blocked
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function checkIfBlocked(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {

        var promise = new Q.Promise(function (resolve, reject) {

            //  Content script does not include windowId, but PopUp does
            var windowId = request.data.windowId ? request.data.windowId : sender.tab.windowId;

            var profileName = windowConfig[windowId];
            if (profileName === 'Unrestricted') {   //  TODO: make a Unrestricted object so that I don't need this check
                resolve(false);
                return;
            } else {
                profiles[profileName].items.forEach(function (domain) {
                    if (request.data.url.match(new RegExp(domain))) {
                        resolve(true);
                        return;
                    }
                });
                resolve(false);
            }
        }).then(function (isBlocked:boolean) {
            Blinds.debug(request.data.url + (isBlocked ? ' is blocked.' : ' not blocked'));
            sendResponse({category: 'checkIfBlocked', isSuccessful: true, data: {isBlocked: isBlocked}});
        }, function (e:Error) {
            console.error(e);
            sendResponse({category: 'checkIfBlocked', isSuccessful: false, data: {errorMessage: e.message}});
        });
    }

    /**
     * Creates a new blacklist
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function createProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {

        Q.fcall(function () {
                if (Object.hasOwnProperty.call(profiles, request.data.profileName)) {
                    throw new Error('Profile name already exists.');
                }
                profiles[request.data.profileName] = new Blinds.Profile(request.data.profileName);
                return;
            })
            .then(function () {
                return Blinds.Storage.setData(profiles);
            }) //  TODO: The return value of setData is causing trouble
            .then(function () {
                sendResponse({
                    category: 'createProfile',
                    isSuccessful: true,
                    data: {profileName: request.data.profileName}
                });
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'createProfile', isSuccessful: false, data: {errorMessage: e.message}});

            });
    }

    /**
     * Deletes a profile
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function deleteProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        var profileName = request.data.profileName;

        Q.fcall(function () {
                if (profileName === 'Unrestricted') {
                    throw new Error('Cannot delete \'Unrestricted\' profile.');
                }

                delete profiles[profileName];

                if (defaultProfileName === profileName) defaultProfileName === 'Unrestricted';

                for (var windowId in windowConfig) {
                    if (Object.hasOwnProperty.call(windowConfig, windowId)) {
                        if (windowConfig[windowId] === profileName) {
                            windowConfig[windowId] = defaultProfileName;
                        }
                    }
                }

                Blinds.debug(profileName + ' deleted');
            })
            .then(function () {
                return Blinds.Storage.setData({profiles: profiles});
            })
            .then(function () {
                sendResponse({category: 'deleteProfile', isSuccessful: true, data: {profileName: profileName}});
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'deleteProfile', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    /**
     * Returns a message containing all profiles and profile info
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function getProfiles(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {


        Blinds.getActiveTab()
            .then(function (tab) {
                sendResponse({
                    category: 'getProfiles',
                    isSuccessful: true,
                    data: {
                        activeProfileName: windowConfig[tab.windowId],
                        defaultProfileName: defaultProfileName,
                        profiles: profiles,
                    }
                });
            })
            .catch(function (error) {
                console.error('getProfiles', error);
                sendResponse({category: 'getProfiles', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    function refreshTab(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        Blinds.debug('refreshing tab:[' + request.data.tabId + ']');
        var code = 'console.log(\'reloading\'); window.location.reload();';
        chrome.tabs.executeScript(request.data.tabId, {code: code});
    }

    function removeSiteFromProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        // //  Content script does not include windowId, but PopUp does
        // var windowId = request.data.windowId ? request.data.windowId : sender.tab.windowId;

        var profileName = request.data.profileName;

        var promise = new Q.Promise(function (resolve, reject) {
            if (profileName === 'Unrestricted') {   //  TODO: make a Unrestricted object so that I don't need this check
                throw 'Cannot modify Unrestricted Profile';
            } else {
                profiles[profileName].items.forEach(function (item) {
                    if (request.data.url.match(new RegExp(item))) {
                        Blinds.debug('match found: ' + item);
                        resolve(item);
                        return;
                    }
                });
                throw 'Cannot find blocking profile item';
            }
        }).then(function (item:string) {
            Blinds.debug('matched item: ' + item);
            var profile = profiles[profileName];
            Blinds.debug('profile before removal:');
            Blinds.debug(profile);
            profile.items.splice(profile.items.indexOf(item), 1);
            Blinds.debug('profile after removal:');
            Blinds.debug(profile);
            return Blinds.Storage.setData({profiles: profiles});
        }).then(function () {
            sendResponse({category: 'removeSiteFromProfile', isSuccessful: true, data: {}});
        }, function (e:Error) {
            console.error(e);
            Blinds.debug('==== Request ====');
            Blinds.debug(request);
            Blinds.debug('=================');
            sendResponse({category: 'removeSiteFromProfile', isSuccessful: false, data: {errorMessage: e.message}});
        });
    }

    /**
     * Sets a window's activeProfile. Assumes the sender is a tab (i.e. content script)
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function setActiveProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {


        Blinds.getActiveTab()
            .then(function (tab:chrome.tabs.Tab) {
                windowConfig[tab.windowId] = request.data.profileName;
                return tab;
            })
            .then(function (tab:chrome.tabs.Tab) {
                Blinds.debug('Window:[' + tab.windowId + '] set to blacklist:' + request.data.profileName);
                sendResponse({
                    category: 'setActiveProfile',
                    isSuccessful: true,
                    data: {activeProfileName: request.data.profileName}
                })
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'setActiveProfile', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    /**
     * Saves a profile. Sent by Options.js
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function saveProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        var profilePropName = request.data.profileName;
        profiles[profilePropName] = request.data.profile;

        Blinds.Storage.setData({profiles: profiles})
            .then(function () {
                sendResponse({category: 'saveProfile', isSuccessful: true, data: {}});
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'saveProfile', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    /**
     * Sets default blacklist
     * @param {Blinds.IRequest} request
     * @param {chrome.runtime.MessageSender} sender
     * @param {Blinds.IResponse} sendResponse
     * @private
     */
    function setDefaultProfile(request:Blinds.IRequest, sender:chrome.runtime.MessageSender, sendResponse:(response:Blinds.IResponse) => any) {
        defaultProfileName = request.data.profileName;

        Blinds.Storage.setData({defaultProfileName: defaultProfileName})
            .then(function () {
                Blinds.debug('defaultProfile set to: ' + defaultProfileName);
                sendResponse({
                    category: 'setDefaultProfile',
                    isSuccessful: true,
                    data: {defaultProfileName: defaultProfileName}
                });
            }, function (e:Error) {
                console.error(e);
                sendResponse({category: 'setDefaultProfile', isSuccessful: false, data: {errorMessage: e.message}});
            });
    }

    /**
     ************************************ INITIALIZE ************************************
     */
    (function () {
        initData();
        initListeners();

    })();
}