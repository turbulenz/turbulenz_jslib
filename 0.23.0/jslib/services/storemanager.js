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

    getItems: function getItemsFn()
    {
        // sort items by index and add keys to item objects
        var items = this.items;
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

    updateBasket: function updateBasketFn(items)
    {
        if (items)
        {
            this.basket.items = items;
        }
        TurbulenzBridge.triggerBasketUpdate(JSON.stringify(this.basket.items));
    },

    addToBasket: function addToBasketFn(key, amount)
    {
        var item = this.items[key];
        if (!item ||
            Math.floor(amount) !== amount ||
            amount <= 0)
        {
            return false;
        }

        var basketItems = this.basket.items;
        var userItem = this.userItems[key];
        var userItemAmount = userItem && userItem.amount || 0;
        var newBasketAmount = amount;
        if (basketItems[key])
        {
            newBasketAmount = basketItems[key].amount + amount;
        }
        if (newBasketAmount > item.max - userItemAmount)
        {
            newBasketAmount = item.max - userItemAmount;
        }
        if (newBasketAmount <= 0)
        {
            return false;
        }

        basketItems[key] = {amount: newBasketAmount};

        this.updateBasket();
        return true;
    },

    removeFromBasket: function removeFromBasketFn(key, amount)
    {
        if (!this.items[key] ||
            Math.floor(amount) !== amount ||
            amount <= 0)
        {
            return false;
        }
        var basketItems = this.basket.items;
        if (!basketItems[key])
        {
            return true;
        }

        basketItems[key].amount -= amount;
        if (basketItems[key].amount <= 0)
        {
            delete basketItems[key];
        }
        this.updateBasket();
        return true;
    },

    emptyBasket: function emptyBasketFn()
    {
        this.updateBasket({});
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

        TurbulenzBridge.triggerShowConfirmPurchase();
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

StoreManager.create = function storeManagerCreateFn(requestHandler,
                                                    gameSession,
                                                    storeMetaRecieved,
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
    storeManager.consumeRequestToken = SessionToken.create();

    var calledMetaRecieved = false;

    storeManager.ready = false;

    storeManager.items = null;
    storeManager.basket = null;
    storeManager.userItems = null;

    function checkMetaRecieved()
    {
        if (!calledMetaRecieved &&
            storeManager.items !== null &&
            storeManager.basket !== null &&
            storeManager.userItems !== null)
        {
            if (storeMetaRecieved)
            {
                storeMetaRecieved(storeManager);
            }
            storeManager.ready = true;
            calledMetaRecieved = true;
        }
    }

    storeManager.requestUserItems(checkMetaRecieved);

    storeManager.onBasketUpdate = null;
    function onBasketUpdate(jsonBasket)
    {
        var basket = JSON.parse(jsonBasket);
        storeManager.basket = basket;
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
        storeManager.items = meta.items;
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
