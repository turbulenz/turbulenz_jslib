// Copyright (c) 2012 Turbulenz Limited

function TouchEvent() {}

TouchEvent.create = function touchEventCreateFn(params)
{
    var touchEvent = new TouchEvent();

    touchEvent.changedTouches   = params.changedTouches;
    touchEvent.gameTouches      = params.gameTouches;
    touchEvent.touches          = params.touches;

    return touchEvent;
};
