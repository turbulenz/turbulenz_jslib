// Copyright (c) 2009-2012 Turbulenz Limited

/*global TurbulenzEngine: false*/
/*global Observer: false*/
/*global Float32Array: false*/

"use strict";

/**
  @class  Font manager
  @private

  @since TurbulenzEngine 0.1.0
*/
function FontManager() {}
FontManager.prototype =
{
    /**
      Version number
      @memberOf FontManager
      @constant
      @type number
    */
    version : 1
};

/**
  @constructs Constructs a FontManager object.

  @param {GraphicsDevice} gd Graphics device
  @param {RequestHandler} rh RequestHandler object

  @return {FontManager} object, null if failed
*/
FontManager.create = function fontManagerCreateFn(gd, rh, df, errorCallback, log)
{
    if (!errorCallback)
    {
        errorCallback = function (e) {};
    }

    function createIndexBuffer(maxGlyphs)
    {
        var indexBufferParameters = {
            numIndices: (6 * maxGlyphs),
            format: 'USHORT'
        };

        var indexBuffer = gd.createIndexBuffer(indexBufferParameters);

        var writer = indexBuffer.map();
        if (writer)
        {
            var i0, i1, i2, i3;
            for (var i = 0; i < maxGlyphs; i += 1)
            {
                i0 = (4 * i);
                i1 = (i0 + 1);
                i2 = (i0 + 2);
                i3 = (i0 + 3);
                writer(i0, i1, i2);
                writer(i2, i3, i0);
            }

            indexBuffer.unmap(writer);
        }

        return indexBuffer;
    }

    function createVertexBuffer(maxGlyphs)
    {
        return gd.createVertexBuffer({numVertices: (4 * maxGlyphs),
            attributes: [gd.VERTEXFORMAT_FLOAT2, gd.VERTEXFORMAT_FLOAT2],
            dynamic: true,
            'transient': true});
    }

    var Float32ArrayConstructor = Array;
    if (typeof Float32Array !== "undefined")
    {
        var testArray = new Float32Array(4);
        var textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Float32Array]')
        {
            Float32ArrayConstructor = Float32Array;
        }
    }


    var primitive = gd.PRIMITIVE_TRIANGLES;
    var semantics = gd.createSemantics(['POSITION', 'TEXCOORD0']);
    var techniqueParameters = gd.createTechniqueParameters({
        texture: null
    });
    var sharedIndexBuffer;
    var sharedVertexBuffer;


    /**
      @class  Font
      @private

      @since TurbulenzEngine 0.1.0
    */
    function Font() {}
    Font.prototype =
    {
        version : 1,

        calculateTextDimensions: function fontCalculateTextDimensionsFn(text, scale, spacing)
        {
            var glyphs = this.glyphs;
            var lineHeight = (this.lineHeight * scale);
            var width = 0;
            var height = 0;
            var numGlyphs = 0;
            var numLines = 0;
            var linesWidth = [];

            var textLength = text.length;
            var lineWidth = 0;
            var c, glyph, gaw;
            for (var i = 0; i < textLength; i += 1)
            {
                c = text.charCodeAt(i);
                if (c === 10)
                {
                    if (lineWidth)
                    {
                        lineWidth -= spacing;
                    }
                    linesWidth[numLines] = lineWidth;
                    numLines += 1;
                    if (width < lineWidth)
                    {
                        width = lineWidth;
                    }
                    lineWidth = 0;
                    height += lineHeight;
                }
                else
                {
                    glyph = glyphs[c];
                    if (glyph)
                    {
                        gaw = glyph.awidth;
                        if (gaw)
                        {
                            lineWidth += ((gaw * scale) + spacing);
                            numGlyphs += 1;
                        }
                        else
                        {
                            lineWidth += spacing;
                        }
                    }
                }
            }

            linesWidth[numLines] = lineWidth;
            if (width < lineWidth)
            {
                width = lineWidth;
            }
            height += lineHeight;

            return {
                width: width,
                height: height,
                numGlyphs: numGlyphs,
                linesWidth: linesWidth
            };
        },


        generateTextVertices: function fontGenerateTextVerticesFn(text, params)
        {
            var rect = params.rect;
            var alignment = params.alignment;
            var scale = (params.scale || 1.0);
            var extraSpacing = (params.spacing ? (params.spacing * scale) : 0);

            var dimensions = this.calculateTextDimensions(text, scale, extraSpacing);
            var numGlyphs = dimensions.numGlyphs;
            if (0 >= numGlyphs)
            {
                return null;
            }

            var linesWidth = dimensions.linesWidth;
            var lineHeight = (this.lineHeight * scale);
            var kernings = this.kernings;
            var glyphs = this.glyphs;

            var numVertices = (numGlyphs * 4);
            var vertices = new Float32ArrayConstructor(numVertices * 4);
            var vertexIndex = 0;

            var c, glyph, gx0, gy0, gx1, gy1, gaw, u0, v0, u1, v1;
            var lineWidth = linesWidth[0];
            var rectLeft = rect[0];
            var rectWidth = rect[2];
            var y = rect[1];
            var x = rectLeft;
            if (1 === alignment)
            {
                x += ((rectWidth - lineWidth) * 0.5);
            }
            else if (2 === alignment)
            {
                x += ((rectWidth - lineWidth));
            }
            var textLength = text.length;
            var line = 0;
            var i;
            for (i = 0; i < textLength; i += 1)
            {
                c = text.charCodeAt(i);
                if (c === 10)
                {
                    y += lineHeight;
                    line += 1;
                    lineWidth = linesWidth[line];
                    x = rectLeft;
                    if (1 === alignment)
                    {
                        x += ((rectWidth - lineWidth) * 0.5);
                    }
                    else if (2 === alignment)
                    {
                        x += ((rectWidth - lineWidth));
                    }
                }
                else
                {
                    glyph = glyphs[c];
                    if (glyph)
                    {
                        gaw = (glyph.awidth * scale);
                        if (gaw)
                        {
                            gx0 = (x + (glyph.xoffset * scale));
                            gy0 = (y + (glyph.yoffset * scale));
                            gx1 = (gx0 + (glyph.width  * scale));
                            gy1 = (gy0 + (glyph.height * scale));
                            u0 = glyph.left;
                            v0 = glyph.top;
                            u1 = glyph.right;
                            v1 = glyph.bottom;

                            vertices[vertexIndex + 0] = gx0;
                            vertices[vertexIndex + 1] = gy0;
                            vertices[vertexIndex + 2] = u0;
                            vertices[vertexIndex + 3] = v0;

                            vertices[vertexIndex + 4] = gx1;
                            vertices[vertexIndex + 5] = gy0;
                            vertices[vertexIndex + 6] = u1;
                            vertices[vertexIndex + 7] = v0;

                            vertices[vertexIndex + 8] = gx1;
                            vertices[vertexIndex + 9] = gy1;
                            vertices[vertexIndex + 10] = u1;
                            vertices[vertexIndex + 11] = v1;

                            vertices[vertexIndex + 12] = gx0;
                            vertices[vertexIndex + 13] = gy1;
                            vertices[vertexIndex + 14] = u0;
                            vertices[vertexIndex + 15] = v1;

                            vertexIndex += 16;

                            numGlyphs -= 1;
                            if (0 === numGlyphs)
                            {
                                break;
                            }
                            x += (gaw + extraSpacing);

                            if (kernings)
                            {
                                var kerning = kernings[c];
                                if (kerning && i < (textLength - 1))
                                {
                                    var amount = kerning[text.charCodeAt(i + 1)];
                                    if (amount)
                                    {
                                        x += (amount * scale);
                                    }
                                }
                            }
                        }
                        else
                        {
                            x += extraSpacing;
                        }
                    }
                }
            }

            return vertices;
        },


        drawTextRect: function fontDrawTextRectFn(text, params)
        {
            var vertices = this.generateTextVertices(text, params);
            if (!vertices)
            {
                return;
            }

            var numGlyphs = (vertices.length / 16);
            var numVertices = (numGlyphs * 4);
            var numIndicies = (numGlyphs * 6);

            if (!sharedIndexBuffer || numIndicies > sharedIndexBuffer.numIndices)
            {
                if (sharedIndexBuffer)
                {
                    sharedIndexBuffer.destroy();
                }
                sharedIndexBuffer = createIndexBuffer(numGlyphs);
            }

            if (!sharedVertexBuffer || numVertices > sharedVertexBuffer.numVertices)
            {
                if (sharedVertexBuffer)
                {
                    sharedVertexBuffer.destroy();
                }
                sharedVertexBuffer = createVertexBuffer(numGlyphs);
            }

            sharedVertexBuffer.setData(vertices, 0, numVertices);

            gd.setStream(sharedVertexBuffer, semantics);
            gd.setIndexBuffer(sharedIndexBuffer);

            // TODO: support for multiple pages
            techniqueParameters.texture = this.texture;
            gd.setTechniqueParameters(techniqueParameters);

            gd.drawIndexed(primitive, numIndicies);
        }
    };

    var fonts = {};
    var loadingFont = {};
    var loadedObservers = {};
    var loadingPages = {};
    var numLoadingFonts = 0;
    var internalFont = {};
    var pathRemapping = null;
    var pathPrefix = "";

    function textureLoaded(font, t)
    {
        font.texture = t;
        font.pageWidth = t.width;
        font.pageHeight = t.height;

        var glyphs = font.glyphs, g;
        if (!glyphs)
        {
            // Assume regular grid
            var floor = Math.floor;
            var w = floor(t.width  / 16);
            var h = floor(t.height / 16);
            var d = 1.0 / 16;
            glyphs = [];
            glyphs.length = 256;
            for (g = 0; g < 256; g += 1)
            {
                var u = (floor(g % 16) * d);
                var v = (floor(g / 16) * d);
                glyphs[g] = {
                        width: w,
                        height: h,
                        awidth: w,
                        xoffset: 0,
                        yoffset: 0,
                        left: u,
                        top: v,
                        right: (u + d),
                        bottom: (v + d),
                        page: 0
                    };
            }
            font.lineHeight = 16;
            font.baseline = 16;
            font.glyphs = glyphs;
            font.numGlyphs = 256;
            font.minGlyphIndex = 0;
        }
    }

    /**
      Creates a font from an '.fnt' or '.fontdat'file and its associated image file

      @memberOf FontManager.prototype
      @public
      @function
      @name load

      @param {string} path Path to the font file without the extension
      @param {function} onFontLoaded function to call once the font has loaded

      @return {object} Font object if it exists, undefined otherwise
    */
    function loadFontFn(path, onFontLoaded)
    {
        function pageComplete()
        {
            loadingPages[path] -= 1;
            if (loadingPages[path] === 0)
            {
                // Last page response
                delete loadingPages[path];
                delete loadingFont[path];
                numLoadingFonts -= 1;
                return true;
            }
            return false;
        }

        function requestFn(url, onload, callContext)
        {
            var font = fonts[path];
            if (!font)
            {
                pageComplete();
                return;
            }

            if (!gd.createTexture({
                src     : url,
                mipmaps : true,
                onload  : onload
            }))
            {
                errorCallback("Failed to create texture for font '" + path + "'.");
                delete fonts[path];

                pageComplete();
            }
        }

        var font = fonts[path];
        if (!font)
        {
            if (!(path in loadingFont))
            {
                loadingFont[path] = true;
                loadingPages[path] = 0;
                numLoadingFonts += 1;

                var observer = Observer.create();
                loadedObservers[path] = observer;
                if (onFontLoaded)
                {
                    observer.subscribe(onFontLoaded);
                }

                var fontDataLoaded = function fontDataLoadedFn(text)
                {
                    font = new Font();

                    if (text)
                    {
                        var fontData = JSON.parse(text);
                        var layouts = fontData.bitmapfontlayouts;
                        for (var p in layouts)
                        {
                            if (layouts.hasOwnProperty(p))
                            {
                                var layout = layouts[p];
                                font.bold = layout.bold;
                                font.italic = layout.italic;
                                font.pageWidth = layout.pagewidth;
                                font.pageHeight = layout.pageheight;
                                font.baseline = layout.baseline;
                                font.glyphs = layout.glyphs;
                                font.numGlyphs = layout.numglyphs;
                                font.minGlyphIndex = layout.minglyphindex;
                                font.lineHeight = layout.lineheight;
                                font.pages = layout.pages;
                                font.kernings = layout.kernings;
                                break;
                            }
                        }
                    }

                    fonts[path] = font;
                    var texturePath;
                    var pages = font.pages;

                    if (pages)
                    {
                        var numPages = pages.length;
                        loadingPages[path] += numPages;

                        var onloadFn = function onloadFn(t, status, callContext)
                        {
                            var font = fonts[path];
                            var i = callContext.index;

                            if (font)
                            {
                                if (t)
                                {
                                    pages[i] = t;

                                    if (i === 0)
                                    {
                                        font.texture = t;
                                    }

                                    if (pageComplete())
                                    {
                                        observer.notify(font);
                                        delete loadedObservers[path];
                                    }
                                    return;
                                }
                                else
                                {
                                    errorCallback("Failed to load font page: '" + pages[i] + "'.");
                                    delete fonts[path];
                                }
                            }
                            pageComplete();
                        };

                        for (var i = 0; i < numPages; i += 1)
                        {
                            texturePath = pages[i];
                            rh.request({
                                src: ((pathRemapping && pathRemapping[texturePath]) || (pathPrefix + texturePath)),
                                onload: onloadFn,
                                requestFn: requestFn,
                                index: i
                            });
                        }
                    }
                    else
                    {
                        texturePath = (path + ".dds");
                        rh.request({
                            src: ((pathRemapping && pathRemapping[texturePath]) || (pathPrefix + texturePath)),
                            onload: function (t)
                            {
                                if (t)
                                {
                                    textureLoaded(font, t);

                                    observer.notify(font);
                                    delete loadedObservers[path];
                                }
                                else
                                {
                                    errorCallback("Failed to load font page: '" + texturePath + "'.");
                                    delete fonts[path];
                                }

                                delete loadingPages[path];
                                delete loadingFont[path];
                                numLoadingFonts -= 1;
                            },
                            requestFn: function (url, onload)
                            {
                                if (!gd.createTexture({
                                    src     : url,
                                    mipmaps : false,
                                    onload  : onload
                                }))
                                {
                                    if (text)
                                    {
                                        errorCallback("Failed to create texture for font '" + path + "'.");
                                    }
                                    else
                                    {
                                        errorCallback("Failed to load font '" + path + "'.");
                                    }
                                    delete fonts[path];
                                    delete loadingPages[path];
                                    delete loadingFont[path];
                                    numLoadingFonts -= 1;
                                }
                            }
                        });
                    }
                };

                var dataPath = path;

                var extension;
                var dot = dataPath.lastIndexOf(".");
                if (dot !== -1)
                {
                    extension = dataPath.substr(dot);
                }
                if (!extension ||
                    (extension !== ".fnt" && extension !== ".fontdat"))
                {
                    dataPath += ".fontdat";
                }

                rh.request({
                    src: (pathRemapping && pathRemapping[dataPath]) || (pathPrefix + dataPath),
                    onload: fontDataLoaded
                });
            }
            else if (onFontLoaded)
            {
                loadedObservers[path].subscribe(onFontLoaded);
            }
        }
        else
        {
            if (onFontLoaded)
            {
                // the callback should always be called asynchronously
                TurbulenzEngine.setTimeout(function fontAlreadyLoadedFn()
                    {
                        onFontLoaded(font);
                    }, 0);
            }
        }
        return font;
    }

    /**
      Alias one font to another name

      @memberOf FontManager.prototype
      @public
      @function
      @name map

      @param {string} dst Name of the alias
      @param {string} src Name of the font to be aliased
    */
    function mapFontFn(dst, src)
    {
        fonts[dst] = fonts[src];
        internalFont[dst] = true;
    }

    /**
      Removes a font from the manager

      @memberOf FontManager.prototype
      @public
      @function
      @name remove

      @param {string} path Path or name of the font
    */
    function removeFontFn(path)
    {
        if (path in fonts)
        {
            delete fonts[path];
        }
    }

    var fm = new FontManager();

    if (log)
    {
        fm.load = function loadFontLogFn(path)
        {
            log.innerHTML += "FontManager.load:&nbsp;'" + path + "'";
            return loadFontFn(path);
        };

        fm.map = function mapFontLogFn(dst, src)
        {
            log.innerHTML += "FontManager.map:&nbsp;'" + src + "' -> '" + dst + "'";
            mapFontFn(dst, src);
        };

        fm.remove = function removeFontLogFn(path)
        {
            log.innerHTML += "FontManager.remove:&nbsp;'" + path + "'";
            removeFontFn(path);
        };
    }
    else
    {
        fm.load = loadFontFn;
        fm.map = mapFontFn;
        fm.remove = removeFontFn;
    }

    /**
      Get object containing all loaded fonts data

      @memberOf FontManager.prototype
      @public
      @function
      @name getAll

      @return {object}
    */
    fm.getAll = function getAllFontsFn()
    {
        return fonts;
    };

    /**
      Get number of fonts pending

      @memberOf FontManager.prototype
      @public
      @function
      @name getNumLoadingFonts

      @return {number}
    */
    fm.getNumPendingFonts = function getNumPendingFontsFn()
    {
        return numLoadingFonts;
    };

    /**
      Check if a font is not pending

      @memberOf FontManager.prototype
      @public
      @function
      @name isFontLoaded

      @param {string} path Path or name of the font

      @return {boolean}
    */
    fm.isFontLoaded = function isFontLoadedFn(path)
    {
        return !loadingFont[path];
    };

    /**
      Check if a font is missing

      @memberOf FontManager.prototype
      @public
      @function
      @name isFontMissing

      @param {string} path Path or name of the font

      @return {boolean}
    */
    fm.isFontMissing = function isFontMissingFn(path)
    {
        return !fonts[path];
    };

    /**
      Set path remapping dictionary

      @memberOf FontManager.prototype
      @public
      @function
      @name setPathRemapping

      @param {string} prm Path remapping dictionary
      @param {string} assetUrl Asset prefix for all assets loaded
    */
    fm.setPathRemapping = function setPathRemappingFn(prm, assetUrl)
    {
        pathRemapping = prm;
        pathPrefix = assetUrl;
    };

    /**
      Calculate text dimensions

      @memberOf FontManager.prototype
      @public
      @function
      @name calculateTextDimensions

      @param {string} path Name of the font
      @param {string} text Text to calculate dimensions for
      @param {number} scale Text scale
      @param {number} spacing Extra spacing between characters

      @return {object} Width and height of the text
    */
    fm.calculateTextDimensions = function calculateTextDimensionsFn(path, text, scale, spacing)
    {
        var font = fonts[path];
        if (font)
        {
            return font.calculateTextDimensions(text, scale, spacing);
        }
        else
        {
            return {
                width: 0,
                height: 0,
                numGlyphs: 0
            };
        }
    };

    /**
      Destroy font manager

      @memberOf FontManager.prototype
      @public
      @function
      @name destroy
    */
    fm.destroy = function fontManagerDestroyFn(prm)
    {
        if (fonts)
        {
            var p;
            for (p in fonts)
            {
                if (fonts.hasOwnProperty(p))
                {
                    var font = fonts[p];
                    if (font)
                    {
                        var texture = font.texture;
                        if (texture)
                        {
                            texture.destroy();
                            font.texture = null;
                        }
                    }
                }
            }
            fonts = null;
        }
        if (sharedVertexBuffer)
        {
            sharedVertexBuffer.destroy();
            sharedVertexBuffer = null;
        }
        if (sharedIndexBuffer)
        {
            sharedIndexBuffer.destroy();
            sharedIndexBuffer = null;
        }
        techniqueParameters = null;
        semantics = null;
        loadingFont = null;
        loadingPages = null;
        loadedObservers = null;
        loadingPages = null;
        numLoadingFonts = 0;
        internalFont = null;
        pathRemapping = null;
        pathPrefix = null;
        rh = null;
        gd = null;
    };

    return fm;
};
