/// <reference path="../../typings/main.d.ts" />

namespace Blinds {
    //  ======== Variables ========
    export var _isDebugging = true;
    export var extensionId = chrome.runtime.id;

    export var HtmlBlock= (function(){

        var htmlString =
                '<div id="getBackToWork" style="z-index:999999999999999; width: 100%; height: 100%; position: fixed;">' +
                '<img id="blockImage" src="chrome-extension://' + extensionId + '/img/shutter.jpg" style="transform: translateY(-100%); transition: transform 3s linear; width: 100%;"/>' +
                '</div>'
            ;

        return htmlString;
    })();

    export var PhysicsBlock = null;

    //  ======== Functions ====
    //  == Logging ======
    export function debug(something:any) {
        if (_isDebugging) chrome.extension.getBackgroundPage().console.debug(something);
    }

    export function log(something:any) {
        chrome.extension.getBackgroundPage().console.log(something);
    }

    export function error(location:string, errorMessage:string) {
        chrome.extension.getBackgroundPage().console.error({
            location: location,
            errorMessage: errorMessage
        });
    }

    export function warn(something:any) {
        chrome.extension.getBackgroundPage().console.warn(something);
    }

    /*
     ************************************ UTILITY METHODS ************************************
     */
    export function extractSubdomain(url:string):string {
        url = url.slice(0);								//  Copy url TODO: Eliminate this step?
        url = url.slice(url.indexOf('/') + 2);			//  Strip protocol
        url = url.slice(0, url.indexOf('/'));
        return url;                                     //  Strip stem/query and return
    }

    export function extractRootDomain(url:string):string {
        var subdomain = Blinds.extractSubdomain(url);
        var numDots = subdomain.match(/\./g).length;
        for (var i = 1; i < numDots; i++) {	            //  strip subdomains
            subdomain = subdomain.slice(subdomain.indexOf('.') + 1);
        }
        return subdomain;
    }

    export function getActiveTab():Q.Promise<chrome.tabs.Tab> {
        var deferred = Q.defer();
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs:chrome.tabs.Tab[]) {
            if (tabs[0]) {
                deferred.resolve(tabs[0]);
            } else {
                console.error(tabs);
                deferred.reject('No Tabs found');
            }
        });
        return deferred.promise;
    }

    export function getActiveWindow():Q.Promise<chrome.windows.Window> {
        var deferred = Q.defer();
        deferred.reject(new Error('Unimplemented Method'));
        return deferred.promise;
    }

    export function parseProfile(profileString:string):string[] {
        return profileString.split('\n');
    }

    export function sendMessage(message):Q.Promise<IResponse> {
        var deferred = Q.defer();
        chrome.runtime.sendMessage(message, function (response:Blinds.IResponse) {
            if (response.isSuccessful) {
                deferred.resolve(response);
            } else {
                deferred.reject(response);
            }
        });
        return deferred.promise;
    }


    /*
     ************************************ Interfaces ************************************
     */

    export interface IErrorLog {
        location:string
        exception:string
    }

    export interface IStorageData {
        defaultProfileName?:string;
        profiles?:{[profileName:string]:Profile};
    }

    export interface IRequest {
        category:string;
        data:{
            profileName?:string,
            profileItem?:string,
            profile?:Profile,
            tabId?:number,
            url?:string,
            windowId?:number
        };
    }

    export interface IResponse {
        category:string;
        isSuccessful:boolean;

        data:{
            activeProfileName?:string,
            defaultProfileName?:string,
            errorMessage?:string, //  Error-type loses its properties during transmission, so just send the message
            isBlocked?:boolean,
            profiles?:{[profileName:string]:Profile },
            profileName?:string
        };
    }


//  ==== Classes =====
//  TODO: Figure out if TS has a better way to make an empty object
    var WindowConfig = (function () {

        WindowConfig.prototype = null;

        function WindowConfig() {

        }

        return WindowConfig;
    })();

    export class Profile {

        displayName:string;
        items:string[];

        constructor(displayName:string) {
            this.displayName = displayName;

            this.items = [];
        }

        public addItem(item:string) {   //  TODO: Maybe I should remove this? It's unnecessary since items is public now
            this.items.push(item);
        }
    }

    export class Storage {

        /***
         * Returns a Promise containing the specified data in chrome.storage.sync
         * @param {string=} data
         * @returns {Promise<IStorageData>}
         */
        public static getData(data?:string):Q.Promise<IStorageData> {
            var deferred = Q.defer();
            chrome.storage.sync.get(null, function (items) {
                deferred.resolve(data ? items[data] : items);
            });
            return deferred.promise;
        }

        /***
         * Sets value(s) in chrome.storage.sync, returns a promise
         * @param {Object} object
         * @returns {Promise}
         */
        public static setData(object:IStorageData):Q.Promise<any> { //  TODO: I can't make this return void because it returns {}
            var deferred = Q.defer();
            chrome.storage.sync.set(object, function () {
                deferred.resolve();
            });
            return deferred.promise;
        }
    }
}