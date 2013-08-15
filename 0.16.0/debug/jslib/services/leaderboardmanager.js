// Copyright (c) 2011 Turbulenz Limited

//
// API
//
function LeaderboardManager() {}
LeaderboardManager.prototype =
{
    version : 1,

    getOverview: function leaderboardManagerGetOverviewFn(spec, callbackFn, errorCallbackFn)
    {
        var that = this;
        function getOverviewCallbackFn(jsonResponse, status, statusText)
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
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("LeaderboardManager.getKeys failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
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

        dataSpec.gameSessionId = that.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug,
            method: 'GET',
            async: true,
            data : dataSpec,
            callback: getOverviewCallbackFn
        });
    },

    get: function leaderboardManagerGetFn(key, spec, callbackFn, errorCallbackFn)
    {
        if (!this.meta || !this.meta.hasOwnProperty(key))
        {
            return;
        }

        var that = this;
        function getCallbackFn(jsonResponse, status, statusText)
        {
            if (status === 200)
            {
                var data = jsonResponse.data;
                if (data.playerIndex)
                {
                    that.meta[key].bestScore = data.ranking[data.playerIndex].score;
                }
                callbackFn(key, data);
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("LeaderboardManager.get failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
                              status,
                              that.get,
                              [key, spec, callbackFn]);
            }
        }

        var dataSpec = {};
        if (spec.numNear)
        {
            dataSpec.numnear = spec.numNear;
        }
        if (spec.numTop)
        {
            dataSpec.numtop = spec.numTop;
        }
        if (spec.friendsOnly)
        {
            dataSpec.friendsonly = spec.friendsOnly && 1;
        }

        dataSpec.gameSessionId = that.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug + '/' + key,
            method: 'GET',
            async: true,
            data : dataSpec,
            callback: getCallbackFn
        });
    },

    set: function leaderboardManagerSetFn(key, score, callbackFn, errorCallbackFn)
    {
        if (!this.meta || !this.meta.hasOwnProperty(key))
        {
            return;
        }

        var meta = this.meta[key];
        var sortBy = meta.sortBy;
        var bestScore = meta.bestScore;
        // Avoid making an Ajax query if the new score is worse than current score
        if (bestScore && ((sortBy === 1 && score <= bestScore) || (sortBy === -1 && score >= bestScore)))
        {
            TurbulenzEngine.setTimeout(function () {
                callbackFn(key, score, false, bestScore);
            }, 0);
            return;
        }

        var that = this;
        function setCallbackFn(jsonResponse, status, statusText)
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
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("LeaderboardManager.set failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
                              status,
                              that.set,
                              [key, score, callbackFn]);
            }
        }

        var dataSpec = {};
        dataSpec.score = score;
        dataSpec.gameSessionId = that.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/leaderboards/scores/set/' + key,
            method: 'POST',
            async: true,
            data : dataSpec,
            callback: setCallbackFn,
            encrypt: true
        });
    }
};
