// Copyright (c) 2011 Turbulenz Limited

//
// API
//
function GameSession() {}
GameSession.prototype =
{
    version : 1,

    destroy: function gameSessionDestroyFn(callbackFn)
    {
        if (this.gameSessionId)
        {
            Utilities.ajax({
                url: '/api/v1/games/destroy-session',
                method: 'POST',
                async: true,
                data: {'gameSessionId': this.gameSessionId},
                callback: callbackFn
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
