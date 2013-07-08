// Copyright (c) 2011 Turbulenz Limited
/*global window*/
"use strict";

//
// WebGLInputDevice
//
function WebGLInputDevice() {}
WebGLInputDevice.prototype = {

    version : 1,

    update : function ()
    {
        if (this.capturing)
        {
            var keyEvents = this.keyEvents;
            var numKeyEvents = keyEvents.length;
            if (numKeyEvents)
            {
                var onkeydown = this.onkeydown;
                var onkeyup = this.onkeyup;
                if (onkeydown || onkeyup)
                {
                    for (var k = 0; k < numKeyEvents; k += 1)
                    {
                        var keyEvent = keyEvents[k];
                        if (keyEvent.down)
                        {
                            if (onkeydown)
                            {
                                onkeydown(keyEvent.key);
                            }
                        }
                        else
                        {
                            if (onkeyup)
                            {
                                onkeyup(keyEvent.key);
                            }
                        }
                    }
                }
                keyEvents.length = 0;
            }

            var mouseEvents = this.mouseEvents;
            var numMouseEvents = mouseEvents.length;
            if (numMouseEvents)
            {
                var onmousedown = this.onmousedown;
                var onmouseup = this.onmouseup;
                if (onmousedown || onmouseup)
                {
                    for (var m = 0; m < numMouseEvents; m += 1)
                    {
                        var mouseEvent = mouseEvents[m];
                        if (mouseEvent.down)
                        {
                            if (onmousedown)
                            {
                                onmousedown(mouseEvent.button);
                            }
                        }
                        else
                        {
                            if (onmouseup)
                            {
                                onmouseup(mouseEvent.button);
                            }
                        }
                    }
                }
                mouseEvents.length = 0;
            }

            if (this.mouseDeltaX || this.mouseDeltaY || this.mouseDeltaZ)
            {
                if (this.onmousemove)
                {
                    this.onmousemove(this.mouseDeltaX, this.mouseDeltaY, this.mouseDeltaZ);
                }
                this.mouseDeltaX = 0;
                this.mouseDeltaY = 0;
                this.mouseDeltaZ = 0;
            }
        }
    }
};

// Constructor function
WebGLInputDevice.create = function webGLInputDeviceFn(canvas, params)
{
    var id = new WebGLInputDevice();
    id.canvas = canvas;
    id.capturing = false;
    id.keyEvents = [];
    id.mouseEvents = [];
    id.mouseDeltaX = 0;
    id.mouseDeltaY = 0;
    id.mouseDeltaZ = 0;

    var previousCursor = '';
    var lastX = 0;
    var lastY = 0;
    
    // Update the button mapping check, for each check
    var buttonMapping = [0, 2, 1];

    function onMouseDown(event)
    {
        event.stopPropagation();
        event.preventDefault();
        
        var button = event.button;
        //3 === buttonMapping.length
        if (button < 3)
        {
            button = buttonMapping[button];
        }
        id.mouseEvents.push({
            down: true,
            button: button
        });
    }

    function onMouseUp(event)
    {
        event.stopPropagation();
        event.preventDefault();
        
        var button = event.button;
        //3 === buttonMapping.length
        if (button < 3)
        {
            button = buttonMapping[button];
        }
        id.mouseEvents.push({
            button: button
        });
    }

    function onMouseMove(event)
    {
        event.stopPropagation();
        event.preventDefault();

        var screenX = event.screenX;
        var screenY = event.screenY;
        var deltaX = (screenX - lastX);
        var deltaY = (screenY - lastY);
        lastX = screenX;
        lastY = screenY;
        id.mouseDeltaX += deltaX;
        id.mouseDeltaY += deltaY;
    }

    function onWheel(event)
    {
        event.stopPropagation();
        event.preventDefault();

        if (event.wheelDelta)
        {
            if (window.opera)
            {
                id.mouseDeltaZ -= event.wheelDelta;
            }
            else
            {
                id.mouseDeltaZ += event.wheelDelta;
            }
        }
        else
        {
            id.mouseDeltaZ -= (event.detail * 40);
        }
    }

    function onKeyUp(event)
    {
        event.stopPropagation();
        event.preventDefault();

        id.keyEvents.push({
            key: event.keyCode
        });
    }

    function emptyEvent(event)
    {
        event.stopPropagation();
        event.preventDefault();
    }

    function onKeyDown(event)
    {
        event.stopPropagation();
        event.preventDefault();

        var keyCode = event.keyCode;
        if (keyCode === 27)
        {
            id.capturing = false;
            id.keyEvents.length = 0;
            id.mouseEvents.length = 0;
            id.mouseDeltaX = 0;
            id.mouseDeltaY = 0;
            id.mouseDeltaZ = 0;

            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('mousedown', onMouseDown, true);
            window.removeEventListener('mousemove', onMouseMove, true);
            window.removeEventListener('mouseup', onMouseUp, true);
            window.removeEventListener('DOMMouseScroll', onWheel, true);
            window.removeEventListener('mousewheel', onWheel, true);
            window.removeEventListener('click', emptyEvent, true);

            document.body.style.cursor = previousCursor;

            canvas.oncontextmenu = null;
        }
        else
        {
            id.keyEvents.push({
                down: true,
                key: keyCode
            });
        }
    }

    canvas.onmousedown = function (event)
    {
        var button = event.button;
        //3 === buttonMapping.length
        if (button < 3)
        {
            button = buttonMapping[button];
        }
        
        if (button === 0)
        {
            if (!id.capturing)
            {
                event.stopPropagation();
                event.preventDefault();

                id.capturing = true;
                id.keyEvents.length = 0;
                id.mouseEvents.length = 0;
                id.mouseDeltaX = 0;
                id.mouseDeltaY = 0;
                id.mouseDeltaZ = 0;

                previousCursor = document.body.style.cursor;

                lastX = event.screenX;
                lastY = event.screenY;

                window.addEventListener('keydown', onKeyDown, true);
                window.addEventListener('keyup', onKeyUp, true);
                window.addEventListener('mousedown', onMouseDown, true);
                window.addEventListener('mousemove', onMouseMove, true);
                window.addEventListener('mouseup', onMouseUp, true);
                window.addEventListener('DOMMouseScroll', onWheel, true);
                window.addEventListener('mousewheel', onWheel, true);
                window.addEventListener('click', emptyEvent, true);

                window.focus();

                document.body.style.cursor = 'none';

                canvas.oncontextmenu = function () {
                    return false;
                };

                return;
            }
        }
    };

    return id;
};
