// Copyright (c) 2009-2012 Turbulenz Limited

/*global Utilities: false*/

function AssetTracker() {}
AssetTracker.prototype =
{
    version : 1,

    getLoadedCount : function assetTrackerGetLoadedCountFn()
    {
        return this.assetsLoadedCount;
    },

    getLoadingProgress : function assetTrackerGetLoadingProgressFn()
    {
        return this.loadingProgress;
    },

    getNumberAssetsToLoad : function assetTrackerGetNumberAssetsToLoadFn()
    {
        return this.numberAssetsToLoad;
    },

    eventOnAssetLoadedCallback : function assetTrackerEventOnAssetLoadedCallbackFn(event)
    {
        var numberAssetsToLoad = this.numberAssetsToLoad;

        this.assetsLoadedCount += 1;

        if (numberAssetsToLoad)
        {
            var progress = this.assetsLoadedCount / numberAssetsToLoad;

            this.loadingProgress = (progress > 1.0) ? 1.0:  progress;
        }

        if (this.displayLog)
        {
            Utilities.log(event.name + " (Asset Number " + this.assetsLoadedCount + ") Progress : " + this.loadingProgress);
        }

        if (this.callback)
        {
            this.callback();
        }
    },

    setCallback : function assetTrackerSetCallbackFn(callback)
    {
        this.callback = callback;
    },

    setNumberAssetsToLoad : function assetTrackerSetNumberAssetsToLoadFn(numberAssetsToLoad)
    {
        if ((numberAssetsToLoad) && (this.numberAssetsToLoad !== numberAssetsToLoad))
        {
            this.numberAssetsToLoad = numberAssetsToLoad;

            var progress = this.assetsLoadedCount / numberAssetsToLoad;

            this.loadingProgress = (progress > 1.0) ? 1.0:  progress;
        }

        if (this.callback)
        {
            this.callback();
        }
    }
};

// Constructor function
AssetTracker.create = function assetTrackerCreateFn(numberAssetsToLoad, displayLog)
{
    var f = new AssetTracker();

    f.assetsLoadedCount = 0;
    f.loadingProgress = 0;
    f.numberAssetsToLoad = 0;
    f.callback = null;
    f.displayLog = displayLog;

    if (numberAssetsToLoad)
    {
        f.numberAssetsToLoad = numberAssetsToLoad;
    }

    f.eventOnLoadHandler = function assetTrackerEventOnLoadHandlerFn(event)
    {
        f.eventOnAssetLoadedCallback(event);
    };
    
    return f;
};
