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
        var numberOfEvents;
        var onkeydown;
        var onkeyup;
        var onmousedown;
        var onmouseup;
        var onmouseover;
        var onmousemove;
        var onmousewheel;
        var onmouselocklost;
        var event;
        var i;
        var eventType = this.eventType;
        var eventQueue = this.eventQueue;

        eventQueue = this.eventQueue;
        numberOfEvents = eventQueue.length;

        if (numberOfEvents)
        {
            onkeydown = this.onkeydown;
            onkeyup = this.onkeyup;
            onmousedown = this.onmousedown;
            onmouseup = this.onmouseup;
            onmouseover = this.onmouseover;
            onmousemove = this.onmousemove;
            onmousewheel = this.onmousewheel;
            onmouselocklost = this.onmouselocklost;

            for (i = 0; i < numberOfEvents; i += 1)
            {
                event = eventQueue[i];
                switch (event.type)
                {
                case eventType.KEY_UP:
                    if (onkeyup)
                    {
                        onkeyup(event.key);
                    }
                    break;

                case eventType.KEY_DOWN:
                    if (onkeydown)
                    {
                        onkeydown(event.key);
                    }

                    break;

                case eventType.MOUSE_UP:
                    if (onmouseup)
                    {
                        onmouseup(event.button, event.x, event.y);
                    }

                    break;

                case eventType.MOUSE_DOWN:
                    if (onmousedown)
                    {
                        onmousedown(event.button, event.x, event.y);
                    }

                    break;

                case eventType.MOUSE_OVER:
                    if (onmouseover)
                    {
                        onmouseover(event.x, event.y);
                    }

                    break;

                case eventType.MOUSE_MOVE:
                    if (onmousemove)
                    {
                        onmousemove(event.deltaX, event.deltaY);
                    }

                    break;

                case eventType.MOUSE_WHEEL:
                    if (onmousewheel)
                    {
                        onmousewheel(event.delta);
                    }

                    break;

                case eventType.MOUSE_ENTER:
                    if (this.onmouseenter)
                    {
                        this.onmouseenter();
                    }
                    break;

                case eventType.MOUSE_LEAVE:
                    if (this.onmouseleave)
                    {
                        this.onmouseleave();
                    }
                    break;

                case eventType.FOCUS:
                    if (this.onfocus)
                    {
                        this.onfocus();
                    }

                    break;

                case eventType.BLUR:
                    if (this.onblur)
                    {
                        this.onblur();
                    }

                    break;

                case eventType.MOUSE_LOCK_LOST:
                    if (onmouselocklost)
                    {
                        onmouselocklost();
                    }

                    break;
                }
            }

            eventQueue.length = 0;
        }
    },

    hideMouse : function hideMouseFn()
    {
        if (this.isHovering)
        {
            if (!this.isCursorHidden)
            {
                this.isCursorHidden = true;
                this.previousCursor = document.body.style.cursor;
                document.body.style.cursor = 'none';
            }

            return true;
        }
        else
        {
            return false;
        }
    },

    showMouse : function showMouseFn()
    {
        if (this.isCursorHidden &&
            !this.isMouseLocked)
        {
            this.isCursorHidden = false;
            document.body.style.cursor = this.previousCursor;
            return true;
        }
        else
        {
            return false;
        }
    },

    isHidden : function isHiddenFn()
    {
        return this.isCursorHidden;
    },

    lockMouse : function lockMouseFn()
    {
        if (this.isHovering &&
            this.isFocused)
        {
            this.isMouseLocked = true;
            this.hideMouse();

            this.addEventHandlersLock();

            return true;
        }
        else
        {
            return false;
        }
    },

    unlockMouse : function unlockMouseFn()
    {
        if (this.isMouseLocked)
        {
            this.isMouseLocked = false;
            this.showMouse();

            this.addEventHandlersUnlock();

            if (this.isOutsideEngine)
            {
                this.isOutsideEngine = false;

                this.isHovering = false;

                // Send mouseout event
                this.eventQueue.push({
                        type : this.eventType.MOUSE_LEAVE
                    });

                this.removeEventHandlersMouseLeave();

            }

            return true;
        }
        else
        {
            return false;
        }
    },

    isLocked : function isLockedFn()
    {
        return this.isMouseLocked;
    },

    // Cannot convert keycodes to unicode in javascript so return empty strings
    convertToUnicode : function convertToUnicodeFn(keyCodeArray)
    {
        var result = {};
        var length = keyCodeArray.length;
        var i;
        var keyCode;

        for (i = 0; i < length; i += 1)
        {
            keyCode = keyCodeArray[i];
            result[keyCode] = "";
        }

        return result;
    },

    // Cannot detect locale in canvas mode
    getLocale : function getLocaleFn()
    {
        return "";
    },

    // Returns the local coordinates of the event (i.e. position in Canvas coords)
    getCanvasPosition : function getCanvasPositionFn(event, position)
    {
        if (event.offsetX)
        {
            position.x = event.offsetX;
            position.y = event.offsetY;
        }
        else if (event.layerX)
        {
            position.x = event.layerX;
            position.y = event.layerY;
        }
    }
};

// Constructor function
WebGLInputDevice.create = function webGLInputDeviceFn(canvas, params)
{
    var id = new WebGLInputDevice();

    var lastX = 0;
    var lastY = 0;
    var onMouseDown;
    var onMouseUp;
    var onMouseOver;
    var onMouseMove;
    var onWheel;
    var onKeyDown;
    var onKeyUp;
    var emptyEvent;

    id.canvas = canvas;
    id.isMouseLocked = false;
    id.isHovering = false;
    id.isFocused = false;
    id.isCursorHidden = false;
    id.isOutsideEngine = false; // Used for determining where we are when unlocking
    id.eventQueue = [];
    id.previousCursor = '';

    // Callbacks
    id.onkeydown = null;
    id.onkeyup = null;
    id.onmousedown = null;
    id.onmouseup = null;
    id.onmouseover = null;
    id.onmousemove = null;
    id.onpaddown = null;
    id.onpadup = null;
    id.onpadmove = null;
    id.onmouseenter = null;
    id.onmouseleave = null;
    id.onfocus = null;
    id.onblur = null;
    id.onmouselocklost = null;

    // Event enums
    var eventType =
    {
        KEY_DOWN : 0,
        KEY_UP : 1,
        MOUSE_DOWN : 2,
        MOUSE_UP : 3,
        MOUSE_OVER : 4,
        MOUSE_MOVE : 5,
        PAD_DOWN : 6,
        PAD_UP : 7,
        PAD_MOVE : 8,
        MOUSE_ENTER : 9,
        MOUSE_LEAVE : 10,
        FOCUS : 11,
        BLUR : 12,
        MOUSE_LOCK_LOST : 13
    };

    id.eventType = eventType;

    // KeyCodes: List of key codes and their values
    var keyCodes =
    {
        A : 0,
        B : 1,
        C : 2,
        D : 3,
        E : 4,
        F : 5,
        G : 6,
        H : 7,
        I : 8,
        J : 9,
        K : 10,
        L : 11,
        M : 12,
        N : 13,
        O : 14,
        P : 15,
        Q : 16,
        R : 17,
        S : 18,
        T : 19,
        U : 20,
        V : 21,
        W : 22,
        X : 23,
        Y : 24,
        Z : 25,
        NUMBER_0 : 100,
        NUMBER_1 : 101,
        NUMBER_2 : 102,
        NUMBER_3 : 103,
        NUMBER_4 : 104,
        NUMBER_5 : 105,
        NUMBER_6 : 106,
        NUMBER_7 : 107,
        NUMBER_8 : 108,
        NUMBER_9 : 109,
        LEFT : 200,
        RIGHT : 201,
        UP : 202,
        DOWN : 203,
        LEFT_SHIFT : 300,
        RIGHT_SHIFT : 301,
        LEFT_CONTROL : 302,
        RIGHT_CONTROL : 303,
        LEFT_ALT : 304,
        RIGHT_ALT : 305,
        ESCAPE : 400,
        TAB : 401,
        SPACE :    402,
        BACKSPACE : 403,
        RETURN : 404,
        GRAVE : 500,
        MINUS : 501,
        EQUALS : 502,
        LEFT_BRACKET : 503,
        RIGHT_BRACKET : 504,
        SEMI_COLON : 505,
        APOSTROPHE : 506,
        COMMA : 507,
        PERIOD : 508,
        F1 : 600,
        F2 : 601,
        F3 : 602,
        F4 : 603,
        F5 : 604,
        F6 : 605,
        F7 : 606,
        F8 : 607,
        F9 : 608,
        F10 : 609,
        F11 : 610,
        F12 : 611,
        NUMPAD_0 : 612,
        NUMPAD_1 : 613,
        NUMPAD_2 : 614,
        NUMPAD_3 : 615,
        NUMPAD_4 : 616,
        NUMPAD_5 : 617,
        NUMPAD_6 : 618,
        NUMPAD_7 : 619,
        NUMPAD_8 : 620,
        NUMPAD_9 : 621,
        NUMPAD_ENTER : 622,
        NUMPAD_DIVIDE : 623,
        NUMPAD_MULTIPLY : 624,
        NUMPAD_ADD : 625,
        NUMPAD_SUBTRACT : 626,
        LEFT_WIN : 627,
        RIGHT_WIN : 628,
        LEFT_OPTION : 629,
        RIGHT_OPTION : 630,
        CAPS_LOCK : 631
    };

    var mouseCodes =
    {
        BUTTON_0 : 0,
        BUTTON_1 : 1,
        BUTTON_2 : 2,
        BUTTON_3 : 3,
        BUTTON_4 : 4,
        BUTTON_5 : 5,
        DELTA_X : 100,
        DELTA_Y : 101,
        MOUSE_WHEEL : 102
    };

    /*var padCodes =
    {
        LEFT : 0,
        RIGHT : 1,
        UP : 2,
        DOWN : 3,
        A : 4,
        B : 5,
        X : 6,
        Y : 7,
        LEFT_TRIGGER : 8,
        RIGHT_TRIGGER : 9,
        LEFT_SHOULDER : 10,
        RIGHT_SHOULDER : 11,
        LEFT_THUMB_X : 12,
        LEFT_THUMB_Y : 13,
        RIGHT_THUMB_X : 14,
        RIGHT_THUMB_Y : 15,
        START : 16,
        BACK : 17
    };*/

    // KeyMap: Maps JavaScript keycodes to Turbulenz keycodes
    var keyMap =
    {
        65 : 0, // A
        66 : 1, // B
        67 : 2, // C
        68 : 3, // D
        69 : 4, // E
        70 : 5, // F
        71 : 6, // G
        72 : 7, // H
        73 : 8, // I
        74 : 9, // J
        75 : 10, // K
        76 : 11, // L
        77 : 12, // M
        78 : 13, // N
        79 : 14, // O
        80 : 15, // P
        81 : 16, // Q
        82 : 17, // R
        83 : 18, // S
        84 : 19, // T
        85 : 20, // U
        86 : 21, // V
        87 : 22, // X
        88 : 23, // W
        89 : 24, // Y
        90 : 25, // Z
        48 : 100, // 0
        49 : 101, // 1
        50 : 102, // 2
        51 : 103, // 3
        52 : 104, // 4
        53 : 105, // 5
        54 : 106, // 6
        55 : 107, // 7
        56 : 108, // 8
        57 : 109, // 9
        37 : 200, // LEFT
        39 : 201, // RIGHT
        38 : 202, // UP
        40 : 203, // DOWN
        16 : 300, // LEFT_SHIFT
        //16 : 301, // RIGHT_SHIFT
        17 : 302, // LEFT_CONTROL
        //17 : 303, "RIGHT_CONTROL",
        18 : 304, // LEFT_ALT
        0 : 305, // RIGHT_ALT
        27 : 400, // ESCAPE
        9 : 401, // TAB
        32 : 402, // SPACE
        8 : 403, // BACKSPACE
        13 : 404, // RETURN
        223 : 500, // GRAVE
        //192 : 500, // GRAVE (on mac chrome)
        109 : 501, // MINUS (mozilla - gecko)
        189 : 501, // MINUS (ie + webkit)
        107 : 502, // EQUALS (mozilla - gecko)
        187 : 502, // EQUALS (ie + webkit)
        219 : 503, // LEFT_BRACKET
        221 : 504, // RIGHT_BRACKET
        59 : 505, // SEMI_COLON (mozilla - gecko)
        186 : 505, // SEMI_COLON (ie + webkit)
        192 : 506, // APOSTROPHE
        222 : 506, // APOSTROPHE
        188 : 507, // COMMA
        190 : 508, // PERIOD
        112 : 600, // F1
        113 : 601, // F2
        114 : 602, // F3
        115 : 603, // F4
        116 : 604, // F5
        117 : 605, // F6
        118 : 606, // F7
        119 : 607, // F8
        120 : 608, // F9
        121 : 609, // F10
        122 : 610, // F11
        123 : 611, // F12
        45 : 612, // NUMPAD_0 (numlock on/off)
        96 : 612, // NUMPAD_0 (numlock on/off)
        35 : 613, // NUMPAD_1 (numlock on/off)
        97 : 613, // NUMPAD_1 (numlock on/off)
        //40 : 614, // NUMPAD_2 (numlock on/off)
        98 : 614, // NUMPAD_2 (numlock on/off)
        34 : 615, // NUMPAD_3 (numlock on/off)
        99 : 615, // NUMPAD_3 (numlock on/off)
        //37 : 616, // NUMPAD_4 (numlock on/off)
        100 : 616, // NUMPAD_4 (numlock on/off)
        12 : 617, // NUMPAD_5 (numlock on/off)
        101 : 617, // NUMPAD_5 (numlock on/off)
        //39 : 618, // NUMPAD_6 (numlock on/off)
        102 : 618, // NUMPAD_6 (numlock on/off)
        36 : 619, // NUMPAD_7 (numlock on/off)
        103 : 619, // NUMPAD_7 (numlock on/off)
        //38 : 620, // NUMPAD_8 (numlock on/off)
        104 : 620, // NUMPAD_8 (numlock on/off)
        33 : 621, // NUMPAD_9 (numlock on/off)
        105 : 621, // NUMPAD_9 (numlock on/off)
        //13 : 622, // NUMPAD_ENTER (numlock on/off)
        111 : 623, // NUMPAD_DIVIDE (numlock on/off)
        191 : 623, // NUMPAD_DIVIDE (numlock on/off), mac chrome
        106 : 624, // NUMPAD_MULTIPLY (numlock on/off)
        //107 : 625, // NUMPAD_ADD (numlock on/off)
        //109 : 626, // NUMPAD_SUBTRACT (numlock on/off)
        91 : 627, // LEFT_WIN
        92 : 628, // RIGHT_WIN
        93 : 628, // RIGHT_WIN (mac chrome)
        //: 629, // LEFT_OPTION
        //: 630, // RIGHT_OPTION
        20 : 631 // CAPS_LOCK
    };

    // MouseMap: Maps current mouse controls to new controls
    var mouseMap =
    {
        0 : 0,
        1 : 2,
        2 : 1
    };

    function addEventHandlersMouseEnter()
    {
        // Add event listener to get focus event
        window.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('mouseup', onMouseUp, true);
        window.addEventListener('mousemove', onMouseOver, true);
        window.addEventListener('DOMMouseScroll', onWheel, true);
        window.addEventListener('mousewheel', onWheel, true);
        window.addEventListener('click', emptyEvent, true);
    }

    function removeEventHandlersMouseLeave()
    {
        // Remove mouse event listeners
        window.removeEventListener('mousedown', onMouseDown, true);
        window.removeEventListener('mousemove', onMouseOver, true);
        window.removeEventListener('DOMMouseScroll', onWheel, true);
        window.removeEventListener('mousewheel', onWheel, true);
        window.removeEventListener('click', emptyEvent, true);
    }
    id.removeEventHandlersMouseLeave = removeEventHandlersMouseLeave;

    function addEventHandlersFocus()
    {
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
    }

    function removeEventHandlersBlur()
    {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('mouseup', onMouseUp, true);
    }

    function addEventHandlersLock()
    {
        window.removeEventListener('mousemove', onMouseOver, true);
        window.addEventListener('mousemove', onMouseMove, true);
    }
    id.addEventHandlersLock = addEventHandlersLock;

    function addEventHandlersUnlock()
    {
        window.removeEventListener('mousemove', onMouseMove, true);
        window.addEventListener('mousemove', onMouseOver, true);
    }
    id.addEventHandlersUnlock = addEventHandlersUnlock;

    onMouseOver = function onMouseOverFn(event)
    {
        var position = {};

        event.stopPropagation();
        event.preventDefault();

        id.getCanvasPosition(event, position);

        id.eventQueue.push({
            type : eventType.MOUSE_OVER,
            x : position.x,
            y : position.y
        });

        lastX = event.screenX;
        lastY = event.screenY;
    };

    onMouseMove = function onMouseMoveFn(event)
    {
        event.stopPropagation();
        event.preventDefault();

        id.eventQueue.push({
            type : eventType.MOUSE_MOVE,
            deltaX : (event.screenX - lastX),
            deltaY : (event.screenY - lastY)
        });

        lastX = event.screenX;
        lastY = event.screenY;
    };

    onWheel = function onWheelFn(event)
    {
        var scrollDelta;

        event.stopPropagation();
        event.preventDefault();

        if (event.wheelDelta)
        {
            if (window.opera)
            {
                scrollDelta = event.wheelDelta < 0 ? 1 : -1;
            }
            else
            {
                scrollDelta = event.wheelDelta > 0 ? 1 : -1;
            }
        }
        else
        {
            scrollDelta = event.detail < 0 ? 1 : -1;
        }

        id.eventQueue.push({
            type : eventType.MOUSE_WHEEL,
            delta : scrollDelta
        });
    };

    onKeyDown = function onKeyDownFn(event)
    {
        event.stopPropagation();
        event.preventDefault();

        var keyCode = event.keyCode;
        keyCode = keyMap[keyCode];

        if (undefined !== keyCode &&
           (keyCodes.ESCAPE !== keyCode))
        {
            id.eventQueue.push({
                type : eventType.KEY_DOWN,
                down : true,
                key : keyCode
            });
        }
    };

    emptyEvent = function emptyEventFn(event)
    {
        event.stopPropagation();
        event.preventDefault();
    };

    onKeyUp = function onKeyUpFn(event)
    {
        event.stopPropagation();
        event.preventDefault();

        var keyCode = event.keyCode;
        keyCode = keyMap[keyCode];

        if (keyCode === keyCodes.ESCAPE)
        {
            id.unlockMouse();

            id.eventQueue.push({
                type : eventType.MOUSE_LOCK_LOST
            });
        }
        else if (undefined !== keyCode)
        {
            id.eventQueue.push({
                type : eventType.KEY_UP,
                key : keyCode
            });
        }
    };

    onMouseDown = function onMouseDownFn(event)
    {
        var button = event.button;
        var position = {};

        event.stopPropagation();
        event.preventDefault();

        if (button < 3)
        {
            button = mouseMap[button];
        }

        id.getCanvasPosition(event, position);

        id.eventQueue.push({
            type: eventType.MOUSE_DOWN,
            down: true,
            button: button,
            x : position.x,
            y : position.y
        });
    };

    onMouseUp = function onMouseUpFn(event)
    {
        var position = {};
        var button;

        if (id.isHovering)
        {
            if (!id.isFocused)
            {
                // Focus

                id.isFocused = true;
                window.focus();
                canvas.focus();

                addEventHandlersFocus();

                canvas.oncontextmenu = function () {
                    return false;
                };

                id.eventQueue.push({
                        type : eventType.FOCUS
                    });
            }

            event.stopPropagation();
            event.preventDefault();

            button = event.button;

            if (button < 3)
            {
                button = mouseMap[button];
            }

            id.getCanvasPosition(event, position);

            id.eventQueue.push({
                type : eventType.MOUSE_UP,
                button : button,
                x : position.x,
                y : position.y
            });
        }
        else
        {
            if (id.isFocused)
            {
                // Blur
                id.isFocused = false;
                removeEventHandlersBlur();
                canvas.oncontextmenu = null;

                id.eventQueue.push({
                        type : eventType.BLUR
                    });
            }
        }
    };

    canvas.onmouseover = function (event)
    {
        if (!id.isMouseLocked)
        {
            id.isHovering = true;

            // Send mouseover event
            id.eventQueue.push({
                    type : eventType.MOUSE_ENTER
                });

            lastX = event.screenX;
            lastY = event.screenY;

            addEventHandlersMouseEnter();
        }
        else
        {
            id.isOutsideEngine = false;
        }
    };

    canvas.onmouseout = function (event)
    {
        if (!id.isMouseLocked)
        {
            id.isHovering = false;

            // Send mouseout event
            id.eventQueue.push({
                    type : eventType.MOUSE_LEAVE
                });

            if (id.isCursorHidden)
            {
                id.showMouse();
            }

            removeEventHandlersMouseLeave();
        }
        else
        {
            id.isOutsideEngine = true;
        }
    };

    id.keyCodes = keyCodes;
    id.mouseCodes = mouseCodes;
    id.onKeyUp = onKeyUp;
    id.onKeyDown = onKeyDown;
    id.onMouseMove = onMouseMove;
    id.onMouseOver = onMouseOver;

    return id;
};
