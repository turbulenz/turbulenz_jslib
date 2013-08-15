// Copyright (c) 2011 Turbulenz Limited

function OSD() {}
OSD.prototype =
{
    version : 1,

    startLoading: function startLoadingFn() {
        try
        {
            var doc = this.topLevelDocument;
            if (doc && doc.osdStartLoading)
            {
                doc.osdStartLoading();
            }
        }
        catch (exception) {}
    },

    startSaving: function startSavingFn() {
        try
        {
            var doc = this.topLevelDocument;
            if (doc && doc.osdStartSaving)
            {
                doc.osdStartSaving();
            }
        }
        catch (exception) {}
    },

    stopLoading: function stopLoadingFn() {
        try
        {
            var doc = this.topLevelDocument;
            if (doc && doc.osdStopLoading)
            {
                doc.osdStopLoading();
            }
        }
        catch (exception) {}
    },

    stopSaving: function stopSavingFn() {
        try
        {
            var doc = this.topLevelDocument;
            if (doc && doc.osdStopSaving)
            {
                doc.osdStopSaving();
            }
        }
        catch (exception) {}
    }
};

// Constructor function
OSD.create = function OSDCreateFn(args)
{
    var osdObject = new OSD();

    var topLevelWindow = window;
    var counter = 15;
    while (topLevelWindow.parent !== topLevelWindow && counter > 0)
    {
        topLevelWindow = topLevelWindow.parent;
        counter -= 1;
    }
    osdObject.topLevelDocument = topLevelWindow.document;
    return osdObject;
};
