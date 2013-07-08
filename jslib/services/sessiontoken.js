// Copyright (c) 2012 Turbulenz Limited

/*global TurbulenzEngine: false*/

//
// API
//

function SessionToken() {}
SessionToken.prototype =
{
    version : 1,

    randomMax: Math.pow(2, 32),

    next: function ()
    {
        this.counter += 1;
        var count = this.counter;
        var random = Math.random() * this.randomMax;
        var bytes = this.bytes;

        bytes[0] = random & 0x000000FF;
        bytes[1] = (random & 0x0000FF00) >>> 8;
        bytes[2] = (random & 0x00FF0000) >>> 16;
        bytes[3] = (random & 0xFF000000) >>> 24;

        // only bother using the bottom 16 bytes of count (wraps at 65536)
        // this means that we fit into 8 base64 characters exactly (no extra padding)
        bytes[4] = count & 0x000000FF;
        bytes[5] = (count & 0x0000FF00) >>> 8;

        return TurbulenzEngine.base64Encode(bytes);
    }
};

SessionToken.create = function SessionTokenCreate()
{
    var sessionToken = new SessionToken();

    sessionToken.counter = 0;
    // TODO use the new random number generator
    sessionToken.randomGenerator = null;
    sessionToken.bytes = [];

    return sessionToken;
};
