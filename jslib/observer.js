// Copyright (c) 2010-2011 Turbulenz Limited

//
// Observer
//
function Observer() {}

Observer.prototype = {
    subscribe: function observerSubscribeFn(subscriber)
    {
        //Check for duplicates
        var subscribers = this.subscribers;
        var length = subscribers.length;
        for (var index = 0; index < length; index += 1)
        {
            if (subscribers[index] === subscriber)
            {
                return;
            }
        }

        subscribers.push(subscriber);
    },

    unsubscribe: function observerUnsubscribeFn(subscriber)
    {
        var subscribers = this.subscribers;
        var length = subscribers.length;
        for (var index = 0; index < length; index += 1)
        {
            if (subscribers[index] === subscriber)
            {
                subscribers.splice(index, 1);
                break;
            }
        }
    },

    unsubscribeAll: function observerUnsubscribeAllFn(subscriber)
    {
        this.subscribers.length = 0;
    },

    // this function can take any number of arguments
    // they are passed on to the subscribers
    notify: function observerNotifyFn()
    {
        // Note that the callbacks might unsubscribe
        var subscribers = this.subscribers;
        var length = this.subscribers.length;
        var index = 0;

        while (index < length)
        {
            subscribers[index].apply(null, arguments);
            if (subscribers.length === length)
            {
                index += 1;
            }
            else
            {
                length = subscribers.length;
            }
        }
    }
};

Observer.create = function observerCreateFn()
{
    var observer = new Observer();
    observer.subscribers = [];
    return observer;
};
