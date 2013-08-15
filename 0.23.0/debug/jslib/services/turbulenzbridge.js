// Copyright (c) 2011-2012 Turbulenz Limited
/*global window: false*/
/*global TurbulenzServices: false*/
/*jshint nomen: false*/

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
            // TODO can remove all of these or's after gamesite and hub updates
            this.on = bridge.gameListenerOn || bridge.addListener || bridge.setListener;

            // we cant use off yet becuase the function recieved on the other VM is re-wrapped each time
            //this.off = bridge.gameListenerOff;
            // Legacy functions addListener/setListener
            this.addListener = bridge.gameListenerOn || bridge.addListener || bridge.setListener;
            this.setListener = bridge.gameListenerOn || bridge.setListener;
        }

        if (typeof TurbulenzServices !== 'undefined')
        {
            TurbulenzServices.addBridgeEvents();
        }
    },

    isInitialised: function isInitialisedFn() {
        return this._bridge !== undefined;
    },

    emit: function emitFn() {},

    on: function onFn() {},

    //off: function offFn() {},

    addListener: function addListenerFn() {},

    setListener: function setListenerFn() {},

    /**
     * Message that passes game configuration information from the hosting site
     */
    setOnReceiveConfig: function setOnReceiveConfigFn(callback) {
        this.on('config.set', callback);
    },
    triggerRequestConfig: function triggerRequestConfigFn() {
        this.emit('config.request');
    },

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

    setGameSessionInfo: function setGameSessionInfoFn(info) {
        this.emit('game.session.info', info);
    },

    /**
     * Update a userbadge. Used by the BadgeManager
     */
    updateUserBadge: function updateUserBadgeFn(badge)
    {
        this.emit('userbadge.update', badge);
    },

    /**
     * Update a leaderboard. Used by the LeaderboardManager
     */
    updateLeaderBoard: function updateLeaderBoardFn(scoreData)
    {
        this.emit('leaderboards.update', scoreData);
    },


    /**
     * Handle multiplayer join events
     */
    setOnMultiplayerSessionToJoin: function setOnMultiplayerSessionToJoinFn(callback) {
        this.on('multiplayer.session.join', callback);
    },

    triggerJoinedMultiplayerSession: function triggerJoinedMultiplayerSessionFn(session) {
        this.emit('multiplayer.session.joined', session);
    },

    triggerLeaveMultiplayerSession: function triggerLeaveMultiplayerSessionFn(sessionId) {
        this.emit('multiplayer.session.leave', sessionId);
    },

    triggerMultiplayerSessionMakePublic: function triggerMultiplayerSessionMakePublicFn(sessionId) {
        this.emit('multiplayer.session.makepublic');
    },

    /**
     * Handle store basket events
     */
    setOnBasketUpdate: function setOnBasketUpdateFn(callback) {
        this.on('basket.site.update', callback);
    },

    triggerBasketUpdate: function triggerBasketUpdateFn(basket) {
        this.emit('basket.game.update', basket);
    },

    triggerUserStoreUpdate: function triggerUserStoreUpdateFn(items) {
        this.emit('store.user.update', items);
    },

    setOnPurchaseConfirmed: function setOnPurchaseConfirmedFn(callback) {
        this.on('purchase.confirmed', callback);
    },

    setOnPurchaseRejected: function setOnPurchaseRejectedFn(callback) {
        this.on('purchase.rejected', callback);
    },

    triggerShowConfirmPurchase: function triggerShowConfirmPurchaseFn() {
        this.emit('purchase.show.confirm');
    },

    triggerFetchStoreMeta: function triggerFetchStoreMetaFn() {
        this.emit('fetch.store.meta');
    },

    setOnStoreMeta: function setOnStoreMetaFn(callback) {
        this.on('store.meta.v2', callback);
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
        this.on('change.viewport.hide', callback);
    },

    setOnViewportShow: function setOnViewportShowFn(callback) {
        this.on('change.viewport.show', callback);
    },

    setOnFullscreenOn: function setOnFullscreenOnFn(callback) {
        this.on('change.viewport.fullscreen.on', callback);
    },

    setOnFullscreenOff: function setOnFullscreenOffFn(callback) {
        this.on('change.viewport.fullscreen.off', callback);
    },

    setOnMenuStateChange: function setOnMenuStateChangeFn(callback) {
        this.on('change.menu.state', callback);
    },

    setOnUserStateChange: function setOnUserStateChangeFn(callback) {
        this.on('change.user.state', callback);
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
