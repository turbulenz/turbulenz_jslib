// Copyright (c) 2011-2012 Turbulenz Limited

/*global TurbulenzServices: false*/
/*global TurbulenzEngine: false*/
/*global TurbulenzBridge: false*/
/*global SessionToken: false*/

//
// API
//
function StoreManager() {}
StoreManager.prototype =
{
    version : 1,

    requestUserItems: function requestUserItemsFn(callbackFn, errorCallbackFn)
    {
        var that = this;

        function requestUserItemsCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                that.userItems = jsonResponse.data.userItems;
                if (callbackFn)
                {
                    callbackFn(jsonResponse.userItems);
                }
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                if (errorCallback)
                {
                    errorCallback("StoreManager.requestUserItems failed with status " + status + ": " + jsonResponse.msg,
                                  status,
                                  that.requestUserItems,
                                  [callbackFn, errorCallbackFn]);
                }
            }
        }

        var dataSpec = {
            // replay attack token
            token: this.userItemsRequestToken.next(),
            gameSessionId: this.gameSessionId
        };

        this.service.request({
                url: '/api/v1/store/user/items/read/' + this.gameSession.gameSlug,
                method: 'GET',
                data: dataSpec,
                callback: requestUserItemsCallbackFn,
                requestHandler: this.requestHandler,
                encrypt: true
            });
    },

    getUserItems: function getUserItemsFn()
    {
        return this.userItems;
    },

    getItemsSortedDict: function getItemsSortedDictFn(items)
    {
        // sort items by index and add keys to item objects
        var itemsArray = [];
        var sortedItemsDict = {};

        var itemKey;
        var item;
        for (itemKey in items)
        {
            if (items.hasOwnProperty(itemKey))
            {
                item = items[itemKey];
                item.key = itemKey;
                itemsArray[item.index] = item;
            }
        }

        var i;
        var itemsLength = itemsArray.length;
        for (i = 0; i < itemsLength; i += 1)
        {
            item = itemsArray[i];
            sortedItemsDict[item.key] = item;
        }

        return sortedItemsDict;
    },

    getOfferings: function getOfferingsFn()
    {
        return this.getItemsSortedDict(this.offerings);
    },

    getResources: function getResourcesFn()
    {
        return this.getItemsSortedDict(this.resources);
    },

    updateBasket: function updateBasketFn(callback)
    {
        var token = null;
        if (callback)
        {
            token = this.basketUpdateRequestToken.next();
            this.updateBasketCallbacks[token] = callback;
        }

        var that = this;
        TurbulenzEngine.setTimeout(function yieldOnUpdate()
            {
                TurbulenzBridge.triggerBasketUpdate(JSON.stringify({
                        basketItems: that.basket.items,
                        token: token
                    }));
            }, 0);
    },

    addToBasket: function addToBasketFn(key, amount)
    {
        var offering = this.offerings[key];
        if (!offering ||
            !offering.available ||
            Math.floor(amount) !== amount ||
            amount <= 0)
        {
            return false;
        }

        var resources = this.resources;
        function isOwnOffering(offering)
        {
            var outputKey;
            var output = offering.output;
            for (outputKey in output)
            {
                if (output.hasOwnProperty(outputKey))
                {
                    if (resources[outputKey].type !== 'own')
                    {
                        return false;
                    }
                }
            }
            return true;
        }

        var userItems = this.userItems;
        function allOutputOwned(offering)
        {
            var outputKey;
            var output = offering.output;
            for (outputKey in output)
            {
                if (output.hasOwnProperty(outputKey))
                {
                    if (!userItems.hasOwnProperty(outputKey) ||
                        userItems[outputKey].amount === 0)
                    {
                        return false;
                    }
                }
            }
            return true;
        }

        var basketItems = this.basket.items;
        var oldBasketAmount = 0;
        if (basketItems[key])
        {
            oldBasketAmount = basketItems[key].amount;
        }
        else
        {
            oldBasketAmount = 0;
        }
        var newBasketAmount = oldBasketAmount + amount;
        var ownOffering = isOwnOffering(offering);
        if (ownOffering && newBasketAmount > 1)
        {
            newBasketAmount = 1;
            if (oldBasketAmount === 1)
            {
                // no change made so return false
                return false;
            }
        }
        if (newBasketAmount <= 0 || (ownOffering && allOutputOwned(offering)))
        {
            return false;
        }

        basketItems[key] = {amount: newBasketAmount};
        return true;
    },

    removeFromBasket: function removeFromBasketFn(key, amount)
    {
        if (!this.offerings[key] ||
            Math.floor(amount) !== amount ||
            amount <= 0)
        {
            return false;
        }
        var basketItem = this.basket.items[key];
        if (!basketItem || basketItem.amount <= 0)
        {
            return false;
        }

        var newAmount = basketItem.amount - amount;
        if (newAmount <= 0)
        {
            delete this.basket.items[key];
        }
        else
        {
            this.basket.items[key] = {amount: newAmount};
        }
        return true;
    },

    emptyBasket: function emptyBasketFn()
    {
        this.basket.items = {};
    },

    isBasketEmpty: function isBasketEmptyFn()
    {
        var key;
        var basketItems = this.basket.items;
        for (key in basketItems)
        {
            if (basketItems.hasOwnProperty(key) && basketItems[key].amount > 0)
            {
                return false;
            }
        }
        return true;
    },

    showConfirmPurchase: function showConfirmPurchaseFn()
    {
        if (this.isBasketEmpty())
        {
            return false;
        }
        this.updateBasket(function showConfirmPurchaseBasketUpdate()
            {
                TurbulenzBridge.triggerShowConfirmPurchase();
            });
        return true;
    },

    consume: function consumeFn(key, consumeAmount, callbackFn, errorCallbackFn)
    {
        var that = this;
        function consumeItemsCallbackFn(jsonResponse, status)
        {
            if (status === 200)
            {
                that.userItems = jsonResponse.data.userItems;
                if (callbackFn)
                {
                    callbackFn(jsonResponse.data.consumed);
                }

                TurbulenzBridge.triggerUserStoreUpdate(JSON.stringify(that.userItems));
            }
            else
            {
                var errorCallback = errorCallbackFn || that.errorCallbackFn;
                if (errorCallback)
                {
                    errorCallback("StoreManager.consume failed with status " + status + ": " + jsonResponse.msg,
                                  status,
                                  that.consume,
                                  [callbackFn, errorCallbackFn]);
                }
            }
        }

        var dataSpec = {
            // replay attack token
            token: this.consumeRequestToken.next(),
            gameSessionId: this.gameSessionId,
            key: key,
            consume: consumeAmount
        };

        this.service.request({
                url: '/api/v1/store/user/items/consume',
                method: 'POST',
                data: dataSpec,
                callback: consumeItemsCallbackFn,
                requestHandler: this.requestHandler,
                encrypt: true
            });
    }
};

// backwards compatibility
StoreManager.prototype.getItems = StoreManager.prototype.getOfferings;

StoreManager.create = function storeManagerCreateFn(requestHandler,
                                                    gameSession,
                                                    storeMetaReceived,
                                                    errorCallbackFn)
{
    if (!TurbulenzServices.available())
    {
        // Call error callback on a timeout to get the same behaviour as the ajax call
        TurbulenzEngine.setTimeout(function () {
                if (errorCallbackFn)
                {
                    errorCallbackFn('TurbulenzServices.createStoreManager requires Turbulenz services');
                }
            }, 0);
        return null;
    }

    var storeManager = new StoreManager();

    storeManager.gameSession = gameSession;
    storeManager.gameSessionId = gameSession.gameSessionId;
    storeManager.errorCallbackFn = errorCallbackFn || TurbulenzServices.defaultErrorCallback;
    storeManager.service = TurbulenzServices.getService('store');
    storeManager.requestHandler = requestHandler;

    storeManager.userItemsRequestToken = SessionToken.create();
    storeManager.basketUpdateRequestToken = SessionToken.create();
    storeManager.consumeRequestToken = SessionToken.create();

    var calledMetaReceived = false;

    storeManager.ready = false;

    storeManager.offerings = null;
    storeManager.resources = null;
    storeManager.basket = null;
    storeManager.userItems = null;

    function checkMetaRecieved()
    {
        if (!calledMetaReceived &&
            storeManager.offerings !== null &&
            storeManager.resources !== null &&
            storeManager.basket !== null &&
            storeManager.userItems !== null)
        {
            if (storeMetaReceived)
            {
                storeMetaReceived(storeManager);
            }
            storeManager.ready = true;
            calledMetaReceived = true;
        }
    }

    storeManager.requestUserItems(checkMetaRecieved);

    storeManager.onBasketUpdate = null;
    storeManager.updateBasketCallbacks = {};
    function onBasketUpdate(jsonParams)
    {
        var basket = JSON.parse(jsonParams);
        var token;
        if (basket.token)
        {
            token = basket.token;
            delete basket.token;
        }

        storeManager.basket = basket;
        if (token && storeManager.updateBasketCallbacks.hasOwnProperty(token))
        {
            storeManager.updateBasketCallbacks[token]();
            delete storeManager.updateBasketCallbacks[token];
        }
        if (storeManager.onBasketUpdate)
        {
            storeManager.onBasketUpdate(basket);
        }

        checkMetaRecieved();
    }
    TurbulenzBridge.setOnBasketUpdate(onBasketUpdate);
    TurbulenzBridge.triggerBasketUpdate();

    function onStoreMeta(jsonMeta)
    {
        var meta = JSON.parse(jsonMeta);
        storeManager.currency = meta.currency;
        storeManager.offerings = meta.items || meta.offerings;
        storeManager.resources = meta.resources;
        checkMetaRecieved();
    }
    TurbulenzBridge.setOnStoreMeta(onStoreMeta);
    TurbulenzBridge.triggerFetchStoreMeta();

    storeManager.onSitePurchaseConfirmed = null;
    function onSitePurchaseConfirmed()
    {
        function gotNewItems()
        {
            if (storeManager.onSitePurchaseConfirmed)
            {
                storeManager.onSitePurchaseConfirmed();
            }
        }
        storeManager.requestUserItems(gotNewItems);
    }
    TurbulenzBridge.setOnPurchaseConfirmed(onSitePurchaseConfirmed);

    storeManager.onSitePurchaseRejected = null;
    function onSitePurchaseRejected()
    {
        if (storeManager.onSitePurchaseRejected)
        {
            storeManager.onSitePurchaseRejected();
        }
    }
    TurbulenzBridge.setOnPurchaseRejected(onSitePurchaseRejected);

    return storeManager;
};
