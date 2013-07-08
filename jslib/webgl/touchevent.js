/* This file was generated from TypeScript source tslib/webgl/touchevent.ts */

// Copyright (c) 2012 Turbulenz Limited
/// <reference path="../turbulenz.d.ts" />
/// <reference path="touch.ts" />
var WebGLTouchEvent = (function () {
    function WebGLTouchEvent() { }
    WebGLTouchEvent.create = function create(params) {
        var touchEvent = new WebGLTouchEvent();
        touchEvent.changedTouches = params.changedTouches;
        touchEvent.gameTouches = params.gameTouches;
        touchEvent.touches = params.touches;
        return touchEvent;
    };
    return WebGLTouchEvent;
})();

