/* This file was generated from TypeScript source tslib/services/sessiontoken.ts */

// Copyright (c) 2012 Turbulenz Limited
/*global TurbulenzEngine: false*/
/// <reference path="../turbulenz.d.ts" />
//
// SessionToken
//
var SessionToken = (function () {
    function SessionToken() {
        this.randomMax = Math.pow(2, 32);
    }
    SessionToken.version = 1;
    SessionToken.prototype.next = function () {
        this.counter += 1;
        var count = this.counter;
        var random = Math.random() * this.randomMax;
        var bytes = this.bytes;
        /*jshint bitwise: false*/
        bytes[0] = random & 255;
        bytes[1] = (random & 65280) >>> 8;
        bytes[2] = (random & 16711680) >>> 16;
        bytes[3] = (random & 4278190080) >>> 24;
        // only bother using the bottom 16 bytes of count (wraps at 65536)
        // this means that we fit into 8 base64 characters exactly (no extra padding)
        bytes[4] = count & 255;
        bytes[5] = (count & 65280) >>> 8;
        /*jshint bitwise: true*/
        return TurbulenzEngine.base64Encode(bytes);
    };
    SessionToken.create = function create() {
        var sessionToken = new SessionToken();
        sessionToken.counter = 0;
        // TODO use the new random number generator
        sessionToken.randomGenerator = null;
        sessionToken.bytes = [];
        return sessionToken;
    };
    return SessionToken;
})();

