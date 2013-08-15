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

    // callbackFn is for testing only!
    // It will not be called if destroy is called in TurbulenzEngine.onUnload
    destroy: function gameSessionDestroyFn(callbackFn)
    {
        if (this.gameSessionId)
        {
            Utilities.ajax({
                url: '/api/v1/games/destroy-session',
                method: 'POST',
                data: {'gameSessionId': this.gameSessionId},
                callback: callbackFn,
                requestHandler: this.requestHandler
            });

            TurbulenzBridge.destroyedGameSession(this.gameSessionId);
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
