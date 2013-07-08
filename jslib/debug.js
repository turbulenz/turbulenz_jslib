// Copyright (c) 2012 Turbulenz Limited

// The debug object is only available in debug modes.  The build tools
// will automatically include it or prevent it from being included
// based on the build mode.
//
// Always use this in the form:
//
//   debug.assert(x === y, "X must equal Y");
//
// and avoid caching either debug or assert:
//
//   var d = debug;
//   d.assert(....);
//
//   var a = debug.assert;
//   a.call(debug, ....);
//
// etc...

var debug = {

    // Override this to change the behaviour when asserts are
    // triggered.  Default logs the message to the console and then
    // throws an exception.
    reportAssert : function debugReportAssertFn(msg)
    {
        window.console.log(msg);

        if ('undefined' !== typeof Error)
        {
            var getStackTrace = function debugReportAssertGetStackTraceFn()
            {
                var obj = {};
                Error.captureStackTrace(obj, getStackTrace);
                return obj.stack;
            };

            window.console.log(getStackTrace());
        }

        throw msg;
    },

    // Basic assertion that a condition is true.
    assert : function debugAssertFn(condition, msg)
    {
        if (!condition)
        {
            if (!msg)
            {
                msg = "Unlabelled assert";
            }
            // TODO : Grab information about the caller?
            debug.reportAssert("ASSERT: " + msg);
        }
    }

};
