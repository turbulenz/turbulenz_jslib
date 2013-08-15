// Copyright (c) 2011 Turbulenz Limited

/*global TurbulenzEngine*/
/*global Observer*/

function RequestHandler() {}
RequestHandler.prototype =
{
    reasonConnectionLost: 0,
    reasonServiceBusy: 1,

    retryExponential: function requestHandlerExponentialRetryFn(callContext, requestFn, status)
    {
        if (!this.notifiedConnectionLost &&
            TurbulenzEngine.time - this.connectionLostTime > (this.notifyTime * 0.001))
        {
            //TurbulenzGamesiteBridge.emit('TurbulenzServices.connectionLost');
            this.notifiedConnectionLost = true;

            var reason;
            if (status === 0)
            {
                reason = this.reasonConnectionLost;
            }
            else
            {
                reason = this.reasonServiceBusy;
            }
            callContext.reason = reason;
            this.onRequestTimeout(reason, callContext);
        }

        // only the first request with a lost connection continues
        // all following requests wait for a reconnection
        if (this.connected)
        {
            this.connectionLostTime = TurbulenzEngine.time;
            this.notifiedConnectionLost = false;
            this.connected = false;
            this.reconnectTest = callContext;

            callContext.status = status;
        }
        else if (this.reconnectTest !== callContext)
        {
            this.reconnectedObserver.subscribe(requestFn);
            return;
        }

        if (callContext.expTime)
        {
            callContext.expTime = 2 * callContext.expTime;
            if (callContext.expTime > this.maxRetryTime)
            {
                callContext.expTime = this.maxRetryTime;
            }
        }
        else
        {
            callContext.expTime = this.initialRetryTime;
        }

        if (callContext.retries)
        {
            callContext.retries += 1;
        }
        else
        {
            callContext.retries = 1;
        }

        TurbulenzEngine.setTimeout(requestFn, callContext.expTime);
    },

    retryAfter: function requestHandlerRetryAfterFn(callContext, retryAfter, requestFn, status)
    {
        if (callContext.retries)
        {
            callContext.retries += 1;
        }
        else
        {
            callContext.firstRetry = TurbulenzEngine.time;
            callContext.retries = 1;
        }

        if (callContext.notifiedMaxRetries &&
            TurbulenzEngine.time - callContext.firstRetry + retryAfter > this.notifyTime)
        {
            callContext.notifiedMaxRetries = true;

            var reason = this.reasonServiceBusy;
            callContext.reason = reason;
            this.onRequestTimeout(reason, callContext);
        }

        TurbulenzEngine.setTimeout(requestFn, retryAfter * 1000);
    },

    wrappedResponseCallback: function responseCallback(makeRequest, callContext)
    {
        var that = this;

        return function responseCallbackFn(responseAsset, status)
        {
            var xhr = callContext.xhr;
            if (xhr)
            {
                var retryAfterHeader = xhr.getResponseHeader("Retry-After");
                if (retryAfterHeader)
                {
                    var retryAfter = parseInt(retryAfterHeader, 10);
                    if (retryAfter > 0)
                    {
                        that.retryAfter(callContext, retryAfter, makeRequest, status);
                        return;
                    }
                }
            }

            // 0 Connection Lost
            // 408 Request Timeout
            // 480 Temporarily Unavailable
            if (status === 0 || status === 408 || status === 480)
            {
                that.retryExponential(callContext, makeRequest, status);
                return;
            }

            if (!that.connected)
            {
                // Reconnected!
                that.connected = true;
                if (that.reconnectTest === callContext && that.notifiedConnectionLost)
                {
                    that.onReconnected(that.reconnectTest.reason, that.reconnectTest);
                }
                that.reconnectTest = null;
                that.reconnectedObserver.notify();
                that.reconnectedObserver.unsubscribeAll();
            }

            if (callContext.onload)
            {
                callContext.onload(responseAsset, status, callContext);
                callContext.onload = null;
            }
            callContext = null;
        };
    },

    request: function requestHandlerRequestFn(callContext)
    {
        var makeRequest;
        var that = this;

        makeRequest = function makeRequestFn()
        {
            var responseCallback = that.wrappedResponseCallback(makeRequest, callContext);

            if (callContext.requestFn)
            {
                if (callContext.requestOwner)
                {
                    callContext.requestFn.call(callContext.requestOwner, callContext.src, responseCallback, callContext);
                }
                else
                {
                    callContext.requestFn(callContext.src, responseCallback, callContext);
                }
            }
            else if (callContext.requestOwner)
            {
                callContext.requestOwner.request(callContext.src, responseCallback, callContext);
            }
            else
            {
                TurbulenzEngine.request(callContext.src, responseCallback, callContext);
            }
        };

        makeRequest();
    }
};

RequestHandler.create = function requestHandlerCreateFn(params)
{
    var rh = new RequestHandler();

    rh.initialRetryTime = params.initialRetryTime || 0.5 * 1000;
    rh.notifyTime = params.notifyTime || 4 * 1000;
    rh.maxRetryTime = params.maxRetryTime || 8 * 1000;

    rh.notifiedConnectionLost = false;
    rh.connected = true;
    rh.reconnectedObserver = Observer.create();
    rh.reconnectTest = null;

    rh.onReconnected = params.onReconnected || function onReconnectedFn() {};
    rh.onRequestTimeout = params.onRequestTimeout || function onRequestTimeoutFn(callContext) {};

    return rh;
};
