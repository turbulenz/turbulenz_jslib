// Copyright (c) 2009-2011 Turbulenz Limited
/*global TurbulenzGamesiteBridge*/
//
// API
//
//badges is created by Turbulenzservices.createBadges
function BadgeManager() {
}

BadgeManager.prototype =
{
    version : 1,
    // list all badges (just queries the yaml file)
    listUserBadges: function userbadgesListFn(callbackFn, errorCallbackFn)
    {
        var that = this;
        function cb(jsonResponse, status, statusText)
        {
            if (status === 200)
            {
                callbackFn(jsonResponse.data);
            }
            else if (status === 404)
            {
                callbackFn(null);
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("Badges.listUserBadges failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
                              status,
                              [callbackFn]);
            }
        }

        var dataSpec = {};
        dataSpec.gameSessionId = that.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/badges/progress/read/' + that.gameSession.gameSlug,
            method: 'GET',
            data : dataSpec,
            async: true,
            callback: cb
        });
    },

    awardUserBadge: function awardUserBadgeFn(badge_key, callbackFn, errorCallbackFn)
    {
        this.addUserBadge(badge_key, null, callbackFn, errorCallbackFn);
    },

    updateUserBadgeProgress: function updateUserBadgeProgressFn(badge_key, current, callbackFn, errorCallbackFn)
    {
        if (current && typeof current === 'number')
        {
            this.addUserBadge(badge_key, current, callbackFn, errorCallbackFn);
        }
        else
        {
            errorCallbackFn("Badges.updateUserBadgeProgress expects a numeric value for current",
                          400,
                          [badge_key, current, callbackFn]);
        }
    },

    // add a badge to a user (gets passed a badge and a current level over POST, the username is taken from the environment)
    addUserBadge: function badgesAddFn(badge_key, current, callbackFn, errorCallbackFn)
    {
        var that = this;
        function cb(jsonResponse, status, statusText)
        {
            if (status === 200)
            {
                var userbadge = jsonResponse.data;
                TurbulenzGamesiteBridge.emit('UserBadge.update', userbadge);
                callbackFn(userbadge);
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("Badges.addUserBadge failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
                              status,
                              [badge_key, current, callbackFn]);
            }
        }

        var dataSpec = {};
        dataSpec.gameSessionId = that.gameSessionId;
        dataSpec.badge_key = badge_key;

        if (current)
        {
            dataSpec.current = current;
        }

        Utilities.ajax({
            url: '/api/v1/badges/progress/add/' + that.gameSession.gameSlug,
            method: 'POST',
            async: true,
            data : dataSpec,
            callback: cb,
            encrypt: true
        });
    },

    // list all badges (just queries the yaml file)
    listBadges: function badgesListFn(callbackFn, errorCallbackFn)
    {

        var that = this;
        function cb(jsonResponse, status, statusText)
        {
            if (status === 200)
            {
                callbackFn(jsonResponse.data);
            }
            else if (status === 404)
            {
                callbackFn(null);
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                errorCallback("Badges.listBadges failed with status " + status + " " + statusText + ": " + jsonResponse.msg,
                              status,
                              [callbackFn]);
            }
        }

        var dataSpec = {};
        dataSpec.gameSessionId = that.gameSessionId;

        Utilities.ajax({
            url: '/api/v1/badges/read/' + that.gameSession.gameSlug,
            method: 'GET',
            async: true,
            data: dataSpec,
            callback: cb
        });
    },

    errorCallbackFn: function errorCallbackFnx() {
        console.log(Array.prototype.slice.call(arguments));
    }

};
