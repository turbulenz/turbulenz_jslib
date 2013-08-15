// Copyright (c) 2011-2012 Turbulenz Limited
/*global window*/

//
// WebGLInputDevice
//
function WebGLInputDevice() {}
WebGLInputDevice.prototype = {

    version : 1,

    addEventListener : function addEventListenerFn(eventType, eventListener)
    {
        var i;
        var length;
        var eventHandlers;

        if (this.handlers.hasOwnProperty(eventType))
        {
            eventHandlers = this.handlers[eventType];

            if (eventListener)
            {
                // Check handler is not already stored
                length = eventHandlers.length;
                for (i = 0; i < length; i += 1)
                {
                    if (eventHandlers[i] === eventListener)
                    {
                        // Event handler has already been added
                        return;
                    }
                }

                eventHandlers.push(eventListener);
            }
        }
    },

    removeEventListener : function removeEventListenerFn(eventType, eventListener)
    {
        var i;
        var length;
        var eventHandlers;

        if (this.handlers.hasOwnProperty(eventType))
        {
            eventHandlers = this.handlers[eventType];

            if (eventListener)
            {
                length = eventHandlers.length;
                for (i = 0; i < length; i += 1)
                {
                    if (eventHandlers[i] === eventListener)
                    {
                        eventHandlers.splice(i, 1);
                        break;
                    }
                }
            }
        }
    },

    sendEventToHandlers : function sendEventToHandlersFn(eventHandlers, arg0, arg1, arg2, arg3, arg4, arg5)
    {
        var i;
        var length = eventHandlers.length;

        if (length)
        {
            for (i = 0; i < length; i += 1)
            {
                eventHandlers[i](arg0, arg1, arg2, arg3, arg4, arg5);
            }
        }
    },

    updateGamePad : function updateGamePadFn()
    {
        var magnitude;
        var normalizedMagnitude;

        var gamepads = (navigator.gamepads || navigator.webkitGamepads);

        if (gamepads)
        {
            var deadZone = this.padAxisDeadZone;
            var maxAxisRange = this.maxAxisRange;
            var sendEventToHandlers = this.sendEventToHandlers;
            var handlers = this.handlers;
            var padButtons = this.padButtons;
            var padMap = this.padMap;
            var leftThumbX = 0;
            var leftThumbY = 0;
            var rightThumbX = 0;
            var rightThumbY = 0;

            var numGamePads = gamepads.length;
            for (var i = 0; i < numGamePads; i += 1)
            {
                var gamepad = gamepads[i];
                if (gamepad)
                {
                    // Update button states

                    var buttons = gamepad.buttons;

                    if (this.padTimestampUpdate < gamepad.timestamp)
                    {
                        this.padTimestampUpdate = gamepad.timestamp;

                        var numButtons = buttons.length;
                        for (var n = 0; n < numButtons; n += 1)
                        {
                            var value = buttons[n];
                            if (padButtons[n] !== value)
                            {
                                padButtons[n] = value;

                                var padCode = padMap[n];
                                if (padCode !== undefined)
                                {
                                    if (value)
                                    {
                                        sendEventToHandlers(handlers.paddown, padCode);
                                    }
                                    else
                                    {
                                        sendEventToHandlers(handlers.padup, padCode);
                                    }
                                }
                            }
                        }
                    }

                    // Update axes states

                    var axes = gamepad.axes;
                    if (axes.length <= 4)
                    {
                        // Axis 1 & 2
                        var lX = axes[0];
                        var lY = -axes[1];
                        magnitude = ((lX * lX) + (lY * lY));

                        if (magnitude > (deadZone * deadZone))
                        {
                            magnitude = Math.sqrt(magnitude);

                            // Normalize lX and lY
                            lX = (lX / magnitude);
                            lY = (lY / magnitude);

                            // Clip the magnitude at its max possible value
                            if (magnitude > maxAxisRange)
                            {
                                magnitude = maxAxisRange;
                            }

                            // Adjust magnitude relative to the end of the dead zone
                            magnitude -= deadZone;

                            // Normalize the magnitude
                            normalizedMagnitude = (magnitude / (maxAxisRange - deadZone));

                            leftThumbX = (lX * normalizedMagnitude);
                            leftThumbY = (lY * normalizedMagnitude);
                        }

                        // Axis 3 & 4
                        var rX = axes[2];
                        var rY = -axes[3];
                        magnitude = ((rX * rX) + (rY * rY));

                        if (magnitude > (deadZone * deadZone))
                        {
                            magnitude = Math.sqrt(magnitude);

                            // Normalize lX and lY
                            rX = (rX / magnitude);
                            rY = (rY / magnitude);

                            // Clip the magnitude at its max possible value
                            if (magnitude > maxAxisRange)
                            {
                                magnitude = maxAxisRange;
                            }

                            // Adjust magnitude relative to the end of the dead zone
                            magnitude -= deadZone;

                            // Normalize the magnitude
                            normalizedMagnitude = (magnitude / (maxAxisRange - deadZone));

                            rightThumbX = (rX * normalizedMagnitude);
                            rightThumbY = (rY * normalizedMagnitude);
                        }


                        sendEventToHandlers(handlers.padmove,
                                            leftThumbX, leftThumbY, buttons[6],
                                            rightThumbX, rightThumbY, buttons[7]);
                    }

                    // Our API only supports one active pad...
                    break;
                }
            }
        }
    },

    update : function inputDeviceUpdateFn()
    {
        if (!this.isWindowFocused)
        {
            return;
        }

        this.updateGamePad();
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

    isFocused : function isFocused()
    {
        return this.isWindowFocused;
    },

    lockMouse : function lockMouseFn()
    {
        if (this.isHovering &&
            this.isWindowFocused)
        {
            this.isMouseLocked = true;
            this.hideMouse();

            var pointer = (navigator.pointer || navigator.webkitPointer);
            if (pointer && !pointer.isLocked)
            {
                pointer.lock(this.canvas);
            }

            this.setEventHandlersLock();

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

            var pointer = (navigator.pointer || navigator.webkitPointer);
            if (pointer && pointer.isLocked)
            {
                pointer.unlock();
            }

            this.setEventHandlersUnlock();

            if (this.isOutsideEngine)
            {
                this.isOutsideEngine = false;

                this.isHovering = false;

                this.setEventHandlersMouseLeave();

                // Send mouseout event
                this.sendEventToHandlers(this.handlers.mouseleave);

                // Send mouselocklost event
                this.sendEventToHandlers(this.handlers.mouselocklost);
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
        var keyCodeToUnicode = this.keyCodeToUnicode;
        var result = {};
        var length = keyCodeArray.length;
        var i;
        var keyCode;

        for (i = 0; i < length; i += 1)
        {
            keyCode = keyCodeArray[i];
            result[keyCode] = keyCodeToUnicode[keyCode] || "";
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
    },

    // Called when blurring
    resetKeyStates : function resetKeyStatesFn()
    {
        var keyName;
        var pressedKeys = this.pressedKeys;

        for (keyName in pressedKeys)
        {
            if (pressedKeys.hasOwnProperty(keyName))
            {
                pressedKeys[keyName] = false;
            }
        }
    },

    destroy : function destroyFn()
    {
        // Remove all event listeners
        if (this.isLocked())
        {
            this.setEventHandlersUnlock();
        }

        if (this.isHovering)
        {
            this.setEventHandlersMouseLeave();
        }

        if (this.isWindowFocused)
        {
            this.setEventHandlersBlur();
        }

        var canvas = this.canvas;
        canvas.onmouseover = null;
        canvas.onmouseout = null;
        canvas.onmousedown = null;
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
    var onFullscreenChanged;

    id.canvas = canvas;
    id.isMouseLocked = false;
    id.isHovering = false;
    id.isWindowFocused = false;
    id.isCursorHidden = false;
    id.isOutsideEngine = false; // Used for determining where we are when unlocking
    id.previousCursor = '';

    // Used to screen out auto-repeats, dictionary from keycode to bool,
    // true for each key currently pressed down
    var pressedKeys = {};
    id.pressedKeys = pressedKeys;

    // Game event handlers
    var handlers = {};
    id.handlers = handlers;

    handlers.keydown = [];
    handlers.keyup = [];

    handlers.mousedown = [];
    handlers.mouseup = [];
    handlers.mousewheel = [];
    handlers.mouseover = [];
    handlers.mousemove = [];

    handlers.paddown = [];
    handlers.padup = [];
    handlers.padmove = [];

    handlers.mouseenter = [];
    handlers.mouseleave = [];
    handlers.focus = [];
    handlers.blur = [];
    handlers.mouselocklost = [];

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
        SLASH: 509,
        BACKSLASH: 510,
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
        CAPS_LOCK : 631,
        INSERT : 632,
        DELETE : 633,
        HOME : 634,
        END : 635,
        PAGE_UP: 636,
        PAGE_DOWN: 637
    };

    var keyCodeToUnicodeTable = {};
    for (var k in keyCodes)
    {
        if (keyCodes.hasOwnProperty(k))
        {
            var code = keyCodes[k];
            keyCodeToUnicodeTable[code] = k;
        }
    }

    var mouseCodes =
    {
        BUTTON_0 : 0,
        BUTTON_1 : 1,
        BUTTON_2 : 2,
        DELTA_X : 100,
        DELTA_Y : 101,
        MOUSE_WHEEL : 102
    };

    var padCodes =
    {
        UP : 0,
        LEFT : 1,
        DOWN : 2,
        RIGHT : 3,
        A : 4,
        B : 5,
        X : 6,
        Y : 7,
        LEFT_TRIGGER : 8,
        RIGHT_TRIGGER : 9,
        LEFT_SHOULDER : 10,
        RIGHT_SHOULDER : 11,
        LEFT_THUMB : 12,
        LEFT_THUMB_X : 13,
        LEFT_THUMB_Y : 14,
        RIGHT_THUMB : 15,
        RIGHT_THUMB_X : 16,
        RIGHT_THUMB_Y : 17,
        START : 18,
        BACK : 19
    };

    // KeyMap: Maps JavaScript keycodes to Turbulenz keycodes - some
    // keycodes are consistent across all browsers and some mappings
    // are browser specific.
    var keyMap = {};

    // A-Z
    keyMap[65] = 0; // A
    keyMap[66] = 1; // B
    keyMap[67] = 2; // C
    keyMap[68] = 3; // D
    keyMap[69] = 4; // E
    keyMap[70] = 5; // F
    keyMap[71] = 6; // G
    keyMap[72] = 7; // H
    keyMap[73] = 8; // I
    keyMap[74] = 9; // J
    keyMap[75] = 10; // K
    keyMap[76] = 11; // L
    keyMap[77] = 12; // M
    keyMap[78] = 13; // N
    keyMap[79] = 14; // O
    keyMap[80] = 15; // P
    keyMap[81] = 16; // Q
    keyMap[82] = 17; // R
    keyMap[83] = 18; // S
    keyMap[84] = 19; // T
    keyMap[85] = 20; // U
    keyMap[86] = 21; // V
    keyMap[87] = 22; // X
    keyMap[88] = 23; // W
    keyMap[89] = 24; // Y
    keyMap[90] = 25; // Z

    // 0-9
    keyMap[48] = 100; // 0
    keyMap[49] = 101; // 1
    keyMap[50] = 102; // 2
    keyMap[51] = 103; // 3
    keyMap[52] = 104; // 4
    keyMap[53] = 105; // 5
    keyMap[54] = 106; // 6
    keyMap[55] = 107; // 7
    keyMap[56] = 108; // 8
    keyMap[57] = 109; // 9

    // Arrow keys
    keyMap[37] = 200; // LEFT
    keyMap[39] = 201; // RIGHT
    keyMap[38] = 202; // UP
    keyMap[40] = 203; // DOWN

    // Modifier keys
    keyMap[16] = 300; // LEFT_SHIFT
    //keyMap[16] = 301; // RIGHT_SHIFT
    keyMap[17] = 302; // LEFT_CONTROL
    //keyMap[17] = 303; // RIGHT_CONTROL
    keyMap[18] = 304; // LEFT_ALT
    keyMap[0] = 305; // RIGHT_ALT

    // Special keys
    keyMap[27] = 400; // ESCAPE
    keyMap[9] = 401; // TAB
    keyMap[32] = 402; // SPACE
    keyMap[8] = 403; // BACKSPACE
    keyMap[13] = 404; // RETURN

    // Punctuation keys
    keyMap[223] = 500; // GRAVE
    keyMap[109] = 501; // MINUS (mozilla - gecko)
    keyMap[189] = 501; // MINUS (ie + webkit)
    keyMap[107] = 502; // EQUALS (mozilla - gecko)
    keyMap[187] = 502; // EQUALS (ie + webkit)
    keyMap[219] = 503; // LEFT_BRACKET
    keyMap[221] = 504; // RIGHT_BRACKET
    keyMap[59] = 505; // SEMI_COLON (mozilla - gecko)
    keyMap[186] = 505; // SEMI_COLON (ie + webkit)
    keyMap[192] = 506; // APOSTROPHE
    keyMap[188] = 507; // COMMA
    keyMap[190] = 508; // PERIOD

    // if Mac OS then overwrite apostrophe and grave key-mappings
    if (navigator.appVersion.indexOf("Mac") !== -1)
    {
        keyMap[192] = 500; // GRAVE (mac webkit)
        keyMap[0] = 500; // GRAVE (mac gecko + safari 5.1)
        keyMap[222] = 506; // APOSTROPHE (mac webkit)
    }

    // Non-standard keys
    keyMap[112] = 600; // F1
    keyMap[113] = 601; // F2
    keyMap[114] = 602; // F3
    keyMap[115] = 603; // F4
    keyMap[116] = 604; // F5
    keyMap[117] = 605; // F6
    keyMap[118] = 606; // F7
    keyMap[119] = 607; // F8
    keyMap[120] = 608; // F9
    keyMap[121] = 609; // F10
    keyMap[122] = 610; // F11
    keyMap[123] = 611; // F12
    //keyMap[45 : 612, // NUMPAD_0 (numlock on/off)
    keyMap[96] = 612; // NUMPAD_0 (numlock on/off)
    //keyMap[35] = 613;, // NUMPAD_1 (numlock on/off)
    keyMap[97] = 613; // NUMPAD_1 (numlock on/off)
    //keyMap[40] = 614; // NUMPAD_2 (numlock on/off)
    keyMap[98] = 614; // NUMPAD_2 (numlock on/off)
    //keyMap[34] = 615; // NUMPAD_3 (numlock on/off)
    keyMap[99] = 615; // NUMPAD_3 (numlock on/off)
    //keyMap[37] = 616;, // NUMPAD_4 (numlock on/off)
    keyMap[100] = 616; // NUMPAD_4 (numlock on/off)
    keyMap[12] = 617; // NUMPAD_5 (numlock on/off)
    keyMap[101] = 617; // NUMPAD_5 (numlock on/off)
    keyMap[144] = 617; // NUMPAD_5 (numlock on/off)
    //keyMap[39] = 618; // NUMPAD_6 (numlock on/off)
    keyMap[102] = 618; // NUMPAD_6 (numlock on/off)
    //keyMap[36] = 619; // NUMPAD_7 (numlock on/off)
    keyMap[103] = 619; // NUMPAD_7 (numlock on/off)
    //keyMap[38] = 620; // NUMPAD_8 (numlock on/off)
    keyMap[104] = 620; // NUMPAD_8 (numlock on/off)
    //keyMap[33] = 621; // NUMPAD_9 (numlock on/off)
    keyMap[105] = 621; // NUMPAD_9 (numlock on/off)
    //keyMap[13] = 622; // NUMPAD_ENTER (numlock on/off)
    keyMap[111] = 623; // NUMPAD_DIVIDE (numlock on/off)
    keyMap[191] = 623; // NUMPAD_DIVIDE (numlock on/off), mac chrome
    keyMap[106] = 624; // NUMPAD_MULTIPLY (numlock on/off)
    //keyMap[107] = 625; // NUMPAD_ADD (numlock on/off)
    //keyMap[109] = 626; // NUMPAD_SUBTRACT (numlock on/off)
    keyMap[91] = 627; // LEFT_WIN
    keyMap[92] = 628; // RIGHT_WIN
    keyMap[93] = 628; // RIGHT_WIN (mac chrome)
    //: 629, // LEFT_OPTION
    //: 630, // RIGHT_OPTION
    keyMap[20] = 631; // CAPS_LOCK
    keyMap[45] = 632; // INSERT
    keyMap[46] = 633; // DELETE
    keyMap[36] = 634; // HOME
    keyMap[35] = 635; // END
    keyMap[33] = 636; // PAGE_UP
    keyMap[34] = 637; // PAGE_DOWN

    // MouseMap: Maps current mouse controls to new controls
    var mouseMap =
    {
        0 : 0,
        1 : 2,
        2 : 1
    };

    // padMap: Maps current pad buttons to new buttons
    var padMap =
    {
        0 : 4, // A
        1 : 5, // B
        2 : 6, // X
        3 : 7, // Y

        4 : 10, // LEFT_SHOULDER
        5 : 11, // RIGHT_SHOULDER

        8 : 19, // BACK
        9 : 18, // START

        10 : 12, // LEFT_THUMB
        11 : 15, // RIGHT_THUMB

        12 : 0, // UP
        13 : 2, // DOWN
        14 : 1, // LEFT
        15 : 3  // RIGHT
    };

    function setEventHandlersMouseEnter()
    {
        // Add event listener to get focus event
        window.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('mouseup', onMouseUp, true);
        window.addEventListener('mousemove', onMouseOver, true);
        window.addEventListener('DOMMouseScroll', onWheel, true);
        window.addEventListener('mousewheel', onWheel, true);
        window.addEventListener('click', emptyEvent, true);
    }
    id.setEventHandlersMouseEnter = setEventHandlersMouseEnter;

    function setEventHandlersMouseLeave()
    {
        // Remove mouse event listeners
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('mousemove', onMouseOver, true);
        window.removeEventListener('DOMMouseScroll', onWheel, true);
        window.removeEventListener('mousewheel', onWheel, true);
        window.removeEventListener('click', emptyEvent, true);
    }
    id.setEventHandlersMouseLeave = setEventHandlersMouseLeave;

    function setEventHandlersFocus()
    {
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
    }
    id.setEventHandlersFocus = setEventHandlersFocus;


    function setEventHandlersBlur()
    {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('mousedown', onMouseDown, true);
    }
    id.setEventHandlersBlur = setEventHandlersBlur;

    function setEventHandlersLock()
    {
        window.removeEventListener('mousemove', onMouseOver, true);
        window.addEventListener('mousemove', onMouseMove, true);
        window.addEventListener('fullscreenchange', onFullscreenChanged, true);
        window.addEventListener('mozfullscreenchange', onFullscreenChanged, true);
        window.addEventListener('webkitfullscreenchange', onFullscreenChanged, true);
    }
    id.setEventHandlersLock = setEventHandlersLock;

    function setEventHandlersUnlock()
    {
        window.removeEventListener('webkitfullscreenchange', onFullscreenChanged, true);
        window.removeEventListener('mozfullscreenchange', onFullscreenChanged, true);
        window.removeEventListener('fullscreenchange', onFullscreenChanged, true);
        window.removeEventListener('mousemove', onMouseMove, true);
        window.addEventListener('mousemove', onMouseOver, true);
    }
    id.setEventHandlersUnlock = setEventHandlersUnlock;

    onMouseOver = function onMouseOverFn(event)
    {
        var position = {};

        event.stopPropagation();
        event.preventDefault();

        id.getCanvasPosition(event, position);

        lastX = event.screenX;
        lastY = event.screenY;

        id.sendEventToHandlers(handlers.mouseover, position.x, position.y);
    };

    onMouseMove = function onMouseMoveFn(event)
    {
        event.stopPropagation();
        event.preventDefault();

        var deltaX, deltaY;
        if (event.movementX !== undefined || event.webkitMovementX !== undefined)
        {
            deltaX = (event.movementX || event.webkitMovementX);
            deltaY = (event.movementY || event.webkitMovementY);
        }
        else
        {
            deltaX = (event.screenX - lastX);
            deltaY = (event.screenY - lastY);
        }

        lastX = event.screenX;
        lastY = event.screenY;

        id.sendEventToHandlers(handlers.mousemove, deltaX, deltaY);
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

        id.sendEventToHandlers(handlers.mousewheel, scrollDelta);
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
            if (!pressedKeys[keyCode])
            {
                pressedKeys[keyCode] = true;
                id.sendEventToHandlers(handlers.keydown, keyCode);
            }
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
        }
        else if (undefined !== keyCode)
        {
            if (pressedKeys[keyCode])
            {
                pressedKeys[keyCode] = false;
                id.sendEventToHandlers(handlers.keyup, keyCode);
            }
        }
    };

    onMouseDown = function onMouseDownFn(event)
    {
        if (id.isHovering)
        {
            var button = event.button;
            var position = {};

            if (!id.isWindowFocused)
            {
                // Focus

                id.isWindowFocused = true;
                window.focus();
                canvas.focus();

                setEventHandlersFocus();

                canvas.oncontextmenu = function () {
                    return false;
                };

                id.sendEventToHandlers(handlers.focus);
            }

            event.stopPropagation();
            event.preventDefault();

            if (button < 3)
            {
                button = mouseMap[button];
            }

            id.getCanvasPosition(event, position);

            id.sendEventToHandlers(handlers.mousedown, button, position.x, position.y);
        }
        else
        {
            if (id.isWindowFocused)
            {
                // Blur
                id.isWindowFocused = false;
                id.resetKeyStates();
                setEventHandlersBlur();
                canvas.oncontextmenu = null;

                id.sendEventToHandlers(handlers.blur);
            }
        }
    };

    onMouseUp = function onMouseUpFn(event)
    {
        if (id.isHovering)
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

            id.sendEventToHandlers(handlers.mouseup, button, position.x, position.y);
        }
    };

    onFullscreenChanged = function onFullscreenChangedFn(event)
    {
        if (id.isMouseLocked)
        {
            if (document.fullscreenEnabled || document.mozFullScreen || document.webkitIsFullScreen)
            {
                var pointer = (navigator.pointer || navigator.webkitPointer);
                if (pointer && !pointer.isLocked)
                {
                    pointer.lock(id.canvas);
                }
            }
            else
            {
                // Browsers capture the escape key whilst in fullscreen
                id.unlockMouse();
            }
        }
    };

    canvas.onmouseover = function (event)
    {
        if (!id.isMouseLocked)
        {
            id.isHovering = true;

            lastX = event.screenX;
            lastY = event.screenY;

            setEventHandlersMouseEnter();

            // Send mouseover event
            id.sendEventToHandlers(handlers.mouseenter);
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

            if (id.isCursorHidden)
            {
                id.showMouse();
            }

            setEventHandlersMouseLeave();

            // Send mouseout event
            id.sendEventToHandlers(handlers.mouseleave);
        }
        else
        {
            id.isOutsideEngine = true;
        }
    };

    // This is required in order to detect hovering when we missed the initial mouseover event
    canvas.onmousedown = function (event)
    {
        canvas.onmousedown = null;

        if (!id.isHovering)
        {
            id.isHovering = true;

            lastX = event.screenX;
            lastY = event.screenY;

            setEventHandlersMouseEnter();

            id.sendEventToHandlers(handlers.mouseenter);

            onMouseDown(event);
        }

        return false;
    };

    id.keyCodes = keyCodes;
    id.keyCodeToUnicode = keyCodeToUnicodeTable;
    id.mouseCodes = mouseCodes;
    id.padCodes = padCodes;
    id.onKeyUp = onKeyUp;
    id.onKeyDown = onKeyDown;
    id.onMouseMove = onMouseMove;
    id.onMouseOver = onMouseOver;

    id.padButtons = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    id.padMap = padMap;
    id.padAxisDeadZone = 0.26;
    id.maxAxisRange = 1.0;
    id.padTimestampUpdate = 0;

    return id;
};
