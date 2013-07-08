/* This file was generated from TypeScript source tslib/assetcache.ts */




//
// AssetCache
//
var AssetCache = (function () {
    function AssetCache() { }
    AssetCache.version = 1;
    AssetCache.prototype.exists = function (key) {
        return this.cache.hasOwnProperty(key);
    };
    AssetCache.prototype.isLoading = function (key) {
        var cachedAsset = this.cache[key];
        if(cachedAsset) {
            return cachedAsset.isLoading;
        }
        return false;
    };
    AssetCache.prototype.request = function (key, params) {
        if(!key) {
            return null;
        }
        var cachedAsset = this.cache[key];
        if(cachedAsset) {
            cachedAsset.cacheHit = this.hitCounter;
            this.hitCounter += 1;
            return cachedAsset.asset;
        }
        cachedAsset = this.cache[key] = {
            cacheHit: this.hitCounter,
            asset: null,
            isLoading: true
        };
        this.hitCounter += 1;
        this.cacheSize += 1;
        if(this.cacheSize >= this.maxCacheSize) {
            var cache = this.cache;
            var oldestCacheHit = this.hitCounter;
            var oldestKey = null;
            var k;
            for(k in cache) {
                if(cache.hasOwnProperty(k)) {
                    if(cache[k].cacheHit < oldestCacheHit) {
                        oldestCacheHit = cache[k].cacheHit;
                        oldestKey = k;
                    }
                }
            }
            if(this.onDestroy) {
                this.onDestroy(oldestKey, cache[oldestKey].asset);
            }
            delete cache[oldestKey];
            this.cacheSize -= 1;
        }
        var that = this;
        this.onLoad(key, params, function onLoadedAssetFn(asset) {
            cachedAsset.cacheHit = that.hitCounter;
            cachedAsset.asset = asset;
            cachedAsset.isLoading = false;
            that.hitCounter += 1;
        });
        return null;
    };
    AssetCache.create = // Constructor function
    function create(cacheParams) {
        var assetCache = new AssetCache();
        assetCache.maxCacheSize = cacheParams.size || 64;
        assetCache.onLoad = cacheParams.onLoad;
        assetCache.onDestroy = cacheParams.onDestroy;
        assetCache.cacheSize = 0;
        assetCache.hitCounter = 0;
        assetCache.cache = {
        };
        return assetCache;
    };
    return AssetCache;
})();

