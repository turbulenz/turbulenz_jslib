// Copyright (c) 2011-2012 Turbulenz Limited
/*global window: false*/
/*jslint nomen: false*/



/*
 * An object that takes care of communication with the gamesite and, among
 * other things, replaces the deprecated 'osdlib' module.
 *
 * It wraps an EventEmitter instance that is stored on the page and provides
 * methods that manually display the 'loading'-flag, post certain events to
 * the page or request information about a player's settings.
 *
 */
var TurbulenzBridge = {
    _bridge: undefined,

    /**
     * Try to find an 'EventEmitter' object on the page and cache it.
     */
    _initInstance: function _initInstanceFn() {
        var Turbulenz = window.top.Turbulenz;

        if (Turbulenz && Turbulenz.Services)
        {
            var bridge = Turbulenz.Services.bridge;
            if (!bridge)
            {
                return;
            }

            this._bridge = bridge;

            this.emit = bridge.emit;
            this.addListener = bridge.addListener;
            this.setListener = bridge.setListener;
        }
    },

    isInitialised: function isInitialisedFn() {
        return this._bridge !== undefined;
    },

    emit: function emitFn() {},

    addListener: function addListenerFn() {},

    setListener: function setListenerFn() {},

    /**
     * Methods to signal the beginning and end of load/save processes.
     * This will display hints to the player and helps the page
     * to prioritize resources.
     */
    startLoading: function startLoadingFn() {
        this.emit('status.loading.start');
    },

    startSaving: function startSavingFn() {
        this.emit('status.saving.start');
    },

    stopLoading: function stopLoadingFn() {
        this.emit('status.loading.stop');
    },

    stopSaving: function stopSavingFn() {
        this.emit('status.saving.stop');
    },

    /**
     * These methods tell the gamesite the gameSession so it can
     * emit a heartbeat for the message server to detect.
     * gameSessionId - A string for identifying the current game session
     */
    createdGameSession: function createdGameSessionFn(gameSessionId) {
        this.emit('game.session.created', gameSessionId);
    },

    destroyedGameSession: function destroyedGameSessionFn(gameSessionId) {
        this.emit('game.session.destroyed', gameSessionId);
    },

    setGameSessionStatus: function setGameSessionStatusFn(gameSessionId, status) {
        this.emit('game.session.status', gameSessionId, status);
    },

    /**
     * Update a userbadge. Used by the BadgeManager
     */
    updateUserBadge: function updateUserBadgeFn(badge)
    {
        this.emit('userbadge.update', badge);
    },


    /**
     * Methods to signal changes of the viewport's aspect ratio to the page.
     */
    changeAspectRatio: function changeAspectRatioFn(ratio) {
        this.emit('change.viewport.ratio', ratio);
    },


    /**
     * Methods to set callbacks to react to events happening on the page.
     */
    setOnViewportHide: function setOnViewportHideFn(callback) {
        this.setListener('change.viewport.hide', callback);
    },

    setOnViewportShow: function setOnViewportShowFn(callback) {
        this.setListener('change.viewport.show', callback);
    },

    setOnFullscreenOn: function setOnFullscreenOnFn(callback) {
        this.setListener('change.viewport.fullscreen.on', callback);
    },

    setOnFullscreenOff: function setOnFullscreenOffFn(callback) {
        this.setListener('change.viewport.fullscreen.off', callback);
    },

    setOnMenuStateChange: function setOnMenuStateChangeFn(callback) {
        this.setListener('change.menu.state', callback);
    },

    setOnUserStateChange: function setOnUserStateChangeFn(callback) {
        this.setListener('change.user.state', callback);
    },

    setOnMultiplayerSessionJoinRequest: function setOnMultiplayerSessionJoinRequestFn(callback) {
        this.setListener('multiplayer.request.joinsession', callback);
    },


    /**
     * Methods to send trigger event-emission on the page. These prompt the  page to trigger
     * the aforementioned corresponding onXXXX methods.
     */
    triggerOnFullscreen: function triggerOnFullscreenQueryFn() {
        this.emit('trigger.viewport.fullscreen');
    },

    triggerOnViewportVisibility: function triggerOnViewportVisibilityQueryFn() {
        this.emit('trigger.viewport.visibility');
    },

    triggerOnMenuStateChange: function triggerOnMenuStateQueryFn() {
        this.emit('trigger.menu.state');
    },

    triggerOnUserStateChange: function triggerOnUserStateQueryFn() {
        this.emit('trigger.user.state');
    },


    /**
     * Methods to send requests for information to the page. These methods can be used to send
     * state-queries. They take a callback function and prompt the page to call it.
     */

    /**
     * callback - a function that takes a single boolean value that will be set to 'true' if the
     * viewport is in fullscreen.
     */
    queryFullscreen: function queryFullscreenFn(callback) {
        this.emit('query.viewport.fullscreen', callback);
    },
    /**
     * callback - a function that takes a single boolean value that will be set to 'true' if the
     * viewport is visible.
     */
    queryViewportVisibility: function queryViewportVisibilityFn(callback) {
        this.emit('query.viewport.visibility', callback);
    },
    /**
     * callback - a function that takes an object-representation of the current menu-state.
     */
    queryMenuState: function queryMenuStateFn(callback) {
        this.emit('query.menu.state', callback);
    },
    /**
     * callback - a function that takes an object-representation of the current state of the user's settings.
     */
    queryUserState: function queryUserStateFn(callback) {
        this.emit('query.user.state', callback);
    }
};

if (!TurbulenzBridge.isInitialised())
{
    TurbulenzBridge._initInstance();
}
