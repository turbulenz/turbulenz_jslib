// Copyright (c) 2011-2012 Turbulenz Limited

/*global TurbulenzEngine: false*/
/*global TurbulenzBridge*/
/*global TurbulenzServices*/

//
// API
//

function LeaderboardManager() {}
LeaderboardManager.prototype =
{
    version : 1,

    getOverview: function leaderboardManagerGetOverviewFn(spec, callbackFn, errorCallbackFn)
    {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta)
        {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var that = this;
        function getOverviewCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                var overview = jsonResponse.data;
                var overviewLength = overview.length;
                for (var i = 0; i < overviewLength; i += 1)
                {
                    var leaderboard = overview[i];
                    that.meta[leaderboard.key].bestScore = leaderboard.score;
                }
                callbackFn(overview);
            }
            else
            {
                errorCallback("LeaderboardManager.getKeys failed with status " + status + ": " + jsonResponse.msg,
                              status,
                              that.getOverview,
                              [spec, callbackFn]);
            }
        }

        var dataSpec = {};
        if (spec.friendsOnly)
        {
            dataSpec.friendsonly = spec.friendsOnly && 1;
        }

        this.service.request({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug,
            method: 'GET',
            data : dataSpec,
            callback: getOverviewCallbackFn,
            requestHandler: this.requestHandler
        });
    },

    get: function leaderboardManagerGetFn(key, spec, callbackFn, errorCallbackFn)
    {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta)
        {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var meta = this.meta[key];
        if (!meta)
        {
            errorCallback("No leaderboard with the name '" + key + "' exists.");
            return;
        }

        var that = this;
        var dataSpec = {};

        function getCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                var data = jsonResponse.data;
                callbackFn(key, LeaderboardResult.create(that, key, dataSpec, data));
            }
            else
            {
                errorCallback("LeaderboardManager.get failed with status " + status + ": " + jsonResponse.msg,
                              status,
                              that.get,
                              [key, spec, callbackFn]);
            }
        }

        // backwards compatibility
        if (spec.numNear)
        {
            dataSpec.type = 'near';
            dataSpec.size = spec.numNear * 2 + 1;
        }
        if (spec.numTop)
        {
            dataSpec.type = 'top';
            dataSpec.size = spec.numTop;
        }

        // new arguments
        if (spec.size)
        {
            dataSpec.size = spec.size;
        }
        if (!dataSpec.size)
        {
            // default value
            dataSpec.size = 9;
        }
        if (spec.friendsOnly)
        {
            dataSpec.friendsonly = spec.friendsOnly && 1;
        }

        if (spec.type)
        {
            dataSpec.type = spec.type;
        }
        if (spec.hasOwnProperty('score'))
        {
            dataSpec.score = spec.score;
        }
        if (spec.hasOwnProperty('time'))
        {
            dataSpec.time = spec.time;
        }

        this.service.request({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug + '/' + key,
            method: 'GET',
            data : dataSpec,
            callback: getCallbackFn,
            requestHandler: this.requestHandler
        });
    },

    set: function leaderboardManagerSetFn(key, score, callbackFn, errorCallbackFn)
    {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta)
        {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return;
        }

        var meta = this.meta[key];
        if (!meta)
        {
            errorCallback("No leaderboard with the name '" + key + "' exists.");
            return;
        }

        var sortBy = meta.sortBy;
        var bestScore = meta.bestScore;
        // Avoid making an ajax query if the new score is worse than current score
        if (bestScore && ((sortBy === 1 && score <= bestScore) || (sortBy === -1 && score >= bestScore)))
        {
            TurbulenzEngine.setTimeout(function () {
                callbackFn(key, score, false, bestScore);
            }, 0);
            return;
        }

        var that = this;
        function setCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                var data = jsonResponse.data;
                var bestScore = data.bestScore || data.lastScore || null;
                var newBest = data.newBest || false;
                if (newBest)
                {
                    bestScore = score;

                    // Assemble data for notification system.
                    var scoreData = {};
                    scoreData.key = key;
                    scoreData.title = meta.title;
                    scoreData.sortBy = meta.sortBy;
                    scoreData.score = score;
                    scoreData.prevBest = data.prevBest; // may be 'undefined'
                    scoreData.gameSlug = that.gameSession.gameSlug;
                    // Trigger notification (only for new best scores).
                    TurbulenzBridge.updateLeaderBoard(scoreData);
                }
                meta.bestScore = bestScore;
                callbackFn(key, score, newBest, bestScore);
            }
            else
            {
                errorCallback("LeaderboardManager.set failed with status " + status + ": " + jsonResponse.msg,
                              status,
                              that.set,
                              [key, score, callbackFn]);
            }
        }

        var dataSpec = {};
        dataSpec.score = score;
        dataSpec.gameSessionId = that.gameSessionId;

        this.service.request({
            url: '/api/v1/leaderboards/scores/set/' + key,
            method: 'POST',
            data : dataSpec,
            callback: setCallbackFn,
            requestHandler: this.requestHandler,
            encrypt: true
        });
    }
};

LeaderboardManager.create = function createLeaderboardManagerFn(requestHandler,
                                                                gameSession,
                                                                leaderboardMetaRecieved,
                                                                errorCallbackFn)
{
    if (!TurbulenzServices.available())
    {
        // Call error callback on a timeout to get the same behaviour as the ajax call
        TurbulenzEngine.setTimeout(function () {
            if (errorCallbackFn)
            {
                errorCallbackFn('TurbulenzServices.createLeaderboardManager could not load leaderboards meta data');
            }
        }, 0);
        return null;
    }

    var leaderboardManager = new LeaderboardManager();

    leaderboardManager.gameSession = gameSession;
    leaderboardManager.gameSessionId = gameSession.gameSessionId;
    leaderboardManager.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
    leaderboardManager.service = TurbulenzServices.getService('leaderboards');
    leaderboardManager.requestHandler = requestHandler;

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
                    var i;
                    for (i = 0; i < metaLength; i += 1)
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
};


function LeaderboardResult() {}
LeaderboardResult.prototype =
{
    version : 1,

    getOffsetPageAbove: function getPageAboveFn(spec, offsetIndex, callbackFn, errorCallbackFn)
    {
        if (this.top)
        {
            // just repeat the data if we are already at the top
            var that = this;
            TurbulenzEngine.setTimeout(function ()
                {
                    callbackFn(that.key, that);
                }, 0);
            return;
        }

        var offsetScore = this.ranking[offsetIndex];
        var newSpec = {
            type: 'above',
            score: offsetScore.score,
            time: offsetScore.time,
            size: (spec && spec.size) || this.spec.size,
            friendsonly: this.spec.friendsOnly
        };
        this.leaderboardManager.get(this.key, newSpec, callbackFn, errorCallbackFn);
    },

    getOffsetPageBelow: function getPageBelowFn(spec, offsetIndex, callbackFn, errorCallbackFn)
    {
        if (this.bottom)
        {
            // just repeat the data if we are already at the top
            var that = this;
            TurbulenzEngine.setTimeout(function ()
                {
                    callbackFn(that.key, that);
                }, 0);
            return;
        }

        var offsetScore = this.ranking[offsetIndex];
        var newSpec = {
            type: 'below',
            score: offsetScore.score,
            time: offsetScore.time,
            size: (spec && spec.size) || this.spec.size,
            friendsonly: this.spec.friendsOnly
        };
        this.leaderboardManager.get(this.key, newSpec, callbackFn, errorCallbackFn);
    },

    getPageAbove: function getPageAboveFn(callbackFn, errorCallbackFn)
    {
        this.getOffsetPageAbove(null, 0, callbackFn, errorCallbackFn);
    },

    getPageBelow: function getPageBelowFn(callbackFn, errorCallbackFn)
    {
        this.getOffsetPageBelow(null, this.ranking.length - 1, callbackFn, errorCallbackFn);
    }
};

LeaderboardResult.create = function LeaderboardResultCreate(leaderboardManager, key, spec, data)
{
    var leaderboardResult = new LeaderboardResult();

    leaderboardResult.leaderboardManager = leaderboardManager;
    leaderboardResult.key = key;
    leaderboardResult.spec = spec;

    var player = leaderboardResult.player = data.player;
    var ranking = leaderboardResult.ranking = data.ranking;

    var entities = data.entities;
    var player_username;

    if (player)
    {
        leaderboardManager.meta[key].bestScore = player.score;
        if (entities)
        {
            player.user = entities[player.user];
        }
        player_username = player.user.username;
    }

    var rankingLength = ranking.length;
    var i;
    for (i = 0; i < rankingLength; i += 1)
    {
        var rank = ranking[i];
        if (entities)
        {
            rank.user = entities[rank.user];
        }

        if (rank.user.username === player_username)
        {
            leaderboardResult.playerIndex = i;
            rank.me = true;
        }
    }

    var bestScore = ranking[0];
    leaderboardResult.top = !bestScore || bestScore.rank === 1;
    leaderboardResult.bottom = data.bottom;

    return leaderboardResult;
};
