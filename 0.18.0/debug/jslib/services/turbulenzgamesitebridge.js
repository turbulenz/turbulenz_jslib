// Copyright (c) 2010-2011 Turbulenz Limited
/*global window: false*/
/*jslint nomen: false*/

//an object that takes care of communication with the gamesite.
// The are  Eventemitters registered under window.document._turbulenzGamesiteBridge.Events
// then call emit to emit events
function TurbulenzGamesiteBridge(gameSession)
{
    this.gameSession = gameSession;
    var doc = this._getGamesiteDocument();

    if (doc._turbulenzGamesiteBridge)
    {
        var bridge = doc._turbulenzGamesiteBridge;
        doc.TurbulenzEngine = doc.getElementById('turbulenz_game_engine_object');
        //var origUnload = doc.TurbulenzEngine.onunload;
        //doc.TurbulenzEngine.onunload = function () {
        //    //we can still emit the unload event, which might be useful
        //    bridge.Events.emit('unload');
        //    if (origUnload) origUnload.apply(doc.TurbulenzEngine, arguments)
        //};
        this.Events = bridge.Events;
        // bridge.Events.emit('ready'); //bridge events exists on the gamesite an is an eventemitter
    }
}

TurbulenzGamesiteBridge.prototype = {
    version: 1,

    _getGamesiteDocument: function _getGamesiteDocumentFn() {
        var topLevelWindow = window;
        var counter = 15;
        while (topLevelWindow.parent !== topLevelWindow && counter > 0)
        {
            topLevelWindow = topLevelWindow.parent;
            counter -= 1;
        }
        this.doc = topLevelWindow.document;
        return this.doc;
    },

    emit: function emitFn(event, arg) {
        if (this.Events) {
            this.Events.emit(event, arg);
        }
    }
};

// Singleton function
var tgsObject;

TurbulenzGamesiteBridge.getSingleton = function TurbulenzGamesiteBridgeCreateFn(gameSession)
{
    if (!tgsObject)
    {
        tgsObject = new TurbulenzGamesiteBridge(gameSession);
    }
    return tgsObject;
};

TurbulenzGamesiteBridge.emit = function TurbulenzGamesiteBridgeEmitFn(args)
{
    //first emit will lazily create the singleton
    TurbulenzGamesiteBridge.getSingleton().emit.apply(tgsObject, arguments);
};
