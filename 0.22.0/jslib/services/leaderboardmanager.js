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

    getTypes: {
        top: 'top',
        near: 'near',
        above: 'above',
        below: 'below'
    },

    maxGetSize: 32,

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

    getRaw: function getRawFn(key, spec, callbackFn, errorCallbackFn)
    {
        var that = this;
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        function getCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                var data = jsonResponse.data;
                callbackFn(data);
            }
            else
            {
                errorCallback("LeaderboardManager.get failed with status " + status + ": " + jsonResponse.msg,
                              status,
                              that.get,
                              [key, spec, callbackFn]);
            }
        }

        this.service.request({
            url: '/api/v1/leaderboards/scores/read/' + that.gameSession.gameSlug + '/' + key,
            method: 'GET',
            data: spec,
            callback: getCallbackFn,
            requestHandler: this.requestHandler
        });
        return true;
    },

    get: function leaderboardManagerGetFn(key, spec, callbackFn, errorCallbackFn)
    {
        var errorCallback = errorCallbackFn || this.errorCallbackFn;
        if (!this.meta)
        {
            errorCallback("The leaderboard manager failed to initialize properly.");
            return false;
        }

        var meta = this.meta[key];
        if (!meta)
        {
            errorCallback("No leaderboard with the name '" + key + "' exists.");
            return false;
        }

        var dataSpec = {};

        // backwards compatibility
        if (spec.numNear)
        {
            dataSpec.type = this.getTypes.near;
            dataSpec.size = spec.numNear * 2 + 1;
        }
        if (spec.numTop)
        {
            dataSpec.type = this.getTypes.top;
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
        if (dataSpec.size > this.maxGetSize)
        {
            throw new Error('Leaderboard get request size must be smaller than ' + this.maxGetSize);
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

        var that = this;
        function callbackWrapper(data)
        {
            callbackFn(key, LeaderboardResult.create(that, key, dataSpec, data));
        }

        return this.getRaw(key, dataSpec, callbackWrapper, errorCallbackFn);
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

    requestSize: 64,

    computeOverlap: function computeOverlapFn()
    {
        // calculates the number of scores that the leaderboard results have overlapped
        // this only happens at the end of the leaderboards
        var results = this.results;
        var overlap = 0;
        if (results.top || results.bottom)
        {
            var ranking = results.ranking;
            var rankingLength = ranking.length;
            var sortBy = this.leaderboardManager.meta[this.key].sortBy;
            var aboveType = this.leaderboardManager.getTypes.above;
            var specScore = results.spec.score;
            var specTime = results.spec.time;

            var i;
            for (i = 0; i < rankingLength; i += 1)
            {
                var rank = ranking[i];
                // find the overlapping point where the score was requested
                if (rank.score * sortBy < specScore * sortBy ||
                    (rank.score === specScore && rank.time >= specTime))
                {
                    // get the distance from end of the board to score requested
                    // add 1 becuase the above/below requests are exclusive of the requested score
                    if (results.spec.type === aboveType)
                    {
                        overlap = rankingLength - i;
                    }
                    else
                    {
                        overlap = i + 1;
                    }
                    break;
                }
            }
        }
        results.overlap = overlap;
    },

    getPageOffset: function getPageBelowOffsetFn(type, offsetIndex, callbackFn, errorCallbackFn)
    {
        var offsetScore = this.results.ranking[offsetIndex];
        if (!offsetScore)
        {
            TurbulenzEngine.setTimeout(callbackFn, 0);
            return false;
        }

        var newSpec = {
            type: type,
            score: offsetScore.score,
            time: offsetScore.time,
            size: this.requestSize,
            // remeber to map to backend lowercase format!
            friendsonly: this.spec.friendsOnly && 1 || 0
        };

        var that = this;
        function parseResults(data)
        {
            that.results = that.parseResults(that.key, newSpec, data);
            that.computeOverlap();
            callbackFn();
        }

        this.leaderboardManager.getRaw(this.key, newSpec, parseResults, errorCallbackFn);
        return true;
    },

    viewOperationBegin: function viewOperationBeginFn()
    {
        // lock the view object so not other page/scroll calls can be made
        if (this.viewLock)
        {
            return false;
        }
        this.viewLock = true;
        return true;
    },

    viewOperationEnd: function viewOperationEndFn(callbackFn)
    {
        // unlock the view object so other page/scroll calls can be made
        this.viewLock = false;

        var that = this;
        function callbackWrapperFn()
        {
            callbackFn(that.key, that);
        }

        if (callbackFn)
        {
            TurbulenzEngine.setTimeout(callbackWrapperFn, 0);
        }
    },

    wrapViewOperationError: function getViewOperationErrorCallbackFn(errorCallbackFn)
    {
        var that = this;
        return function errorWrapper(errorMsg, httpStatus, calledByFn, calledByParams)
        {
            // unlock the view object so other page/scroll calls can be made
            that.viewLock = false;
            errorCallbackFn(errorMsg, httpStatus, calledByFn, calledByParams);
        };
    },

    moveUp: function moveUpFn(offset, callbackFn, errorCallbackFn)
    {
        if (!this.viewOperationBegin())
        {
            return false;
        }

        var that = this;
        function newResult()
        {
            var results = that.results;
            that.viewTop = Math.max(0, results.ranking.length - that.viewSize - results.overlap);
            that.invalidView = true;
            that.viewOperationEnd(callbackFn);
        }

        if (this.viewTop - offset < 0)
        {
            if (this.results.top)
            {
                this.viewTop = 0;
                this.viewOperationEnd(callbackFn);
            }
            else
            {
                this.getPageOffset(this.leaderboardManager.getTypes.above,
                                   this.viewTop + this.viewSize - offset,
                                   newResult,
                                   this.wrapViewOperationError(errorCallbackFn));
            }
            return;
        }

        this.viewTop -= offset;
        this.invalidView = true;
        this.viewOperationEnd(callbackFn);
    },

    moveDown: function moveDownFn(offset, callbackFn, errorCallbackFn)
    {
        if (!this.viewOperationBegin())
        {
            return false;
        }

        var that = this;
        function newResult()
        {
            var results = that.results;
            that.viewTop = Math.min(results.overlap, Math.max(results.ranking.length - that.viewSize, 0));
            that.invalidView = true;
            that.viewOperationEnd(callbackFn);
        }

        var results = this.results;
        if (this.viewTop + this.viewSize + offset > results.ranking.length)
        {
            if (results.bottom)
            {
                var orginalViewTop = this.viewTop;
                this.viewTop = Math.max(results.ranking.length - this.viewSize, 0);
                this.invalidView = this.invalidView || (this.viewTop !== orginalViewTop);
                this.viewOperationEnd(callbackFn);
            }
            else
            {
                this.getPageOffset(this.leaderboardManager.getTypes.below,
                                   this.viewTop + offset - 1,
                                   newResult,
                                   this.wrapViewOperationError(errorCallbackFn));
            }
            return true;
        }

        this.viewTop += offset;
        this.invalidView = true;
        this.viewOperationEnd(callbackFn);
        return true;
    },

    pageUp: function pageUpFn(callbackFn, errorCallbackFn)
    {
        return this.moveUp(this.viewSize, callbackFn, errorCallbackFn);
    },

    pageDown: function pageDownFn(callbackFn, errorCallbackFn)
    {
        return this.moveDown(this.viewSize, callbackFn, errorCallbackFn);
    },

    scrollUp: function scrollUpFn(callbackFn, errorCallbackFn)
    {
        return this.moveUp(1, callbackFn, errorCallbackFn);
    },

    scrollDown: function scrollDownFn(callbackFn, errorCallbackFn)
    {
        return this.moveDown(1, callbackFn, errorCallbackFn);
    },

    getView: function getViewFn()
    {
        if (this.invalidView)
        {
            var viewTop = this.viewTop;
            var viewSize = this.viewSize;
            var results = this.results;
            var ranking = results.ranking;
            var rankingLength = ranking.length;

            var playerIndex = null;
            if (results.playerIndex !== undefined)
            {
                playerIndex = results.playerIndex - viewTop;
                if (playerIndex < 0 || playerIndex >= viewSize)
                {
                    playerIndex = null;
                }
            }

            this.view = {
                ranking: ranking.slice(viewTop, Math.min(viewTop + viewSize, rankingLength)),
                top: results.top && (viewTop === 0),
                bottom: results.bottom && (viewTop >= rankingLength - viewSize),
                player: results.player,
                playerIndex: playerIndex
            };
        }
        return this.view;
    },

    parseResults: function parseResultsFn(key, spec, data)
    {
        var results = {
            spec: spec,
            overlap: null
        };

        var player = results.player = data.player;
        var ranking = results.ranking = data.ranking;

        var entities = data.entities;
        var playerUsername;

        if (player)
        {
            this.leaderboardManager.meta[key].bestScore = player.score;
            if (entities)
            {
                player.user = entities[player.user];
            }
            playerUsername = player.user.username;
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

            if (rank.user.username === playerUsername)
            {
                results.playerIndex = i;
            }
        }

        results.top = data.top;
        results.bottom = data.bottom;

        return results;
    }
};

LeaderboardResult.create = function LeaderboardResultCreate(leaderboardManager, key, spec, data)
{
    var leaderboardResult = new LeaderboardResult();

    leaderboardResult.leaderboardManager = leaderboardManager;

    leaderboardResult.key = key;

    // patch up friendsOnly for frontend
    spec.friendsOnly = spec.friendsonly;
    delete spec.friendsonly;
    leaderboardResult.spec = spec;

    var results = leaderboardResult.results = leaderboardResult.parseResults(key, spec, data);

    leaderboardResult.viewTop = 0;
    leaderboardResult.viewSize = spec.size;
    // lock to stop multiple synchronous view operations
    // as that will have unknown consequences
    leaderboardResult.viewLock = false;
    // for lazy evaluation
    leaderboardResult.view = {
        player: results.player,
        ranking: results.ranking,
        playerIndex: results.playerIndex,
        top: results.top,
        bottom: results.bottom
    };
    leaderboardResult.invalidView = false;

    return leaderboardResult;
};
