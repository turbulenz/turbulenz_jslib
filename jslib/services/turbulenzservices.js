// Copyright (c) 2011-2012 Turbulenz Limited

/*global BadgeManager: false*/
/*global window: false*/
/*global GameSession: false*/
/*global TurbulenzBridge: false*/
/*global TurbulenzEngine: false*/
/*global Utilities: false*/
/*global MappingTable: false*/
/*global LeaderboardManager: false*/
/*global ServiceRequester: false*/
/*global Badges*/
/*global MultiPlayerSession: false*/
/*global Observer*/

var TurbulenzServices;

function ServiceRequester() {}
ServiceRequester.prototype =
{

    // make a request if the service is available. Same parameters as an
    // Utilities.ajax call with extra argument:
    //     neverDiscard - Never discard the request. Always queues the request
    //                    for when the service is again available. (Ignores
    //                    server preference)
    request: function requestFn(params)
    {
        var discardRequestFn = function discardRequestFn()
        {
            if (params.callback)
            {
                params.callback({'ok': false, 'msg': 'Service Unavailable. Discarding request'}, 503);
            }
        };

        var that = this;
        var serviceStatusObserver = this.serviceStatusObserver;

        var onServiceStatusChange;
        onServiceStatusChange = function onServiceStatusChangeFn(running, discardRequest)
        {
            if (discardRequest)
            {
                if (!params.neverDiscard)
                {
                    serviceStatusObserver.unsubscribe(onServiceStatusChange);
                    discardRequestFn();
                }
            }
            else if (running)
            {
                serviceStatusObserver.unsubscribe(onServiceStatusChange);
                that.request(params);
            }
        };

        if (!this.running)
        {
            if (this.discardRequests && !params.neverDiscard)
            {
                TurbulenzEngine.setTimeout(discardRequestFn, 0);
                return false;
            }

            // we check waiting so that we don't get into an infinite loop of callbacks
            // when a service goes down, then up and then down again before the subscribed
            // callbacks have all been called.
            if (!params.waiting)
            {
                params.waiting = true;
                serviceStatusObserver.subscribe(onServiceStatusChange);
            }
            return true;
        }

        var oldCustomErrorHandler = params.customErrorHandler;
        params.customErrorHandler = function checkServiceUnavailableFn(callContext, makeRequest, responseJSON, status)
        {
            if (status === 503)
            {
                var responseObj = JSON.parse(responseJSON);
                var statusObj = responseObj.data;
                var discardRequests = (statusObj ? statusObj.discardRequests : true);
                that.discardRequests = discardRequests;

                if (discardRequests && !params.neverDiscard)
                {
                    discardRequestFn();
                }
                else
                {
                    serviceStatusObserver.subscribe(onServiceStatusChange);
                }
                TurbulenzServices.serviceUnavailable(that, callContext);
                // An error occurred so return false to avoid calling the success callback
                return false;
            }
            else
            {
                // call the old custom error handler
                if (oldCustomErrorHandler)
                {
                    return oldCustomErrorHandler.call(that.requestHandler, callContext, makeRequest, responseJSON, status);
                }
                return true;
            }
        };

        Utilities.ajax(params);
        return true;
    }
};

ServiceRequester.create = function apiServiceCreateFn(serviceName, params)
{
    var serviceRequester = new ServiceRequester();

    if (!params)
    {
        params = {};
    }

    // we assume everything is working at first
    serviceRequester.running = true;
    serviceRequester.discardRequests = false;
    serviceRequester.serviceStatusObserver = Observer.create();

    serviceRequester.serviceName = serviceName;

    serviceRequester.onServiceUnavailable = params.onServiceUnavailable;
    serviceRequester.onServiceAvailable = params.onServiceAvailable;

    return serviceRequester;
};

//
// TurbulenzServices
//
TurbulenzServices = {

    available: function turbulenzServicesAvailableFn()
    {
        return window.gameSlug !== undefined;
    },

    defaultErrorCallback: function turbulenzServicesDefaultErrorCallbackFn(errorMsg, httpStatus) {},

    onServiceUnavailable: function turbulenzServicesOnServiceUnavailableFn(serviceName, callContext) {},
    onServiceAvailable : function turbulenzServicesOnServiceAvailableFn(serviceName, callContext) {},

    createGameSession: function turbulenzServicesCreateGameSession(requestHandler, sessionCreatedFn, errorCallbackFn)
    {
        var gameSession = new GameSession();

        var gameSlug = window.gameSlug;
        gameSession.gameSlug = gameSlug;

        gameSession.requestHandler = requestHandler;
        gameSession.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
        gameSession.gameSessionId = null;
        gameSession.service = this.getService('gameSessions');
        gameSession.status = null;

        if (!TurbulenzServices.available())
        {
            // Call sessionCreatedFn on a timeout to get the same behaviour as the AJAX call
            if (sessionCreatedFn)
            {
                TurbulenzEngine.setTimeout(function sessionCreatedCall()
                    {
                        sessionCreatedFn(gameSession);
                    }, 0);
            }
            return gameSession;
        }

        function gameSessionRequestCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                gameSession.mappingTable = jsonResponse.mappingTable;
                gameSession.gameSessionId = jsonResponse.gameSessionId;

                if (sessionCreatedFn)
                {
                    sessionCreatedFn(gameSession);
                }

                TurbulenzBridge.createdGameSession(gameSession.gameSessionId);
            }
            else
            {
                gameSession.errorCallbackFn("TurbulenzServices.createGameSession error with HTTP status " + status + ": " + jsonResponse.msg, status);
            }
        }

        var createSessionURL = '/api/v1/games/create-session/' + gameSlug;

        var Turbulenz = window.top.Turbulenz;
        if (Turbulenz)
        {
            var data = Turbulenz.Data;
            if (data)
            {
                var mode = data.mode;
                if (mode)
                {
                    createSessionURL += '/' + mode;
                }
            }
        }

        gameSession.service.request({
            url: createSessionURL,
            method: 'POST',
            callback: gameSessionRequestCallbackFn,
            requestHandler: requestHandler,
            neverDiscard: true
        });

        return gameSession;
    },

    createMappingTable: function turbulenzServicesCreateMappingTable(requestHandler,
                                                                     gameSession,
                                                                     tableRecievedFn,
                                                                     defaultMappingSettings,
                                                                     errorCallbackFn)
    {
        var mappingTable = new MappingTable();
        var mappingTableSettings = gameSession && gameSession.mappingTable;
        if (mappingTableSettings)
        {
            mappingTable.mappingTableURL = mappingTableSettings.mappingTableURL;
            mappingTable.mappingTablePrefix = mappingTableSettings.mappingTablePrefix;
            mappingTable.assetPrefix = mappingTableSettings.assetPrefix;
        }
        else if (defaultMappingSettings)
        {
            mappingTable.mappingTableURL = defaultMappingSettings.mappingTableURL ||
                (defaultMappingSettings.mappingTableURL === "" ? "" : "mapping_table.json");
            mappingTable.mappingTablePrefix = defaultMappingSettings.mappingTablePrefix ||
                (defaultMappingSettings.mappingTablePrefix === "" ? "" : "staticmax/");
            mappingTable.assetPrefix = defaultMappingSettings.assetPrefix ||
                (defaultMappingSettings.assetPrefix === "" ? "" : "missing/");
        }
        else
        {
            mappingTable.mappingTableURL = "mapping_table.json";
            mappingTable.mappingTablePrefix = "staticmax/";
            mappingTable.assetPrefix = "missing/";
        }

        mappingTable.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
        if (!mappingTable.mappingTableURL)
        {
            mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable no mapping table file given");
        }

        function createMappingTableCallbackFn(urlMappingData)
        {
            var urlMapping = urlMappingData.urnmapping || urlMappingData.urnremapping || {};
            mappingTable.urlMapping = urlMapping;

            // Prepend all the mapped physical paths with the asset server
            var mappingTablePrefix = mappingTable.mappingTablePrefix;
            if (mappingTablePrefix)
            {
                for (var source in urlMapping)
                {
                    if (urlMapping.hasOwnProperty(source))
                    {
                        urlMapping[source] = mappingTablePrefix + urlMapping[source];
                    }
                }
            }

            tableRecievedFn(mappingTable);
        }

        requestHandler.request({
                src: mappingTable.mappingTableURL,
                onload: function jsonifyResponse(jsonResponse, status) {
                    var obj = JSON.parse(jsonResponse);
                    if (status === 200)
                    {
                        createMappingTableCallbackFn(obj);
                    }
                    else
                    {
                        mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable error with HTTP status " + status + ": " + jsonResponse.msg, status);
                        mappingTable.urlMapping = defaultMappingSettings && (defaultMappingSettings.urnMapping || {});
                        tableRecievedFn(mappingTable);
                    }
                }
            });

        return mappingTable;
    },

    createLeaderboardManager: function turbulenzServicesCreateLeaderboardManager(requestHandler,
                                                                                 gameSession,
                                                                                 leaderboardMetaRecieved,
                                                                                 errorCallbackFn)
    {
        var leaderboardManager = new LeaderboardManager();

        leaderboardManager.gameSession = gameSession;
        leaderboardManager.gameSessionId = gameSession.gameSessionId;
        leaderboardManager.errorCallbackFn = errorCallbackFn || this.defaultErrorCallback;
        leaderboardManager.service = this.getService('leaderboards');
        leaderboardManager.requestHandler = requestHandler;

        if (!TurbulenzServices.available())
        {
            // Call error callback on a timeout to get the same behaviour as the ajax call
            TurbulenzEngine.setTimeout(function () {
                leaderboardManager.errorCallbackFn('TurbulenzServices.createLeaderboardManager could not load leaderboards meta data');
            }, 0);
            return leaderboardManager;
        }

        leaderboardManager.service.request({
            url: '/api/v1/leaderboards/read/' + gameSession.gameSlug,
            method: 'GET',
            callback: function createLeaderboardManagerAjaxErrorCheck(jsonResponse, status) {
                if (status === 200)
                {
                    var metaArray = jsonResponse.data;
                    if (metaArray)
                    {
                        leaderboardManager.meta = {};
                        var metaLength = metaArray.length;
                        for (var i = 0; i < metaLength; i += 1)
                        {
                            var board = metaArray[i];
                            leaderboardManager.meta[board.key] = board;
                        }
                    }
                    if (leaderboardMetaRecieved)
                    {
                        leaderboardMetaRecieved(leaderboardManager);
                    }
                }
                else
                {
                    leaderboardManager.errorCallbackFn("TurbulenzServices.createLeaderboardManager error with HTTP status " + status + ": " + jsonResponse.msg, status);
                }
            },
            requestHandler: requestHandler,
            neverDiscard: true
        });

        return leaderboardManager;
    },

    //just a factory, Badges have to be included from the caller!->TODO change to a less obtrusive pattern
    createBadgeManager: function turbulenzServicesCreateBadgeManager(requestHandler, gameSession)
    {
        var badgeManager = new BadgeManager();

        badgeManager.gameSession = gameSession;
        badgeManager.gameSessionId = gameSession.gameSessionId;
        badgeManager.service = this.getService('badges');
        badgeManager.requestHandler = requestHandler;

        return badgeManager;
    },

    createUserProfile: function turbulenzServicesCreateUserProfile(requestHandler,
                                                                   profileRecievedFn,
                                                                   errorCallbackFn)
    {
        var userProfile = {};

        if (!errorCallbackFn)
        {
            errorCallbackFn = TurbulenzServices.defaultErrorCallback;
        }

        function loadUserProfileCallbackFn(userProfileData)
        {
            if (userProfileData && userProfileData.ok)
            {
                userProfileData = userProfileData.data;
                for (var p in userProfileData)
                {
                    if (userProfileData.hasOwnProperty(p))
                    {
                        userProfile[p] = userProfileData[p];
                    }
                }
            }
        }

        var url = '/api/v1/profiles/user';
        // Can't request files from the hard disk using AJAX
        if (TurbulenzServices.available())
        {
            this.getService('profiles').request({
                url: url,
                method: 'GET',
                callback: function createUserProfileAjaxErrorCheck(jsonResponse, status)
                {
                    if (status === 200)
                    {
                        loadUserProfileCallbackFn(jsonResponse);
                    }
                    else if (errorCallbackFn)
                    {
                        errorCallbackFn("TurbulenzServices.createUserProfile error with HTTP status " + status + ": " + jsonResponse.msg, status);
                    }
                    profileRecievedFn(userProfile);
                },
                requestHandler: requestHandler
            });
        }

        return userProfile;
    },

    createMultiplayerSession: function turbulenzServicesCreateMultiplayerSession(numSlots,
                                                                                 requestHandler,
                                                                                 sessionCreatedFn,
                                                                                 errorCallbackFn)
    {
        if (!errorCallbackFn)
        {
            errorCallbackFn = TurbulenzServices.defaultErrorCallback;
        }

        if (!TurbulenzServices.available())
        {
            if (errorCallbackFn)
            {
                errorCallbackFn("TurbulenzServices.createMultiplayerSession failed: Service not available",
                                0);
            }
        }
        else
        {
            var requestCallback = function requestCallbackFn(jsonResponse, status)
            {
                if (status === 200)
                {
                    var sessionData = jsonResponse.data;
                    sessionData.requestHandler = requestHandler;

                    MultiPlayerSession.create(sessionData,
                                              sessionCreatedFn,
                                              errorCallbackFn);
                }
                else if (errorCallbackFn)
                {
                    errorCallbackFn("TurbulenzServices.createMultiplayerSession error with HTTP status " +
                                    status + ": " + jsonResponse.msg,
                                    status);
                }
            };

            this.getService('multiplayer').request({
                url: '/api/v1/multiplayer/session/create/' + window.gameSlug,
                method: 'POST',
                data: {'slots': numSlots},
                callback: requestCallback,
                requestHandler: requestHandler
            });
        }
    },

    joinMultiplayerSession: function turbulenzServicesJoinMultiplayerSession(sessionID,
                                                                             requestHandler,
                                                                             sessionCreatedFn,
                                                                             errorCallbackFn)
    {
        if (!errorCallbackFn)
        {
            errorCallbackFn = TurbulenzServices.defaultErrorCallback;
        }

        if (!TurbulenzServices.available())
        {
            if (errorCallbackFn)
            {
                errorCallbackFn("TurbulenzServices.joinMultiplayerSession failed: Service not available",
                                0);
            }
        }
        else
        {
            var requestCallback = function requestCallbackFn(jsonResponse, status)
            {
                if (status === 200)
                {
                    var sessionData = jsonResponse.data;
                    sessionData.requestHandler = requestHandler;
                    MultiPlayerSession.create(sessionData,
                                              sessionCreatedFn,
                                              errorCallbackFn);
                }
                else if (errorCallbackFn)
                {
                    errorCallbackFn("TurbulenzServices.joinMultiplayerSession error with HTTP status " +
                                    status + ": " + jsonResponse.msg,
                                    status);
                }
            };

            this.getService('multiplayer').request({
                url: '/api/v1/multiplayer/session/join',
                method: 'POST',
                data: {'session': sessionID},
                callback: requestCallback,
                requestHandler: requestHandler
            });
        }
    },

    services: {},
    waitingServices: {},
    pollingServiceStatus: false,
    // milliseconds
    defaultPollInterval: 4000,

    getService: function getServiceFn(serviceName)
    {
        var services = this.services;
        if (services.hasOwnProperty(serviceName))
        {
            return services[serviceName];
        }
        else
        {
            var service = ServiceRequester.create(serviceName);
            services[serviceName] = service;
            return service;
        }
    },

    serviceUnavailable: function serviceUnavailableFn(service, callContext)
    {
        var waitingServices = this.waitingServices;
        var serviceName = service.serviceName;
        if (waitingServices.hasOwnProperty(serviceName))
        {
            return;
        }

        waitingServices[serviceName] = service;

        service.running = false;

        var onServiceUnavailableCallbacks = function onServiceUnavailableCallbacksFn(service)
        {
            var onServiceUnavailable = callContext.onServiceUnavailable;
            if (onServiceUnavailable)
            {
                onServiceUnavailable.call(service, callContext);
            }
            if (service.onServiceUnavailable)
            {
                service.onServiceUnavailable();
            }
            if (TurbulenzServices.onServiceUnavailable)
            {
                TurbulenzServices.onServiceUnavailable(service);
            }
        };

        if (service.discardRequests)
        {
            onServiceUnavailableCallbacks(service);
        }

        if (this.pollingServiceStatus)
        {
            return;
        }

        var that = this;
        var pollServiceStatus;

        var serviceUrl = '/api/v1/service-status/game/read/' + window.gameSlug;
        var servicesStatusCB = function servicesStatusCBFn(responseObj, status)
        {
            if (status === 200)
            {
                var statusObj = responseObj.data;
                var servicesObj = statusObj.services;

                var retry = false;
                for (var serviceName in waitingServices)
                {
                    if (waitingServices.hasOwnProperty(serviceName))
                    {
                        var service = waitingServices[serviceName];
                        var serviceData = servicesObj[serviceName];
                        var serviceRunning = serviceData.running;

                        service.running = serviceRunning;
                        service.description = serviceData.description;

                        if (serviceRunning)
                        {
                            if (service.discardRequests)
                            {
                                var onServiceAvailable = callContext.onServiceAvailable;
                                if (onServiceAvailable)
                                {
                                    onServiceAvailable.call(service, callContext);
                                }
                                if (service.onServiceAvailable)
                                {
                                    service.onServiceAvailable();
                                }
                                if (TurbulenzServices.onServiceAvailable)
                                {
                                    TurbulenzServices.onServiceAvailable(service);
                                }
                            }

                            delete waitingServices[serviceName];
                            service.discardRequests = false;
                            service.serviceStatusObserver.notify(serviceRunning, service.discardRequests);

                        }
                        else
                        {
                            // if discardRequests has been set
                            if (serviceData.discardRequests && !service.discardRequests)
                            {
                                service.discardRequests = true;
                                onServiceUnavailableCallbacks(service);
                                // discard all waiting requests
                                service.serviceStatusObserver.notify(serviceRunning, service.discardRequests);
                            }
                            retry = true;
                        }
                    }
                }
                if (!retry)
                {
                    this.pollingServiceStatus = false;
                    return;
                }
                TurbulenzEngine.setTimeout(pollServiceStatus, statusObj.pollInterval * 1000);
            }
            else
            {
                TurbulenzEngine.setTimeout(pollServiceStatus, that.defaultPollInterval);
            }
        };

        pollServiceStatus = function pollServiceStatusFn()
        {
            Utilities.ajax({
                url: serviceUrl,
                method: 'GET',
                callback: servicesStatusCB
            });
        };

        pollServiceStatus();
    }

};
