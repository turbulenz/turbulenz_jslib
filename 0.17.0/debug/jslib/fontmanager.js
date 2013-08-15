// Copyright (c) 2009-2011 Turbulenz Limited
/*global TurbulenzEngine: false*/

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
  @param {String} request Function used to request JSON files
  @param {Element} log Logging element

  @return {FontManager} object, null if failed
*/
FontManager.create = function fontManagerCreateFn(gd, df, errorCallback, log)
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
            transient: true});
    }

    /**
      @class  Font
      @private

      @since TurbulenzEngine 0.1.0
    */
    function Font() {}
    Font.prototype =
    {
        /**
          Version number
          @memberOf Font
          @constant
          @type number
        */
        version : 1,

        primitive: gd.PRIMITIVE_TRIANGLES,

        semantics: gd.createSemantics(['POSITION', 'TEXCOORD0']),

        indexBuffer : createIndexBuffer(256),

        vertexBuffer : createVertexBuffer(256),

        techniqueParameters: gd.createTechniqueParameters({
            texture: null
        }),


        calculateTextDimensions: function fontCalculateTextDimensionsFn(text, scale, spacing)
        {
            var glyphs = this.glyphs;
            var lineHeight = this.lineHeight;
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

        /**
          Draw text in rectangle

          @memberOf Font.prototype
          @public
          @function
          @name drawTextRect

          @param {string} text Text to calculate dimensions for
          @param {object} params Text drawing parameters:
                    rect: Rectangle to draw the text into
                    alignment: A value of 0 left-aligns the text.
                               A value of 1 center-aligns the text.
                               A value of 2 right-aligns the text.
                               When this flag is not set, the text defaults to left-aligned.
                    spacing: Extra pixels between glyphs.
                    scale: Scale factor applied to glyphs

        */
        drawTextRect: function fontDrawTextRectFn(text, params)
        {
            var rect = params.rect;
            var alignment = params.alignment;
            var scale = (params.scale || 1.0);
            var extraSpacing = (0.5 + ((params.spacing * scale) || 0));
            var dimensions = this.calculateTextDimensions(text, scale, extraSpacing);
            var numGlyphs = dimensions.numGlyphs;
            if (0 < numGlyphs)
            {
                var linesWidth = dimensions.linesWidth;
                var lineHeight = (this.lineHeight * scale);
                var kernings = this.kernings;
                var glyphs = this.glyphs;
                var writer, i;

                var numVertices = (numGlyphs * 4);
                var numIndicies = (numGlyphs * 6);

                var indexBuffer = Font.prototype.indexBuffer;
                if (!indexBuffer || numIndicies > indexBuffer.numIndices)
                {
                    Font.prototype.indexBuffer = indexBuffer = createIndexBuffer(numGlyphs);
                }

                var vertexBuffer = Font.prototype.vertexBuffer;
                if (!vertexBuffer || numVertices > vertexBuffer.numVertices)
                {
                    Font.prototype.vertexBuffer = vertexBuffer = createVertexBuffer(numGlyphs);
                }

                if (vertexBuffer)
                {
                    writer = vertexBuffer.map(0, numVertices);
                    if (writer)
                    {
                        var c, glyph, gx0, gy0, gx1, gy1, gaw, u0, v0, u1, v1;
                        var lineWidth = linesWidth[0];
                        var rectLeft = rect[0];
                        var rectWidth = rect[2];
                        var y = (rect[1] + (this.baseline * scale));
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
                                        gy0 = (y - (glyph.yoffset * scale));
                                        gx1 = (gx0 + (glyph.width  * scale));
                                        gy1 = (gy0 + (glyph.height * scale));
                                        u0 = glyph.left;
                                        v0 = glyph.top;
                                        u1 = glyph.right;
                                        v1 = glyph.bottom;

                                        writer(gx0, gy0, u0, v0);
                                        writer(gx1, gy0, u1, v0);
                                        writer(gx1, gy1, u1, v1);
                                        writer(gx0, gy1, u0, v1);

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

                        vertexBuffer.unmap(writer);

                        gd.setStream(vertexBuffer, this.semantics);
                        gd.setIndexBuffer(indexBuffer);

                        // TODO: support for multiple pages
                        var techniqueParameters = this.techniqueParameters;
                        techniqueParameters.texture = this.texture;
                        gd.setTechniqueParameters(techniqueParameters);

                        gd.drawIndexed(this.primitive, numIndicies);
                    }
                }
            }
        }
    };

    var fonts = {};
    var loadingFont = {};
    var numLoadingFonts = 0;
    var numLoadingPages = 0;
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
                        yoffset: h,
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
        else if (!font.lineHeight)
        {
            var minGlyphIndex = font.minGlyphIndex;
            var maxGlyphIndex = (minGlyphIndex + font.numGlyphs);
            var height = 0;
            var offset = 0;
            for (g = minGlyphIndex; g < maxGlyphIndex; g += 1)
            {
                var glyph = glyphs[g];
                glyph.page = 0;
                var goffset = (glyph.height - glyph.yoffset);
                if (height < glyph.height)
                {
                    height = glyph.height;
                }
                if (offset < goffset)
                {
                    offset = goffset;
                }
            }
            font.lineHeight = Math.round(height + offset);
            font.baseline = height;
        }
    }

    function createLoadedPage(pages, i, path)
    {
        return function (t) {

            var font = fonts[path];
            if (font)
            {
                if (t)
                {
                    pages[i] = t;

                    if (i === 0)
                    {
                        font.texture = t;
                    }
                }
                else
                {
                    errorCallback("Failed to load font page: '" + pages[i] + "'.");
                    delete fonts[path];
                }
            }

            numLoadingPages -= 1;
            if (numLoadingPages === 0)
            {
                delete loadingFont[path];
                numLoadingFonts -= 1;
            }
        };
    }

    /**
      Creates a font from an '.fnt' or '.fontdat'file and its associated image file

      @memberOf FontManager.prototype
      @public
      @function
      @name load

      @param {string} path Path to the font file without the extension

      @return {object} Font object if it exists, undefined otherwise
    */
    function loadFontFn(path)
    {
        var font = fonts[path];
        if (!font)
        {
            if (!(path in loadingFont))
            {
                loadingFont[path] = true;
                numLoadingFonts += 1;

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
                        numLoadingPages += numPages;
                        for (var i = 0; i < numPages; i += 1)
                        {
                            texturePath = pages[i];
                            if (!gd.createTexture({
                                src     : ((pathRemapping && pathRemapping[texturePath]) || (pathPrefix + texturePath)),
                                mipmaps : true,
                                onload  : createLoadedPage(pages, i, path)
                            }))
                            {
                                errorCallback("Failed to create texture for font '" + path + "'.");
                                delete fonts[path];

                                numLoadingPages -= (numPages - i);

                                if (i === 0)
                                {
                                    delete loadingFont[path];
                                    numLoadingFonts -= 1;
                                }
                                break;
                            }
                        }
                    }
                    else
                    {
                        texturePath = (path + ".dds");
                        if (!gd.createTexture({
                            src     : ((pathRemapping && pathRemapping[texturePath]) || (pathPrefix + texturePath)),
                            mipmaps : false,
                            onload  : function (t)
                            {
                                if (t)
                                {
                                    textureLoaded(font, t);
                                }
                                else
                                {
                                    errorCallback("Failed to load font page: '" + texturePath + "'.");
                                    delete fonts[path];
                                }

                                delete loadingFont[path];
                                numLoadingFonts -= 1;
                            }
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

                            delete loadingFont[path];
                            numLoadingFonts -= 1;
                        }
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

                TurbulenzEngine.request(((pathRemapping && pathRemapping[dataPath]) || (pathPrefix + dataPath)),
                                        fontDataLoaded);
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
        fonts = {};
        loadingFont = {};
        numLoadingFonts = 0;
        internalFont = {};
        pathRemapping = null;
        pathPrefix = "";
        Font.prototype = null;
    };

    return fm;
};
