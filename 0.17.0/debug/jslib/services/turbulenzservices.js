// Copyright (c) 2011 Turbulenz Limited

/*global BadgeManager: false*/
/*global TurbulenzGamesiteBridge: false*/
/*global window: false*/
/*global GameSession: false*/
/*global TurbulenzEngine: false*/
/*global Utilities: false*/
/*global MappingTable: false*/
/*global LeaderboardManager: false*/
/*global Badges*/

//
// TurbulenzServices
//
var TurbulenzServices = {

    available: function turbulenzServicesAvailableFn()
    {
        return window.gameSlug !== undefined;
    },

    defaultErrorCallback: function turbulenzServicesDefaultErrorCallbackFn(errorMsg, httpStatus) {},

    createGameSession: function turbulenzServicesCreateGameSession(sessionCreatedFn, errorCallbackFn)
    {
        var gameSession = new GameSession();

        var gameSlug = window.gameSlug;
        gameSession.gameSlug = gameSlug;
        gameSession.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
        gameSession.gameSessionId = null;

        function sessionCreatedCall()
        {
            sessionCreatedFn(gameSession);
        }

        if (!TurbulenzServices.available())
        {
            // Call sessionCreatedFn on a timeout to get the same behaviour as the AJAX call
            TurbulenzEngine.setTimeout(sessionCreatedCall, 0);
            return gameSession;
        }

        function gameSessionRequestCallbackFn(jsonResponse, status, statusText)
        {
            if (status === 200)
            {
                gameSession.mappingTable = jsonResponse.mappingTable;
                gameSession.gameSessionId = jsonResponse.gameSessionId;
                sessionCreatedFn(gameSession);
            }
            else
            {
                gameSession.errorCallbackFn("TurbulenzServices.createGameSession error with HTTP status " + status + ": " + jsonResponse.msg, status);
            }
        }

        Utilities.ajax({
            url: '/api/v1/games/create-session/' + gameSlug,
            method: 'POST',
            async: true,
            callback: gameSessionRequestCallbackFn
        });

        return gameSession;
    },

    createMappingTable: function turbulenzServicesCreateMappingTable(gameSession,
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

        // Cant request files from the hard disk using AJAX
        if (TurbulenzServices.available() && mappingTable.mappingTableURL.indexOf('https://') !== 0)
        {
            Utilities.ajax({
                url: mappingTable.mappingTableURL,
                method: 'GET',
                async: true,
                callback: function createMappingTableAjaxErrorCheck(jsonResponse, status, statusText) {
                    if (status === 200)
                    {
                        createMappingTableCallbackFn(jsonResponse);
                    }
                    else
                    {
                        mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable error with HTTP status " + status + ": " + jsonResponse.msg, status);
                        mappingTable.urlMapping = defaultMappingSettings && (defaultMappingSettings.urnMapping || {});
                        tableRecievedFn(mappingTable);
                    }
                }
            });
        }
        else
        {
            TurbulenzEngine.request(mappingTable.mappingTableURL,
                function createMappingTablePluginErrorCheck(responseText, status, statusText)
                {
                    if (responseText)
                    {
                        createMappingTableCallbackFn(JSON.parse(responseText));
                    }
                    else
                    {
                        mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable could not load mapping table");
                        mappingTable.urlMapping = defaultMappingSettings.urnMapping || {};
                        tableRecievedFn(mappingTable);
                    }
                });
        }

        return mappingTable;
    },

    createLeaderboardManager: function turbulenzServicesCreateLeaderboardManager(gameSession,
                                                                                 leaderboardMetaRecieved,
                                                                                 errorCallbackFn)
    {
        var leaderboardManager = new LeaderboardManager();
        leaderboardManager.gameSession = gameSession;
        leaderboardManager.gameSessionId = gameSession.gameSessionId;
        leaderboardManager.errorCallbackFn = errorCallbackFn || this.defaultErrorCallback;

        if (!TurbulenzServices.available())
        {
            // Call error callback on a timeout to get the same behaviour as the AJAX call
            TurbulenzEngine.setTimeout(function () {
                leaderboardManager.errorCallbackFn('TurbulenzServices.createLeaderboardManager could not load leaderboards meta data');
            }, 0);
            return leaderboardManager;
        }

        var dataSpec = {};
        dataSpec.gameSessionId = gameSession.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/leaderboards/read/' + gameSession.gameSlug,
            method: 'GET',
            async: true,
            data: dataSpec,
            callback: function createLeaderboardManagerAjaxErrorCheck(jsonResponse, status, statusText) {
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
            }
        });

        return leaderboardManager;
    },

    //just a factory, Badges have to be included from the caller!->TODO change to a less obtrusive pattern
    createBadgeManager: function turbulenzServicesCreateBadgeManager(gameSession)
    {
        var badgemanager = new BadgeManager();
        badgemanager.gameSession = gameSession;
        badgemanager.gameSessionId = gameSession.gameSessionId;
        //got to init the global event Object at the beginning to register it in the window.document
        TurbulenzGamesiteBridge.getSingleton(gameSession);
        return badgemanager;
    },

    createUserProfile: function turbulenzServicesCreateUserProfile(profileRecievedFn,
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

        // Cant request files from the hard disk using AJAX
        var url = '/api/v1/profiles/user';
        if (TurbulenzServices.available())
        {
            Utilities.ajax({
                url: url,
                method: 'GET',
                async: true,
                callback: function createUserProfileAjaxErrorCheck(jsonResponse, status, statusText)
                {
                    if (status === 200)
                    {
                        loadUserProfileCallbackFn(jsonResponse);
                    }
                    else
                    {
                        errorCallbackFn("TurbulenzServices.createUserProfile error with HTTP status " + status + ": " + jsonResponse.msg, status);
                    }
                    profileRecievedFn(userProfile);
                }
            });
        }
        else
        {
            TurbulenzEngine.request(url,
                function createUserProfilePluginErrorCheck(responseText)
                {
                    if (responseText)
                    {
                        loadUserProfileCallbackFn(JSON.parse(responseText));
                    }
                    else
                    {
                        errorCallbackFn("TurbulenzServices.createUserProfile could not load user profile");
                    }
                    profileRecievedFn(userProfile);
                });
        }

        return userProfile;
    }
};
