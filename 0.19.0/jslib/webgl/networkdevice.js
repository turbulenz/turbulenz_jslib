// Copyright (c) 2011 Turbulenz Limited
/*global window*/
"use strict";

//
// WebGLNetworkDevice
//
function WebGLNetworkDevice() {}
WebGLNetworkDevice.prototype = {

    version : 1,

    WebSocketConstructor : (window.WebSocket ? window.WebSocket : window.MozWebSocket),

    createWebSocket : function createWebSocketdFn(url, protocol)
    {
        var WebSocketConstructor = this.WebSocketConstructor;
        if (WebSocketConstructor)
        {
            if (protocol)
            {
                return new WebSocketConstructor(url, protocol);
            }
            else
            {
                return new WebSocketConstructor(url);
            }
        }
        else
        {
            return null;
        }
    },

    update : function networkDeviceUpdateFn(params)
    {
    }
};

WebGLNetworkDevice.create = function networkDeviceCreateFn(params)
{
    var nd = new WebGLNetworkDevice();
    return nd;
};
