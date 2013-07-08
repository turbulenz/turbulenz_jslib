// Copyright (c) 2011 Turbulenz Limited


var namedCSSColor = {
    aliceblue : "#f0f8ff",
    antiquewhite : "#faebd7",
    aqua : "#00ffff",
    aquamarine : "#7fffd4",
    azure : "#f0ffff",
    beige : "#f5f5dc",
    bisque : "#ffe4c4",
    black : "#000000",
    blanchedalmond : "#ffebcd",
    blue : "#0000ff",
    blueviolet : "#8a2be2",
    brown : "#a52a2a",
    burlywood : "#deb887",
    cadetblue : "#5f9ea0",
    chartreuse : "#7fff00",
    chocolate : "#d2691e",
    coral : "#ff7f50",
    cornflowerblue : "#6495ed",
    cornsilk : "#fff8dc",
    crimson : "#dc143c",
    cyan : "#00ffff",
    darkblue : "#00008b",
    darkcyan : "#008b8b",
    darkgoldenrod : "#b8860b",
    darkgray : "#a9a9a9",
    darkgrey : "#a9a9a9",
    darkgreen : "#006400",
    darkkhaki : "#bdb76b",
    darkmagenta : "#8b008b",
    darkolivegreen : "#556b2f",
    darkorange : "#ff8c00",
    darkorchid : "#9932cc",
    darkred : "#8b0000",
    darksalmon : "#e9967a",
    darkseagreen : "#8fbc8f",
    darkslateblue : "#483d8b",
    darkslategray : "#2f4f4f",
    darkslategrey : "#2f4f4f",
    darkturquoise : "#00ced1",
    darkviolet : "#9400d3",
    deeppink : "#ff1493",
    deepskyblue : "#00bfff",
    dimgray : "#696969",
    dimgrey : "#696969",
    dodgerblue : "#1e90ff",
    firebrick : "#b22222",
    floralwhite : "#fffaf0",
    forestgreen : "#228b22",
    fuchsia : "#ff00ff",
    gainsboro : "#dcdcdc",
    ghostwhite : "#f8f8ff",
    gold : "#ffd700",
    goldenrod : "#daa520",
    gray : "#808080",
    grey : "#808080",
    green : "#008000",
    greenyellow : "#adff2f",
    honeydew : "#f0fff0",
    hotpink : "#ff69b4",
    indianred : "#cd5c5c",
    indigo : "#4b0082",
    ivory : "#fffff0",
    khaki : "#f0e68c",
    lavender : "#e6e6fa",
    lavenderblush : "#fff0f5",
    lawngreen : "#7cfc00",
    lemonchiffon : "#fffacd",
    lightblue : "#add8e6",
    lightcoral : "#f08080",
    lightcyan : "#e0ffff",
    lightgoldenrodyellow : "#fafad2",
    lightgray : "#d3d3d3",
    lightgrey : "#d3d3d3",
    lightgreen : "#90ee90",
    lightpink : "#ffb6c1",
    lightsalmon : "#ffa07a",
    lightseagreen : "#20b2aa",
    lightskyblue : "#87cefa",
    lightslategray : "#778899",
    lightslategrey : "#778899",
    lightsteelblue : "#b0c4de",
    lightyellow : "#ffffe0",
    lime : "#00ff00",
    limegreen : "#32cd32",
    linen : "#faf0e6",
    magenta : "#ff00ff",
    maroon : "#800000",
    mediumaquamarine : "#66cdaa",
    mediumblue : "#0000cd",
    mediumorchid : "#ba55d3",
    mediumpurple : "#9370d8",
    mediumseagreen : "#3cb371",
    mediumslateblue : "#7b68ee",
    mediumspringgreen : "#00fa9a",
    mediumturquoise : "#48d1cc",
    mediumvioletred : "#c71585",
    midnightblue : "#191970",
    mintcream : "#f5fffa",
    mistyrose : "#ffe4e1",
    moccasin : "#ffe4b5",
    navajowhite : "#ffdead",
    navy : "#000080",
    oldlace : "#fdf5e6",
    olive : "#808000",
    olivedrab : "#6b8e23",
    orange : "#ffa500",
    orangered : "#ff4500",
    orchid : "#da70d6",
    palegoldenrod : "#eee8aa",
    palegreen : "#98fb98",
    paleturquoise : "#afeeee",
    palevioletred : "#d87093",
    papayawhip : "#ffefd5",
    peachpuff : "#ffdab9",
    peru : "#cd853f",
    pink : "#ffc0cb",
    plum : "#dda0dd",
    powderblue : "#b0e0e6",
    purple : "#800080",
    red : "#ff0000",
    rosybrown : "#bc8f8f",
    royalblue : "#4169e1",
    saddlebrown : "#8b4513",
    salmon : "#fa8072",
    sandybrown : "#f4a460",
    seagreen : "#2e8b57",
    seashell : "#fff5ee",
    sienna : "#a0522d",
    silver : "#c0c0c0",
    skyblue : "#87ceeb",
    slateblue : "#6a5acd",
    slategray : "#708090",
    slategrey : "#708090",
    snow : "#fffafa",
    springgreen : "#00ff7f",
    steelblue : "#4682b4",
    tan : "#d2b48c",
    teal : "#008080",
    thistle : "#d8bfd8",
    tomato : "#ff6347",
    turquoise : "#40e0d0",
    violet : "#ee82ee",
    wheat : "#f5deb3",
    white : "#ffffff",
    whitesmoke : "#f5f5f5",
    yellow : "#ffff00",
    yellowgreen : "#9acd32"
};

function parseCSSColor(text, color)
{
    var readInt = parseInt;
    var components;

    text = text.replace(/ /g, '').toLowerCase();

    text = (namedCSSColor[text] || text);

    if (text[0] === '#')
    {
        text = text.substr(1, 6);

        var numChars = text.length;
        if (numChars === 6)
        {
            components = /^(\w{2})(\w{2})(\w{2})$/.exec(text);
            if (components)
            {
                color[0] = (readInt(components[1], 16) / 255);
                color[1] = (readInt(components[2], 16) / 255);
                color[2] = (readInt(components[3], 16) / 255);
                color[3] = 1.0;
                return color;
            }
        }
        else if (numChars === 3)
        {
            components = /^(\w{1})(\w{1})(\w{1})$/.exec(text);
            if (components)
            {
                color[0] = (readInt(components[1], 16) / 15);
                color[1] = (readInt(components[2], 16) / 15);
                color[2] = (readInt(components[3], 16) / 15);
                color[3] = 1.0;
                return color;
            }
        }
    }
    else
    {
        var color_type = text.substr(0, 4);
        if (color_type === 'rgba')
        {
            components = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*\.?\d+)\)$/.exec(text);
            if (components)
            {
                color[0] = readInt(components[1], 10) / 255;
                color[1] = readInt(components[2], 10) / 255;
                color[2] = readInt(components[3], 10) / 255;
                color[3] = parseFloat(components[4]);
                return color;
            }
        }
        else if (color_type === 'rgb(')
        {
            components = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/.exec(text);
            if (components)
            {
                color[0] = readInt(components[1], 10) / 255;
                color[1] = readInt(components[2], 10) / 255;
                color[2] = readInt(components[3], 10) / 255;
                color[3] = 1.0;
                return color;
            }
        }
        else
        {
            if (color_type === 'hsla')
            {
                components = /^hsla\((\d{1,3}),\s*(\d{1,3})\%,\s*(\d{1,3})\%,\s*(\d*\.?\d+)\)$/.exec(text);
                if (components)
                {
                    color[3] = parseFloat(components[4]);
                }
            }
            else if (color_type === 'hsl(')
            {
                components = /^hsl\((\d{1,3}),\s*(\d{1,3})\%,\s*(\d{1,3})\%\)$/.exec(text);
                if (components)
                {
                    color[3] = 1.0;
                }
            }

            if (components)
            {
                var hue = readInt(components[1], 10) / 360;
                var saturation = readInt(components[2], 10) / 100;
                var lightness = readInt(components[3], 10) / 100;
                if (saturation === 0)
                {
                    color[0] = lightness;
                    color[1] = lightness;
                    color[2] = lightness;
                }
                else
                {
                    var m1, m2;
                    if (lightness < 0.5)
                    {
                        m2 = (lightness * (saturation + 1));
                    }
                    else
                    {
                        m2 = ((lightness + saturation) - (lightness * saturation));
                    }
                    m1 = ((lightness * 2) - m2);

                    var hueToRgb = function hueToRgbFn(m1, m2, hue)
                    {
                        if (hue < 0)
                        {
                            hue += 1;
                        }
                        else if (hue > 1)
                        {
                            hue -= 1;
                        }

                        if ((6 * hue) < 1)
                        {
                            return (m1 + ((m2 - m1) * (hue * 6)));
                        }
                        else if ((2 * hue) < 1)
                        {
                            return m2;
                        }
                        else if ((3 * hue) < 2)
                        {
                            return (m1 + ((m2 - m1) * ((2 / 3) - hue) * 6));
                        }
                        else
                        {
                            return m1;
                        }
                    };

                    color[0] = hueToRgb(m1, m2, (hue + (1 / 3)));
                    color[1] = hueToRgb(m1, m2, hue);
                    color[2] = hueToRgb(m1, m2, (hue - (1 / 3)));
                }
                return color;
            }
        }
    }

    return undefined;
}

//
// CanvasLinearGradient
//
function CanvasLinearGradient() {}
CanvasLinearGradient.prototype =
{
    version : 1,

    // Public API
    addColorStop : function addLinearColorStopFn(offset, color)
    {
        if (offset < 0 || offset > 1)
        {
            throw 'INDEX_SIZE_ERR';
        }

        function sortfunction(a, b)
        {
            return (a[0] - b[0]);
        }

        var stops = this.stops;
        var numStops = stops.length;

        var parsedColor = parseCSSColor(color, []);

        if (parsedColor[3] < 1.0)
        {
            this.opaque = false;
        }

        parsedColor[0] = parseInt((parsedColor[0] * 255), 10);
        parsedColor[1] = parseInt((parsedColor[1] * 255), 10);
        parsedColor[2] = parseInt((parsedColor[2] * 255), 10);
        parsedColor[3] = parseInt((parsedColor[3] * 255), 10);
        stops[numStops] = [offset, parsedColor];
        numStops += 1;
        if (numStops > 1)
        {
            stops.sort(sortfunction);
        }
    },

    // Private API
    updateTexture : function updateLinearTextureFn(gd)
    {
        var texture = this.texture;
        var stops = this.stops;
        var numStops = stops.length;
        if (this.numTextureStops !== numStops)
        {
            this.numTextureStops = numStops;

            var width = this.width;
            var height = this.height;

            if (!texture)
            {
                this.texture = texture = gd.createTexture({
                    name    : ('linear:' + width + 'x' + height),
                    width   : width,
                    height  : height,
                    depth   : 1,
                    format  : gd.PIXELFORMAT_R8G8B8A8,
                    cubemap : false,
                    mipmaps : false
                });
            }

            var opaque = this.opaque;

            var lx = (this.x1 - this.x0);
            var ly = (this.y1 - this.y0);
            var ln = ((lx * lx) + (ly * ly));
            if (ln === 0)
            {
                ln = 1;
            }
            else
            {
                ln = (1.0 / Math.sqrt(ln));
            }

            lx *= ln;
            ly *= ln;

            var dx = (lx / (width > 1 ? (width - 1) : 1));
            var dy = (ly / (height > 1 ? (height - 1) : 1));

            var ArrayTypeConstructor = [].constructor;
            var numValues = (width * height * 4);
            var pixelData = new ArrayTypeConstructor(numValues);
            var p = 0;
            var vy = 0;
            for (var y = 0; y < height; y += 1, vy += dy)
            {
                var vyly = (vy * ly);
                var vx = 0;

                for (var x = 0; x < width; x += 1, p += 4, vx += dx)
                {
                    var s = ((vx * lx) + vyly);

                    var currentStop = stops[0];
                    var currentOffset = currentStop[0];
                    var currentColor = currentStop[1];
                    var lastOffset = currentOffset;
                    var lastColor = currentColor;

                    if (s > currentOffset)
                    {
                        for (var ns = 1; ns < numStops; ns += 1)
                        {
                            currentStop = stops[ns];
                            currentOffset = currentStop[0];
                            currentColor = currentStop[1];
                            if (s <= currentOffset)
                            {
                                break;
                            }
                            lastOffset = currentOffset;
                            lastColor = currentColor;
                        }
                    }

                    var da = (currentOffset - lastOffset);
                    if (da <= 0 || s === currentOffset)
                    {
                        pixelData[p] = currentColor[0];
                        pixelData[p + 1] = currentColor[1];
                        pixelData[p + 2] = currentColor[2];
                        if (opaque)
                        {
                            pixelData[p + 3] = 255;
                        }
                        else
                        {
                            pixelData[p + 3] = currentColor[3];
                        }
                    }
                    else
                    {
                        var a = (s - lastOffset) / da;
                        if (a < 0.996)
                        {
                            var inva = (1.0 - a);
                            pixelData[p] = ((currentColor[0] * a) + (lastColor[0] * inva));
                            pixelData[p + 1] = ((currentColor[1] * a) + (lastColor[1] * inva));
                            pixelData[p + 2] = ((currentColor[2] * a) + (lastColor[2] * inva));
                            if (opaque)
                            {
                                pixelData[p + 3] = 255;
                            }
                            else
                            {
                                pixelData[p + 3] = ((currentColor[3] * a) + (lastColor[3] * inva));
                            }
                        }
                        else
                        {
                            pixelData[p] = currentColor[0];
                            pixelData[p + 1] = currentColor[1];
                            pixelData[p + 2] = currentColor[2];
                            if (opaque)
                            {
                                pixelData[p + 3] = 255;
                            }
                            else
                            {
                                pixelData[p + 3] = currentColor[3];
                            }
                        }
                    }
                }
            }

            texture.setData(pixelData);
        }
        return texture;
    }
};

// Constructor function
CanvasLinearGradient.create = function canvasLinearGradientCreateFn(x0, y0, x1, y1)
{
    var dx = (x1 - x0);
    var dy = (y1 - y0);
    var width = Math.abs(dx);
    var height = Math.abs(dy);
    if (width === 0 && height === 0)
    {
        return null;
    }

    // We need minimmal dimensions for minimal quality
    while (width < 16 && height < 16)
    {
        width *= 16;
        height *= 16;
    }

    if (width < 1)
    {
        width = 1;
    }
    else
    {
        width = Math.floor(width);
    }

    if (height < 1)
    {
        height = 1;
    }
    else
    {
        height = Math.floor(height);
    }

    var c = new CanvasLinearGradient();
    c.x0 = x0;
    c.y0 = y0;
    c.x1 = x1;
    c.y1 = y1;
    c.width = width;
    c.height = height;
    c.stops = [];

    var idx = (1.0 / dx);
    var idy = (1.0 / dy);
    c.matrix = [idx, 0, -x0 * idx,
                0, idy, -y0 * idy];

    c.numTextureStops = 0;
    c.texture = null;

    c.opaque = true;

    return c;
};

//
// CanvasRadialGradient
//
function CanvasRadialGradient() {}
CanvasRadialGradient.prototype =
{
    version : 1,

    // Public API
    addColorStop : function addRadialColorStopFn(offset, color)
    {
        if (offset < 0 || offset > 1)
        {
            throw 'INDEX_SIZE_ERR';
        }

        function sortfunction(a, b)
        {
            return (a[0] - b[0]);
        }

        var stops = this.stops;
        var numStops = stops.length;
        var parsedColor = parseCSSColor(color, []);

        if (parsedColor[3] < 1.0)
        {
            this.opaque = false;
        }

        parsedColor[0] = parseInt((parsedColor[0] * 255), 10);
        parsedColor[1] = parseInt((parsedColor[1] * 255), 10);
        parsedColor[2] = parseInt((parsedColor[2] * 255), 10);
        parsedColor[3] = parseInt((parsedColor[3] * 255), 10);
        stops[numStops] = [offset, parsedColor];
        numStops += 1;
        if (numStops > 1)
        {
            stops.sort(sortfunction);
        }
    },

    // Private API
    updateTexture : function updateRadialTextureFn(gd)
    {
        var texture = this.texture;
        var stops = this.stops;
        var numStops = stops.length;
        if (this.numTextureStops !== numStops)
        {
            this.numTextureStops = numStops;

            var width = this.width;
            if (width < numStops)
            {
                this.width = width = numStops;
            }

            var height = this.height;
            if (height < numStops)
            {
                this.height = height = numStops;
            }

            if (!texture ||
                texture.width !== width ||
                texture.height !== height)
            {
                this.texture = texture = gd.createTexture({
                    name    : ('radial:' + width + 'x' + height),
                    width   : width,
                    height  : height,
                    depth   : 1,
                    format  : gd.PIXELFORMAT_R8G8B8A8,
                    cubemap : false,
                    mipmaps : false
                });
            }

            var x0 = (this.x0 - this.minX);
            var x1 = (this.x1 - this.minX);
            var dx = (x1 - x0);

            var y0 = (this.y0 - this.minY);
            var y1 = (this.y1 - this.minY);
            var dy = (y1 - y0);

            var r0 = this.r0;
            var r1 = this.r1;
            var dr = (r1 - r0);

            var ArrayTypeConstructor = [].constructor;
            var numValues = (width * height * 4);
            var pixelData = new ArrayTypeConstructor(numValues);

            var cos = Math.cos;
            var sin = Math.sin;
            var abs = Math.abs;
            var pi2 = (Math.PI * 2);

            /*jslint bitwise: false*/
            var numSteps = Math.max(abs(dx | 0), abs(dy | 0), abs(dr | 0));
            /*jslint bitwise: true*/

            var dw = (1.0 / numSteps);
            var c0, c1, c2, c3;
            for (var w = 0.0; w <= 1.0; w += dw)
            {
                var currentStop = stops[0];
                var currentOffset = currentStop[0];
                var currentColor = currentStop[1];
                var lastOffset = currentOffset;
                var lastColor = currentColor;

                if (w > currentOffset)
                {
                    for (var ns = 1; ns < numStops; ns += 1)
                    {
                        currentStop = stops[ns];
                        currentOffset = currentStop[0];
                        currentColor = currentStop[1];
                        if (w <= currentOffset)
                        {
                            break;
                        }
                        lastOffset = currentOffset;
                        lastColor = currentColor;
                    }
                }

                var da = (currentOffset - lastOffset);
                if (da <= 0 || w === currentOffset)
                {
                    c0 = currentColor[0];
                    c1 = currentColor[1];
                    c2 = currentColor[2];
                    c3 = currentColor[3];
                }
                else
                {
                    var a = (w - lastOffset) / da;
                    var inva = (1.0 - a);
                    c0 = ((currentColor[0] * a) + (lastColor[0] * inva));
                    c1 = ((currentColor[1] * a) + (lastColor[1] * inva));
                    c2 = ((currentColor[2] * a) + (lastColor[2] * inva));
                    c3 = ((currentColor[3] * a) + (lastColor[3] * inva));
                }

                var x = (x0 + (w * dx));
                var y = (y0 + (w * dy));
                var r = (r0 + (w * dr));

                var angle, dangle, cx, cy, p;
                for (var cr = 1; cr < r; cr += 1)
                {
                    dangle = (1.0 / cr);
                    for (angle = 0; angle < pi2; angle += dangle)
                    {
                        /*jslint bitwise: false*/
                        cx = ((x + (cr * cos(angle))) | 0);
                        cy = ((y + (cr * sin(angle))) | 0);
                        p = ((cx + (cy * width)) << 2);
                        /*jslint bitwise: true*/
                        if (pixelData[p + 3] === undefined)
                        {
                            pixelData[p] = c0;
                            pixelData[p + 1] = c1;
                            pixelData[p + 2] = c2;
                            pixelData[p + 3] = c3;
                        }
                    }
                }

                dangle = (1.0 / r);
                for (angle = 0; angle < pi2; angle += dangle)
                {
                    /*jslint bitwise: false*/
                    cx = ((x + (r * cos(angle))) | 0);
                    cy = ((y + (r * sin(angle))) | 0);
                    p = ((cx + (cy * width)) << 2);
                    /*jslint bitwise: true*/
                    if (pixelData[p + 3] === undefined)
                    {
                        pixelData[p] = c0;
                        pixelData[p + 1] = c1;
                        pixelData[p + 2] = c2;
                        pixelData[p + 3] = c3;
                    }
                }
            }

            var outColor = stops[numStops - 1][1];
            var out0 = outColor[0];
            var out1 = outColor[1];
            var out2 = outColor[2];
            var out3 = outColor[3];
            for (var n = 0; n < numValues; n += 4)
            {
                if (pixelData[n + 3] === undefined)
                {
                    pixelData[n] = out0;
                    pixelData[n + 1] = out1;
                    pixelData[n + 2] = out2;
                    pixelData[n + 3] = out3;
                }
            }

            texture.setData(pixelData);
        }
        return texture;
    }
};

// Constructor function
CanvasRadialGradient.create = function canvasRadialGradientCreateFn(x0, y0, r0, x1, y1, r1)
{
    if (r0 < 0 || r1 < 0)
    {
        throw 'INDEX_SIZE_ERR';
    }

    var c = new CanvasRadialGradient();
    c.x0 = x0;
    c.y0 = y0;
    c.r0 = r0;
    c.x1 = x1;
    c.y1 = y1;
    c.r1 = r1;

    var minX = (Math.min((x0 - r0), (x1 - r1)) - 1);
    var maxX = (Math.max((x0 + r0), (x1 + r1)) + 1);
    var minY = (Math.min((y0 - r0), (y1 - r1)) - 1);
    var maxY = (Math.max((y0 + r0), (y1 + r1)) + 1);

    c.minX = minX;
    c.minY = minY;
    c.stops = [];

    var width = Math.ceil(maxX - minX);
    var height = Math.ceil(maxY - minY);
    if (!width || !height)
    {
        return null;
    }
    c.width = width;
    c.height = height;

    var idx = (1.0 / width);
    var idy = (1.0 / height);

    c.matrix = [idx, 0, -minX * idx,
                0, idy, -minY * idy];

    c.numTextureStops = 0;
    c.texture = null;

    c.opaque = true;

    return c;
};

//
// CanvasContext
//
function CanvasContext() {}
CanvasContext.prototype =
{
    version : 1,

    compositeOperations :
    {
        'source-atop' : 1,
        'source-in' : 1,
        'source-out' : 1,
        'source-over' : 1,
        'destination-atop' : 1,
        'destination-in' : 1,
        'destination-out' : 1,
        'destination-over' : 1,
        'lighter' : 1,
        'copy' : 1,
        'xor' : 1
    },

    capStyles :
    {
        'butt' : 1,
        'round' : 1,
        'square' : 1
    },

    joinStyles :
    {
        'bevel' : 1,
        'round' : 1,
        'miter' : 1
    },

    arrayTypeConstructor : [].constructor,

    //
    // Public canvas 2D context API
    //
    save : function saveFn()
    {
        var statesStack = this.statesStack;
        statesStack[statesStack.length] = this.getStates();
    },

    restore : function restoreFn()
    {
        var statesStack = this.statesStack;
        if (statesStack.length >= 1)
        {
            this.setStates(statesStack.pop());
        }
    },


    scale : function scaleFn(x, y)
    {
        var m = this.matrix;
        m[0] *= x;
        m[1] *= y;
        m[3] *= x;
        m[4] *= y;
    },

    rotate : function rotateFn(angle)
    {
        if (angle)
        {
            var s = Math.sin(angle);
            var c = Math.cos(angle);
            this.transform(c, s, -s, c, 0, 0);
        }
    },

    translate : function translateFn(x, y)
    {
        var m = this.matrix;
        m[2] += (m[0] * x + m[1] * y);
        m[5] += (m[3] * x + m[4] * y);
    },

    transform : function transformFn(a, b, c, d, e, f)
    {
        var m = this.matrix;
        var m0 = m[0];
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m4 = m[4];
        var m5 = m[5];

        m[0] = (m0 * a + m1 * b);
        m[3] = (m3 * a + m4 * b);
        m[1] = (m0 * c + m1 * d);
        m[4] = (m3 * c + m4 * d);
        m[2] = (m0 * e + m1 * f + m2);
        m[5] = (m3 * e + m4 * f + m5);
    },

    setTransform : function setTransformFn(a, b, c, d, e, f)
    {
        var m = this.matrix;
        m[0] = a;
        m[1] = c;
        m[2] = e;
        m[3] = b;
        m[4] = d;
        m[5] = f;
    },


    createLinearGradient : function createLinearGradientFn(x0, y0, x1, y1)
    {
        return CanvasLinearGradient.create(x0, y0, x1, y1);
    },

    createRadialGradient : function createRadialGradientFn(x0, y0, r0, x1, y1, r1)
    {
        return CanvasRadialGradient.create(x0, y0, r0, x1, y1, r1);
    },

    createPattern : function createPatternFn(image, repetition)
    {
        if (!image)
        {
            throw 'INVALID_STATE_ERR';
        }

        if (image.width === 0 ||
            image.height === 0)
        {
            return null;
        }

        return image;
    },


    clearRect : function clearRectFn(x, y, w, h)
    {
        if (w > 0 && h > 0)
        {
            var rect = this.transformRect(x, y, w, h);
            this.fillFlatVertices(rect, 4);

            var technique = this.flatTechniques.copy;
            var gd = this.gd;

            gd.setTechnique(technique);

            technique.screen = this.screen;
            technique.color = this.v4Zero;

            gd.draw(this.triangleStripPrimitive, 4);
        }
    },

    fillRect : function fillRectFn(x, y, w, h)
    {
        if (w > 0 && h > 0)
        {
            var rect = this.transformRect(x, y, w, h);
            this.fillFlatVertices(rect, 4);

            var primitive = this.triangleStripPrimitive;
            var style = this.fillStyle;
            var gd = this.gd;

            if (this.setShadowStyle(style))
            {
                gd.draw(primitive, 4);
            }

            this.setStyle(style);

            gd.draw(primitive, 4);
        }
    },

    strokeRect : function strokeRectFn(x, y, w, h)
    {
        if (w > 0 || h > 0)
        {
            var rect = this.transformRect(x, y, w, h);
            var points = [rect[2], rect[3], rect[1], rect[0], rect[2]];

            var style = this.strokeStyle;
            var lineWidth = this.lineWidth;
            var thinLines = (lineWidth < 2 && !this.forceFatLines);

            var primitive;
            var vertices;
            var numVertices = 0;

            if (thinLines)
            {
                primitive = this.lineStripPrimitive;
                vertices = points;
                numVertices = 5;
            }
            else
            {
                primitive = this.triangleStripPrimitive;
                vertices = this.tempVertices;
                numVertices = this.triangulateFatStrip(points, 5, lineWidth, vertices, numVertices);
            }

            if (numVertices > 0)
            {
                this.fillFlatVertices(vertices, numVertices);

                var gd = this.gd;

                if (this.setShadowStyle(style))
                {
                    gd.draw(primitive, numVertices);
                }

                this.setStyle(style);

                gd.draw(primitive, numVertices);
            }
        }
    },


    beginPath : function beginPathFn()
    {
        this.subPaths.length = 0;
        this.currentSubPath.length = 0;
    },

    closePath : function closePathFn()
    {
        var currentSubPath = this.currentSubPath;
        var numCurrentSubPathElements = currentSubPath.length;
        if (numCurrentSubPathElements > 1)
        {
            var firstPoint = currentSubPath[0];

            // Close current subpath if not just a single segment
            if (numCurrentSubPathElements > 2)
            {
                var lastPoint = currentSubPath[numCurrentSubPathElements - 1];
                if (firstPoint[0] !== lastPoint[0] &&
                    firstPoint[1] !== lastPoint[2])
                {
                    currentSubPath[numCurrentSubPathElements] = firstPoint;
                }
            }

            var subPaths = this.subPaths;
            subPaths[subPaths.length] = currentSubPath;

            this.currentSubPath = [firstPoint];
        }
    },

    moveTo : function moveToFn(x, y)
    {
        var currentSubPath = this.currentSubPath;
        if (currentSubPath.length > 1)
        {
            var subPaths = this.subPaths;
            subPaths[subPaths.length] = currentSubPath;

            this.currentSubPath = [this.transformPoint(x, y)];
        }
        else
        {
            currentSubPath[0] = this.transformPoint(x, y);
        }
    },

    lineTo : function lineToFn(x, y)
    {
        var currentSubPath = this.currentSubPath;
        currentSubPath[currentSubPath.length] = this.transformPoint(x, y);
    },

    quadraticCurveTo : function quadraticCurveToFn(cpx, cpy, x, y)
    {
        var currentSubPath = this.currentSubPath;
        var numCurrentSubPathElements = currentSubPath.length;
        if (numCurrentSubPathElements === 0)
        {
            throw 'Needs starting point!';
        }

        var p1 = currentSubPath[numCurrentSubPathElements - 1];
        var x1 = p1[0];
        var y1 = p1[1];

        var q = this.transformPoint(cpx, cpy);
        var xq = q[0];
        var yq = q[1];

        var p2 = this.transformPoint(x, y);
        var x2 = p2[0];
        var y2 = p2[1];

        var abs = Math.abs;
        /*jslint bitwise: false*/
        var numSteps = ((0.5 * (abs(x2 - x1) + abs(y2 - y1))) | 0);
        /*jslint bitwise: true*/
        var dt = (1.0 / numSteps);
        for (var t = dt; 1 < numSteps; t += dt, numSteps -= 1)
        {
            var invt = (1.0 - t);
            var invt2 = (invt * invt);
            var t2 = (t * t);
            var tinvt = (2 * t * invt);
            currentSubPath[numCurrentSubPathElements] = [((invt2 * x1) + (tinvt * xq) + (t2 * x2)),
                                                         ((invt2 * y1) + (tinvt * yq) + (t2 * y2))];
            numCurrentSubPathElements += 1;
        }

        currentSubPath[numCurrentSubPathElements] = [x2, y2];
    },

    bezierCurveTo : function bezierCurveToFn(cp1x, cp1y, cp2x, cp2y, x, y)
    {
        var currentSubPath = this.currentSubPath;
        var numCurrentSubPathElements = currentSubPath.length;
        if (numCurrentSubPathElements === 0)
        {
            throw 'Needs starting point!';
        }

        var p1 = currentSubPath[numCurrentSubPathElements - 1];
        var x1 = p1[0];
        var y1 = p1[1];

        var q1 = this.transformPoint(cp1x, cp1y);
        var xq1 = q1[0];
        var yq1 = q1[1];

        var q2 = this.transformPoint(cp2x, cp2y);
        var xq2 = q2[0];
        var yq2 = q2[1];

        var p2 = this.transformPoint(x, y);
        var x2 = p2[0];
        var y2 = p2[1];

        var abs = Math.abs;
        /*jslint bitwise: false*/
        var numSteps = ((0.5 * (abs(x2 - x1) + abs(y2 - y1))) | 0);
        /*jslint bitwise: true*/
        var dt = (1.0 / numSteps);
        for (var t = dt; 1 < numSteps; t += dt, numSteps -= 1)
        {
            var invt = (1.0 - t);
            var invt2 = (invt * invt);
            var invt3 = (invt2 * invt);
            var t2 = (t * t);
            var t3 = (t2 * t);
            var tinvt = (3 * t * invt2);
            var invtt = (3 * t2 * invt);
            currentSubPath[numCurrentSubPathElements] = [((invt3 * x1) + (tinvt * xq1) + (invtt * xq2) + (t3 * x2)),
                                                         ((invt3 * y1) + (tinvt * yq1) + (invtt * yq2) + (t3 * y2))];
            numCurrentSubPathElements += 1;
        }

        currentSubPath[numCurrentSubPathElements] = [x2, y2];
    },

    arcTo : function arcToFn(x1, y1, x2, y2, radius)
    {
        if (radius < 0)
        {
            throw 'INDEX_SIZE_ERR';
        }

        var x0, y0;

        var currentSubPath = this.currentSubPath;
        var numCurrentSubPathElements = currentSubPath.length;
        if (numCurrentSubPathElements === 0)
        {
            currentSubPath[0] = this.transformPoint(x1, y1);
            numCurrentSubPathElements = 1;

            x0 = x1;
            y0 = y1;
        }
        else
        {
            var p0 = this.untransformPoint(currentSubPath[numCurrentSubPathElements - 1]);
            x0 = p0[0];
            y0 = p0[1];
        }

        var dx0 = (x0 - x1);
        var dy0 = (y0 - y1);
        var ln0 = ((dx0 * dx0) + (dy0 * dy0));

        var dx2 = (x2 - x1);
        var dy2 = (y2 - y1);
        var ln2 = ((dx2 * dx2) + (dy2 * dy2));

        if (radius < 2 ||
            ln0 < 2 ||
            ln2 < 2)
        {
            currentSubPath.push(this.transformPoint(x1, y1));
        }
        else
        {
            var sqrt = Math.sqrt;
            var acos = Math.acos;
            var pi = Math.PI;

            ln0 = 1.0 / sqrt(ln0);
            dx0 *= ln0;
            dy0 *= ln0;

            ln2 = 1.0 / sqrt(ln2);
            dx2 *= ln2;
            dy2 *= ln2;

            // Calculate unit vector from x1 to center
            var dxc = (dx0 + dx2);
            var dyc = (dy0 + dy2);
            var lnc = (1.0 / sqrt((dxc * dxc) + (dyc * dyc)));
            dxc *= lnc;
            dyc *= lnc;

            // Calculate angle from vector to center with the vector to x2 using dot product
            // Use it to calculate distance to center
            var dot = ((dxc * dx2) + (dyc * dy2));
            var h = (radius / dot); // dot = Math.cos(angle)

            var cp = this.transformPoint((x1 + (h * dxc)),
                                         (y1 + (h * dyc)));
            var cx = cp[0];
            var cy = cp[1];

            var anticlockwise = (((dx0 * dy2) - (dx2 * dy0)) > 0);

            var da = acos(-dxc);
            if (dyc < 0)
            {
                da = -da;
            }
            da = ((0.5 * pi) - da);

            var angle = acos(dot);
            var startAngle = (pi + angle + da);
            var endAngle = ((2 * pi) - angle + da);
            if (anticlockwise)
            {
                this.interpolateArc(cx, cy, radius, endAngle, startAngle, true);
            }
            else
            {
                this.interpolateArc(cx, cy, radius, startAngle, endAngle);
            }
        }
    },

    arc : function arcFn(x, y, radius, startAngle, endAngle, anticlockwise)
    {
        if (radius < 0)
        {
            throw 'INDEX_SIZE_ERR';
        }

        var cp = this.transformPoint(x, y);

        var currentSubPath = this.currentSubPath;

        if (radius < 2.0)
        {
            currentSubPath.push(cp);
        }
        else
        {
            this.interpolateArc(cp[0], cp[1], radius, startAngle, endAngle, anticlockwise);
        }
    },

    rect : function rectFn(x, y, w, h)
    {
        var subPaths = this.subPaths;
        var numSubPaths = subPaths.length;
        var currentSubPath = this.currentSubPath;
        if (currentSubPath.length > 1)
        {
            subPaths[numSubPaths] = currentSubPath;
            numSubPaths += 1;
        }

        var rect = this.transformRect(x, y, w, h);
        var p0 = rect[0];
        var p1 = rect[1];
        var p2 = rect[2];
        var p3 = rect[3];

        subPaths[numSubPaths] = [p2, p3, p1, p0, p2];

        this.currentSubPath = [p0];
    },

    path : function pathFn(path)
    {
        var end = path.length;
        var currentCommand = -1, previousCommand = -1;
        var i = 0;

        function skipWhiteSpace()
        {
            var c = path.charCodeAt(i);
            while (c <= 32 || c === 44) // whitespace or ,
            {
                i += 1;
                if (i >= end)
                {
                    return -1;
                }
                c = path.charCodeAt(i);
            }
            return c;
        }

        function readNumber()
        {
            var c = path.charCodeAt(i);
            while (c <= 32 || c === 44) // whitespace or ,
            {
                i += 1;
                if (i >= end)
                {
                    throw "Reached end of string without required coordinate.";
                }
                c = path.charCodeAt(i);
            }

            var start = i;

            if (c === 45 || //-
                c === 43) //+
            {
                i += 1;
                if (i >= end)
                {
                    return 0;
                }
                c = path.charCodeAt(i);
            }

            while (c >= 48 && c <= 57) //0-9
            {
                i += 1;
                if (i >= end)
                {
                    break;
                }
                c = path.charCodeAt(i);
            }

            if (c === 46 || //.
                c === 101 || //e
                c === 101) //E
            {
                if (c === 46) //.
                {
                    do
                    {
                        i += 1;
                        if (i >= end)
                        {
                            break;
                        }
                        c = path.charCodeAt(i);
                    }
                    while (c >= 48 && c <= 57); //0-9
                }

                if (c === 101 || //e
                    c === 101) //E
                {
                    i += 1;
                    if (i < end)
                    {
                        c = path.charCodeAt(i);

                        if (c === 45 || //-
                            c === 43) //+
                        {
                            i += 1;
                            if (i < end)
                            {
                                c = path.charCodeAt(i);
                            }
                        }

                        while (c >= 48 && c <= 57) //0-9
                        {
                            i += 1;
                            if (i >= end)
                            {
                                break;
                            }
                            c = path.charCodeAt(i);
                        }
                    }
                }

                return parseFloat(path.slice(start, i));
            }
            else
            {
                return parseInt(path.slice(start, i), 10);
            }
        }

        function readFlag()
        {
            var c = skipWhiteSpace();
            if (c < -1)
            {
                throw "Reached end of string without required flag.";
            }

            if (c === 48) //0
            {
                i += 1;
                return false;
            }
            else if (c === 49) //1
            {
                i += 1;
                return true;
            }
            else
            {
                throw "Unknown flag: " + path.slice(i);
            }
        }

        function getRatio(u, v)
        {
            var u0 = u[0];
            var u1 = u[1];
            var v0 = v[0];
            var v1 = v[1];
            return ((u0 * v0) + (u1 * v1)) / Math.sqrt(((u0 * u0) + (u1 * u1)) * ((v0 * v0) + (v1 * v1)));
        }

        function getAngle(u, v)
        {
            return ((u[0] * v[1]) < (u[1] * v[0]) ? -1 : 1) * Math.acos(getRatio(u, v));
        }

        var lx = 0;
        var ly = 0;

        var x, y, x1, y1, x2, y2;
        var rx, ry, angle, largeArcFlag, sweepFlag;

        while (i < end)
        {
            // Skip whitespace
            var c = skipWhiteSpace();
            if (c < 0)
            {
                // end of string
                return;
            }

            // Same command, new arguments?
            if (c === 43 || //+
                c === 45 || //-
                c === 46 || //.
                (c >= 48 && c <= 57)) //0-9
            {
                if (currentCommand < 0)
                {
                    throw "Coordinates without a command: " + path.slice(i);
                }
                else
                {
                    // Implicit lineTo after moveTo?
                    if (currentCommand === 77) //M
                    {
                        currentCommand = 76; //L
                    }
                    else if (currentCommand === 109) //m
                    {
                        currentCommand = 108; //l
                    }
                }
            }
            else
            {
                previousCommand = currentCommand;
                currentCommand = c;
                i += 1;
            }

            switch (currentCommand)
            {
            case 77: //M
            case 109: //m
                x = readNumber();
                y = readNumber();
                if (currentCommand === 109) //m
                {
                    x += lx;
                    y += ly;
                }
                this.moveTo(x, y);
                break;

            case 76: //L
            case 108: //l
                x = readNumber();
                y = readNumber();
                if (currentCommand === 108) //l
                {
                    x += lx;
                    y += ly;
                }
                this.lineTo(x, y);
                break;

            case 72: //H
            case 104: //h
                x = readNumber();
                if (currentCommand === 104) //h
                {
                    x += lx;
                }
                y = ly;
                this.lineTo(x, y);
                break;

            case 86: //V
            case 118: //v
                x = lx;
                y = readNumber();
                if (currentCommand === 118) //v
                {
                    y += ly;
                }
                this.lineTo(x, y);
                break;

            case 67: //C
            case 99: //c
                x1 = readNumber();
                y1 = readNumber();
                x2 = readNumber();
                y2 = readNumber();
                x = readNumber();
                y = readNumber();
                if (currentCommand === 99) //c
                {
                    x1 += lx;
                    y1 += ly;
                    x2 += lx;
                    y2 += ly;
                    x += lx;
                    y += ly;
                }
                this.bezierCurveTo(x1, y1, x2, y2, x, y);
                break;

            case 83: //S
            case 115: //s
                if (previousCommand === 67 || //C
                    previousCommand === 99 || //c
                    previousCommand === 83 || //S
                    previousCommand === 115) //s
                {
                    x1 = ((2 * lx) - x2);
                    y1 = ((2 * ly) - y2);
                }
                else
                {
                    x1 = lx;
                    y1 = ly;
                }
                x2 = readNumber();
                y2 = readNumber();
                x = readNumber();
                y = readNumber();
                if (currentCommand === 115) //s
                {
                    x2 += lx;
                    y2 += ly;
                    x += lx;
                    y += ly;
                }
                this.bezierCurveTo(x1, y1, x2, y2, x, y);
                break;

            case 81: //Q
            case 113: //q
                x1 = readNumber();
                y1 = readNumber();
                x = readNumber();
                y = readNumber();
                if (currentCommand === 113) //q
                {
                    x1 += lx;
                    y1 += ly;
                    x += lx;
                    y += ly;
                }
                this.quadraticCurveTo(x1, y1, x, y);
                break;

            case 84: //T
            case 116: //t
                if (previousCommand === 81 || //Q
                    previousCommand === 113 || //q
                    previousCommand === 84 || //T
                    previousCommand === 116) //t
                {
                    x1 = ((2 * lx) - x1);
                    y1 = ((2 * ly) - y1);
                }
                else
                {
                    x1 = lx;
                    y1 = ly;
                }
                x = readNumber();
                y = readNumber();
                if (currentCommand === 116) //t
                {
                    x += lx;
                    y += ly;
                }
                this.quadraticCurveTo(x1, y1, x, y);
                break;

            case 65: //A
            case 97: //a
                var pi = Math.PI;
                x1 = lx;
                y1 = ly;
                rx = readNumber();
                ry = readNumber();
                angle = (readNumber() * (pi / 180.0));
                largeArcFlag = readFlag();
                sweepFlag = readFlag();
                x = readNumber();
                y = readNumber();
                if (currentCommand === 97) //a
                {
                    x += lx;
                    y += ly;
                }

                var sqrt = Math.sqrt;
                var ca = Math.cos(angle);
                var sa = Math.sin(angle);

                var hdx = (x1 - x) * 0.5;
                var hdy = (y1 - y) * 0.5;
                var x1b = ca * hdx + sa * hdy;
                var x1b2 = (x1b * x1b);
                var y1b = -sa * hdx + ca * hdy;
                var y1b2 = (y1b * y1b);

                // adjust radii
                var l = x1b2 / (rx * rx) + y1b2 / (ry * ry);
                if (l > 1)
                {
                    var lsq = sqrt(l);
                    rx *= lsq;
                    ry *= lsq;
                }

                var rx2 = (rx * rx);
                var invrx = (1 / rx);
                var ry2 = (ry * ry);
                var invry = (1 / ry);

                // cx', cy'
                var s = (largeArcFlag === sweepFlag ? -1 : 1) * sqrt(
                        ((rx2 * ry2) - (rx2 * y1b2) - (ry2 * x1b2)) / (rx2 * y1b2 + ry2 * x1b2));
                if (isNaN(s))
                {
                    s = 0;
                }
                var cxb = s * rx * y1b * invry;
                var cyb = s * -ry * x1b * invrx;

                var cx = (x1 + x) * 0.5 + ca * cxb - sa * cyb;
                var cy = (y1 + y) * 0.5 + sa * cxb + ca * cyb;

                var u = [(x1b - cxb) * invrx, (y1b - cyb) * invry];
                var v = [(-x1b - cxb) * invrx, (-y1b - cyb) * invry];

                // initial angle
                var a1 = getAngle([1, 0], u);

                // angle delta
                var ad;
                var ratio = getRatio(u, v);
                if (ratio <= -1)
                {
                    ad = pi;
                }
                else if (ratio >= 1)
                {
                    ad = 0;
                }
                else
                {
                    ad = getAngle(u, v);
                }

                if (!sweepFlag)
                {
                    if (ad > 0)
                    {
                        ad = ad - (2 * pi);
                    }
                }
                else //if (sweepFlag)
                {
                    if (ad < 0)
                    {
                        ad = ad + (2 * pi);
                    }
                }

                var radius, sx, sy;
                if (rx === ry)
                {
                    radius = rx;
                    sx = 1;
                    sy = 1;
                }
                else if (rx > ry)
                {
                    radius = rx;
                    sx = 1;
                    sy = ry * invrx;
                }
                else //if (rx < ry)
                {
                    radius = ry;
                    sx = rx * invry;
                    sy = 1;
                }

                if (angle !== 0 || sx !== 1 || sy !== 1)
                {
                    this.translate(cx, cy);
                    if (angle !== 0)
                    {
                        this.rotate(angle);
                    }
                    if (sx !== 1 || sy !== 1)
                    {
                        this.scale(sx, sy);
                    }

                    this.arc(0, 0, radius, a1, (a1 + ad), (true - sweepFlag));

                    if (sx !== 1 || sy !== 1)
                    {
                        this.scale((1 / sx), (1 / sy));
                    }
                    if (angle !== 0)
                    {
                        this.rotate(-angle);
                    }
                    this.translate(-cx, -cy);
                }
                else
                {
                    this.arc(cx, cy, radius, a1, (a1 + ad), (true - sweepFlag));
                }
                break;

            case 90: //Z
            case 122: //z
                var firstPoint = this.currentSubPath[0];
                x = firstPoint[0];
                y = firstPoint[1];
                this.closePath();
                break;

            default:
                throw "Unknown command: " + path.slice(i);
            }

            lx = x;
            ly = y;
        }
    },

    fill : function fillFn()
    {
        var subPaths = this.subPaths;
        var numSubPaths = subPaths.length;
        var currentSubPath = this.currentSubPath;
        if (numSubPaths > 0 ||
            currentSubPath.length > 2)
        {
            var autoClose = this.autoClose;
            var isConvex = this.isConvex;
            var points, numPoints, numSegments;

            var style = this.fillStyle;

            var primitive;
            var vertices;
            var numVertices = 0;

            if (numSubPaths > 1 ||
                (numSubPaths === 1 &&
                 currentSubPath.length > 2))
            {
                primitive = this.trianglePrimitive;
                vertices = this.tempVertices;

                for (var i = 0; i < numSubPaths; i += 1)
                {
                    points = subPaths[i];
                    numPoints = points.length;
                    if (numPoints > 2)
                    {
                        numPoints = autoClose(points, numPoints);
                        numSegments = (numPoints - 1);
                        if (isConvex(points, numSegments))
                        {
                            numVertices = this.triangulateConvex(points, numSegments, vertices, numVertices);
                        }
                        else
                        {
                            numVertices = this.triangulateConcave(points, numSegments, vertices, numVertices);
                        }
                    }
                }

                points = currentSubPath;
                numPoints = points.length;
                if (numPoints > 2)
                {
                    numPoints = autoClose(points, numPoints);
                    numSegments = (numPoints - 1);
                    if (isConvex(points, numSegments))
                    {
                        numVertices = this.triangulateConvex(points, numSegments, vertices, numVertices);
                    }
                    else
                    {
                        numVertices = this.triangulateConcave(points, numSegments, vertices, numVertices);
                    }
                }
            }
            else
            {
                if (numSubPaths > 0)
                {
                    points = subPaths[0];
                }
                else
                {
                    points = currentSubPath;
                }

                numPoints = points.length;
                if (numPoints > 2)
                {
                    numPoints = autoClose(points, numPoints);
                    numSegments = (numPoints - 1);

                    if (isConvex(points, numSegments))
                    {
                        primitive = this.triangleFanPrimitive;
                        vertices = points;
                        numVertices = numSegments;
                    }
                    else
                    {
                        primitive = this.trianglePrimitive;
                        vertices = this.tempVertices;
                        numVertices = this.triangulateConcave(points, numSegments, vertices, 0);
                    }
                }
            }

            if (numVertices > 0)
            {
                this.fillFlatVertices(vertices, numVertices);

                var gd = this.gd;

                if (this.setShadowStyle(style))
                {
                    gd.draw(primitive, numVertices);
                }

                this.setStyle(style);

                gd.draw(primitive, numVertices);
            }
        }
    },

    stroke : function strokeFn()
    {
        var subPaths = this.subPaths;
        var numSubPaths = subPaths.length;
        var currentSubPath = this.currentSubPath;
        if (numSubPaths > 0 ||
            currentSubPath.length > 0)
        {
            var gd = this.gd;
            var style = this.strokeStyle;
            var lineWidth = this.lineWidth;
            var thinLines = (lineWidth < 2 && !this.forceFatLines);

            var points, numPoints, primitive, vertices, numVertices;

            for (var i = 0; i < numSubPaths; i += 1)
            {
                points = subPaths[i];
                numPoints = points.length;
                if (thinLines)
                {
                    primitive = this.lineStripPrimitive;
                    vertices = points;
                    numVertices = numPoints;
                }
                else if (numPoints > 1)
                {
                    primitive = this.triangleStripPrimitive;
                    vertices = this.tempVertices;
                    numVertices = this.triangulateFatStrip(points, numPoints, lineWidth, vertices, 0);
                }

                this.fillFlatVertices(vertices, numVertices);

                if (this.setShadowStyle(style))
                {
                    gd.draw(primitive, numVertices);
                }

                this.setStyle(style);

                gd.draw(primitive, numVertices);
            }

            points = currentSubPath;
            numPoints = points.length;
            if (numPoints > 0)
            {
                if (thinLines)
                {
                    primitive = this.lineStripPrimitive;
                    vertices = points;
                    numVertices = numPoints;
                }
                else if (numPoints > 1)
                {
                    primitive = this.triangleStripPrimitive;
                    vertices = this.tempVertices;
                    numVertices = this.triangulateFatStrip(points, numPoints, lineWidth, vertices, 0);
                }

                this.fillFlatVertices(vertices, numVertices);

                if (this.setShadowStyle(style))
                {
                    gd.draw(primitive, numVertices);
                }

                this.setStyle(style);

                gd.draw(primitive, numVertices);
            }
        }
    },


    drawSystemFocusRing : function drawSystemFocusRingFn(element)
    {
        // TODO
    },

    drawCustomFocusRing : function drawCustomFocusRingFn(element)
    {
        // TODO
        return false;
    },

    scrollPathIntoView : function scrollPathIntoViewFn()
    {
        // TODO
    },

    clip : function clipFn()
    {
        // Get copy of sub paths
        var points, numPoints, i, j, point, x, y;
        var numClipSubPaths = 0;
        var clipSubPaths = [];

        var subPaths = this.subPaths;
        var numSubPaths = subPaths.length;
        if (numSubPaths > 0)
        {
            clipSubPaths.length = numSubPaths;
            i = 0;
            do
            {
                points = subPaths[i];
                if (points.length > 2)
                {
                    clipSubPaths[numClipSubPaths] = points.slice();
                    numClipSubPaths += 1;
                }

                i += 1;
            }
            while (i < numSubPaths);
        }

        var currentSubPath = this.currentSubPath;
        if (currentSubPath.length > 2)
        {
            clipSubPaths[numClipSubPaths] = currentSubPath.slice();
            numClipSubPaths += 1;
        }

        if (numClipSubPaths === 0)
        {
            return;
        }

        var autoClose = this.autoClose;

        // Calculate bounding box of current path
        var minX, minY, maxX, maxY;
        i = 0;
        do
        {
            points = clipSubPaths[i];
            numPoints = autoClose(points, points.length);

            j = 0;

            if (minX === undefined)
            {
                point = points[0];
                minX = maxX = point[0];
                minY = maxY = point[1];
                j = 1;
            }

            do
            {
                point = points[j];
                x = point[0];
                y = point[1];

                if (minX > x)
                {
                    minX = x;
                }
                else if (maxX < x)
                {
                    maxX = x;
                }

                if (minY > y)
                {
                    minY = y;
                }
                else if (maxY < y)
                {
                    maxY = y;
                }

                j += 1;
            }
            while (j < numPoints);

            i += 1;
        }
        while (i < numClipSubPaths);

        // Intersect current clipExtents with bounding boxes of current paths
        var clipExtents = this.clipExtents;
        var minClipX = clipExtents[0];
        var minClipY = clipExtents[1];
        var maxClipX = clipExtents[2];
        var maxClipY = clipExtents[3];
        minClipX = (minClipX > minX ? minClipX : minX);
        minClipY = (minClipY > minY ? minClipY : minY);
        maxClipX = (maxClipX < maxX ? maxClipX : maxX);
        maxClipY = (maxClipY < maxY ? maxClipY : maxY);
        clipExtents[0] = minClipX;
        clipExtents[1] = minClipY;
        clipExtents[2] = maxClipX;
        clipExtents[3] = maxClipY;

        // Update scissor rectangle to at least have rectangular clipping
        this.updateScissor();

        // TODO: non rectangular clipping
    },

    isPointInPath : function isPointInPathFn(x, y)
    {
        var subPaths = this.subPaths;
        var numSubPaths = subPaths.length;
        if (numSubPaths > 0)
        {
            for (var i = 0; i < numSubPaths; i += 1)
            {
                if (this.isPointInSubPath(x, y, subPaths[i]))
                {
                    return true;
                }
            }
        }

        var currentSubPath = this.currentSubPath;
        if (this.isPointInSubPath(x, y, currentSubPath))
        {
            return true;
        }

        return false;
    },


    fillText : function fillTextFn(text, x, y, maxWidth)
    {
        if (maxWidth !== undefined && maxWidth <= 0)
        {
            return;
        }

        var fm = this.fm;
        if (!fm)
        {
            return;
        }

        var fontName = this.buildFontName();
        if (!fontName)
        {
            return;
        }

        var font = fm.load(fontName);
        if (!font)
        {
            return;
        }

        if (!maxWidth)
        {
            maxWidth = this.width;
        }

        var color;

        var style = this.fillStyle;
        if (typeof style === 'string') // CSS Color
        {
            color = this.parseColor(style);
        }
        else
        {
            // TODO
            color = this.v4One;
        }

        // No need to pre-multiply RGB by alpha for texture shaders
        var globalAlpha = this.globalAlpha;
        if (globalAlpha < 1.0)
        {
            color = this.md.v4Build(color[0], color[1], color[2], (color[3] * globalAlpha), this.tempColor);
        }

        var technique = this.textureTechniques[this.globalCompositeOperation];
        if (!technique)
        {
            throw "Unknown composite operation: " + this.globalCompositeOperation;
        }

        var gd = this.gd;

        gd.setTechnique(technique);

        technique.screen = this.screen;

        technique.color = color;

        var rect = this.transformRect(x, y, maxWidth, maxWidth);
        var p1 = rect[1];
        var p2 = rect[2];
        x = p2[0];
        y = p2[1];

        var scale = this.calculateFontScale(font);

        if (this.textBaseline === 'alphabetic')
        {
            y -= (font.baseline * scale);
        }
        else if (this.textBaseline === 'middle')
        {
            y -= ((font.baseline * 0.5) * scale);
        }
        else if (this.textBaseline === 'bottom' ||
                 this.textBaseline === 'ideographic')
        {
            y -= (font.lineHeight * scale);
        }

        var params = {
            rect : [x, y, (p1[0] - x), (p1[1] - y)],
            scale : scale,
            spacing : 0
        };

        if (this.textAlign === "left" ||
            this.textAlign === "start")
        {
            params.alignment = 0;
        }
        else if (this.textAlign === "right" ||
                 this.textAlign === "end")
        {
            params.alignment = 2;
        }
        else
        {
            params.alignment = 1;
        }

        font.drawTextRect(text, params);
    },

    strokeText : function strokeTextFn(text, x, y, maxWidth)
    {
        // TODO
    },

    measureText : function measureTextFn(text)
    {
        var fm = this.fm;
        if (fm)
        {
            var fontName = this.buildFontName();
            if (fontName)
            {
                var font = fm.load(fontName);
                if (font)
                {
                    var scale = this.calculateFontScale(font);
                    return {
                            width : font.calculateTextDimensions(text, scale, 0).width
                        };
                }
            }
        }

        return {
                width : 0
            };
    },


    drawImage : function drawImageFn(image)
    {
        var dx, dy, dw, dh, u0, v0, u1, v1;

        if (arguments.length >= 7)
        {
            var sx = arguments[1];
            var sy = arguments[2];
            var sw = arguments[3];
            var sh = arguments[4];

            dx = arguments[5];
            dy = arguments[6];

            if (arguments.length >= 9)
            {
                dw = arguments[7];
                dh = arguments[8];
            }
            else
            {
                dw = sw;
                dh = sh;
            }

            var invImageWidth  = (1.0 / image.width);
            var invImageHeight = (1.0 / image.height);
            u0 = (sx * invImageWidth);
            v0 = (sy * invImageHeight);
            u1 = ((sx + sw) * invImageWidth);
            v1 = ((sy + sh) * invImageHeight);
        }
        else
        {
            dx = arguments[1];
            dy = arguments[2];

            if (arguments.length >= 5)
            {
                dw = arguments[3];
                dh = arguments[4];
            }
            else
            {
                dw = image.width;
                dh = image.height;
            }

            u0 = 0;
            v0 = 0;
            u1 = 1;
            v1 = 1;
        }

        if (dw > 0 && dh > 0)
        {
            var writer = this.mapTextureBuffer(4);
            if (writer)
            {
                var rect = this.transformRect(dx, dy, dw, dh);
                var p0 = rect[0];
                var p1 = rect[1];
                var p2 = rect[2];
                var p3 = rect[3];

                var x0 = p0[0];
                var y0 = p0[1];
                var x1 = p1[0];
                var y1 = p1[1];
                var x2 = p2[0];
                var y2 = p2[1];
                var x3 = p3[0];
                var y3 = p3[1];

                writer(x0, y0, u0, v1);
                writer(x1, y1, u1, v1);
                writer(x2, y2, u0, v0);
                writer(x3, y3, u1, v0);

                this.unmapTextureBuffer(writer);
                writer = null;

                var primitive = this.triangleStripPrimitive;
                var gd = this.gd;

                if (this.setShadowStyle(image, true))
                {
                    gd.draw(primitive, 4);
                }

                var technique = this.textureTechniques[this.globalCompositeOperation];
                if (!technique)
                {
                    throw "Unknown composite operation: " + this.globalCompositeOperation;
                }

                gd.setTechnique(technique);

                technique.screen = this.screen;
                technique.texture = image;

                var globalAlpha = this.globalAlpha;
                if (globalAlpha < 1.0)
                {
                    technique.color = this.md.v4Build(1.0, 1.0, 1.0, globalAlpha, this.tempColor);
                }
                else
                {
                    technique.color = this.v4One;
                }

                gd.draw(primitive, 4);
            }
        }
    },


    createImageData : function createImageDataFn()
    {
        var sw, sh;
        if (arguments.length === 2)
        {
            sw = arguments[0];
            sh = arguments[1];
        }
        else if (arguments.length === 1)
        {
            var imagedata = arguments[0];
            sw = imagedata.width;
            sh = imagedata.height;
        }
        else
        {
            throw "Wrong arguments";
        }

        var numValues = (sw * sh * 4);
        var pixelData = new this.arrayTypeConstructor(numValues);
        for (var i = 0; i < numValues; i += 1)
        {
            pixelData[i] = 0;
        }

        return {
            width : sw,
            height : sh,
            data : pixelData
        };
    },

    getImageData : function getImageDataFn(sx, sy, sw, sh)
    {
        var gd = this.gd;

        // Convert from top-left to bottom-left
        sy = (this.height - (sy + sh));

        var pixelData = gd.getScreenshot(false, sx, sy, sw, sh);

        return {
            width : sw,
            height : sh,
            data : pixelData
        };
    },

    putImageData : function putImageDataFn(imagedata, dx, dy)
    {
        if (!imagedata || !imagedata.data)
        {
            throw 'TYPE_MISMATCH_ERR';
        }

        var imageWidth  = imagedata.width;
        var imageHeight = imagedata.height;

        var dirtyX, dirtyY, dirtyWidth, dirtyHeight;
        if (arguments.length >= 7)
        {
            dirtyX = arguments[3];
            dirtyY = arguments[4];
            dirtyWidth = arguments[5];
            dirtyHeight = arguments[6];
        }
        else
        {
            dirtyX = 0;
            dirtyY = 0;
            dirtyWidth = imageWidth;
            dirtyHeight = imageHeight;
        }

        if (dirtyWidth && dirtyHeight)
        {
            var gd = this.gd;

            var tempImage = this.tempImage;
            if (tempImage === null ||
                tempImage.width !== dirtyWidth ||
                tempImage.height !== dirtyHeight)
            {
                this.tempImage = tempImage = gd.createTexture({
                        name    : ('imageData:' + dirtyWidth + 'x' + dirtyHeight),
                        width   : dirtyWidth,
                        height  : dirtyHeight,
                        depth   : 1,
                        format  : gd.PIXELFORMAT_R8G8B8A8,
                        cubemap : false,
                        mipmaps : false
                    });
            }

            tempImage.setData(imagedata.data);

            var viewport = this.viewport;
            gd.setScissor(viewport[0], viewport[1], viewport[2], viewport[3]);

            var writer = this.mapTextureBuffer(4);
            if (writer)
            {
                var invCanvasWidth  = 2.0 / this.width;
                var invCanvasHeight = 2.0 / this.height;
                var x0 = ((dx * invCanvasWidth)  - 1);
                var y0 = (1 - (dy * invCanvasHeight));
                var x1 = (((dx + dirtyWidth)  * invCanvasWidth)  - 1);
                var y1 = (1 - ((dy + dirtyHeight) * invCanvasHeight));

                var invImageWidth  = 1.0 / imageWidth;
                var invImageHeight = 1.0 / imageHeight;
                var u0 = (dirtyX * invImageWidth);
                var v0 = (dirtyY * invImageHeight);
                var u1 = ((dirtyX + dirtyWidth)  * invImageWidth);
                var v1 = ((dirtyY + dirtyHeight) * invImageHeight);

                writer(x0, y1, u0, v1);
                writer(x1, y1, u1, v1);
                writer(x0, y0, u0, v0);
                writer(x1, y0, u1, v0);

                this.unmapTextureBuffer(writer);
                writer = null;

                var technique = this.imageTechnique;

                gd.setTechnique(technique);

                technique.image = tempImage;

                gd.draw(this.triangleStripPrimitive, 4);
            }

            this.updateScissor();
        }
    },

    //
    // Public Turbulenz Canvas Context API
    //
    beginFrame : function beginFrameFn(target, viewportRect)
    {
        if (this.target)
        {
            throw '"endFrame" was never called!';
        }

        var gd = this.gd;

        if (!target)
        {
            target = gd;
        }

        this.target = target;

        var viewport = this.viewport;

        if (viewportRect)
        {
            viewport[0] =  viewportRect[0];
            viewport[1] =  viewportRect[1];
            viewport[2] =  viewportRect[2];
            viewport[3] =  viewportRect[3];
        }
        else
        {
            viewport[0] =  0;
            viewport[1] =  0;
            viewport[2] =  target.width;
            viewport[3] =  target.height;
        }

        gd.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);

        /* This code is required if Object.defineProperty does not work */
        var canvas = this.canvas;
        var width = canvas.width;
        var height = canvas.height;
        if (width !== this.width ||
            height !== this.height)
        {
            this.width = width;
            this.height = height;

            this.screen[0] = (2 / width);
            this.screen[1] = (-2 / height);

            this.resetState();

            this.clearRect(0, 0, width, height);
        }

        this.forceFatLines = ((2 * width) <= viewport[2] ||
                              (2 * height) <= viewport[3]);

        this.updateScissor();

        return true;
    },

    endFrame : function endFrameFn()
    {
        if (!this.target)
        {
            throw '"beginFrame" was never called!';
        }

        this.target = null;

        var viewport = this.viewport;
        var v0 = viewport[0];
        var v1 = viewport[1];
        var v2 = viewport[2];
        var v3 = viewport[3];

        var gd = this.gd;

        gd.setViewport(v0, v1, v2, v3);
        gd.setScissor(v0, v1, v2, v3);
    },

    //
    // Private API
    //
    setWidth : function setWidthFn(width)
    {
        this.width = width;
        this.screen[0] = (2 / width);

        this.resetState();

        if (this.target)
        {
            this.clearRect(0, 0, width, this.height);
        }
    },

    setHeight : function setHeightFn(height)
    {
        this.height = height;
        this.screen[1] = (-2 / height);

        this.resetState();

        if (this.target)
        {
            this.clearRect(0, 0, this.width, height);
        }
    },

    getStates : function getStatesFn()
    {
        return {
            globalAlpha : this.globalAlpha,
            globalCompositeOperation : this.globalCompositeOperation,
            strokeStyle : this.strokeStyle,
            fillStyle : this.fillStyle,
            lineWidth : this.lineWidth,
            lineCap : this.lineCap,
            lineJoin : this.lineJoin,
            miterLimit : this.miterLimit,
            shadowOffsetX : this.shadowOffsetX,
            shadowOffsetY : this.shadowOffsetY,
            shadowBlur : this.shadowBlur,
            shadowColor : this.shadowColor,
            font : this.font,
            textAlign : this.textAlign,
            textBaseline : this.textBaseline,
            matrix : this.matrix.slice(),
            scale : this.scale,
            translate : this.translate,
            transform : this.transform,
            setTransform : this.setTransform,
            transformPoint : this.transformPoint,
            transformRect : this.transformRect,
            clipExtents : this.clipExtents.slice()
        };
    },

    setStates : function setStatesFn(states)
    {
        this.globalAlpha = states.globalAlpha;
        this.globalCompositeOperation = states.globalCompositeOperation;
        this.strokeStyle = states.strokeStyle;
        this.fillStyle = states.fillStyle;
        this.lineWidth = states.lineWidth;
        this.lineCap = states.lineCap;
        this.lineJoin = states.lineJoin;
        this.miterLimit = states.miterLimit;
        this.shadowOffsetX = states.shadowOffsetX;
        this.shadowOffsetY = states.shadowOffsetY;
        this.shadowBlur = states.shadowBlur;
        this.shadowColor = states.shadowColor;
        this.font = states.font;
        this.textAlign = states.textAlign;
        this.textBaseline = states.textBaseline;

        // Have to copy array elements because if we keep a reference we modify the default ones
        var newMatrix = states.matrix;
        var oldMatrix = this.matrix;
        oldMatrix[0] = newMatrix[0];
        oldMatrix[1] = newMatrix[1];
        oldMatrix[2] = newMatrix[2];
        oldMatrix[3] = newMatrix[3];
        oldMatrix[4] = newMatrix[4];
        oldMatrix[5] = newMatrix[5];

        this.scale = states.scale;
        this.translate = states.translate;
        this.transform = states.transform;
        this.setTransform = states.setTransform;
        this.transformPoint = states.transformPoint;
        this.transformRect = states.transformRect;

        var newExtents = states.clipExtents;
        var oldExtents = this.clipExtents;
        oldExtents[0] = newExtents[0];
        oldExtents[1] = newExtents[1];
        oldExtents[2] = newExtents[2];
        oldExtents[3] = newExtents[3];
    },

    resetState : function resetStateFn()
    {
        this.statesStack.length = 0;

        this.beginPath();

        this.setStates(this.defaultStates);

        var clipExtents = this.clipExtents;
        clipExtents[0] = 0;
        clipExtents[1] = 0;
        clipExtents[2] = this.width;
        clipExtents[3] = this.height;
    },

    updateScissor : function updateScissorFn()
    {
        // Set scissor rectangle to intersection of viewport with clipExtents,
        // in OpengGL screen coordinates (0, 0) at bottom
        var viewport = this.viewport;
        var viewportX = viewport[0];
        var viewportY = viewport[1];
        var viewportWidth = viewport[2];
        var viewportHeight = viewport[3];

        var deviceScaleX = (viewportWidth / this.width);
        var deviceScaleY = (viewportHeight / this.height);

        var clipExtents = this.clipExtents;
        var minClipX = (clipExtents[0] * deviceScaleX);
        var minClipY = (clipExtents[1] * deviceScaleY);
        var maxClipX = (clipExtents[2] * deviceScaleX);
        var maxClipY = (clipExtents[3] * deviceScaleY);

        this.gd.setScissor((viewportX + minClipX),
                           (viewportY + (viewportHeight - maxClipY)),
                           (maxClipX - minClipX),
                           (maxClipY - minClipY));
    },


    setFontManager : function setFontManagerFn(fm)
    {
        this.fm = fm;
    },

    buildFontName : function buildFontNameFn()
    {
        var fontName;
        var font = this.font;
        var lastSpace = font.lastIndexOf(" ");
        if (lastSpace !== -1)
        {
            fontName = ('fonts/' + font.substr(lastSpace + 1) + '.fnt');
        }
        return fontName;
    },

    calculateFontScale : function calculateFontScaleFn(font)
    {
        var requiredHeight = parseInt(this.font, 10);
        if (isNaN(requiredHeight))
        {
            return 1;
        }
        else
        {
            return (requiredHeight / font.lineHeight);
        }
    },

    transformPoint : function transformPointFn(x, y)
    {
        var m = this.matrix;
        return [((x * m[0]) + (y * m[1]) + m[2]),
                ((x * m[3]) + (y * m[4]) + m[5])];
    },

    transformRect : function transformRectFn(x, y, w, h)
    {
        var m = this.matrix;
        var m0 = m[0];
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m4 = m[4];
        var m5 = m[5];

        var bx = ((x * m0) + (y * m1) + m2);
        var by = ((x * m3) + (y * m4) + m5);
        var dx0 = (w * m0);
        var dy0 = (h * m1);
        var dx1 = (w * m3);
        var dy1 = (h * m4);

        return [[(bx + dy0), (by + dy1)],
                [(bx + dx0 + dy0), (by + dx1 + dy1)],
                [bx, by],
                [(bx + dx0), (by + dx1)]];
    },

    untransformPoint : function untransformPointFn(p)
    {
        var m = this.matrix;
        var m0 = m[0];
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m4 = m[4];
        var m5 = m[5];

        var x = p[0];
        var y = p[1];

        // invert matrix
        var r0, r1, r2, r3, r4, r5;

        var det = (m0 * m4 - m1 * m3);
        if (det === 0.0)
        {
            return [x, y];
        }

        r0 = m4;
        r3 = -m3;
        r1 = -m1;
        r4 = m0;
        r2 = (m1 * m5 - m4 * m2);
        r5 = (m2 * m3 - m0 * m5);

        if (det !== 1.0)
        {
            var detrecp = (1.0 / det);
            r0 *= detrecp;
            r3 *= detrecp;
            r1 *= detrecp;
            r4 *= detrecp;
            r2 *= detrecp;
            r5 *= detrecp;
        }

        return [((x * r0) + (y * r1) + r2),
                ((x * r3) + (y * r4) + r5)];
    },

    calculateUVtransform : function calculateUVtransformFn(gradientMatrix)
    {
        var m = this.matrix;
        var m0 = m[0];
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m4 = m[4];
        var m5 = m[5];

        var g0 = gradientMatrix[0];
        var g1 = gradientMatrix[1];
        var g2 = gradientMatrix[2];
        var g3 = gradientMatrix[3];
        var g4 = gradientMatrix[4];
        var g5 = gradientMatrix[5];

        // invert matrix
        var r0, r1, r2, r3, r4, r5;

        var det = (m0 * m4 - m1 * m3);
        if (det === 0.0)
        {
            r0 = 1.0;
            r3 = 0.0;
            r1 = 0.0;
            r4 = 1.0;
            r2 = 0.0;
            r5 = 0.0;
        }
        else
        {
            r0 = m4;
            r3 = -m3;
            r1 = -m1;
            r4 = m0;
            r2 = (m1 * m5 - m4 * m2);
            r5 = (m2 * m3 - m0 * m5);

            if (det !== 1.0)
            {
                var detrecp = (1.0 / det);
                r0 *= detrecp;
                r3 *= detrecp;
                r1 *= detrecp;
                r4 *= detrecp;
                r2 *= detrecp;
                r5 *= detrecp;
            }
        }

        return [(g0 * r0 + g1 * r3),
                (g0 * r1 + g1 * r4),
                (g0 * r2 + g1 * r5 + g2),
                (g3 * r0 + g4 * r3),
                (g3 * r1 + g4 * r4),
                (g3 * r2 + g4 * r5 + g5)];
    },


    setShadowStyle : function setShadowStyleFn(style, onlyTexture)
    {
        var shadowOffsetX = this.shadowOffsetX;
        var shadowOffsetY = this.shadowOffsetY;
        if (shadowOffsetX < 1 && shadowOffsetY < 1)
        {
            return false;
        }

        if (this.globalCompositeOperation !== 'source-over')
        {
            return false;
        }

        var color = this.parseColor(this.shadowColor);

        var alpha = (color[3] * this.globalAlpha);

        if (this.shadowBlur > 0)
        {
            alpha *= 0.5;
        }

        if (alpha < 0.004)
        {
            return false;
        }

        if (alpha < 1.0)
        {
            color = this.md.v4Build((color[0] * alpha),
                                    (color[1] * alpha),
                                    (color[2] * alpha),
                                    alpha,
                                    this.tempColor);
        }

        var screen = this.screen;
        var screenScaleX = screen[0];
        var screenScaleY = screen[1];
        screen = this.md.v4Build(screenScaleX, screenScaleY,
                                (screen[2] + (shadowOffsetX * screenScaleX)),
                                (screen[3] + (shadowOffsetY * screenScaleY)),
                                this.tempScreen);

        var gd = this.gd;

        var technique;

        if (typeof style !== 'string' &&
            !style.opaque)
        {
            if (onlyTexture) // drawImage
            {
                technique = this.textureShadowTechnique;

                gd.setTechnique(technique);

                technique.texture = style;
            }
            else if (style.stops) // Gradient
            {
                var texture = style.updateTexture(gd);
                var gradientWidth = texture.width;
                var gradientHeight = texture.height;

                if (!gradientWidth || !gradientHeight)
                {
                    throw 'INVALID_STATE_ERR';
                }

                technique = this.gradientShadowTechnique;

                gd.setTechnique(technique);

                technique.uvtransform = this.calculateUVtransform(style.matrix);
                technique.gradient = texture;
            }
            else // Pattern
            {
                var imageWidth = style.width;
                var imageHeight = style.height;

                if (!imageWidth || !imageHeight)
                {
                    throw 'INVALID_STATE_ERR';
                }

                technique = this.patternShadowTechnique;

                gd.setTechnique(technique);

                technique.uvscale = this.md.v4Build((1.0 / imageWidth), (1.0 / imageHeight), 0, 0, this.uvscale);
                technique.pattern = style;
            }
        }
        else
        {
            if (alpha < 1.0)
            {
                technique = this.flatTechniques['source-over'];
            }
            else
            {
                technique = this.flatTechniques.copy;
            }

            gd.setTechnique(technique);
        }

        technique.screen = screen;

        technique.color = color;

        return true;
    },


    setStyle : function setStyleFn(style)
    {
        if (!style)
        {
            throw 'INVALID_STATE_ERR';
        }

        var globalCompositeOperation = this.globalCompositeOperation;
        var screen = this.screen;
        var gd = this.gd;

        var technique;

        if (typeof style === 'string') // CSS Color
        {
            var color = this.parseColor(style);

            var alpha = (color[3] * this.globalAlpha);
            if (alpha < 1.0)
            {
                color = this.md.v4Build((color[0] * alpha),
                                        (color[1] * alpha),
                                        (color[2] * alpha),
                                        alpha,
                                        this.tempColor);
            }

            if (globalCompositeOperation !== 'source-over' ||
                alpha < 1.0)
            {
                technique = this.flatTechniques[globalCompositeOperation];
                if (!technique)
                {
                    throw "Unknown composite operation: " + globalCompositeOperation;
                }
            }
            else
            {
                technique = this.flatTechniques.copy;
            }

            gd.setTechnique(technique);

            technique.screen = screen;

            technique.color = color;
        }
        else if (style.stops) // Gradient
        {
            var texture = style.updateTexture(gd);
            var gradientWidth = texture.width;
            var gradientHeight = texture.height;

            if (!gradientWidth || !gradientHeight)
            {
                throw 'INVALID_STATE_ERR';
            }

            var globalAlpha = this.globalAlpha;
            if (globalCompositeOperation !== 'source-over' ||
                globalAlpha < 1.0 ||
                !style.opaque)
            {
                technique = this.gradientTechniques[globalCompositeOperation];
                if (!technique)
                {
                    throw "Unknown composite operation: " + globalCompositeOperation;
                }
            }
            else
            {
                technique = this.gradientTechniques.copy;
            }

            gd.setTechnique(technique);

            technique.screen = screen;

            technique.uvtransform = this.calculateUVtransform(style.matrix);

            technique.gradient = texture;
            technique.alpha = globalAlpha;
        }
        else // Pattern
        {
            var imageWidth = style.width;
            var imageHeight = style.height;

            if (!imageWidth || !imageHeight)
            {
                throw 'INVALID_STATE_ERR';
            }

            technique = this.patternTechniques[globalCompositeOperation];
            if (!technique)
            {
                throw "Unknown composite operation: " + globalCompositeOperation;
            }

            gd.setTechnique(technique);

            technique.screen = screen;

            technique.uvscale = this.md.v4Build((1.0 / imageWidth), (1.0 / imageHeight), 0, 0, this.uvscale);

            technique.pattern = style;
            technique.alpha = this.globalAlpha;
        }
    },

    parseColor : function parseColorFn(colorText)
    {
        var color = this.cachedColors[colorText];
        if (color !== undefined)
        {
            return color;
        }

        if (this.numCachedColors > 1024)
        {
            this.cachedColors = {};
            this.numCachedColors = 0;
        }

        color = parseCSSColor(colorText, this.md.v4BuildZero());
        if (color)
        {
            this.cachedColors[colorText] = color;
            this.numCachedColors += 1;
            return color;
        }
        else
        {
            throw "Unknown color: " + colorText;
        }
    },

    interpolateArc : function interpolateArcFn(x, y, radius, startAngle, endAngle, anticlockwise)
    {
        var cos = Math.cos;
        var sin = Math.sin;
        var pi2 = (Math.PI * 2);

        var points = this.currentSubPath;
        var numPoints = points.length;
        var angle, angleDiff, i, j;

        var angleStep = (2.0 / radius);

        var m = this.matrix;
        var m0 = (m[0] * radius);
        var m1 = (m[1] * radius);
        var m3 = (m[3] * radius);
        var m4 = (m[4] * radius);

        if (anticlockwise)
        {
            while (endAngle >= startAngle)
            {
                endAngle -= pi2;
            }

            angleDiff = (startAngle - endAngle);
            if (angleDiff >= angleStep)
            {
                for (angle = startAngle; angle > endAngle; angle -= angleStep)
                {
                    i = cos(angle);
                    j = sin(angle);
                    points[numPoints] = [((i * m0) + (j * m1) + x),
                                         ((i * m3) + (j * m4) + y)];
                    numPoints += 1;
                }
            }
        }
        else
        {
            while (endAngle <= startAngle)
            {
                endAngle += pi2;
            }

            angleDiff = (endAngle - startAngle);
            if (angleDiff >= angleStep)
            {
                for (angle = startAngle; angle < endAngle; angle += angleStep)
                {
                    i = cos(angle);
                    j = sin(angle);
                    points[numPoints] = [((i * m0) + (j * m1) + x),
                                         ((i * m3) + (j * m4) + y)];
                    numPoints += 1;
                }
            }
        }

        i = cos(endAngle);
        j = sin(endAngle);
        points[numPoints] = [((i * m0) + (j * m1) + x),
                             ((i * m3) + (j * m4) + y)];
    },


    mapFlatBuffer : function mapFlatBufferFn(numVertices)
    {
        var flatVertexBuffer = this.flatVertexBuffer;

        if (flatVertexBuffer.numVertices < numVertices)
        {
            this.flatVertexBuffer = flatVertexBuffer = null;
            this.flatVertexBuffer = flatVertexBuffer = this.gd.createVertexBuffer({
                numVertices: numVertices,
                attributes: this.flatVertexFormats,
                dynamic: true,
                'transient': true
            });
        }

        return flatVertexBuffer.map(0, numVertices);
    },

    unmapFlatBuffer : function unmapFlatBufferFn(writer)
    {
        var flatVertexBuffer = this.flatVertexBuffer;

        flatVertexBuffer.unmap(writer);

        this.gd.setStream(flatVertexBuffer, this.flatSemantics);
    },


    mapTextureBuffer : function mapTextureBufferFn(numVertices)
    {
        var textureVertexBuffer = this.textureVertexBuffer;

        if (textureVertexBuffer.numVertices < numVertices)
        {
            this.textureVertexBuffer = textureVertexBuffer = null;
            this.textureVertexBuffer = textureVertexBuffer = this.gd.createVertexBuffer({
                numVertices: numVertices,
                attributes: this.textureVertexFormats,
                dynamic: true,
                'transient': true
            });
        }

        return textureVertexBuffer.map(0, numVertices);
    },

    unmapTextureBuffer : function unmapTextureBufferFn(writer)
    {
        var textureVertexBuffer = this.textureVertexBuffer;

        textureVertexBuffer.unmap(writer);

        this.gd.setStream(textureVertexBuffer, this.textureSemantics);
    },


    triangulateFatLines : function triangulateFatLinesFn(points, numPoints, lineWidth, vertices, numVertices)
    {
        var p, pA, pB, x0, y0, x1, y1, dx, dy, ln, a, b;
        var sqrt = Math.sqrt;

        lineWidth *= 0.5;
        p = 0;
        do
        {
            pA = points[p];
            pB = points[p + 1];
            x0 = pA[0];
            y0 = pA[1];
            x1 = pB[0];
            y1 = pB[1];
            dx = (x1 - x0);
            dy = (y1 - y0);
            ln = ((dx * dx) + (dy * dy));
            if (ln > 0)
            {
                ln = (lineWidth / sqrt(ln));
                dx *= ln;
                dy *= ln;

                // use perpendicular vector to (dx, dy) -> (dy, -dx)
                var a0 = (x0 + dy);
                var a1 = (y0 - dx);
                var b0 = (x1 - dy);
                var b1 = (y1 + dx);

                a = [a0, a1];
                b = [b0, b1];

                vertices[numVertices] = [x0 - dy, y0 + dx];
                vertices[numVertices + 1] = a;
                vertices[numVertices + 2] = b;
                vertices[numVertices + 3] = b;
                vertices[numVertices + 4] = a;
                vertices[numVertices + 5] = [x1 + dy, y1 - dx];
            }
            else
            {
                a = [x0, y0];
                b = [x1, y1];

                vertices[numVertices] = a;
                vertices[numVertices + 1] = a;
                vertices[numVertices + 2] = a;
                vertices[numVertices + 3] = b;
                vertices[numVertices + 4] = b;
                vertices[numVertices + 5] = b;
            }

            numVertices += 6;

            p += 2;
        }
        while (p < numPoints);

        return numVertices;
    },


    triangulateFatStrip : function triangulateFatStripFn(points, numPoints, lineWidth, vertices, numVertices)
    {
        var p, pA, pB, x0, y0, x1, y1, dx, dy, ln;
        var sqrt = Math.sqrt;

        var numSegments = (numPoints - 1);
        var startNumVertices = numVertices;

        lineWidth *= 0.5;
        p = 0;
        pA = points[0];
        x0 = pA[0];
        y0 = pA[1];
        do
        {
            pB = points[p + 1];
            x1 = pB[0];
            y1 = pB[1];
            dx = (x1 - x0);
            dy = (y1 - y0);
            ln = ((dx * dx) + (dy * dy));
            if (ln > 0)
            {
                ln = (lineWidth / sqrt(ln));
                dx *= ln;
                dy *= ln;

                // use perpendicular vector to (dx, dy) -> (dy, -dx)
                vertices[numVertices] = [x0 - dy, y0 + dx];
                vertices[numVertices + 1] = [x0 + dy, y0 - dx];
                vertices[numVertices + 2] = [x1 - dy, y1 + dx];
                vertices[numVertices + 3] = [x1 + dy, y1 - dx];
            }
            else
            {
                vertices[numVertices] = pA;
                vertices[numVertices + 1] = pA;
                vertices[numVertices + 2] = pB;
                vertices[numVertices + 3] = pB;
            }

            numVertices += 4;

            p += 1;
            pA = pB;
            x0 = x1;
            y0 = y1;
        }
        while (p < numSegments);

        // Do we need to close the loop
        if (points[0] === points[numSegments])
        {
            vertices[numVertices] = vertices[startNumVertices];
            vertices[numVertices + 1] = vertices[startNumVertices + 1];
            numVertices += 2;
        }

        return numVertices;
    },

    autoClose : function autoCloseFn(points, numPoints)
    {
        var firstPoint = points[0];
        var lastPoint = points[numPoints - 1];

        if (firstPoint === lastPoint)
        {
            return numPoints;
        }

        var abs = Math.abs;
        if (abs(firstPoint[0] - lastPoint[0]) < 1.0 &&
            abs(firstPoint[1] - lastPoint[1]) < 1.0)
        {
            return numPoints;
        }

        points[numPoints] = firstPoint;

        return (numPoints + 1);
    },

    isClosed : function isClosedFn(firstPoint, lastPoint)
    {
        if (firstPoint === lastPoint)
        {
            return true;
        }

        var abs = Math.abs;
        if (abs(firstPoint[0] - lastPoint[0]) < 1.0 &&
            abs(firstPoint[1] - lastPoint[1]) < 1.0)
        {
            return true;
        }

        return false;
    },

    isConvex : function isConvexFn(points, numSegments)
    {
        if (numSegments < 4)
        {
            return true;
        }

        var flag = 0;

        /*jslint bitwise: false*/
        var p0 = points[numSegments - 2];
        var p1 = points[numSegments - 1];
        var p0x = p0[0];
        var p0y = p0[1];
        var p1x = p1[0];
        var p1y = p1[1];
        var n = 0;
        do
        {
            var p2 = points[n];
            var p2x = p2[0];
            var p2y = p2[1];

            var z = (((p1x - p0x) * (p2y - p1y)) - ((p1y - p0y) * (p2x - p1x)));
            if (z < 0)
            {
                flag |= 1;
            }
            else if (z > 0)
            {
                flag |= 2;
            }

            if (flag === 3)
            {
                return false;
            }

            p0x = p1x;
            p0y = p1y;
            p1x = p2x;
            p1y = p2y;

            n += 1;
        }
        while (n < numSegments);
        /*jslint bitwise: true*/

        if (flag !== 0)
        {
            return true;
        }

        return false;
    },

    calculateArea : function calculateArea(points, numPoints)
    {
        // Dan Sunday, "Fast Polygon Area and Newell Normal Computation"
        var area = 0;
        var p0 = points[numPoints - 2];
        var p1 = points[numPoints - 1];
        var p = 0;
        do
        {
            var p2 = points[p];
            area += p1[0] * (p2[1] - p0[1]);
            p0 = p1;
            p1 = p2;

            p += 1;
        }
        while (p < numPoints);
        return (area * 0.5);
    },

    triangulateConvex : function triangulateConvexFn(points, numSegments, vertices, numVertices)
    {
        var p0 = points[0];
        var p1 = points[1];
        var p = 2;
        do
        {
            var p2 = points[p];
            vertices[numVertices] = p0;
            vertices[numVertices + 1] = p1;
            vertices[numVertices + 2] = p2;
            numVertices += 3;
            p1 = p2;
            p += 1;
        }
        while (p < numSegments);

        return numVertices;
    },

    triangulateConcave : function triangulateConcaveFn(points, numSegments, vertices, numVertices, ownPoints)
    {
        var isConvex = this.isConvex;

        var totalArea = this.calculateArea(points, numSegments);
        if (totalArea === 0)
        {
            return numVertices;
        }

        if (ownPoints)
        {
            points.length = numSegments;
        }
        else
        {
            // Need to get a copy because this is a destructive algorithm
            points = points.slice(0, numSegments); // no need to copy the duplicated last point
        }

        // Ear cutting algorithm
        var i0, i1, i2, p0, p1, p2, j, tarea;
        var ax, ay, bx, by, cx, cy;
        var v0x, v0y, v1x, v1y;
        var minX, maxX, minY, maxY;
        var valid, deletePoint;
        do
        {
            i0 = (numSegments - 2);
            i1 = (numSegments - 1);
            i2 = 0;

            p0 = points[i0];
            ax = p0[0];
            ay = p0[1];

            p1 = points[i1];
            bx = p1[0];
            by = p1[1];
            v1x = (bx - ax);
            v1y = (by - ay);

            valid = false;
            do
            {
                deletePoint = false;

                p2 = points[i2];
                cx = p2[0];
                cy = p2[1];
                v0x = (cx - ax);
                v0y = (cy - ay);

                // Calculate triangle area
                tarea = ((v1x * v0y) - (v0x * v1y)); // * 0.5);

                if ((totalArea * tarea) >= 0) // same winding order
                {
                    // Calculate triangle extents
                    minX = (ax < bx ? ax : bx);
                    minX = (minX < cx ? minX : cx);

                    maxX = (ax > bx ? ax : bx);
                    maxX = (maxX > cx ? maxX : cx);

                    minY = (ay < by ? ay : by);
                    minY = (minY < cy ? minY : cy);

                    maxY = (ay > by ? ay : by);
                    maxY = (maxY > cy ? maxY : cy);

                    // Compute dot products
                    var dot00 = ((v0x * v0x) + (v0y * v0y));
                    var dot01 = ((v0x * v1x) + (v0y * v1y));
                    var dot11 = ((v1x * v1x) + (v1y * v1y));
                    var denom = ((dot00 * dot11) - (dot01 * dot01));
                    if (denom !== 0)
                    {
                        var invDenom = (1.0 / denom);
                        dot00 *= invDenom;
                        dot01 *= invDenom;
                        dot11 *= invDenom;

                        var overlappingPointArea = 0;
                        var overlappingPoint = -1;

                        // Check if triangle overlaps any other point
                        j = 0;
                        do
                        {
                            if (j !== i0 &&
                                j !== i1 &&
                                j !== i2)
                            {
                                var p = points[j];
                                var px = p[0];
                                if (minX <= px && px <= maxX)
                                {
                                    var py = p[1];
                                    if (minY <= py && py <= maxY)
                                    {
                                        var v2x = (px - ax);
                                        var v2y = (py - ay);
                                        var dot02 = ((v0x * v2x) + (v0y * v2y));
                                        var dot12 = ((v1x * v2x) + (v1y * v2y));

                                        // Barycentric coordinates
                                        var u = ((dot11 * dot02) - (dot01 * dot12));
                                        if (u > 0)
                                        {
                                            var v = ((dot00 * dot12) - (dot01 * dot02));
                                            if (v > 0 && (u + v) < 1)
                                            {
                                                // There is at least one vertex inside the triangle, if there are more
                                                // find the one closer to i1 vertically by finding the one that has the
                                                // biggest triangle area with i0 and i2
                                                var parea = ((v0y * v2x) - (v0x * v2y));
                                                parea *= parea; // Make sure is a positive value
                                                if (overlappingPointArea < parea)
                                                {
                                                    overlappingPointArea = parea;
                                                    overlappingPoint = j;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            j += 1;
                        }
                        while (j < numSegments);

                        if (overlappingPoint < 0)
                        {
                            vertices[numVertices] = p0;
                            vertices[numVertices + 1] = p1;
                            vertices[numVertices + 2] = p2;
                            numVertices += 3;

                            deletePoint = true;
                        }
                        else if (overlappingPoint === ((i1 + 2) % numSegments))
                        {
                            // The diagonal is only splitting the next triangle
                            // Remove the point an keep going
                            i0 = i1;
                            i1 = i2;
                            i2 = overlappingPoint;

                            p0 = p1;
                            ax = bx;
                            ay = by;

                            p1 = p2;

                            p2 = points[i2];
                            cx = p2[0];
                            cy = p2[1];
                            v0x = (cx - ax);
                            v0y = (cy - ay);

                            vertices[numVertices] = p0;
                            vertices[numVertices + 1] = p1;
                            vertices[numVertices + 2] = p2;
                            numVertices += 3;

                            deletePoint = true;
                        }
                        else if (i1 === ((overlappingPoint + 2) % numSegments))
                        {
                            // The diagonal is only splitting the previous triangle
                            // Remove the point an keep going
                            i2 = i1;
                            i1 = i0;
                            i0 = overlappingPoint;

                            p2 = p1;
                            cx = bx;
                            cy = by;

                            p1 = p0;

                            p0 = points[i0];
                            ax = p0[0];
                            ay = p0[1];

                            v0x = (cx - ax);
                            v0y = (cy - ay);

                            vertices[numVertices] = p0;
                            vertices[numVertices + 1] = p1;
                            vertices[numVertices + 2] = p2;
                            numVertices += 3;

                            deletePoint = true;
                        }
                        else
                        {
                             // Found a diagonal
                            var d0 = i1;
                            var d1 = overlappingPoint;

                            var pointsA, pointsB;
                            if (d0 < d1)
                            {
                                pointsA = points.splice(d0, (d1 - d0 + 1), points[d0], points[d1]);
                                pointsB = points;
                            }
                            else
                            {
                                pointsB = points.splice(d1, (d0 - d1 + 1), points[d1], points[d0]);
                                pointsA = points;
                            }
                            points = null;

                            var numSegmentsA = pointsA.length;
                            if (numSegmentsA === 3)
                            {
                                vertices[numVertices] = pointsA[0];
                                vertices[numVertices + 1] = pointsA[1];
                                vertices[numVertices + 2] = pointsA[2];
                                numVertices += 3;
                            }
                            else
                            {
                                pointsA[numSegmentsA] = pointsA[0];

                                if (isConvex(pointsA, numSegmentsA))
                                {
                                    numVertices = this.triangulateConvex(pointsA, numSegmentsA, vertices, numVertices);
                                }
                                else
                                {
                                    numVertices = this.triangulateConcave(pointsA, numSegmentsA, vertices, numVertices, true);
                                }
                            }
                            pointsA = null;

                            var numSegmentsB = pointsB.length;
                            if (numSegmentsB === 3)
                            {
                                vertices[numVertices] = pointsB[0];
                                vertices[numVertices + 1] = pointsB[1];
                                vertices[numVertices + 2] = pointsB[2];
                                numVertices += 3;
                                return numVertices;
                            }
                            else
                            {
                                pointsB[numSegmentsB] = pointsB[0];

                                // Avoid recursion by restarting the loop
                                points = pointsB;
                                numSegments = numSegmentsB;
                                pointsB = null;

                                totalArea = this.calculateArea(points, numSegments);
                                if (totalArea === 0)
                                {
                                    return numVertices;
                                }

                                points.length = numSegments;

                                valid = true;
                                break;
                            }
                        }
                    }
                    else // Zero-area triangle
                    {
                        deletePoint = true;
                    }
                }

                if (deletePoint)
                {
                    valid = true;

                    points.splice(i1, 1);

                    numSegments -= 1;
                    if (numSegments < 4)
                    {
                        break;
                    }

                    if (i2 < numSegments)
                    {
                        if (i1 === 0)
                        {
                            i0 = (numSegments - 1);
                        }
                        else
                        {
                            i0 = (i1 - 1);

                            if (i1 === numSegments)
                            {
                                i1 = 0;
                            }
                        }

                        i2 = (i1 + 1);

                        p1 = p2;
                        bx = cx;
                        by = cy;
                        v1x = v0x;
                        v1y = v0y;

                        continue;
                    }
                    else
                    {
                        break;
                    }
                }

                i0 = i1;
                i1 = i2;
                i2 = (i2 + 1);

                p0 = p1;
                ax = bx;
                ay = by;

                p1 = p2;
                bx = cx;
                by = cy;
                v1x = (bx - ax);
                v1y = (by - ay);
            }
            while (i2 < numSegments);
        }
        while (valid && !isConvex(points, numSegments));

        if (!valid)
        {
            return numVertices;
        }

        // convex
        p0 = points[0];
        ax = p0[0];
        ay = p0[1];

        p1 = points[1];
        bx = p1[0];
        by = p1[1];
        v1x = (bx - ax);
        v1y = (by - ay);

        j = 2;
        do
        {
            p2 = points[j];
            cx = p2[0];
            cy = p2[1];
            v0x = (cx - ax);
            v0y = (cy - ay);

            // Calculate triangle area
            tarea = (((v1x * v0y) - (v0x * v1y)) * 0.5);

            if ((totalArea * tarea) > 0) // same winding order
            {
                vertices[numVertices] = p0;
                vertices[numVertices + 1] = p1;
                vertices[numVertices + 2] = p2;
                numVertices += 3;
            }

            p1 = p2;
            bx = cx;
            by = cy;
            v1x = v0x;
            v1y = v0y;

            j += 1;
        }
        while (j < numSegments);

        return numVertices;
    },

    fillFlatVertices : function fillFlatVerticesFn(vertices, numVertices)
    {
        var writer = this.mapFlatBuffer(numVertices);
        if (writer)
        {
            var p = 0;
            do
            {
                var vertex = vertices[p];
                writer(vertex[0], vertex[1]);
                p += 1;
            }
            while (p < numVertices);

            this.unmapFlatBuffer(writer);
        }
    },

    isPointInPolygon : function isPointInPolygonFn(tx, ty, points, numPoints)
    {
        var yflag0, yflag1, inside;
        var vtx0, vtx1, vtxn;

        vtx0 = points[numPoints - 1];
        yflag0 = (vtx0[1] >= ty);

        inside = false;

        for (vtxn = 0; vtxn < numPoints; vtxn += 1)
        {
            vtx1 = points[vtxn];
            yflag1 = (vtx1[1] >= ty);

            if (yflag0 !== yflag1)
            {
                if (((vtx1[1] - ty) * (vtx0[0] - vtx1[0]) >= (vtx1[0] - tx) * (vtx0[1] - vtx1[1])) === yflag1)
                {
                    inside = !inside;
                }
            }

            vtx0 = vtx1;
            yflag0 = yflag1;
        }

        return inside;
    },

    isPointInSubPath : function isPointInSubPathFn(tx, ty, points)
    {
        var numPoints = points.length;
        if (numPoints > 2)
        {
            if (this.isClosed(points[0], points[numPoints - 1]))
            {
                numPoints -= 1; // Skip duplicated last point

                return this.isPointInPolygon(tx, ty, points, numPoints);
            }
        }

        return false;
    },

/*jslint white: false*/
    shaderDefinition : {
 "version": 1,
 "name": "canvas.cgfx",
 "samplers":
 {
  "texture":
  {
   "MinFilter": 9985,
   "MagFilter": 9729,
   "WrapS": 33071,
   "WrapT": 33071
  },
  "pattern":
  {
   "MinFilter": 9728,
   "MagFilter": 9729,
   "WrapS": 10497,
   "WrapT": 10497
  },
  "gradient":
  {
   "MinFilter": 9728,
   "MagFilter": 9729,
   "WrapS": 33071,
   "WrapT": 33071
  },
  "image":
  {
   "MinFilter": 9728,
   "MagFilter": 9729,
   "WrapS": 33071,
   "WrapT": 33071
  }
 },
 "parameters":
 {
  "screen":
  {
   "type": "float",
   "columns": 4
  },
  "uvscale":
  {
   "type": "float",
   "columns": 4
  },
  "uvtransform":
  {
   "type": "float",
   "rows": 2,
   "columns": 3
  },
  "color":
  {
   "type": "float",
   "columns": 4
  },
  "alpha":
  {
   "type": "float"
  },
  "texture":
  {
   "type": "sampler2D"
  },
  "pattern":
  {
   "type": "sampler2D"
  },
  "gradient":
  {
   "type": "sampler2D"
  },
  "image":
  {
   "type": "sampler2D"
  }
 },
 "techniques":
 {
  "flat_source_atop":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,771]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_source_in":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,0]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_source_out":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,0]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_source_over":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_destination_atop":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,770]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_destination_in":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,770]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_destination_out":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,771]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_destination_over":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,1]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_lighter":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,1]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_copy":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": false
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "flat_xor":
  [
   {
    "parameters": ["screen","color"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,771]
    },
    "programs": ["vp_flat","fp_flat"]
   }
  ],
  "texture_source_atop":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,771]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_source_in":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,0]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_source_out":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,0]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_source_over":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_destination_atop":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,770]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_destination_in":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,770]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_destination_out":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,771]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_destination_over":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,1]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_lighter":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,1]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_copy":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": false
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "texture_xor":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,771]
    },
    "programs": ["vp_texture","fp_texture"]
   }
  ],
  "pattern_source_atop":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,771]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_source_in":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,0]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_source_out":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,0]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_source_over":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_destination_atop":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,770]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_destination_in":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,770]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_destination_out":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,771]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_destination_over":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,1]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_lighter":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,1]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_copy":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": false
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "pattern_xor":
  [
   {
    "parameters": ["screen","uvscale","alpha","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,771]
    },
    "programs": ["vp_pattern","fp_pattern"]
   }
  ],
  "gradient_source_atop":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,771]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_source_in":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [772,0]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_source_out":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,0]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_source_over":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_destination_atop":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,770]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_destination_in":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,770]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_destination_out":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [0,771]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_destination_over":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,1]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_lighter":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,1]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_copy":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": false
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "gradient_xor":
  [
   {
    "parameters": ["screen","uvtransform","alpha","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [773,771]
    },
    "programs": ["vp_gradient","fp_gradient"]
   }
  ],
  "texture_shadow":
  [
   {
    "parameters": ["screen","color","texture"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_texture","fp_texture_shadow"]
   }
  ],
  "pattern_shadow":
  [
   {
    "parameters": ["screen","uvscale","color","pattern"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_pattern","fp_pattern_shadow"]
   }
  ],
  "gradient_shadow":
  [
   {
    "parameters": ["screen","uvtransform","color","gradient"],
    "semantics": ["POSITION"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": true,
     "BlendFunc": [1,771]
    },
    "programs": ["vp_gradient","fp_gradient_shadow"]
   }
  ],
  "image":
  [
   {
    "parameters": ["image"],
    "semantics": ["POSITION","TEXCOORD0"],
    "states":
    {
     "DepthTestEnable": false,
     "DepthMask": false,
     "CullFaceEnable": false,
     "BlendEnable": false
    },
    "programs": ["vp_image","fp_image"]
   }
  ]
 },
 "programs":
 {
  "fp_image":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;uniform sampler2D image;void main()\n{_ret_0=texture2D(image,tz_TexCoord[0].xy);gl_FragColor=_ret_0;}"
  },
  "vp_image":
  {
   "type": "vertex",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];attribute vec4 ATTR8;attribute vec4 ATTR0;\nstruct VS_TEXTURE_OUT{vec4 _Position;vec2 _UV;};void main()\n{VS_TEXTURE_OUT _Out;_Out._Position=vec4(ATTR0.x,ATTR0.y,0.0,1.0);tz_TexCoord[0].xy=ATTR8.xy;gl_Position=_Out._Position;}"
  },
  "fp_gradient_shadow":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;uniform vec4 color;uniform sampler2D gradient;void main()\n{_ret_0=color*texture2D(gradient,tz_TexCoord[0].xy).w;gl_FragColor=_ret_0;}"
  },
  "vp_gradient":
  {
   "type": "vertex",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];attribute vec4 ATTR0;\nstruct VS_TEXTURE_OUT{vec4 _Position;vec2 _UV;};uniform vec4 screen;uniform vec3 uvtransform[2];void main()\n{VS_TEXTURE_OUT _Out;vec3 _position;vec2 _TMP10;_TMP10=ATTR0.xy*screen.xy+screen.zw;_Out._Position=vec4(_TMP10.x,_TMP10.y,0.0,1.0);_position=vec3(ATTR0.x,ATTR0.y,1.0);_Out._UV.x=dot(_position,uvtransform[0]);_Out._UV.y=dot(_position,uvtransform[1]);tz_TexCoord[0].xy=_Out._UV;gl_Position=_Out._Position;}"
  },
  "fp_pattern_shadow":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;uniform vec4 color;uniform sampler2D pattern;void main()\n{_ret_0=color*texture2D(pattern,tz_TexCoord[0].xy).w;gl_FragColor=_ret_0;}"
  },
  "vp_pattern":
  {
   "type": "vertex",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];attribute vec4 ATTR0;\nstruct VS_TEXTURE_OUT{vec4 _Position;vec2 _UV;};uniform vec4 screen;uniform vec4 uvscale;void main()\n{VS_TEXTURE_OUT _Out;vec2 _TMP9;_TMP9=ATTR0.xy*screen.xy+screen.zw;_Out._Position=vec4(_TMP9.x,_TMP9.y,0.0,1.0);_Out._UV=ATTR0.xy*uvscale.xy+uvscale.zw;tz_TexCoord[0].xy=_Out._UV;gl_Position=_Out._Position;}"
  },
  "fp_texture_shadow":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nvec4 _ret_0;uniform vec4 color;uniform sampler2D texture;void main()\n{_ret_0=color*texture2D(texture,tz_TexCoord[0].xy).w;gl_FragColor=_ret_0;}"
  },
  "vp_texture":
  {
   "type": "vertex",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];attribute vec4 ATTR8;attribute vec4 ATTR0;\nstruct VS_TEXTURE_OUT{vec4 _Position;vec2 _UV;};uniform vec4 screen;void main()\n{VS_TEXTURE_OUT _Out;vec2 _TMP9;_TMP9=ATTR0.xy*screen.xy+screen.zw;_Out._Position=vec4(_TMP9.x,_TMP9.y,0.0,1.0);tz_TexCoord[0].xy=ATTR8.xy;gl_Position=_Out._Position;}"
  },
  "fp_gradient":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nuniform float alpha;uniform sampler2D gradient;void main()\n{vec4 _fg;_fg=texture2D(gradient,tz_TexCoord[0].xy);_fg.w=_fg.w*alpha;_fg.xyz=_fg.xyz*_fg.www;gl_FragColor=_fg;}"
  },
  "fp_pattern":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nuniform float alpha;uniform sampler2D pattern;void main()\n{vec4 _fg;_fg=texture2D(pattern,tz_TexCoord[0].xy);_fg.w=_fg.w*alpha;_fg.xyz=_fg.xyz*_fg.www;gl_FragColor=_fg;}"
  },
  "fp_texture":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nvarying vec4 tz_TexCoord[8];\nuniform vec4 color;uniform sampler2D texture;void main()\n{vec4 _fg;_fg=texture2D(texture,tz_TexCoord[0].xy)*color;_fg.xyz=_fg.xyz*_fg.www;gl_FragColor=_fg;}"
  },
  "fp_flat":
  {
   "type": "fragment",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nuniform vec4 color;void main()\n{gl_FragColor=color;}"
  },
  "vp_flat":
  {
   "type": "vertex",
   "code": "#ifdef GL_ES\nprecision mediump float;precision mediump int;\n#endif\nattribute vec4 ATTR0;\nvec4 _ret_0;uniform vec4 screen;void main()\n{vec2 _TMP9;_TMP9=ATTR0.xy*screen.xy+screen.zw;_ret_0=vec4(_TMP9.x,_TMP9.y,0.0,1.0);gl_Position=_ret_0;}"
  }
 }
}
/*jslint white: true*/
};

// Constructor function
CanvasContext.create = function canvasCreateFn(canvas, gd, md, width, height)
{
    var c = new CanvasContext();

    // public variables
    c.canvas = canvas;
    c.globalAlpha = 1.0;
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#000000';
    c.fillStyle = '#000000';
    c.lineWidth = 1;
    c.lineCap = 'butt';
    c.lineJoin = 'miter';
    c.miterLimit = 10;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
    c.shadowBlur = 0;
    c.shadowColor = 'rgba(0,0,0,0)';
    c.font = '10px sans-serif';
    c.textAlign = 'start';
    c.textBaseline = 'alphabetic';

    // private variables
    c.gd = gd;
    c.md = md;

    c.fm = null;

    c.target = null;
    c.viewport = [0, 0, width, height];

    c.forceFatLines = false;

    c.width = width;
    c.height = height;

    c.screen = md.v4Build((2 / width), (-2 / height), -1, 1);

    c.statesStack = [];

    c.subPaths = [];
    c.currentSubPath = [];

    var shader = gd.createShader(c.shaderDefinition);
    c.shader = shader;

    c.triangleStripPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;
    c.triangleFanPrimitive = gd.PRIMITIVE_TRIANGLE_FAN;
    c.trianglePrimitive = gd.PRIMITIVE_TRIANGLES;
    c.lineStripPrimitive = gd.PRIMITIVE_LINE_STRIP;
    c.linePrimitive = gd.PRIMITIVE_LINES;

    c.textureVertexFormats = [gd.VERTEXFORMAT_FLOAT2, gd.VERTEXFORMAT_FLOAT2];
    c.textureSemantics = gd.createSemantics(['POSITION', 'TEXCOORD0']);

    c.textureVertexBuffer = gd.createVertexBuffer({
        numVertices: 256,
        attributes: c.textureVertexFormats,
        dynamic: true,
        'transient': true
    });

    c.flatVertexFormats = [gd.VERTEXFORMAT_FLOAT2];
    c.flatSemantics = gd.createSemantics(['POSITION']);

    c.flatVertexBuffer = gd.createVertexBuffer({
        numVertices: 256,
        attributes: c.flatVertexFormats,
        dynamic: true,
        'transient': true
    });

    c.tempVertices = [];

    c.v4Zero = md.v4BuildZero();
    c.v4One = md.v4BuildOne();

    c.cachedColors = {};
    c.numCachedColors = 0;

    c.uvscale = md.v4BuildZero();
    c.tempColor = md.v4BuildZero();
    c.tempScreen = md.v4BuildZero();

    c.tempImage = null;
    c.imageTechnique = shader.getTechnique('image');

    var compositeOperations = c.compositeOperations;
    var flatTechniques = {};
    var textureTechniques = {};
    var patternTechniques = {};
    var gradientTechniques = {};
    c.flatTechniques = flatTechniques;
    c.textureTechniques = textureTechniques;
    c.patternTechniques = patternTechniques;
    c.gradientTechniques = gradientTechniques;
    for (var p in compositeOperations)
    {
        if (compositeOperations.hasOwnProperty(p))
        {
            var sp = p.replace('-', '_');
            flatTechniques[p] = shader.getTechnique('flat_' + sp);
            textureTechniques[p] = shader.getTechnique('texture_' + sp);
            patternTechniques[p] = shader.getTechnique('pattern_' + sp);
            gradientTechniques[p] = shader.getTechnique('gradient_' + sp);
        }
    }

    c.textureShadowTechnique = shader.getTechnique('texture_shadow');
    c.patternShadowTechnique = shader.getTechnique('pattern_shadow');
    c.gradientShadowTechnique = shader.getTechnique('gradient_shadow');

/*
    c.renderTexture = gd.createTexture({
        name       : "canvas.backbuffer",
        width      : width,
        height     : height,
        depth      : 1,
        format     : gd.PIXELFORMAT_R8G8B8A8,
        cubemap    : false,
        mipmaps    : false,
        renderable : true
    });

    c.renderTarget = gd.createRenderTarget({
        colorTexture0 : c.renderTexture
    });
*/

    //
    // Transformation matrix and related operations
    //
    c.matrix = [1, 0, 0,
                0, 1, 0];

    var CanvasPrototype = CanvasContext.prototype;
    var scale = CanvasPrototype.scale;
    var translate = CanvasPrototype.translate;
    var transform = CanvasPrototype.transform;
    var setTransform = CanvasPrototype.setTransform;
    var transformPoint = CanvasPrototype.transformPoint;
    var transformRect = CanvasPrototype.transformRect;

    function resetTransformMethods()
    {
        c.scale = scale;
        c.translate = translate;
        c.transform = transform;
        c.setTransform = setTransform;
        c.transformPoint = transformPoint;
        c.transformRect = transformRect;
    }

    function transformTranslate(a, b, c, d, e, f)
    {
        var m = this.matrix;
        m[0] = a;
        m[3] = b;
        m[1] = c;
        m[4] = d;
        m[2] = (e + m[2]);
        m[5] = (f + m[5]);

        resetTransformMethods();
    }

    function translatePoint(x, y)
    {
        var m = this.matrix;
        return [(x + m[2]), (y + m[5])];
    }

    function translateRect(x, y, w, h)
    {
        var m = this.matrix;
        var x0 = (x + m[2]);
        var y0 = (y + m[5]);
        var x1 = (x0 + w);
        var y1 = (y0 + h);
        return [[x0, y1], [x1, y1], [x0, y0], [x1, y0]];
    }

    function scaleIdentity(x, y)
    {
        var m = this.matrix;
        m[0] = x;
        m[4] = y;

        resetTransformMethods();
    }

    function translateIdentity(x, y)
    {
        var m = this.matrix;
        m[2] = x;
        m[5] = y;

        this.translate = translate;
        this.transform = transformTranslate;
        this.transformPoint = translatePoint;
        this.transformRect = translateRect;
    }

    function setTransformIdentity(a, b, c, d, e, f)
    {
        var m = this.matrix;
        m[0] = a;
        m[1] = c;
        m[2] = e;
        m[3] = b;
        m[4] = d;
        m[5] = f;

        resetTransformMethods();
    }

    function transformPointIdentity(x, y)
    {
        return [x, y];
    }

    function transformRectIdentity(x, y, w, h)
    {
        var x1 = (x + w);
        var y1 = (y + h);
        return [[x, y1], [x1, y1], [x, y], [x1, y]];
    }

    c.scale = scaleIdentity;
    c.translate = translateIdentity;
    c.transform = setTransformIdentity;
    c.setTransform = setTransformIdentity;
    c.transformPoint = transformPointIdentity;
    c.transformRect = transformRectIdentity;

    //
    // Clipping
    //
    c.clipExtents = [0, 0, width, height];

    //
    c.defaultStates = c.getStates();

    return c;
};

//
// Canvas
//
function Canvas() {}
Canvas.prototype =
{
    version : 1,

    // Standard API
    getContext : function getContextFn(contextId)
    {
        if (contextId.toLowerCase() === '2d')
        {
            return this.context;
        }
        else
        {
            return null;
        }
    },

    toDataURL : function toDataURLFn(type)
    {
        if (this.width === 0 ||
            this.height === 0)
        {
            return "data:,";
        }

        //if (type.toLowerCase() === 'image/jpeg')
        var pixelData = this.gd.getScreenshot(true, 0, 0, this.width, this.height);
        if (pixelData)
        {
            return "data:image/jpeg;base64," + pixelData.toBase64();
        }

        return null;
    },

    toBlob : function toBlobFn(fileCallback, type)
    {
        if (fileCallback)
        {
            //if (type.toLowerCase() === 'image/jpeg')
            var pixelData = this.gd.getScreenshot(true, 0, 0, this.width, this.height);
            fileCallback(pixelData);
        }
    },

    setAttribute : function setAttributeFn(attr, value)
    {
        if (value.substr(-2, 2) === "px")
        {
            value = value.substr(0, value.lengh - 2);
        }
        value = parseInt(value, 10);

        if (attr === "width")
        {
            this.width = value;
        }
        else if (attr === "height")
        {
            this.height = value;
        }
        else
        {
            throw 'UNSUPPORTED ATTRIBUTE!';
        }
    },

    // Turbulenz API
    setFontManager : function setFontManagerFn(fm)
    {
        this.context.setFontManager(fm);
    }
};

// Constructor function
Canvas.create = function canvasCreateFn(gd, md)
{
    var width = gd.width;
    var height = gd.height;

    var c = new Canvas();

    c.context = CanvasContext.create(c, gd, md, width, height);

    if (Object.defineProperty)
    {
        Object.defineProperty(c, "width", {
                get : function getWidth() {
                    return width;
                },
                set : function setWidth(newValue) {
                    width = newValue;

                    this.context.setWidth(newValue);
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(c, "height", {
                get : function getHeight() {
                    return height;
                },
                set : function setHeight(newValue) {
                    height = newValue;

                    this.context.setHeight(newValue);
                },
                enumerable : true,
                configurable : false
            });
    }
    else
    {
        c.width = width;
        c.height = height;
    }

    return c;
};
