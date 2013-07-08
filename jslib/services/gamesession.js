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
        if (this.status !== status)
        {
            this.status = status;
            TurbulenzBridge.setGameSessionStatus(this.gameSessionId, status);
        }
    },

    // callbackFn is for testing only!
    // It will not be called if destroy is called in TurbulenzEngine.onUnload
    destroy: function gameSessionDestroyFn(callbackFn)
    {
        if (this.gameSessionId)
        {
            TurbulenzBridge.destroyedGameSession(this.gameSessionId);

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
    }
};
