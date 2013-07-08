// Copyright (c) 2011 Turbulenz Limited
/*global VMath*/
/*global WebGLGraphicsDevice*/
/*global WebGLInputDevice*/
/*global console*/
/*global window*/
"use strict";

//
// WebGLTurbulenzEngine
//
function WebGLTurbulenzEngine() {}
WebGLTurbulenzEngine.prototype = {

    version : '0.17.0',

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
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.createPhysicsDevice(params);
        }
        else
        {
            return null;
        }
    },

    createSoundDevice: function (params)
    {
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.createSoundDevice(params);
        }
        else
        {
            return null;
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
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.createNetworkDevice(params);
        }
        else
        {
            return null;
        }
    },

    createMathDevice: function (params)
    {
        return VMath;
    },

    getGraphicsDevice: function ()
    {
        return this.graphicsDevice;
    },

    getPhysicsDevice: function ()
    {
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.getPhysicsDevice();
        }
        else
        {
            return null;
        }
    },

    getSoundDevice: function ()
    {
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.getSoundDevice();
        }
        else
        {
            return null;
        }
    },

    getInputDevice: function ()
    {
        return this.inputDevice;
    },

    getNetworkDevice: function ()
    {
        var plugin = this.getPluginObject();
        if (plugin)
        {
            return plugin.getNetworkDevice();
        }
        else
        {
            return null;
        }
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
        window.alert(msg);
    },

    onwarning: function (msg)
    {
        console.log(msg);
    },

    getSystemInfo: function ()
    {
        return {};
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
                    if (xhr.status !== 0)
                    {
                        callback(xhr.responseText, xhr.status, xhr.statusText);
                    }
                    else
                    {
                        // Checking xhr.statusText when xhr.status is 0 causes a silent error
                        callback(xhr.responseText, 0, "Timeout or cross domain request");
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
        if (this.inputDevice)
        {
            delete this.inputDevice;
        }
        if (this.graphicsDevice)
        {
            delete this.graphicsDevice;
        }
        if (this.canvas)
        {
            delete this.canvas;
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
        }
    },

    isUnloading : function ()
    {
        return this.unloading;
    }
};

// Constructor function
WebGLTurbulenzEngine.create = function webGLTurbulenzEngineFn(params)
{
    var tz = new WebGLTurbulenzEngine();

    var canvas = params.canvas;
    var fillParent = params.fillParent;

    tz.pluginId = params.pluginId;
    tz.plugin = null;

    if (Object.defineProperty)
    {
        Object.defineProperty(tz, "time", {
                get : function () {
                    return tz.getTime();
                },
                set : function (newValue) {
                    tz.baseTime = ((Date.now() * 0.001) - newValue);
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

    if (fillParent)
    {
        // Resize canvas to fill parent
        var resizeCanvas = function resizeCanvasFn()
        {
            canvas.width = canvas.parentNode.clientWidth;
            canvas.height = canvas.parentNode.clientHeight;
        };

        resizeCanvas();

        window.addEventListener('resize', resizeCanvas, false);
    }

    var previousOnBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = function ()
    {
        tz.unload();
        tz.destroy();

        if (previousOnBeforeUnload)
        {
            previousOnBeforeUnload.call(this);
        }
    };

    tz.baseTime = 0; // need to set it to zero first so the next function call works for the first time
    tz.baseTime = tz.getTime();
    tz.time = 0;

    return tz;
};
