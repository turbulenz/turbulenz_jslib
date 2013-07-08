// Copyright (c) 2010-2011 Turbulenz Limited

/*global window: false*/
/*global Observer: false*/
/*global TurbulenzEngine: false*/

var Utilities = {};

//
// assert
//
Utilities.skipAsserts = false;
Utilities.assert = function assertFn(test, message)
{
    if (!test)
    {
        if (!this.skipAsserts)
        {
            this.breakInDebugger.doesNotExist(); //Use a function that does not exist. This is caught in the debuggers.
        }
    }
};


//
// beget
//
Utilities.beget = function begetFn(o)
{
    var F = function () { };
    F.prototype = o;
    return new F();
};

var MathDeviceConvert =
{
    v3ToArray : function v3ToJavaScriptArrayFn(v3)
    {
        return [v3[0], v3[1], v3[2]];
    },

    arrayToV3 : function arrayToV3Fn(mathDevice, v3Array, v3Dest)
    {
        return mathDevice.v3Build(v3Array[0], v3Array[1], v3Array[2], v3Dest);
    },

    v4ToArray : function v4ToJavaScriptArrayFn(v4)
    {
        return [v4[0], v4[1], v4[2], v4[3]];
    },

    arrayToV4 : function arrayToV4Fn(mathDevice, v4Array, v4Dest)
    {
        return mathDevice.v4Build(v4Array[0], v4Array[1], v4Array[2], v4Array[3], v4Dest);
    },

    quatToArray : function quatToJavaScriptArrayFn(quat)
    {
        return [quat[0], quat[1], quat[2], quat[3]];
    },

    arrayToQuat : function arrayToQuatFn(mathDevice, quatArray, quatDest)
    {
        return mathDevice.quatBuild(quatArray[0], quatArray[1], quatArray[2], quatArray[3], quatDest);
    },

    aabbToArray : function aabbToJavaScriptArrayFn(aabb)
    {
        return [aabb[0], aabb[1], aabb[2],
                aabb[3], aabb[4], aabb[5]];
    },

    arrayToAABB : function arrayToQuatFn(mathDevice, aabbArray, aabbDest)
    {
        return mathDevice.aabbBuild(aabbArray[0], aabbArray[1], aabbArray[2],
                                    aabbArray[3], aabbArray[4], aabbArray[5], aabbDest);
    },

    quatPosToArray : function quatPosToJavaScriptArrayFn(quatPos)
    {
        return [quatPos[0], quatPos[1], quatPos[2], quatPos[3],
                quatPos[4], quatPos[5], quatPos[6]];
    },

    arrayToQuatPos : function arrayToQuatPosFn(mathDevice, quatPosArray, quatPosDest)
    {
        return mathDevice.quatPosBuild(quatPosArray[0], quatPosArray[1], quatPosArray[2], quatPosArray[3],
                                       quatPosArray[4], quatPosArray[5], quatPosArray[6], quatPosDest);
    },

    m33ToArray : function m33ToJavaScriptArrayFn(m33)
    {
        return [m33[0], m33[1], m33[2],
                m33[3], m33[4], m33[5],
                m33[6], m33[7], m33[8]];
    },

    arrayToM33 : function arrayToM33Fn(mathDevice, m33Array, m33Dest)
    {
        return mathDevice.m33Build(m33Array[0], m33Array[1], m33Array[2],
                                   m33Array[3], m33Array[4], m33Array[5],
                                   m33Array[6], m33Array[7], m33Array[8], m33Dest);
    },

    /*jslint white: false*/
    m43ToArray : function m43ToJavaScriptArrayFn(m43)
    {
        return [m43[0], m43[ 1], m43[ 2],
                m43[3], m43[ 4], m43[ 5],
                m43[6], m43[ 7], m43[ 8],
                m43[9], m43[10], m43[11]];
    },

    arrayToM43 : function arrayToM43Fn(mathDevice, m43Array, m43Dest)
    {
        return mathDevice.m43Build(m43Array[0], m43Array[ 1], m43Array[ 2],
                                   m43Array[3], m43Array[ 4], m43Array[ 5],
                                   m43Array[6], m43Array[ 7], m43Array[ 8],
                                   m43Array[9], m43Array[10], m43Array[11], m43Dest);
    },

    m34ToArray : function m34ToJavaScriptArrayFn(m34)
    {
        return [m34[0], m34[1], m34[ 2], m34[ 3],
                m34[4], m34[5], m34[ 6], m34[ 7],
                m34[8], m34[9], m34[10], m34[11]];
    },

    m44ToArray : function m44ToJavaScriptArrayFn(m44)
    {
        return [m44[ 0], m44[ 1], m44[ 2], m44[ 3],
                m44[ 4], m44[ 5], m44[ 6], m44[ 7],
                m44[ 8], m44[ 9], m44[10], m44[11],
                m44[12], m44[13], m44[14], m44[15]];
    },

    arrayToM44 : function arrayToM44Fn(mathDevice, m44Array, m44Dest)
    {
        return mathDevice.m44Build(m44Array[ 0], m44Array[ 1], m44Array[ 2], m44Array[ 3],
                                   m44Array[ 4], m44Array[ 5], m44Array[ 6], m44Array[ 7],
                                   m44Array[ 8], m44Array[ 9], m44Array[10], m44Array[11],
                                   m44Array[12], m44Array[13], m44Array[14], m44Array[15], m44Dest);
    }
    /*jslint white: true*/
};

//
// ajax
//
Utilities.ajax = function utilitiesAjaxFn(params)
{
    var xhr;
    if (window.XMLHttpRequest)
    {
        xhr = new window.XMLHttpRequest();
    }
    else if (window.ActiveXObject)
    {
        xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
    }
    else
    {
        if (params.error)
        {
            params.error("No XMLHTTPRequest object could be created");
        }
        return;
    }

    // parameters
    var requestText = "";
    var method = params.method;
    var data = params.data || {};
    var encrypted = params.encrypt;
    var signature = null;
    var url = params.url;

    if (encrypted)
    {
        data.requestUrl = url;

        var str = JSON.stringify(data);

        if (method === "POST")
        {
            str = TurbulenzEngine.encrypt(str);
        }

        requestText += "data=" + encodeURIComponent(str) + "&";

        requestText += "gameSessionId=" + encodeURIComponent(data.gameSessionId);

        signature = TurbulenzEngine.generateSignature(str);
    }
    else if (data)
    {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                if (requestText.length !== 0)
                {
                    requestText += "&";
                }
                if (method === "POST")
                {
                    requestText += key + "=" + data[key];
                }
                else
                {
                    requestText += encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
                }
            }
        }
    }

    var callbackFn = params.callback;
    var httpRequestCallback = function httpRequestCallbackFn()
    {
        if (xhr.readyState === 4 && !TurbulenzEngine.isUnloading()) /* 4 == complete */
        {
            var xhrStatus = xhr.status;
            var xhrResponseText = xhr.responseText;

            // Checking xhrStatusText when xhrStatus is 0 causes a silent error!
            var xhrStatusText = (xhrStatus !== 0 && xhr.statusText) || "No connection or cross domain request";

            var sig = xhr.getResponseHeader("X-TZ-Signature");

            // break circular reference
            xhr.onreadystatechange = null;
            xhr = null;

            if (xhrStatus === 0)
            {
                TurbulenzEngine.setTimeout(function () {
                    callbackFn({msg: "No connection or cross domain request", ok: false}, 0, xhrStatusText);
                    callbackFn = null;
                }, 0);
                return;
            }

            var response;

            if (encrypted)
            {
                response = JSON.parse(xhrResponseText);
                var validSignature = TurbulenzEngine.verifySignature(xhrResponseText, sig);
                xhrResponseText = null;

                TurbulenzEngine.setTimeout(function () {
                    var receivedUrl = response.requestUrl;

                    if (validSignature)
                    {
                        if (!TurbulenzEngine.encryptionEnabled || receivedUrl === url)
                        {
                            callbackFn(response, xhrStatus, xhrStatusText);
                            callbackFn = null;
                            return;
                        }
                    }

                    // If it was a server-side verification fail then pass through the actual message
                    if (xhrStatus === 400)
                    {
                        callbackFn(response, xhrStatus, "Verification Failed");
                    }
                    else
                    {
                        // Else drop reply
                        callbackFn({msg: "Verification failed", ok: false}, 400, "Verification Failed");
                    }
                    callbackFn = null;
                }, 0);
            }
            else
            {
                response = JSON.parse(xhrResponseText);
                xhrResponseText = null;

                TurbulenzEngine.setTimeout(function () {
                    callbackFn(response, xhrStatus, xhrStatusText);
                    callbackFn = null;
                }, 0);
            }
        }
    };

    // Send request
    xhr.open(method, ((requestText && (method !== "POST")) ? url + "?" + requestText : url), params.async);
    if (callbackFn)
    {
        xhr.onreadystatechange = httpRequestCallback;
    }

    if (signature)
    {
        xhr.setRequestHeader("X-TZ-Signature", signature);
    }

    if (method === "POST")
    {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        xhr.send(requestText);
    }
    else // method === 'GET'
    {
        xhr.send();
    }
};



//
//Reference
// Proxy reference class allowing weak reference to the object
function Reference() {}

Reference.prototype =
{
    version: 1,

    //
    // add
    //
    add: function referenceAddFn()
    {
        this.referenceCount += 1;
    },

    //
    // remove
    //
    remove: function referenceRemovefn()
    {
        this.referenceCount -= 1;
        if (this.referenceCount === 0)
        {
            if (this.destroyedObserver)
            {
                this.destroyedObserver.notify(this.object);
            }
            this.object.destroy();
            this.object = null;
        }
    },

    //
    //subscribeDestroyed
    //
    subscribeDestroyed: function referenceSubscribeDestroyedFn(observerFunction)
    {
        if (!this.destroyedObserver)
        {
            this.destroyedObserver = Observer.create();
        }
        this.destroyedObserver.subscribe(observerFunction);
    },

    //
    //unsubscribeDestroyed
    //
    unsubscribeDestroyed: function referenceDestroyedFn(observerFunction)
    {
        this.destroyedObserver.unsubscribe(observerFunction);
    }
};

//
// create
//
Reference.create = function referenceCreate(object)
{
    var result = new Reference();
    result.object = object;
    result.referenceCount = 0;
    return result;
};


//
// Profile
//
var Profile =
{
    profiles: [],

    sortMode: {alphabetical: 0, duration: 1, max: 2, min: 3, calls: 4},

    //
    // start
    //
    start: function profileStartFn(name)
    {
        var data = this.profiles[name];
        if (!data)
        {
            data = {name: name, calls: 0, duration: 0.0, min: Number.MAX_VALUE, max: 0.0, sumOfSquares: 0.0};
            this.profiles[name] = data;
        }
        data.start = TurbulenzEngine.time;
    },

    //
    // stop
    //
    stop: function profileStopFn(name)
    {
        var end = TurbulenzEngine.time;
        var data = this.profiles[name];
        if (data)
        {
            var duration = end - data.start;
            data.duration += duration;
            data.calls += 1;
            var delta = duration - data.duration / data.calls; // This is an approximation, it should use the mean of all samples (or N random ones) but thats requries samples to be stored
            data.sumOfSquares += delta * delta;

            if (duration > data.max)
            {
                data.max = duration;
            }

            if (duration < data.min)
            {
                data.min = duration;
            }
        }
    },

    //
    // reset
    //
    reset: function profileResetFn()
    {
        this.profiles = [];
    },

    //
    // getReport
    //
    getReport: function profileGetReportFn(sortMode, format)
    {
        var dataArray = [];
        var data;
        var maxDuration = 0.0;
        for (var name in this.profiles)
        {
            if (this.profiles.hasOwnProperty(name))
            {
                data = this.profiles[name];
                if (maxDuration < data.duration)
                {
                    maxDuration = data.duration;
                }
                dataArray.push(data);
            }
        }

        var compareFunction;

        if (sortMode === Profile.sortMode.alphabetical)
        {
            compareFunction = function compareName(left, right)
                            {
                                return (left.name < right.name) ? -1 : (left.name > right.name) ? 1 : 0;
                            };
        }
        else if (sortMode === Profile.sortMode.max)
        {
            compareFunction = function compareMax(left, right)
                            {
                                return right.max - left.max;
                            };
        }
        else if (sortMode === Profile.sortMode.min)
        {
            compareFunction = function compareMin(left, right)
                            {
                                return right.min - left.min;
                            };
        }
        else if (sortMode === Profile.sortMode.calls)
        {
            compareFunction = function compareCalls(left, right)
                            {
                                return right.calls - left.calls;
                            };
        }
        else // Profile.sortMode.duration or undefined
        {
            compareFunction = function compareDuration(left, right)
                            {
                                return right.duration - left.duration;
                            };
        }

        dataArray.sort(compareFunction);

        var line;
        var text = "";
        var precision = format ? format.precision : 8;
        var percentagePrecision = format ? format.percentagePrecision : 1;
        var seperator = format ? format.seperator : " ";
        var length = dataArray.length;
        for (var index = 0; index < length; index += 1)
        {
            data = dataArray[index];
            line = data.name;
            line += seperator + data.calls;
            line += seperator + data.duration.toFixed(precision);
            line += seperator + data.max.toFixed(precision);
            line += seperator + data.min.toFixed(precision);
            line += seperator + (data.duration / data.calls).toFixed(precision); // average
            line += seperator + Math.sqrt(data.sumOfSquares / data.calls).toFixed(precision); // approximate standard deviation
            line += seperator + (100 * data.duration / maxDuration).toFixed(percentagePrecision) + "%\n";
            text += line;
        }
        return text;
    }
};
