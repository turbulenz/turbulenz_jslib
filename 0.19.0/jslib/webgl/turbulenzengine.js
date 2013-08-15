// Copyright (c) 2011-2012 Turbulenz Limited
/*global VMathArrayConstructor: true*/
/*global VMath*/
/*global WebGLGraphicsDevice*/
/*global WebGLInputDevice*/
/*global WebGLSoundDevice*/
/*global WebGLPhysicsDevice*/
/*global WebGLNetworkDevice*/
/*global Float32Array*/
/*global Utilities*/
/*global console*/
/*global window*/
"use strict";

//
// WebGLTurbulenzEngine
//
function WebGLTurbulenzEngine() {}
WebGLTurbulenzEngine.prototype = {

    version : '0.19.0',

    setInterval: function (f, t)
    {
        var that = this;
        return window.setInterval(function () {
                that.updateTime();
                f();
            }, t);
    },

    clearInterval: function (i)
    {
        return window.clearInterval(i);
    },

    createGraphicsDevice: function (params)
    {
        if (this.graphicsDevice)
        {
            throw 'GraphicsDevice already created';
        }
        else
        {
            var graphicsDevice = WebGLGraphicsDevice.create(this.canvas, params);
            this.graphicsDevice = graphicsDevice;
            return graphicsDevice;
        }
    },

    createPhysicsDevice: function (params)
    {
        if (this.physicsDevice)
        {
            throw 'PhysicsDevice already created';
        }
        else
        {
            var physicsDevice;
            var plugin = this.getPluginObject();
            if (plugin)
            {
                physicsDevice = plugin.createPhysicsDevice(params);
            }
            else
            {
                physicsDevice = WebGLPhysicsDevice.create(params);
            }
            this.physicsDevice = physicsDevice;
            return physicsDevice;
        }
    },

    createSoundDevice: function (params)
    {
        if (this.soundDevice)
        {
            throw 'SoundDevice already created';
        }
        else
        {
            var soundDevice;
            var plugin = this.getPluginObject();
            if (plugin)
            {
                soundDevice = plugin.createSoundDevice(params);
            }
            else
            {
                soundDevice = WebGLSoundDevice.create(params);
            }
            this.soundDevice = soundDevice;
            return soundDevice;
        }
    },

    createInputDevice: function (params)
    {
        if (this.inputDevice)
        {
            throw 'InputDevice already created';
        }
        else
        {
            var inputDevice = WebGLInputDevice.create(this.canvas, params);
            this.inputDevice = inputDevice;
            return inputDevice;
        }
    },

    createNetworkDevice: function (params)
    {
        if (this.networkDevice)
        {
            throw 'NetworkDevice already created';
        }
        else
        {
            var networkDevice = WebGLNetworkDevice.create(params);
            this.networkDevice = networkDevice;
            return networkDevice;
        }
    },

    createMathDevice: function (params)
    {
        // Check if the browser supports using apply with Float32Array
        try
        {
            var testVector = new Float32Array([1, 2, 3]);

            VMath.v3Build.apply(VMath, testVector);

            if (Float32Array.prototype.slice === undefined)
            {
                Float32Array.prototype.slice = function Float32ArraySlice(s, e)
                {
                    var length = this.length;
                    if (s === undefined)
                    {
                        s = 0;
                    }
                    else if (s < 0)
                    {
                        s += length;
                    }
                    if (e === undefined)
                    {
                        e = length;
                    }
                    else if (e < 0)
                    {
                        e += length;
                    }
                    length = (e - s);
                    if (0 < length)
                    {
                        var dst = new Float32Array(length);
                        var n = 0;
                        do
                        {
                            dst[n] = this[s];
                            n += 1;
                            s += 1;
                        }
                        while (s < e);
                        return dst;
                    }
                    else
                    {
                        return new Float32Array();
                    }
                };
            }

            // Clamp FLOAT_MAX
            testVector[0] = VMath.FLOAT_MAX;
            VMath.FLOAT_MAX = testVector[0];

            VMathArrayConstructor = Float32Array;
        }
        catch (e)
        {
        }

        return VMath;
    },

    getGraphicsDevice: function ()
    {
        var graphicsDevice = this.graphicsDevice;
        if (graphicsDevice === null)
        {
            var onerror = this.onerror;
            if (onerror)
            {
                onerror("GraphicsDevice not created yet.");
            }
        }
        return graphicsDevice;
    },

    getPhysicsDevice: function ()
    {
        return this.physicsDevice;
    },

    getSoundDevice: function ()
    {
        return this.soundDevice;
    },

    getInputDevice: function ()
    {
        return this.inputDevice;
    },

    getNetworkDevice: function ()
    {
        return this.networkDevice;
    },

    getMathDevice: function ()
    {
        return VMath;
    },

    flush: function ()
    {

    },

    run: function ()
    {

    },

    encrypt: function (msg)
    {
        return msg;
    },

    decrypt: function (msg)
    {
        return msg;
    },

    generateSignature: function (msg)
    {
        return null;
    },

    verifySignature: function (msg, sig)
    {
        return true;
    },

    onerror: function (msg)
    {
        Utilities.assert(false, msg);
    },

    onwarning: function (msg)
    {
        Utilities.log(msg);
    },

    getSystemInfo: function ()
    {
        return this.systemInfo;
    },

    request: function (url, callback)
    {
        var that = this;

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
            if (that.onerror)
            {
                that.onerror("No XMLHTTPRequest object could be created");
            }
            return;
        }

        function httpRequestCallback()
        {
            if (xhr.readyState === 4) /* 4 == complete */
            {
                if (!that.isUnloading())
                {
                    var xhrResponseText = xhr.responseText;
                    var xhrStatus = xhr.status;
                    var xhrStatusText = xhr.statusText;

                    // Sometimes the browser sets status to 200 OK when the connection is closed
                    // before the message is sent (weird!).
                    // In order to address this we fail any completely empty responses.
                    // Hopefully, nobody will get a valid response with no headers and no body!
                    if (xhr.getAllResponseHeaders() === "" && xhrResponseText === "" && xhrStatus === 200 && xhrStatusText === 'OK')
                    {
                        callback('', 0);
                        return;
                    }

                    if (xhr.status !== 0)
                    {
                        callback(xhrResponseText, xhrStatus);
                    }
                    else
                    {
                        // Checking xhr.statusText when xhr.status is 0 causes a silent error
                        callback(xhrResponseText, 0);
                    }
                }

                // break circular reference
                xhr.onreadystatechange = null;
                xhr = null;
                callback = null;
            }
        }

        xhr.open('GET', url, true);
        if (callback)
        {
            xhr.onreadystatechange = httpRequestCallback;
        }
        xhr.send();
    },

    // Internals
    destroy : function ()
    {
        if (this.networkDevice)
        {
            delete this.networkDevice;
        }
        if (this.inputDevice)
        {
            delete this.inputDevice;
        }
        if (this.physicsDevice)
        {
            delete this.physicsDevice;
        }
        if (this.soundDevice)
        {
            delete this.soundDevice;
        }
        if (this.graphicsDevice)
        {
            delete this.graphicsDevice;
        }
        if (this.canvas)
        {
            delete this.canvas;
        }
        if (this.resizeCanvas)
        {
            window.removeEventListener('resize', this.resizeCanvas, false);
        }
    },

    getTime : function ()
    {
        return ((Date.now() * 0.001) - this.baseTime);
    },

    getPluginObject : function ()
    {
        if (!this.plugin &&
            this.pluginId)
        {
            this.plugin = document.getElementById(this.pluginId);
        }
        return this.plugin;
    },

    unload : function ()
    {
        if (!this.unloading)
        {
            this.unloading = true;
            if (this.onunload)
            {
                this.onunload();
            }
            if (this.destroy)
            {
                this.destroy();
            }
        }
    },

    isUnloading : function ()
    {
        return this.unloading;
    },

    enableProfiling : function ()
    {
    },

    startProfiling : function ()
    {
        if (console && console.profile && console.profileEnd)
        {
            console.profile("turbulenz");
        }
    },

    stopProfiling : function ()
    {
        // Chrome and Safari return an object. IE and Firefox print to the console/profile tab.
        var result;
        if (console && console.profile && console.profileEnd)
        {
            console.profileEnd("turbulenz");
            if (console.profiles)
            {
                result = console.profiles[console.profiles.length - 1];
            }
        }

        return result;
    }
};

// Constructor function
WebGLTurbulenzEngine.create = function webGLTurbulenzEngineFn(params)
{
    var tz = new WebGLTurbulenzEngine();

    var canvas = params.canvas;
    var fillParent = params.fillParent;

    // To expose unload (the whole interaction needs a re-design)
    window.TurbulenzEngineCanvas = tz;

    tz.pluginId = params.pluginId;
    tz.plugin = null;

    if (Object.defineProperty)
    {
        Object.defineProperty(tz, "time", {
                get : function () {
                    return tz.getTime();
                },
                set : function (newValue) {
                    if (typeof newValue === 'number')
                    {
                        tz.baseTime = ((Date.now() * 0.001) - newValue);
                    }
                    else
                    {
                        var onerror = tz.onerror;
                        if (onerror)
                        {
                            onerror("Must set 'time' attribute to a number");
                        }
                    }
                },
                enumerable : false,
                configurable : false
            });

        tz.updateTime = function ()
        {
        };
    }
    else
    {
        tz.updateTime = function ()
        {
            this.time = this.getTime();
        };
    }

    // fast zero timeouts
    if (window.postMessage)
    {
        var zeroTimeoutMessageName = "0-timeout-message";
        var timeouts = [];
        var timeId = 0;

        var setZeroTimeout = function setZeroTimeoutFn(fn)
        {
            timeId += 1;
            var timeout = {
                    id : timeId,
                    fn : fn
                };
            timeouts.push(timeout);
            window.postMessage(zeroTimeoutMessageName, "*");
            return timeout;
        };

        var clearZeroTimeout = function clearZeroTimeoutFn(timeout)
        {
            var id = timeout;
            var numTimeouts = timeouts.length;
            for (var n = 0; n < numTimeouts; n += 1)
            {
                if (timeouts[n].id === id)
                {
                    timeouts.splice(n, 1);
                    return;
                }
            }
        };

        var handleZeroTimeoutMessages = function handleZeroTimeoutMessagesFn(event)
        {
            if (event.source === window &&
                event.data === zeroTimeoutMessageName)
            {
                event.stopPropagation();

                if (timeouts.length && !tz.isUnloading())
                {
                    var timeout = timeouts.shift();
                    var fn = timeout.fn;
                    fn();
                }
            }
        };
        window.addEventListener("message", handleZeroTimeoutMessages, true);

        tz.setTimeout = function (f, t)
        {
            if (t < 1)
            {
                return setZeroTimeout(f);
            }
            else
            {
                var that = this;
                return window.setTimeout(function () {
                        that.updateTime();
                        if (!that.isUnloading())
                        {
                            f();
                        }
                    }, t);
            }
        };

        tz.clearTimeout = function (i)
        {
            if (typeof i === 'object')
            {
                return clearZeroTimeout(i);
            }
            else
            {
                return window.clearTimeout(i);
            }
        };
    }
    else
    {
        tz.setTimeout = function (f, t)
        {
            var that = this;
            return window.setTimeout(function () {
                    that.updateTime();
                    if (!that.isUnloading())
                    {
                        f();
                    }
                }, t);
        };

        tz.clearTimeout = function (i)
        {
            return window.clearTimeout(i);
        };
    }

    if (window.mozRequestAnimationFrame)
    {
        tz.setInterval = function (f, t)
        {
            var that = this;
            if (Math.abs(t - (1000 / 60)) <= 1)
            {
                var interval = {
                    enabled: true
                };
                var wrap1 = function wrap1Fn()
                {
                    if (interval.enabled)
                    {
                        that.updateTime();
                        if (!that.isUnloading())
                        {
                            f();
                        }
                        window.mozRequestAnimationFrame();
                    }
                };
                interval.callback = wrap1;
                window.addEventListener("MozBeforePaint", wrap1, false);
                window.mozRequestAnimationFrame();
                return interval;
            }
            else
            {
                var wrap2 = function wrap2()
                {
                    that.updateTime();
                    if (!that.isUnloading())
                    {
                        f();
                    }
                };
                return window.setInterval(wrap2, t);
            }
        };

        tz.clearInterval = function (i)
        {
            if (typeof i === 'object')
            {
                i.enabled = false;
                window.removeEventListener("MozBeforePaint", i.callback, false);
                i.callback = null;
            }
            else
            {
                window.clearInterval(i);
            }
        };
    }
    else
    {
        var requestAnimationFrame = (window.requestAnimationFrame       ||
                                     window.webkitRequestAnimationFrame ||
                                     window.oRequestAnimationFrame      ||
                                     window.msRequestAnimationFrame);
        if (requestAnimationFrame)
        {
            tz.setInterval = function (f, t)
            {
                var that = this;
                if (Math.abs(t - (1000 / 60)) <= 1)
                {
                    var interval = {
                        enabled: true
                    };
                    var wrap1 = function wrap1()
                    {
                        if (interval.enabled)
                        {
                            that.updateTime();
                            if (!that.isUnloading())
                            {
                                f();
                            }
                            requestAnimationFrame(wrap1, that.canvas);
                        }
                    };
                    requestAnimationFrame(wrap1, that.canvas);
                    return interval;
                }
                else
                {
                    var wrap2 = function wrap2()
                    {
                        that.updateTime();
                        if (!that.isUnloading())
                        {
                            f();
                        }
                    };
                    return window.setInterval(wrap2, t);
                }
            };

            tz.clearInterval = function (i)
            {
                if (typeof i === 'object')
                {
                    i.enabled = false;
                }
                else
                {
                    window.clearInterval(i);
                }
            };
        }
    }

    tz.canvas = canvas;
    tz.networkDevice = null;
    tz.inputDevice = null;
    tz.physicsDevice = null;
    tz.soundDevice = null;
    tz.graphicsDevice = null;

    if (fillParent)
    {
        // Resize canvas to fill parent
        tz.resizeCanvas = function ()
        {
            canvas.width = canvas.parentNode.clientWidth;
            canvas.height = canvas.parentNode.clientHeight;
        };

        tz.resizeCanvas();

        window.addEventListener('resize', tz.resizeCanvas, false);
    }

    var previousOnBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = function ()
    {
        tz.unload();

        if (previousOnBeforeUnload)
        {
            previousOnBeforeUnload.call(this);
        }
    };

    tz.baseTime = 0; // need to set it to zero first so the next function call works for the first time
    tz.baseTime = tz.getTime();
    tz.time = 0;

    // System info
    var systemInfo = {
        architecture: '',
        cpuDescription: '',
        cpuVendor: '',
        numPhysicalCores: 1,
        numLogicalCores: 1,
        ramInMegabytes: 0,
        frequencyInMegaHZ: 0,
        osVersionMajor: 0,
        osVersionMinor: 0,
        osVersionBuild: 0,
        osName: navigator.platform,
        userLocale: (navigator.language || navigator.userLanguage).replace('-', '_')
    };
    var userAgent = navigator.userAgent;
    var osIndex = userAgent.indexOf('Windows');
    if (osIndex !== -1)
    {
        systemInfo.osName = 'Windows';
        if (navigator.platform === 'Win64')
        {
            systemInfo.architecture = 'x86_64';
        }
        else if (navigator.platform === 'Win32')
        {
            systemInfo.architecture = 'x86';
        }
        osIndex += 7;
        if (userAgent.slice(osIndex, (osIndex + 4)) === ' NT ')
        {
            osIndex += 4;
            systemInfo.osVersionMajor = parseInt(userAgent.slice(osIndex, (osIndex + 1)), 10);
            systemInfo.osVersionMinor = parseInt(userAgent.slice((osIndex + 2), (osIndex + 4)), 10);
        }
    }
    else
    {
        osIndex = userAgent.indexOf('Mac OS X');
        if (osIndex !== -1)
        {
            systemInfo.osName = 'Darwin';
            if (navigator.platform.indexOf('Intel') !== -1)
            {
                systemInfo.architecture = 'x86';
            }
            osIndex += 9;
            systemInfo.osVersionMajor = parseInt(userAgent.slice(osIndex, (osIndex + 2)), 10);
            systemInfo.osVersionMinor = parseInt(userAgent.slice((osIndex + 3), (osIndex + 4)), 10);
            systemInfo.osVersionBuild = (parseInt(userAgent.slice((osIndex + 5), (osIndex + 6)), 10) || 0);
        }
        else
        {
            osIndex = userAgent.indexOf('Linux');
            if (osIndex !== -1)
            {
                systemInfo.osName = 'Linux';
                if (navigator.platform.indexOf('64') !== -1)
                {
                    systemInfo.architecture = 'x86_64';
                }
                else if (navigator.platform.indexOf('x86') !== -1)
                {
                    systemInfo.architecture = 'x86';
                }
            }
        }
    }
    tz.systemInfo = systemInfo;

    return tz;
};

window.WebGLTurbulenzEngine = WebGLTurbulenzEngine;
