// Copyright (c) 2011-2012 Turbulenz Limited

/*global TurbulenzEngine: false*/

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
        function getCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                var data = jsonResponse.data;
                var player = data.player;
                var entities = data.entities;
                var ranking = data.ranking;
                var player_user_id;
                var user_id;

                if (player)
                {
                    that.meta[key].bestScore = player.score;
                    player_user_id = player.user;
                    player.user = entities[player_user_id];
                }

                var rankingLength = ranking.length;
                var i;
                for (i = 0; i < rankingLength; i += 1)
                {
                    var rank = ranking[i];

                    user_id = rank.user;
                    if (user_id === player_user_id)
                    {
                        data.playerIndex = i;
                        rank.me = true;
                    }
                    rank.user = entities[user_id];
                }

                callbackFn(key, data);
            }
            else
            {
                errorCallback("LeaderboardManager.get failed with status " + status + ": " + jsonResponse.msg,
                              status,
                              that.get,
                              [key, spec, callbackFn]);
            }
        }

        var dataSpec = {};

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
        if (spec.type)
        {
            dataSpec.type = spec.type;
        }
        if (spec.friendsOnly)
        {
            dataSpec.friendsonly = spec.friendsOnly && 1;
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
