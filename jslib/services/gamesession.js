// Copyright (c) 2011-2012 Turbulenz Limited

/*global Utilities: false*/
/*global TurbulenzBridge: false*/
/*global TurbulenzEngine: false*/

//
// API
//
function GameSession() {}
GameSession.prototype =
{
    version : 1,

    setStatus: function gameSessionSetStatusFn(status)
    {
        if (this.destroyed || this.status === status)
        {
            return;
        }

        this.status = status;
        TurbulenzBridge.setGameSessionStatus(this.gameSessionId, status);
    },

    // callbackFn is for testing only!
    // It will not be called if destroy is called in TurbulenzEngine.onUnload
    destroy: function gameSessionDestroyFn(callbackFn)
    {
        TurbulenzEngine.clearInterval(this.intervalID);

        if (this.gameSessionId)
        {
            // we can't wait for the callback as the browser doesn't
            // call async callbacks after onbeforeunload has been called
            TurbulenzBridge.destroyedGameSession(this.gameSessionId);
            this.destroyed = true;

            Utilities.ajax({
                url: '/api/v1/games/destroy-session',
                method: 'POST',
                data: {'gameSessionId': this.gameSessionId},
                callback: callbackFn,
                requestHandler: this.requestHandler
            });
        }
        else
        {
            if (callbackFn)
            {
                TurbulenzEngine.setTimeout(callbackFn, 0);
            }
        }
    },
    
    /**
     * Handle player metadata
     */
    setTeamInfo : function gameSessionSetTeamInfoFn(teamList)
    {
        this.info.sessionData.teamList = teamList;
    },
    
    setPlayerInfo : function gameSessionSetPlayerInfoFn(playerId, data)
    {
        var playerData = this.info.playerSessionData[playerId];
        if (!playerData)
        {
            playerData = this.info.playerSessionData[playerId] = {};
        }
        
        for (var type in data)
        {
            if (data.hasOwnProperty(type))
            {
                if (!this.templatePlayerData.hasOwnProperty(type))
                {
                    throw "unknown session data property " + type;
                }
                playerData[type] = data[type];
            }
        }
    },
    
    removePlayerInfo : function gameSessionRemovePlayerInfoFn(playerId)
    {
        delete this.info.playerSessionData[playerId];
    },
    
    clearAllPlayerInfo : function clearAllPlayerInfoFn()
    {
        this.info.playerSessionData = {};
    },
    
    update: function updateFn()
    {
        this.info.sessionData.gameSessionId = this.gameSessionId;
        TurbulenzBridge.setGameSessionInfo(JSON.stringify(this.info));
    }
};

GameSession.create = function gameSessionCreateFn()
{
    var game = new GameSession();
    
    game.info = {
        sessionData: {},
        playerSessionData: {}
    };
    
    game.templatePlayerData = {
        team: null,
        color: null,
        status: null,
        rank: null,
        score: null,
        sortkey: null
    };

    game.intervalID = TurbulenzEngine.setInterval(function () {
        game.update();
    }, 500);
    return game;
};
