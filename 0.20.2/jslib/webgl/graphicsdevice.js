// Copyright (c) 2011-2012 Turbulenz Limited
/*global TurbulenzEngine*/
/*global TGALoader*/
/*global DDSLoader*/
/*global TARLoader*/
/*global Int8Array*/
/*global Int16Array*/
/*global Int32Array*/
/*global Uint8Array*/
/*global Uint16Array*/
/*global Uint32Array*/
/*global Float32Array*/
/*global ArrayBuffer*/
/*global DataView*/
/*global window*/
/*global console*/
"use strict";

//
// WebGLTexture
//
function WebGLTexture() {}
WebGLTexture.prototype =
{
    version : 1,

    setData : function textureSetDataFn(data)
    {
        var gd = this.gd;
        var target = this.target;
        gd.bindTexture(target, this.glTexture);
        this.updateData(data);
        gd.bindTexture(target, null);
    },

    // Internal
    createGLTexture : function createGLTextureFn(data)
    {
        var gd = this.gd;
        var gl = gd.gl;

        var target;
        if (this.cubemap)
        {
            target = gl.TEXTURE_CUBE_MAP;
        }
        else if (this.depth > 1)
        {
            //target = gl.TEXTURE_3D;
            // 3D textures are not supported yet
            return false;
        }
        else
        {
            target = gl.TEXTURE_2D;
        }
        this.target = target;

        var gltex = gl.createTexture();
        this.glTexture = gltex;

        gd.bindTexture(target, gltex);

        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        if (this.mipmaps || 1 < this.numDataLevels)
        {
            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        }
        else
        {
            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        this.updateData(data);

        gd.bindTexture(target, null);

        return true;
    },

    updateData : function updateDataFn(data)
    {
        var gd = this.gd;
        var gl = gd.gl;

        function log2(a)
        {
            return Math.floor(Math.log(a) / Math.log(2));
        }

        var generateMipMaps = this.mipmaps && (this.numDataLevels !== (1 + Math.max(log2(this.width), log2(this.height))));
        var format = this.format;
        var internalFormat, gltype, srcStep, bufferData = null;
        var compressedTexturesExtension;

        if (format === gd.PIXELFORMAT_A8)
        {
            internalFormat = gl.ALPHA;
            gltype = gl.UNSIGNED_BYTE;
            srcStep = 1;
            if (data && !data.src)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_L8)
        {
            internalFormat = gl.LUMINANCE;
            gltype = gl.UNSIGNED_BYTE;
            srcStep = 1;
            if (data && !data.src)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_L8A8)
        {
            internalFormat = gl.LUMINANCE_ALPHA;
            gltype = gl.UNSIGNED_BYTE;
            srcStep = 2;
            if (data && !data.src)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_R5G5B5A1)
        {
            internalFormat = gl.RGBA;
            gltype = gl.UNSIGNED_SHORT_5_5_5_1;
            srcStep = 1;
            if (data && !data.src)
            {
                if (data instanceof Uint16Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint16Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_R5G6B5)
        {
            internalFormat = gl.RGB;
            gltype = gl.UNSIGNED_SHORT_5_6_5;
            srcStep = 1;
            if (data && !data.src)
            {
                if (data instanceof Uint16Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint16Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_R8G8B8A8)
        {
            internalFormat = gl.RGBA;
            gltype = gl.UNSIGNED_BYTE;
            srcStep = 4;
            if (data && !data.src)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_R8G8B8)
        {
            internalFormat = gl.RGB;
            gltype = gl.UNSIGNED_BYTE;
            srcStep = 3;
            if (data && !data.src)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
        }
        else if (format === gd.PIXELFORMAT_D24S8)
        {
            //internalFormat = gl.DEPTH24_STENCIL8_EXT;
            //gltype = gl.UNSIGNED_INT_24_8_EXT;
            //internalFormat = gl.DEPTH_COMPONENT;
            internalFormat = gl.DEPTH_STENCIL;
            gltype = gl.UNSIGNED_INT;
            srcStep = 1;
            if (data && !data.src)
            {
                bufferData = new Uint32Array(data);
            }
        }
        else if (format === gd.PIXELFORMAT_DXT1 ||
                 format === gd.PIXELFORMAT_DXT3 ||
                 format === gd.PIXELFORMAT_DXT5)
        {
            compressedTexturesExtension = gd.compressedTexturesExtension;
            if (compressedTexturesExtension)
            {
                if (format === gd.PIXELFORMAT_DXT1)
                {
                    internalFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
                    srcStep = 8;
                }
                else if (format === gd.PIXELFORMAT_DXT3)
                {
                    internalFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                    srcStep = 16;
                }
                else //if (format === gd.PIXELFORMAT_DXT5)
                {
                    internalFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    srcStep = 16;
                }

                if (internalFormat === undefined)
                {
                    return; // Unsupported format
                }

                if (data && !data.src)
                {
                    if (data instanceof Uint8Array)
                    {
                        bufferData = data;
                    }
                    else
                    {
                        bufferData = new Uint8Array(data);
                    }
                }
            }
            else
            {
                return;   // Unsupported format
            }
        }
        else
        {
            return;   //unknown/unsupported format
        }

        var numLevels = (data && 0 < this.numDataLevels ? this.numDataLevels : 1);
        var w = this.width, h = this.height, offset = 0, target, n, levelSize, levelData;
        if (this.cubemap)
        {
            target = gl.TEXTURE_CUBE_MAP;
            gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            for (var f = 0; f < 6; f += 1)
            {
                var faceTarget = (gl.TEXTURE_CUBE_MAP_POSITIVE_X + f);
                for (n = 0; n < numLevels; n += 1)
                {
                    if (compressedTexturesExtension)
                    {
                        levelSize = (Math.floor((w + 3) / 4) * Math.floor((h + 3) / 4) * srcStep);
                        if (bufferData)
                        {
                            if (numLevels === 1)
                            {
                                levelData = bufferData;
                            }
                            else
                            {
                                levelData = bufferData.subarray(offset, (offset + levelSize));
                            }
                        }
                        else
                        {
                            levelData = new Uint8Array(levelSize);
                        }
                        if (gd.WEBGL_compressed_texture_s3tc)
                        {
                            gl.compressedTexImage2D(faceTarget, n, internalFormat, w, h, 0,
                                                    levelData);
                        }
                        else
                        {
                            compressedTexturesExtension.compressedTexImage2D(faceTarget, n, internalFormat, w, h, 0,
                                                                             levelData);
                        }
                    }
                    else
                    {
                        levelSize = (w * h * srcStep);
                        if (bufferData)
                        {
                            if (numLevels === 1)
                            {
                                levelData = bufferData;
                            }
                            else
                            {
                                levelData = bufferData.subarray(offset, (offset + levelSize));
                            }
                            gl.texImage2D(faceTarget, n, internalFormat, w, h, 0, internalFormat, gltype, levelData);
                        }
                        else if (data)
                        {
                            gl.texImage2D(faceTarget, n, internalFormat, internalFormat, gltype, data);
                        }
                        else
                        {
                            gl.texImage2D(faceTarget, n, internalFormat, w, h, 0, internalFormat, gltype,
                                          new Uint8Array(levelSize));
                        }
                    }
                    offset += levelSize;
                    w = (w > 1 ? Math.floor(w / 2) : 1);
                    h = (h > 1 ? Math.floor(h / 2) : 1);
                }
                w = this.width;
                h = this.height;
            }
        }
        else
        {
            target = gl.TEXTURE_2D;
            gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            for (n = 0; n < numLevels; n += 1)
            {
                if (compressedTexturesExtension)
                {
                    levelSize = (Math.floor((w + 3) / 4) * Math.floor((h + 3) / 4) * srcStep);
                    if (bufferData)
                    {
                        if (numLevels === 1)
                        {
                            levelData = bufferData;
                        }
                        else
                        {
                            levelData = bufferData.subarray(offset, (offset + levelSize));
                        }
                    }
                    else
                    {
                        levelData = new Uint8Array(levelSize);
                    }
                    if (gd.WEBGL_compressed_texture_s3tc)
                    {
                        gl.compressedTexImage2D(target, n, internalFormat, w, h, 0, levelData);
                    }
                    else
                    {
                        compressedTexturesExtension.compressedTexImage2D(target, n, internalFormat, w, h, 0, levelData);
                    }
                }
                else
                {
                    levelSize = (w * h * srcStep);
                    if (bufferData)
                    {
                        if (numLevels === 1)
                        {
                            levelData = bufferData;
                        }
                        else
                        {
                            levelData = bufferData.subarray(offset, (offset + levelSize));
                        }
                        gl.texImage2D(target, n, internalFormat, w, h, 0, internalFormat, gltype, levelData);
                    }
                    else if (data)
                    {
                        gl.texImage2D(target, n, internalFormat, internalFormat, gltype, data);
                    }
                    else
                    {
                        gl.texImage2D(target, n, internalFormat, w, h, 0, internalFormat, gltype,
                                      new Uint8Array(levelSize));
                    }
                }
                offset += levelSize;
                w = (w > 1 ? Math.floor(w / 2) : 1);
                h = (h > 1 ? Math.floor(h / 2) : 1);
            }
        }

        if (generateMipMaps)
        {
            gl.generateMipmap(target);
        }
    },

    updateMipmaps : function updateMipmapsFn(face)
    {
        if (this.mipmaps)
        {
            if (this.depth > 1)
            {
                TurbulenzEngine.callOnError(
                    "3D texture mipmap generation unsupported");
                return;
            }

            if (this.cubemap && face !== 5)
            {
                return;
            }

            var gd = this.gd;
            var gl = gd.gl;

            var target = this.target;
            gd.bindTexture(target, this.glTexture);
            gl.generateMipmap(target);
            gd.bindTexture(target, null);
        }
    },

    destroy : function textureDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var glTexture = this.glTexture;
            if (glTexture)
            {
                var gl = gd.gl;
                if (gl)
                {
                    gd.unbindTexture(glTexture);
                    gl.deleteTexture(glTexture);
                }
                delete this.glTexture;
            }

            delete this.sampler;
            delete this.gd;
        }
    }
};

// Constructor function
WebGLTexture.create = function webGLTextureCreateFn(gd, params)
{
    var tex = new WebGLTexture();
    tex.gd = gd;
    tex.mipmaps = params.mipmaps;
    tex.dynamic = params.dynamic;
    tex.renderable = params.renderable;
    tex.numDataLevels = 0;

    var src = params.src;
    if (src)
    {
        tex.name = params.name || src;
        var extension;
        var data = params.data;
        if (data)
        {
            // do not trust file extensions if we got data...
            if (data[0] === 137 &&
                data[1] === 80 &&
                data[2] === 78 &&
                data[3] === 71)
            {
                extension = '.png';
            }
            else if (data[0] === 255 &&
                     data[1] === 216 &&
                     data[2] === 255 &&
                     (data[3] === 224 || data[3] === 225))
            {
                extension = '.jpg';
            }
            else if (data[0] === 68 &&
                     data[1] === 68 &&
                     data[2] === 83 &&
                     data[3] === 32)
            {
                extension = '.dds';
            }
            else
            {
                extension = src.slice(-4);
            }
        }
        else
        {
            extension = src.slice(-4);
        }

        // DDS and TGA textures require out own image loaders
        if (extension === '.dds' ||
            extension === '.tga')
        {
            if (extension === '.tga' && typeof TGALoader !== 'undefined')
            {
                var tgaParams = {
                    gd: gd,
                    onload : function tgaLoadedFn(data, width, height, format, status)
                    {
                        tex.width = width;
                        tex.height = height;
                        tex.depth = 1;
                        tex.format = format;
                        tex.cubemap = false;
                        var result = tex.createGLTexture(data);
                        if (params.onload)
                        {
                            params.onload(result ? tex : null, status);
                        }
                    },
                    onerror : function tgaFailedFn()
                    {
                        tex.failed = true;
                        if (params.onload)
                        {
                            params.onload(null);
                        }
                    }
                };
                if (data)
                {
                    tgaParams.data = data;
                }
                else
                {
                    tgaParams.src = src;
                }
                TGALoader.create(tgaParams);
                return tex;
            }
            else if (extension === '.dds' && typeof DDSLoader !== 'undefined')
            {
                var ddsParams = {
                    gd: gd,
                    onload : function ddsLoadedFn(data, width, height, format, numLevels, cubemap, depth, status)
                    {
                        tex.width = width;
                        tex.height = height;
                        tex.depth = 1;
                        tex.format = format;
                        tex.cubemap = cubemap;
                        tex.depth = depth;
                        tex.numDataLevels = numLevels;
                        var result = tex.createGLTexture(data);
                        if (params.onload)
                        {
                            params.onload(result ? tex : null, status);
                        }
                    },
                    onerror : function ddsFailedFn()
                    {
                        tex.failed = true;
                        if (params.onload)
                        {
                            params.onload(null);
                        }
                    }
                };
                if (data)
                {
                    ddsParams.data = data;
                }
                else
                {
                    ddsParams.src = src;
                }
                DDSLoader.create(ddsParams);
                return tex;
            }
            else
            {
                TurbulenzEngine.callOnError(
                    'Missing image loader required for ' + src);

                tex = webGLTextureCreateFn(gd, {
                    name    : (params.name || src),
                    width   : 2,
                    height  : 2,
                    depth   : 1,
                    format  : 'R8G8B8A8',
                    cubemap : false,
                    mipmaps : params.mipmaps,
                    dynamic : params.dynamic,
                    renderable : params.renderable,
                    data    : [255,  20, 147, 255,
                               255,   0,   0, 255,
                               255, 255, 255, 255,
                               255,  20, 147, 255]
                });

                if (params.onload)
                {
                    if (TurbulenzEngine)
                    {
                        TurbulenzEngine.setTimeout(function () {
                            params.onload(tex, 200);
                        }, 0);
                    }
                    else
                    {
                        window.setTimeout(function () {
                            params.onload(tex, 200);
                        }, 0);
                    }
                }
                return tex;
            }
        }

        var img = new Image();
        img.onload = function imageLoadedFn()
        {
            tex.width = img.width;
            tex.height = img.height;
            tex.depth = 1;
            tex.format = gd.PIXELFORMAT_R8G8B8A8;
            tex.cubemap = false;
            var result = tex.createGLTexture(img);
            if (params.onload)
            {
                params.onload(result ? tex : null, 200);
            }
        };
        img.onerror = function imageFailedFn()
        {
            tex.failed = true;
            if (params.onload)
            {
                params.onload(null);
            }
        };
        if (data)
        {
            var arrayToSring = function arrayToSringFn(bytes)
            {
                var numBytes = bytes.length;
                var a = [];
                a.length = numBytes;
                for (var n = 0; n < numBytes; n += 1)
                {
                    a[n] = bytes[n];
                }
                return String.fromCharCode.apply(null, a);
            };

            if (extension === '.jpg' || extension === '.jpeg')
            {
                src = 'data:image/jpeg;base64,' + window.btoa(arrayToSring(data));
            }
            else if (extension === '.png')
            {
                src = 'data:image/png;base64,' + window.btoa(arrayToSring(data));
            }
        }
        else
        {
            img.crossOrigin = 'anonymous';
        }
        img.src = src;
    }
    else
    {
        // Invalid src values like "" fall through to here
        if ("" === src && params.onload)
        {
            // Assume the caller intended to pass in a valid url.
            return null;
        }

        var format = params.format;
        if (typeof format === 'string')
        {
            format = gd['PIXELFORMAT_' + format];
        }

        tex.width = params.width;
        tex.height = params.height;
        tex.depth = params.depth;
        tex.format = format;
        tex.cubemap = params.cubemap;
        tex.name = params.name;

        var result = tex.createGLTexture(params.data);
        if (!result)
        {
            tex = null;
        }

        if (params.onload)
        {
            params.onload(tex, 200);
        }
    }

    return tex;
};


//
// WebGLRenderBuffer
//
function WebGLRenderBuffer() {}
WebGLRenderBuffer.prototype =
{
    version : 1,

    destroy : function renderBufferDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var glBuffer = this.glBuffer;
            if (glBuffer)
            {
                var gl = gd.gl;
                if (gl)
                {
                    gl.deleteRenderbuffer(glBuffer);
                }
                delete this.glBuffer;
            }

            delete this.gd;
        }
    }
};

// Constructor function
WebGLRenderBuffer.create = function webGLRenderBufferFn(gd, params)
{
    var renderBuffer = new WebGLRenderBuffer();

    var width = params.width;
    var height = params.height;
    var format = params.format;
    if (typeof format === 'string')
    {
        format = gd['PIXELFORMAT_' + format];
    }

    if (format !== gd.PIXELFORMAT_D24S8)
    {
        return null;
    }

    var gl = gd.gl;

    var glBuffer = gl.createRenderbuffer();

    gl.bindRenderbuffer(gl.RENDERBUFFER, glBuffer);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);

    renderBuffer.width = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_WIDTH);
    renderBuffer.height = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_HEIGHT);

    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    if (renderBuffer.width < width ||
        renderBuffer.height < height)
    {
        gl.deleteRenderbuffer(glBuffer);
        return null;
    }

    renderBuffer.gd = gd;
    renderBuffer.format = format;
    renderBuffer.glBuffer = glBuffer;

    return renderBuffer;
};


//
// WebGLRenderTarget
//
function WebGLRenderTarget() {}
WebGLRenderTarget.prototype =
{
    version : 1,

    bind : function bindFn()
    {
        var gd = this.gd;
        var gl = gd.gl;

        gd.unbindTexture(this.colorTexture0.glTexture);
        if (this.depthTexture)
        {
            gd.unbindTexture(this.depthTexture.glTexture);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.glObject);

        var state = gd.state;
        this.oldViewportBox = state.viewportBox.slice();
        this.oldScissorBox = state.scissorBox.slice();
        gd.setViewport(0, 0, this.width, this.height);
        gd.setScissor(0, 0, this.width, this.height);

        return true;
    },

    unbind : function unbindFn()
    {
        var gd = this.gd;
        var gl = gd.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gd.setViewport.apply(gd, this.oldViewportBox);
        gd.setScissor.apply(gd, this.oldScissorBox);

        this.colorTexture0.updateMipmaps(this.face);
        if (this.depthTexture)
        {
            this.depthTexture.updateMipmaps(this.face);
        }
    },

    destroy : function renderTargetDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var glObject = this.glObject;
            if (glObject)
            {
                var gl = gd.gl;
                if (gl)
                {
                    gl.deleteFramebuffer(glObject);
                }
                delete this.glObject;
            }

            delete this.colorTexture0;
            delete this.colorTexture1;
            delete this.colorTexture2;
            delete this.colorTexture3;
            delete this.depthBuffer;
            delete this.depthTexture;
            delete this.gd;
        }
    }
};

// Constructor function
WebGLRenderTarget.create = function webGLRenderTargetFn(gd, params)
{
    var renderTarget = new WebGLRenderTarget();

    var colorTexture0 = params.colorTexture0;
    var colorTexture1 = (colorTexture0 ? (params.colorTexture1 || null) : null);
    var colorTexture2 = (colorTexture1 ? (params.colorTexture2 || null) : null);
    var colorTexture3 = (colorTexture2 ? (params.colorTexture3 || null) : null);
    var depthBuffer = params.depthBuffer || null;
    var depthTexture = params.depthTexture || null;
    var face = params.face;

    var maxSupported  = gd.maxSupported("RENDERTARGET_COLOR_TEXTURES");
    if (colorTexture1 && maxSupported < 2)
    {
        return null;
    }
    if (colorTexture2 && maxSupported < 3)
    {
        return null;
    }
    if (colorTexture3 && maxSupported < 4)
    {
        return null;
    }

    var gl = gd.gl;

    var glObject = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, glObject);

    var width, height;
    if (colorTexture0)
    {
        width = colorTexture0.width;
        height = colorTexture0.height;

        var glTexture = colorTexture0.glTexture;
        if (glTexture === undefined)
        {
            TurbulenzEngine.callOnError("Color texture is not a Texture");
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(glObject);
            return null;
        }

        var colorAttachment0 = gl.COLOR_ATTACHMENT0;
        if (colorTexture0.cubemap)
        {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, colorAttachment0, (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), glTexture, 0);
        }
        else
        {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, colorAttachment0, gl.TEXTURE_2D, glTexture, 0);
        }

        if (colorTexture1)
        {
            glTexture = colorTexture1.glTexture;
            if (colorTexture1.cubemap)
            {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 1), (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), glTexture, 0);
            }
            else
            {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 1), gl.TEXTURE_2D, glTexture, 0);
            }

            if (colorTexture2)
            {
                glTexture = colorTexture2.glTexture;
                if (colorTexture1.cubemap)
                {
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 2), (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), glTexture, 0);
                }
                else
                {
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 2), gl.TEXTURE_2D, glTexture, 0);
                }

                if (colorTexture3)
                {
                    glTexture = colorTexture3.glTexture;
                    if (colorTexture1.cubemap)
                    {
                        gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 3), (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), glTexture, 0);
                    }
                    else
                    {
                        gl.framebufferTexture2D(gl.FRAMEBUFFER, (colorAttachment0 + 3), gl.TEXTURE_2D, glTexture, 0);
                    }
                }
            }
        }
    }
    else if (depthTexture)
    {
        width = depthTexture.width;
        height = depthTexture.height;
    }
    else if (depthBuffer)
    {
        width = depthBuffer.width;
        height = depthBuffer.height;
    }
    else
    {
        TurbulenzEngine.callOnError(
            "No RenderBuffers or Textures specified for this RenderTarget");
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(glObject);
        return null;
    }

    if (depthTexture)
    {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT,
                                gl.TEXTURE_2D, depthTexture.glTexture, 0);
    }
    else if (depthBuffer)
    {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT,
                                   gl.RENDERBUFFER, depthBuffer.glBuffer);
    }

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE)
    {
        gl.deleteFramebuffer(glObject);
        return null;
    }

    renderTarget.gd = gd;
    renderTarget.glObject = glObject;
    renderTarget.colorTexture0 = colorTexture0;
    renderTarget.colorTexture1 = colorTexture1;
    renderTarget.colorTexture2 = colorTexture2;
    renderTarget.colorTexture3 = colorTexture3;
    renderTarget.depthBuffer = depthBuffer;
    renderTarget.depthTexture = depthTexture;
    renderTarget.width = width;
    renderTarget.height = height;
    renderTarget.face = face;

    return renderTarget;
};


//
// WebGLIndexBuffer
//
function WebGLIndexBuffer() {}
WebGLIndexBuffer.prototype =
{
    version : 1,

    map : function indexBufferMapFn(offset, numIndices)
    {
        if (offset === undefined)
        {
            offset = 0;
        }
        if (numIndices === undefined)
        {
            numIndices = this.numIndices;
        }

        var gd = this.gd;
        var gl = gd.gl;

        var format = this.format;
        var data;
        if (format === gl.UNSIGNED_BYTE)
        {
            data = new Uint8Array(numIndices);
        }
        else if (format === gl.UNSIGNED_SHORT)
        {
            data = new Uint16Array(numIndices);
        }
        else //if (format === gl.UNSIGNED_INT)
        {
            data = new Uint32Array(numIndices);
        }

        var numValues = 0;
        var writer = function indexBufferWriterFn()
        {
            var numArguments = arguments.length;
            for (var n = 0; n < numArguments; n += 1)
            {
                data[numValues] = arguments[n];
                numValues += 1;
            }
        };
        writer.data = data;
        writer.offset = offset;
        writer.getNumWrittenIndices = function getNumWrittenIndicesFn()
        {
            return numValues;
        };
        writer.write = writer;
        return writer;
    },

    unmap : function indexBufferUnmapFn(writer)
    {
        if (writer)
        {
            var gd = this.gd;
            var gl = gd.gl;

            var data = writer.data;
            delete writer.data;

            var offset = writer.offset;

            delete writer.write;

            var numIndices = writer.getNumWrittenIndices();
            if (!numIndices)
            {
                return;
            }

            if (numIndices < data.length)
            {
                data = data.subarray(0, numIndices);
            }

            gd.setIndexBuffer(this);

            if (numIndices < this.numIndices)
            {
                gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, offset, data);
            }
            else
            {
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, this.usage);
            }
        }
    },

    setData : function indexBufferSetDataFn(data, offset, numIndices)
    {
        if (offset === undefined)
        {
            offset = 0;
        }
        if (numIndices === undefined)
        {
            numIndices = this.numIndices;
        }

        var gd = this.gd;
        var gl = gd.gl;

        var bufferData;
        var format = this.format;
        if (format === gl.UNSIGNED_BYTE)
        {
            if (data instanceof Uint8Array)
            {
                bufferData = data;
            }
            else
            {
                bufferData = new Uint8Array(data);
            }
        }
        else if (format === gl.UNSIGNED_SHORT)
        {
            if (data instanceof Uint16Array)
            {
                bufferData = data;
            }
            else
            {
                bufferData = new Uint16Array(data);
            }
            offset *= 2;
        }
        else if (format === gl.UNSIGNED_INT)
        {
            if (data instanceof Uint32Array)
            {
                bufferData = data;
            }
            else
            {
                bufferData = new Uint32Array(data);
            }
            offset *= 4;
        }
        data = undefined;

        if (numIndices < bufferData.length)
        {
            bufferData = bufferData.subarray(0, numIndices);
        }

        gd.setIndexBuffer(this);

        if (numIndices < this.numIndices)
        {
            gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, offset, bufferData);
        }
        else
        {
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bufferData, this.usage);
        }
    },

    destroy : function indexBufferDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var glBuffer = this.glBuffer;
            if (glBuffer)
            {
                var gl = gd.gl;
                if (gl)
                {
                    gd.unsetIndexBuffer(this);
                    gl.deleteBuffer(glBuffer);
                }
                delete this.glBuffer;
            }

            delete this.gd;
        }
    }
};

// Constructor function
WebGLIndexBuffer.create = function webGLIndexBufferCreateFn(gd, params)
{
    var gl = gd.gl;

    var ib = new WebGLIndexBuffer();
    ib.gd = gd;

    var numIndices = params.numIndices;
    ib.numIndices = numIndices;

    var format = params.format;
    if (typeof format === "string")
    {
        format = gd['INDEXFORMAT_' + format];
    }
    ib.format = format;

    var stride;
    if (format === gl.UNSIGNED_BYTE)
    {
        stride = 1;
    }
    else if (format === gl.UNSIGNED_SHORT)
    {
        stride = 2;
    }
    else //if (format === gl.UNSIGNED_INT)
    {
        stride = 4;
    }
    ib.stride = stride;

    ib.dynamic = params.dynamic;
    ib.usage = (params.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    ib.glBuffer = gl.createBuffer();

    if (params.data)
    {
        ib.setData(params.data, 0, numIndices);
    }
    else
    {
        gd.setIndexBuffer(ib);

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, (numIndices * stride), ib.usage);
    }

    return ib;
};


//
// WebGLSemantics
//
function WebGLSemantics() {}
WebGLSemantics.prototype =
{
    version : 1
};

// Constructor function
WebGLSemantics.create = function webGLSemanticsCreateFn(gd, attributes)
{
    var semantics = new WebGLSemantics();

    var numAttributes = attributes.length;
    semantics.length = numAttributes;
    for (var i = 0; i < numAttributes; i += 1)
    {
        var attribute = attributes[i];
        if (typeof attribute === "string")
        {
            semantics[i] = gd['SEMANTIC_' + attribute];
        }
        else
        {
            semantics[i] = attribute;
        }
    }

    return semantics;
};


//
// WebGLVertexBuffer
//
function WebGLVertexBuffer() {}
WebGLVertexBuffer.prototype =
{
    version : 1,

    map : function vertexBufferMapFn(offset, numVertices)
    {
        if (offset === undefined)
        {
            offset = 0;
        }
        if (numVertices === undefined)
        {
            numVertices = this.numVertices;
        }

        var gd = this.gd;
        var gl = gd.gl;

        var numValuesPerVertex = this.stride;
        var attributes = this.attributes;
        var numAttributes = attributes.length;

        var data, writer;
        var numValues = 0;

        if (this.hasSingleFormat)
        {
            var maxNumValues = (numVertices * numValuesPerVertex);
            var format = attributes[0].format;

            if (this.bufferData)
            {
                if (format === gl.BYTE)
                {
                    data = new Int8Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.UNSIGNED_BYTE)
                {
                    data = new Uint8Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.SHORT)
                {
                    data = new Int16Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.UNSIGNED_SHORT)
                {
                    data = new Uint16Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.INT)
                {
                    data = new Int32Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.UNSIGNED_INT)
                {
                    data = new Uint32Array(this.bufferData, 0, maxNumValues);
                }
                else if (format === gl.FLOAT)
                {
                    data = new Float32Array(this.bufferData, 0, maxNumValues);
                }
            }
            else
            {
                if (format === gl.BYTE)
                {
                    data = new Int8Array(maxNumValues);
                }
                else if (format === gl.UNSIGNED_BYTE)
                {
                    data = new Uint8Array(maxNumValues);
                }
                else if (format === gl.SHORT)
                {
                    data = new Int16Array(maxNumValues);
                }
                else if (format === gl.UNSIGNED_SHORT)
                {
                    data = new Uint16Array(maxNumValues);
                }
                else if (format === gl.INT)
                {
                    data = new Int32Array(maxNumValues);
                }
                else if (format === gl.UNSIGNED_INT)
                {
                    data = new Uint32Array(maxNumValues);
                }
                else if (format === gl.FLOAT)
                {
                    data = new Float32Array(maxNumValues);
                }
            }

            writer = function vertexBufferWriterSingleFn()
            {
                var numArguments = arguments.length;
                var currentArgument = 0;
                for (var a = 0; a < numAttributes; a += 1)
                {
                    var attribute = attributes[a];
                    var numComponents = attribute.numComponents;
                    var currentComponent = 0, j;
                    do
                    {
                        if (currentArgument < numArguments)
                        {
                            var value = arguments[currentArgument];
                            currentArgument += 1;
                            if (typeof value === "number")
                            {
                                if (attribute.normalized)
                                {
                                    value *= attribute.normalizationScale;
                                }
                                data[numValues] = value;
                                numValues += 1;
                                currentComponent += 1;
                            }
                            else if (currentComponent === 0)
                            {
                                var numSubArguments = value.length;
                                if (numSubArguments > numComponents)
                                {
                                    numSubArguments = numComponents;
                                }
                                if (attribute.normalized)
                                {
                                    var scale = attribute.normalizationScale;
                                    for (j = 0; j < numSubArguments; j += 1)
                                    {
                                        data[numValues] = (value[j] * scale);
                                        numValues += 1;
                                        currentComponent += 1;
                                    }
                                }
                                else
                                {
                                    for (j = 0; j < numSubArguments; j += 1)
                                    {
                                        data[numValues] = value[j];
                                        numValues += 1;
                                        currentComponent += 1;
                                    }
                                }
                                while (currentComponent < numComponents)
                                {
                                    // No need to clear to zeros
                                    numValues += 1;
                                    currentComponent += 1;
                                }
                                break;
                            }
                            else
                            {
                                TurbulenzEngine.callOnError(
                                    'Missing values for attribute ' + a);
                                return null;
                            }
                        }
                        else
                        {
                            // No need to clear to zeros
                            numValues += 1;
                            currentComponent += 1;
                        }
                    }
                    while (currentComponent < numComponents);
                }
            };
        }
        else
        {
            var destOffset = 0;
            var bufferSize = (numVertices * this.strideInBytes);

            if (typeof DataView !== 'undefined' && 'setFloat32' in DataView.prototype)
            {
                if (this.bufferData)
                {
                    data = new DataView(this.bufferData, 0, bufferSize);
                }
                else
                {
                    data = new ArrayBuffer(bufferSize);
                    data = new DataView(data);
                }

                writer = function vertexBufferWriterDataViewFn()
                {
                    var numArguments = arguments.length;
                    var currentArgument = 0;
                    for (var a = 0; a < numAttributes; a += 1)
                    {
                        var attribute = attributes[a];
                        var numComponents = attribute.numComponents;
                        var setter = attribute.typedSetter;
                        var componentStride = attribute.componentStride;
                        var currentComponent = 0, j;
                        do
                        {
                            if (currentArgument < numArguments)
                            {
                                var value = arguments[currentArgument];
                                currentArgument += 1;
                                if (typeof value === "number")
                                {
                                    if (attribute.normalized)
                                    {
                                        value *= attribute.normalizationScale;
                                    }
                                    setter.call(data, destOffset, value, true);
                                    destOffset += componentStride;
                                    currentComponent += 1;
                                    numValues += 1;
                                }
                                else if (currentComponent === 0)
                                {
                                    var numSubArguments = value.length;
                                    if (numSubArguments > numComponents)
                                    {
                                        numSubArguments = numComponents;
                                    }
                                    if (attribute.normalized)
                                    {
                                        var scale = attribute.normalizationScale;
                                        for (j = 0; j < numSubArguments; j += 1)
                                        {
                                            setter.call(data, destOffset, (value[j] * scale), true);
                                            destOffset += componentStride;
                                            currentComponent += 1;
                                            numValues += 1;
                                        }
                                    }
                                    else
                                    {
                                        for (j = 0; j < numSubArguments; j += 1)
                                        {
                                            setter.call(data, destOffset, value[j], true);
                                            destOffset += componentStride;
                                            currentComponent += 1;
                                            numValues += 1;
                                        }
                                    }
                                    while (currentComponent < numComponents)
                                    {
                                        // No need to clear to zeros
                                        numValues += 1;
                                        currentComponent += 1;
                                    }
                                    break;
                                }
                                else
                                {
                                    TurbulenzEngine.callOnError(
                                        'Missing values for attribute ' + a);
                                    return null;
                                }
                            }
                            else
                            {
                                // No need to clear to zeros
                                numValues += 1;
                                currentComponent += 1;
                            }
                        }
                        while (currentComponent < numComponents);
                    }
                };
            }
            else
            {
                if (this.bufferData &&
                    this.bufferData.byteLength === bufferSize)
                {
                    data = this.bufferData;
                }
                else
                {
                    data = new ArrayBuffer(bufferSize);
                }

                writer = function vertexBufferWriterMultiFn()
                {
                    var numArguments = arguments.length;
                    var currentArgument = 0;
                    var dest;
                    for (var a = 0; a < numAttributes; a += 1)
                    {
                        var attribute = attributes[a];
                        var numComponents = attribute.numComponents;
                        dest = new attribute.typedArray(data, destOffset, numComponents);
                        destOffset += attribute.stride;

                        var currentComponent = 0, j;
                        do
                        {
                            if (currentArgument < numArguments)
                            {
                                var value = arguments[currentArgument];
                                currentArgument += 1;
                                if (typeof value === "number")
                                {
                                    if (attribute.normalized)
                                    {
                                        value *= attribute.normalizationScale;
                                    }
                                    dest[currentComponent] = value;
                                    currentComponent += 1;
                                    numValues += 1;
                                }
                                else if (currentComponent === 0)
                                {
                                    var numSubArguments = value.length;
                                    if (numSubArguments > numComponents)
                                    {
                                        numSubArguments = numComponents;
                                    }
                                    if (attribute.normalized)
                                    {
                                        var scale = attribute.normalizationScale;
                                        for (j = 0; j < numSubArguments; j += 1)
                                        {
                                            dest[currentComponent] = (value[j] * scale);
                                            currentComponent += 1;
                                            numValues += 1;
                                        }
                                    }
                                    else
                                    {
                                        for (j = 0; j < numSubArguments; j += 1)
                                        {
                                            dest[currentComponent] = value[j];
                                            currentComponent += 1;
                                            numValues += 1;
                                        }
                                    }
                                    while (currentComponent < numComponents)
                                    {
                                        // No need to clear to zeros
                                        currentComponent += 1;
                                        numValues += 1;
                                    }
                                    break;
                                }
                                else
                                {
                                    TurbulenzEngine.callOnError(
                                        'Missing values for attribute ' + a);
                                    return null;
                                }
                            }
                            else
                            {
                                // No need to clear to zeros
                                currentComponent += 1;
                                numValues += 1;
                            }
                        }
                        while (currentComponent < numComponents);
                    }
                };
            }
        }

        writer.data = data;
        writer.offset = offset;
        writer.getNumWrittenVertices = function getNumWrittenVerticesFn()
        {
            return Math.floor(numValues / numValuesPerVertex);
        };
        writer.getNumWrittenValues = function getNumWrittenValuesFn()
        {
            return numValues;
        };
        writer.write = writer;
        return writer;
    },

    unmap : function vertexBufferUnmapFn(writer)
    {
        if (writer)
        {
            var data = writer.data;
            delete writer.data;

            delete writer.write;

            var numVertices = writer.getNumWrittenVertices();
            if (!numVertices)
            {
                return;
            }

            var offset = writer.offset;

            var stride = this.strideInBytes;

            if (this.hasSingleFormat)
            {
                var numValues = writer.getNumWrittenValues();
                if (numValues < data.length)
                {
                    data = data.subarray(0, numValues);
                }
            }
            else
            {
                if ((numVertices * stride) < data.byteLength)
                {
                    if (typeof DataView !== 'undefined')
                    {
                        data = new DataView(data.buffer, 0, (numVertices * stride));
                    }
                }
            }

            var gd = this.gd;
            var gl = gd.gl;

            gd.bindVertexBuffer(this.glBuffer);

            if (numVertices < this.numVertices)
            {
                gl.bufferSubData(gl.ARRAY_BUFFER, (offset * stride), data);
            }
            else
            {
                gl.bufferData(gl.ARRAY_BUFFER, data, this.usage);
            }
        }
    },

    setData : function vertexBufferSetDataFn(data, offset, numVertices)
    {
        if (offset === undefined)
        {
            offset = 0;
        }
        if (numVertices === undefined)
        {
            numVertices = this.numVertices;
        }

        var gd = this.gd;
        var gl = gd.gl;
        var strideInBytes = this.strideInBytes;
        var attributes = this.attributes;
        var numAttributes = this.numAttributes;
        var attribute, format, bufferData;
        if (this.hasSingleFormat)
        {
            attribute = attributes[0];
            format = attribute.format;

            if (attribute.normalized)
            {
                data = this.scaleValues(data, attribute.normalizationScale);
            }

            if (format === gl.BYTE)
            {
                if (data instanceof Int8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Int8Array(data);
                }
            }
            else if (format === gl.UNSIGNED_BYTE)
            {
                if (data instanceof Uint8Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint8Array(data);
                }
            }
            else if (format === gl.SHORT)
            {
                if (data instanceof Int16Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Int16Array(data);
                }
            }
            else if (format === gl.UNSIGNED_SHORT)
            {
                if (data instanceof Uint16Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint16Array(data);
                }
            }
            else if (format === gl.INT)
            {
                if (data instanceof Int32Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Int32Array(data);
                }
            }
            else if (format === gl.UNSIGNED_INT)
            {
                if (data instanceof Uint32Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Uint32Array(data);
                }
            }
            else if (format === gl.FLOAT)
            {
                if (data instanceof Float32Array)
                {
                    bufferData = data;
                }
                else
                {
                    bufferData = new Float32Array(data);
                }
            }

            var numValuesPerVertex = this.stride;
            var numValues = (numVertices * numValuesPerVertex);
            if (numValues < bufferData.length)
            {
                bufferData = bufferData.subarray(0, numValues);
            }
        }
        else
        {
            var bufferSize = (numVertices * strideInBytes);

            var srcOffset = 0, destOffset = 0, v, c, a, numComponents, componentStride, scale;
            if (typeof DataView !== 'undefined' && 'setFloat32' in DataView.prototype)
            {
                if (this.bufferData)
                {
                    bufferData = new DataView(this.bufferData, 0, bufferSize);
                }
                else
                {
                    bufferData = new ArrayBuffer(bufferSize);
                    bufferData = new DataView(bufferData);
                }

                for (v = 0; v < numVertices; v += 1)
                {
                    for (a = 0; a < numAttributes; a += 1)
                    {
                        attribute = attributes[a];
                        numComponents = attribute.numComponents;
                        componentStride = attribute.componentStride;
                        var setter = attribute.typedSetter;
                        if (attribute.normalized)
                        {
                            scale = attribute.normalizationScale;
                            for (c = 0; c < numComponents; c += 1)
                            {
                                setter.call(bufferData, destOffset, (data[srcOffset] * scale), true);
                                destOffset += componentStride;
                                srcOffset += 1;
                            }
                        }
                        else
                        {
                            for (c = 0; c < numComponents; c += 1)
                            {
                                setter.call(bufferData, destOffset, data[srcOffset], true);
                                destOffset += componentStride;
                                srcOffset += 1;
                            }
                        }
                    }
                }
            }
            else
            {
                if (this.bufferData &&
                    this.bufferData.byteLength === bufferSize)
                {
                    bufferData = this.bufferData;
                }
                else
                {
                    bufferData = new ArrayBuffer(bufferSize);
                }

                for (v = 0; v < numVertices; v += 1)
                {
                    for (a = 0; a < numAttributes; a += 1)
                    {
                        attribute = attributes[a];
                        numComponents = attribute.numComponents;
                        var dest = new attribute.typedArray(bufferData, destOffset, numComponents);
                        destOffset += attribute.stride;
                        if (attribute.normalized)
                        {
                            scale = attribute.normalizationScale;
                            for (c = 0; c < numComponents; c += 1)
                            {
                                dest[c] = (data[srcOffset] * scale);
                                srcOffset += 1;
                            }
                        }
                        else
                        {
                            for (c = 0; c < numComponents; c += 1)
                            {
                                dest[c] = data[srcOffset];
                                srcOffset += 1;
                            }
                        }
                    }
                }
            }
        }
        data = undefined;

        gd.bindVertexBuffer(this.glBuffer);

        if (numVertices < this.numVertices)
        {
            gl.bufferSubData(gl.ARRAY_BUFFER, (offset * strideInBytes), bufferData);
        }
        else
        {
            gl.bufferData(gl.ARRAY_BUFFER, bufferData, this.usage);
        }
    },

    // Internal
    scaleValues : function scaleValuesFn(values, scale)
    {
        var numValues = values.length;
        var scaledValues = new values.constructor(numValues);
        for (var n = 0; n < numValues; n += 1)
        {
            scaledValues[n] = (values[n] * scale);
        }
        return scaledValues;
    },

    bindAttributes : function bindAttributesFn(numAttributes, attributes, offset)
    {
        var gd = this.gd;
        var gl = gd.gl;
        var vertexAttribPointer = gl.vertexAttribPointer;
        var vertexAttributes = this.attributes;
        var stride = this.strideInBytes;
        var attributeMask = 0;
        /*jslint bitwise: false*/
        for (var n = 0; n < numAttributes; n += 1)
        {
            var vertexAttribute = vertexAttributes[n];
            var attribute = attributes[n];

            attributeMask |= (1 << attribute);

            vertexAttribPointer.call(gl,
                                     attribute,
                                     vertexAttribute.numComponents,
                                     vertexAttribute.format,
                                     vertexAttribute.normalized,
                                     stride,
                                     offset);

            offset += vertexAttribute.stride;
        }
        /*jslint bitwise: true*/
        return attributeMask;
    },

    setAttributes : function setAttributesFn(attributes)
    {
        var gd = this.gd;

        var numAttributes = attributes.length;
        this.numAttributes = numAttributes;

        this.attributes = [];
        var stride = 0, numValuesPerVertex = 0, hasSingleFormat = true;

        for (var i = 0; i < numAttributes; i += 1)
        {
            var format = attributes[i];
            if (typeof format === "string")
            {
                format = gd['VERTEXFORMAT_' + format];
            }
            this.attributes[i] = format;
            stride += format.stride;
            numValuesPerVertex += format.numComponents;

            if (hasSingleFormat && i)
            {
                if (format.format !== this.attributes[i - 1].format)
                {
                    hasSingleFormat = false;
                }
            }
        }
        this.strideInBytes = stride;
        this.stride = numValuesPerVertex;
        this.hasSingleFormat = hasSingleFormat;

        return stride;
    },

    createInternalBuffer : function createInternalBufferFn(bufferSize)
    {
        this.bufferData = null;
        if (this.dynamic)
        {
            // This check is mainly for Firefox that lacks DataView
            // and hence does not have an optimal way of mapping small subsets of the buffer
            if (this.hasSingleFormat ||
                (typeof DataView !== 'undefined' && 'setFloat32' in DataView.prototype) ||
                this.numVertices <= 8)
            {
                this.bufferData = new ArrayBuffer(bufferSize);
            }
        }
    },

    resize : function resizeFn(size)
    {
        if (size !== (this.strideInBytes * this.numVertices))
        {
            var gd = this.gd;
            var gl = gd.gl;

            gd.bindVertexBuffer(this.glBuffer);

            var bufferType = gl.ARRAY_BUFFER;
            gl.bufferData(bufferType, size, this.usage);

            var bufferSize = gl.getBufferParameter(bufferType, gl.BUFFER_SIZE);
            this.numVertices = Math.floor(bufferSize / this.strideInBytes);

            this.createInternalBuffer(bufferSize);
        }
    },

    destroy : function vertexBufferDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var glBuffer = this.glBuffer;
            if (glBuffer)
            {
                var gl = gd.gl;
                if (gl)
                {
                    gd.unbindVertexBuffer(glBuffer);
                    gl.deleteBuffer(glBuffer);
                }
                delete this.glBuffer;
            }

            delete this.bufferData;
            delete this.gd;
        }
    }
};

// Constructor function
WebGLVertexBuffer.create = function webGLVertexBufferCreateFn(gd, params)
{
    var gl = gd.gl;

    var vb = new WebGLVertexBuffer();
    vb.gd = gd;

    var numVertices = params.numVertices;
    vb.numVertices = numVertices;

    var strideInBytes = vb.setAttributes(params.attributes);

    /*jslint sub: true*/
    // Avoid dot notation lookup to prevent Google Closure complaining about transient being a keyword
    vb['transient'] = (params['transient'] || false);
    vb.dynamic = (params.dynamic || vb['transient']);
    vb.usage = (vb['transient'] ? gl.STREAM_DRAW : (vb.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW));
    /*jslint sub: false*/
    vb.glBuffer = gl.createBuffer();

    var bufferSize = (numVertices * strideInBytes);

    vb.createInternalBuffer(bufferSize);

    if (params.data)
    {
        vb.setData(params.data, 0, numVertices);
    }
    else
    {
        gd.bindVertexBuffer(vb.glBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, bufferSize, vb.usage);
    }

    return vb;
};


//
// WebGLPass
//
function WebGLPass() {}
WebGLPass.prototype =
{
    version : 1,

    updateParametersData : function updateParametersDataFn(gd)
    {
        var gl = gd.gl;

        delete this.dirty;

        // Set parameters
        var hasProperty = Object.prototype.hasOwnProperty;
        var parameters = this.parameters;
        for (var p in parameters)
        {
            if (hasProperty.call(parameters, p))
            {
                var parameter = parameters[p];
                if (parameter.dirty)
                {
                    delete parameter.dirty;

                    var paramInfo = parameter.info;
                    var location = parameter.location;
                    if (paramInfo &&
                        null !== location)
                    {
                        var parameterValues = paramInfo.values;
                        var sampler = paramInfo.sampler;
                        if (sampler)
                        {
                            gd.setTexture(parameter.textureUnit, parameterValues, sampler);
                        }
                        else if (1 < paramInfo.numValues)
                        {
                            paramInfo.setter.call(gl, location, parameterValues);
                        }
                        else //if (1 === paramInfo.numValues)
                        {
                            paramInfo.setter.call(gl, location, parameterValues[0]);
                        }
                    }
                }
            }
        }
    },

    destroy : function passDestroyFn()
    {
        delete this.glProgram;
        delete this.semanticsMask;
        delete this.parameters;

        var states = this.states;
        if (states)
        {
            states.length = 0;
            delete this.states;
        }
    }
};

// Constructor function
WebGLPass.create = function webGLPassCreateFn(gd, shader, params)
{
    var gl = gd.gl;

    var pass = new WebGLPass();

    pass.name = (params.name || null);

    var programs = shader.programs;
    var parameters = shader.parameters;

    var parameterNames = params.parameters;
    var programNames = params.programs;
    var semanticNames = params.semantics;
    var states = params.states;

    var compoundProgramName = programNames.join(':');
    var linkedProgram = shader.linkedPrograms[compoundProgramName];
    var glProgram, semanticsMask, p, s;
    if (linkedProgram === undefined)
    {
        // Create GL program
        glProgram = gl.createProgram();

        var numPrograms = programNames.length;
        for (p = 0; p < numPrograms; p += 1)
        {
            var glShader = programs[programNames[p]];
            if (glShader)
            {
                gl.attachShader(glProgram, glShader);
            }
        }

        /*jslint bitwise: false*/
        var numSemantics = semanticNames.length;
        semanticsMask = 0;
        for (s = 0; s < numSemantics; s += 1)
        {
            var semanticName = semanticNames[s];
            var attribute = gd['SEMANTIC_' + semanticName];
            if (attribute !== undefined)
            {
                semanticsMask |= (1 << attribute);
                gl.bindAttribLocation(glProgram, attribute, ("ATTR" + attribute));
            }
        }
        /*jslint bitwise: true*/

        gl.linkProgram(glProgram);

        var linked = gl.getProgramParameter(glProgram, gl.LINK_STATUS);
        if (linked)
        {
            gd.setProgram(glProgram);
        }
        else
        {
            //var info = gl.getProgramInfoLog(glProgram);
            //console.log(info);
            gl.deleteProgram(glProgram);
            glProgram = null;
        }

        shader.linkedPrograms[compoundProgramName] = {
                glProgram : glProgram,
                semanticsMask : semanticsMask
            };
    }
    else
    {
        //console.log('Reused program ' + compoundProgramName);
        glProgram = linkedProgram.glProgram;
        if (glProgram)
        {
            gd.setProgram(glProgram);
        }
        semanticsMask = linkedProgram.semanticsMask;
    }

    pass.glProgram = glProgram;
    pass.semanticsMask = semanticsMask;

    // Set parameters
    var numTextureUnits = 0;
    var passParameters = {};
    pass.parameters = passParameters;
    var numParameters = parameterNames.length;
    for (p = 0; p < numParameters; p += 1)
    {
        var parameterName = parameterNames[p];

        var parameter = {};
        passParameters[parameterName] = parameter;

        var paramInfo = parameters[parameterName];
        parameter.info = paramInfo;
        if (paramInfo)
        {
            var location = gl.getUniformLocation(glProgram, parameterName);
            if (null !== location)
            {
                parameter.location = location;

                if (paramInfo.sampler)
                {
                    parameter.textureUnit = numTextureUnits;

                    if (linkedProgram === undefined)
                    {
                        gl.uniform1i(location, numTextureUnits);
                    }

                    numTextureUnits += 1;
                }
                else
                {
                    if (linkedProgram === undefined)
                    {
                        if (1 < paramInfo.numValues)
                        {
                            paramInfo.setter.call(gl, location, paramInfo.values);
                        }
                        else //if (1 === paramInfo.numValues)
                        {
                            paramInfo.setter.call(gl, location, paramInfo.values[0]);
                        }
                    }
                }
            }
        }
    }
    pass.numTextureUnits = numTextureUnits;
    pass.numParameters = numParameters;

    function equalRenderStates(defaultValues, values)
    {
        var numDefaultValues = defaultValues.length;
        var n;
        for (n = 0; n < numDefaultValues; n += 1)
        {
            if (defaultValues[n] !== values[n])
            {
                return false;
            }
        }
        return true;
    }

    var hasProperty = Object.prototype.hasOwnProperty;
    var stateHandlers = gd.stateHandlers;
    var passStates = [];
    var passStatesSet = {};
    pass.states = passStates;
    pass.statesSet = passStatesSet;
    for (s in states)
    {
        if (hasProperty.call(states, s))
        {
            var stateHandler = stateHandlers[s];
            if (stateHandler)
            {
                var values = stateHandler.parse(states[s]);
                if (values !== null)
                {
                    if (equalRenderStates(stateHandler.defaultValues, values))
                    {
                        continue;
                    }
                    passStates.push({
                        name: s,
                        set: stateHandler.set,
                        reset: stateHandler.reset,
                        values: values
                    });
                    passStatesSet[s] = true;
                }
                else
                {
                    TurbulenzEngine.callOnError('Unknown value for state ' +
                                                s + ': ' + states[s]);
                }
            }
        }
    }

    return pass;
};


//
// WebGLTechnique
//
function WebGLTechnique() {}
WebGLTechnique.prototype =
{
    version : 1,

    getPass : function getPassFn(id)
    {
        var passes = this.passes;
        var numPasses = passes.length;
        if (typeof id === "string")
        {
            for (var n = 0; n < numPasses; n += 1)
            {
                var pass = passes[n];
                if (pass.name === id)
                {
                    return pass;
                }
            }
        }
        else
        {
            /*jslint bitwise: false*/
            id = (id | 0);
            /*jslint bitwise: true*/
            if (id < numPasses)
            {
                return passes[id];
            }
        }
        return null;
    },

    setParametersImmediate : function setParametersImmediateFn(gd, techniqueParameters)
    {
        var gl = gd.gl;

        var pass = this.passes[0];
        var parameters = pass.parameters;
        /*jslint forin: true*/
        for (var p in techniqueParameters)
        {
            var parameter = parameters[p];
            if (parameter)
            {
                var paramInfo = parameter.info;
                var sampler = paramInfo.sampler;
                var parameterValues = techniqueParameters[p];
                if (parameterValues !== undefined)
                {
                    if (sampler)
                    {
                        gd.setTexture(parameter.textureUnit, parameterValues, sampler);
                    }
                    else
                    {
                        paramInfo.setter.call(gl, parameter.location, parameterValues);
                    }
                }
                else
                {
                    delete techniqueParameters[p];
                    if (sampler)
                    {
                        gd.setTexture(parameter.textureUnit);
                    }
                }
            }
        }
        /*jslint forin: false*/
    },

    setParametersDeferred : function setParametersDeferredFn(gd, techniqueParameters)
    {
        var passes = this.passes;
        var numPasses = passes.length;
        var min = Math.min;
        var max = Math.max;
        for (var n = 0; n < numPasses; n += 1)
        {
            var pass = this.passes[n];
            var parameters = pass.parameters;
            pass.dirty = true;

            /*jslint forin: true*/
            for (var p in techniqueParameters)
            {
                var parameter = parameters[p];
                if (parameter)
                {
                    var paramInfo = parameter.info;
                    var parameterValues = techniqueParameters[p];
                    if (parameterValues !== undefined)
                    {
                        if (paramInfo.sampler)
                        {
                            paramInfo.values = parameterValues;
                            parameter.dirty = 1;
                        }
                        else if (typeof parameterValues !== 'number')
                        {
                            var values = paramInfo.values;
                            var numValues = min(paramInfo.numValues, parameterValues.length);
                            for (var v = 0; v < numValues; v += 1)
                            {
                                values[v] = parameterValues[v];
                            }
                            parameter.dirty = max(numValues, (parameter.dirty || 0));
                        }
                        else
                        {
                            paramInfo.values[0] = parameterValues;
                            parameter.dirty = (parameter.dirty || 1);
                        }
                    }
                    else
                    {
                        delete techniqueParameters[p];
                    }
                }
            }
            /*jslint forin: false*/
        }
    },

    activate : function activateFn(gd)
    {
        this.device = gd;
    },

    deactivate : function deactivateFn()
    {
        this.device = null;
    },

    checkProperties : function checkPropertiesFn(gd)
    {
        // Check for parameters set directly into the technique...
        var fakeTechniqueParameters = {}, p;
        for (p in this)
        {
            if (p !== 'version' &&
                p !== 'name' &&
                p !== 'passes' &&
                p !== 'numPasses' &&
                p !== 'device' &&
                p !== 'numParameters')
            {
                fakeTechniqueParameters[p] = this[p];
            }
        }

        if (fakeTechniqueParameters)
        {
            if (this.passes.length === 1)
            {
                this.setParametersImmediate(gd, fakeTechniqueParameters);
            }
            else
            {
                this.setParametersDeferred(gd, fakeTechniqueParameters);
            }

            var hasProperty = Object.prototype.hasOwnProperty;
            for (p in fakeTechniqueParameters)
            {
                if (hasProperty.call(fakeTechniqueParameters, p))
                {
                    delete this[p];
                }
            }
        }
    },

    initializeParametersSetters : function initializeParametersSettersFn(gd)
    {
        var gl = gd.gl;

        function make_sampler_setter(pass, parameter) {
            return function (parameterValues) {
                if (this.device)
                {
                    gd.setTexture(parameter.textureUnit, parameterValues, parameter.info.sampler);
                }
                else
                {
                    pass.dirty = true;
                    parameter.dirty = 1;
                    parameter.info.values = parameterValues;
                }
            };
        }

        function make_float_uniform_setter(pass, parameter) {

            var paramInfo = parameter.info;
            var location = parameter.location;

            function setDeferredParameter(parameterValues)
            {
                if (typeof parameterValues !== 'number')
                {
                    var values = paramInfo.values;
                    var numValues = Math.min(paramInfo.numValues, parameterValues.length);
                    for (var v = 0; v < numValues; v += 1)
                    {
                        values[v] = parameterValues[v];
                    }
                    parameter.dirty = Math.max(numValues, (parameter.dirty || 0));
                }
                else
                {
                    paramInfo.values[0] = parameterValues;
                    parameter.dirty = (parameter.dirty || 1);
                }
                pass.dirty = true;
            }

            switch (paramInfo.columns)
            {
            case 1:
                if (1 === paramInfo.numValues)
                {
                    return function (parameterValues)
                    {
                        if (this.device)
                        {
                            gl.uniform1f(location, parameterValues);
                        }
                        else
                        {
                            setDeferredParameter(parameterValues);
                        }
                    };
                }
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform1fv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 2:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform2fv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 3:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform3fv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 4:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform4fv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            default:
                return null;
            }
        }

        function make_int_uniform_setter(pass, parameter) {
            var paramInfo = parameter.info;
            var location = parameter.location;

            function setDeferredParameter(parameterValues)
            {
                if (typeof parameterValues !== 'number')
                {
                    var values = paramInfo.values;
                    var numValues = Math.min(paramInfo.numValues, parameterValues.length);
                    for (var v = 0; v < numValues; v += 1)
                    {
                        values[v] = parameterValues[v];
                    }
                    parameter.dirty = Math.max(numValues, (parameter.dirty || 0));
                }
                else
                {
                    paramInfo.values[0] = parameterValues;
                    parameter.dirty = (parameter.dirty || 1);
                }
                pass.dirty = true;
            }

            switch (paramInfo.columns)
            {
            case 1:
                if (1 === paramInfo.numValues)
                {
                    return function (parameterValues)
                    {
                        if (this.device)
                        {
                            gl.uniform1i(location, parameterValues);
                        }
                        else
                        {
                            setDeferredParameter(parameterValues);
                        }
                    };
                }
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform1iv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 2:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform2iv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 3:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform3iv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            case 4:
                return function (parameterValues)
                {
                    if (this.device)
                    {
                        gl.uniform4iv(location, parameterValues);
                    }
                    else
                    {
                        setDeferredParameter(parameterValues);
                    }
                };
            default:
                return null;
            }
        }

        var passes = this.passes;
        var numPasses = passes.length;
        var pass, parameters, p, parameter, paramInfo, setter;
        if (numPasses === 1)
        {
            pass = passes[0];
            parameters = pass.parameters;
            for (p in parameters)
            {
                if (parameters.hasOwnProperty(p))
                {
                    parameter = parameters[p];
                    paramInfo = parameter.info;
                    if (paramInfo)
                    {
                        if (undefined !== parameter.location)
                        {
                            if (paramInfo.sampler)
                            {
                                setter = make_sampler_setter(pass, parameter);
                            }
                            else
                            {
                                if (paramInfo.type === 'float')
                                {
                                    setter = make_float_uniform_setter(pass, parameter);
                                }
                                else
                                {
                                    setter = make_int_uniform_setter(pass, parameter);
                                }
                            }

                            Object.defineProperty(this, p, {
                                    set : setter,
                                    enumerable : false,
                                    configurable : false
                                });
                        }
                    }
                }
            }

            this.checkProperties = function ()
            {
            };
        }
        else
        {
            Object.defineProperty(this, 'device', {
                    writable : true,
                    enumerable : false,
                    configurable : false
                });

            Object.defineProperty(this, 'version', {
                    writable : false,
                    enumerable : false,
                    configurable : false
                });

            Object.defineProperty(this, 'name', {
                    writable : false,
                    enumerable : false,
                    configurable : false
                });

            Object.defineProperty(this, 'passes', {
                    writable : false,
                    enumerable : false,
                    configurable : false
                });

            Object.defineProperty(this, 'numParameters', {
                    writable : false,
                    enumerable : false,
                    configurable : false
                });
        }
    },

    destroy : function techniqueDestroyFn()
    {
        var passes = this.passes;
        if (passes)
        {
            var numPasses = passes.length;
            var n;

            for (n = 0; n < numPasses; n += 1)
            {
                passes[n].destroy();
            }

            passes.length = 0;

            delete this.passes;
        }

        delete this.device;
    }
};

// Constructor function
WebGLTechnique.create = function webGLTechniqueCreateFn(gd, shader, name, passes)
{
    var technique = new WebGLTechnique();

    technique.name = name;

    var numPasses = passes.length, n;
    var numParameters = 0;
    technique.passes = [];
    technique.numPasses = numPasses;
    for (n = 0; n < numPasses; n += 1)
    {
        var passParams = passes[n];
        numParameters += passParams.parameters.length;
        technique.passes[n] = WebGLPass.create(gd, shader, passParams);
    }

    technique.numParameters = numParameters;

    technique.device = null;

    if (Object.defineProperty)
    {
        technique.initializeParametersSetters(gd);
    }

    return technique;
};

//
// WebGLShader
//
function WebGLShader() {}
WebGLShader.prototype =
{
    version : 1,

    getTechnique : function getTechniqueFn(name)
    {
        if (typeof name === "string")
        {
            return this.techniques[name];
        }
        else
        {
            var techniques = this.techniques;
            for (var t in techniques)
            {
                if (techniques.hasOwnProperty(t))
                {
                    if (name === 0)
                    {
                        return techniques[t];
                    }
                    else
                    {
                        name -= 1;
                    }
                }
            }
            return null;
        }
    },

    getParameter : function getParameterFn(name)
    {
        if (typeof name === "string")
        {
            return this.parameters[name];
        }
        else
        {
            /*jslint bitwise: false*/
            name = (name | 0);
            /*jslint bitwise: true*/
            var parameters = this.parameters;
            for (var p in parameters)
            {
                if (parameters.hasOwnProperty(p))
                {
                    if (name === 0)
                    {
                        return parameters[p];
                    }
                    else
                    {
                        name -= 1;
                    }
                }
            }
            return null;
        }
    },

    destroy : function shaderDestroyFn()
    {
        var gd = this.gd;
        if (gd)
        {
            var gl = gd.gl;
            var p;

            var techniques = this.techniques;
            if (techniques)
            {
                for (p in techniques)
                {
                    if (techniques.hasOwnProperty(p))
                    {
                        techniques[p].destroy();
                    }
                }
                delete this.techniques;
            }

            var linkedPrograms = this.linkedPrograms;
            if (linkedPrograms)
            {
                if (gl)
                {
                    for (p in linkedPrograms)
                    {
                        if (linkedPrograms.hasOwnProperty(p))
                        {
                            var linkedProgram = linkedPrograms[p];
                            var glProgram = linkedProgram.glProgram;
                            if (glProgram)
                            {
                                gl.deleteProgram(glProgram);
                                delete linkedProgram.glProgram;
                            }
                        }
                    }
                }
                delete this.linkedPrograms;
            }

            var programs = this.programs;
            if (programs)
            {
                if (gl)
                {
                    for (p in programs)
                    {
                        if (programs.hasOwnProperty(p))
                        {
                            gl.deleteShader(programs[p]);
                        }
                    }
                }
                delete this.programs;
            }

            delete this.samplers;
            delete this.parameters;
            delete this.gd;
        }
    }
};

// Constructor function
WebGLShader.create = function webGLShaderCreateFn(gd, params)
{
    var gl = gd.gl;

    var shader = new WebGLShader();

    var techniques = params.techniques;
    var parameters = params.parameters;
    var programs = params.programs;
    var samplers = params.samplers;
    var p;

    shader.gd = gd;
    shader.name = params.name;

    shader.linkedPrograms = {};

    var defaultSampler = gd.DEFAULT_SAMPLER;
    var maxAnisotropy = gd.maxAnisotropy;

    shader.samplers = {};
    var sampler;
    for (p in samplers)
    {
        if (samplers.hasOwnProperty(p))
        {
            sampler = samplers[p];

            var samplerMaxAnisotropy = sampler.MaxAnisotropy;
            if (samplerMaxAnisotropy)
            {
                if (samplerMaxAnisotropy > maxAnisotropy)
                {
                    samplerMaxAnisotropy = maxAnisotropy;
                }
            }
            else
            {
                samplerMaxAnisotropy = defaultSampler.maxAnisotropy;
            }

            sampler = {
                minFilter : (sampler.MinFilter || defaultSampler.minFilter),
                magFilter : (sampler.MagFilter || defaultSampler.magFilter),
                wrapS : (sampler.WrapS || defaultSampler.wrapS),
                wrapT : (sampler.WrapT || defaultSampler.wrapT),
                wrapR : (sampler.WrapR || defaultSampler.wrapR),
                maxAnisotropy : samplerMaxAnisotropy
            };
            if (sampler.wrapS === 0x2900)
            {
                sampler.wrapS = gl.CLAMP_TO_EDGE;
            }
            if (sampler.wrapT === 0x2900)
            {
                sampler.wrapT = gl.CLAMP_TO_EDGE;
            }
            if (sampler.wrapR === 0x2900)
            {
                sampler.wrapR = gl.CLAMP_TO_EDGE;
            }
            shader.samplers[p] = gd.createSampler(sampler);
        }
    }

    var numParameters = 0;
    shader.parameters = {};
    for (p in parameters)
    {
        if (parameters.hasOwnProperty(p))
        {
            var parameter = parameters[p];
            if (!parameter.columns)
            {
                parameter.columns = 1;
            }
            if (!parameter.rows)
            {
                parameter.rows = 1;
            }
            parameter.numValues = (parameter.columns * parameter.rows);
            var parameterType = parameter.type;
            if (parameterType === "float" ||
                parameterType === "int" ||
                parameterType === "bool")
            {
                var parameterValues = parameter.values;
                if (parameterValues)
                {
                    if (parameterType === "float")
                    {
                        parameter.values = new Float32Array(parameterValues);
                    }
                    else
                    {
                        parameter.values = new Int32Array(parameterValues);
                    }
                }
                else
                {
                    if (parameterType === "float")
                    {
                        parameter.values = new Float32Array(parameter.numValues);
                    }
                    else
                    {
                        parameter.values = new Int32Array(parameter.numValues);
                    }
                }

                if (parameterType === 'float')
                {
                    switch (parameter.columns)
                    {
                    case 1:
                        if (1 === parameter.numValues)
                        {
                            parameter.setter = gl.uniform1f;
                        }
                        else
                        {
                            parameter.setter = gl.uniform1fv;
                        }
                        break;
                    case 2:
                        parameter.setter = gl.uniform2fv;
                        break;
                    case 3:
                        parameter.setter = gl.uniform3fv;
                        break;
                    case 4:
                        parameter.setter = gl.uniform4fv;
                        break;
                    default:
                        break;
                    }
                }
                else
                {
                    switch (parameter.columns)
                    {
                    case 1:
                        if (1 === parameter.numValues)
                        {
                            parameter.setter = gl.uniform1i;
                        }
                        else
                        {
                            parameter.setter = gl.uniform1iv;
                        }
                        break;
                    case 2:
                        parameter.setter = gl.uniform2iv;
                        break;
                    case 3:
                        parameter.setter = gl.uniform3iv;
                        break;
                    case 4:
                        parameter.setter = gl.uniform4iv;
                        break;
                    default:
                        break;
                    }
                }
            }
            else // Sampler
            {
                sampler = shader.samplers[p];
                if (!sampler)
                {
                    sampler = defaultSampler;
                    shader.samplers[p] = defaultSampler;
                }
                parameter.sampler = sampler;
                parameter.values = null;
            }

            parameter.name = p;

            shader.parameters[p] = parameter;
            numParameters += 1;
        }
    }
    shader.numParameters = numParameters;

    shader.programs = {};
    for (p in programs)
    {
        if (programs.hasOwnProperty(p))
        {
            var program = programs[p];

            var glShaderType;
            if (program.type === 'fragment')
            {
                glShaderType = gl.FRAGMENT_SHADER;
            }
            else if (program.type === 'vertex')
            {
                glShaderType = gl.VERTEX_SHADER;
            }
            var glShader = gl.createShader(glShaderType);

            gl.shaderSource(glShader, program.code);

            gl.compileShader(glShader);

            var compiled = gl.getShaderParameter(glShader, gl.COMPILE_STATUS);
            if (!compiled)
            {
                var info = gl.getShaderInfoLog(glShader);
                TurbulenzEngine.callOnError(
                    'Program "' + p + '" failed to compile: ' + info);
                gl.deleteShader(glShader);
                glShader = null;
            }

            shader.programs[p] = glShader;
        }
    }

    var numTechniques = 0;
    shader.techniques = {};
    for (p in techniques)
    {
        if (techniques.hasOwnProperty(p))
        {
            shader.techniques[p] = WebGLTechnique.create(gd, shader, p, techniques[p]);
            numTechniques += 1;
        }
    }
    shader.numTechniques = numTechniques;

    return shader;
};


//
// WebGLTechniqueParameterBuffer
//
function techniqueParameterBufferCreate(params)
{
    if (Float32Array.prototype.map === undefined)
    {
        Float32Array.prototype.map = function techniqueParameterBufferMap(offset, numFloats) {
            if (offset === undefined)
            {
                offset = 0;
            }
            var data = this;
            if (numFloats === undefined)
            {
                numFloats = data.length;
            }
            function techniqueParameterBufferWriter()
            {
                var numArguments = arguments.length;
                for (var a = 0; a < numArguments; a += 1)
                {
                    var value = arguments[a];
                    if (typeof value === 'number')
                    {
                        data[offset] = value;
                        offset += 1;
                    }
                    else
                    {
                        var numValues = value.length;
                        for (var n = 0; n < numValues; n += 1)
                        {
                            data[offset] = value[n];
                            offset += 1;
                        }
                    }
                }
            }
            return techniqueParameterBufferWriter;
        };

        Float32Array.prototype.unmap = function techniqueParameterBufferUnmap(writer) {
        };
    }

    return new Float32Array(params.numFloats);
}


//
// WebGLDrawParameters
//
function WebGLDrawParameters() {}
WebGLDrawParameters.prototype =
{
    version : 1,

    setTechniqueParameters : function setTechniqueParametersFn(indx, techniqueParameters)
    {
        this.techniqueParameters[indx] = techniqueParameters;
    },

    setVertexBuffer : function setVertexBufferFn(indx, vertexBuffer)
    {
        this.streams[(indx * 3) + 0] = vertexBuffer;
    },

    setSemantics : function setSemanticsFn(indx, semantics)
    {
        this.streams[(indx * 3) + 1] = semantics;
    },

    setOffset : function setOffsetFn(indx, offset)
    {
        this.streams[(indx * 3) + 2] = offset;
    },

    getTechniqueParameters : function getTechniqueParametersFn(indx)
    {
        return this.techniqueParameters[indx];
    },

    getVertexBuffer : function getVertexBufferFn(indx)
    {
        return this.streams[(indx * 3) + 0];
    },

    getSemantics : function getSemanticsFn(indx)
    {
        return this.streams[(indx * 3) + 1];
    },

    getOffset : function getOffsetFn(indx)
    {
        return this.streams[(indx * 3) + 2];
    }
};

// Constructor function
WebGLDrawParameters.create = function webGLDrawParametersFn(params)
{
    var drawParameters = new WebGLDrawParameters();
    drawParameters.techniqueParameters = [];
    drawParameters.streams = [];
    drawParameters.firstIndex = 0;
    drawParameters.count = 0;
    drawParameters.sortKey = 0;
    drawParameters.technique = null;
    drawParameters.indexBuffer = null;
    drawParameters.primitive = -1;

    return drawParameters;
};


//
// WebGLGraphicsDevice
//
function WebGLGraphicsDevice() {}
WebGLGraphicsDevice.prototype =
{
    version : 1,

    SEMANTIC_POSITION: 0,
    SEMANTIC_POSITION0: 0,
    SEMANTIC_BLENDWEIGHT: 1,
    SEMANTIC_BLENDWEIGHT0: 1,
    SEMANTIC_NORMAL: 2,
    SEMANTIC_NORMAL0: 2,
    SEMANTIC_COLOR: 3,
    SEMANTIC_COLOR0: 3,
    SEMANTIC_COLOR1: 4,
    SEMANTIC_SPECULAR: 4,
    SEMANTIC_FOGCOORD: 5,
    SEMANTIC_TESSFACTOR: 5,
    SEMANTIC_PSIZE0: 6,
    SEMANTIC_BLENDINDICES: 7,
    SEMANTIC_BLENDINDICES0: 7,
    SEMANTIC_TEXCOORD: 8,
    SEMANTIC_TEXCOORD0: 8,
    SEMANTIC_TEXCOORD1: 9,
    SEMANTIC_TEXCOORD2: 10,
    SEMANTIC_TEXCOORD3: 11,
    SEMANTIC_TEXCOORD4: 12,
    SEMANTIC_TEXCOORD5: 13,
    SEMANTIC_TEXCOORD6: 14,
    SEMANTIC_TEXCOORD7: 15,
    SEMANTIC_TANGENT: 14,
    SEMANTIC_TANGENT0: 14,
    SEMANTIC_BINORMAL0: 15,
    SEMANTIC_BINORMAL: 15,
    SEMANTIC_PSIZE: 6,
    SEMANTIC_ATTR0: 0,
    SEMANTIC_ATTR1: 1,
    SEMANTIC_ATTR2: 2,
    SEMANTIC_ATTR3: 3,
    SEMANTIC_ATTR4: 4,
    SEMANTIC_ATTR5: 5,
    SEMANTIC_ATTR6: 6,
    SEMANTIC_ATTR7: 7,
    SEMANTIC_ATTR8: 8,
    SEMANTIC_ATTR9: 9,
    SEMANTIC_ATTR10: 10,
    SEMANTIC_ATTR11: 11,
    SEMANTIC_ATTR12: 12,
    SEMANTIC_ATTR13: 13,
    SEMANTIC_ATTR14: 14,
    SEMANTIC_ATTR15: 15,

    PIXELFORMAT_A8: 0,
    PIXELFORMAT_L8: 1,
    PIXELFORMAT_L8A8: 2,
    PIXELFORMAT_R5G5B5A1: 3,
    PIXELFORMAT_R5G6B5: 4,
    PIXELFORMAT_R8G8B8A8: 5,
    PIXELFORMAT_R8G8B8: 6,
    PIXELFORMAT_D24S8: 7,
    PIXELFORMAT_DXT1: 8,
    PIXELFORMAT_DXT3: 9,
    PIXELFORMAT_DXT5: 10,

    drawIndexed : function drawIndexedFn(primitive, numIndices, first)
    {
        var gl = this.gl;
        var indexBuffer = this.activeIndexBuffer;

        var offset = first;
        if (offset)
        {
            offset *= indexBuffer.stride;
        }

        var format = indexBuffer.format;

        var attributeMask = this.attributeMask;

        var activeTechnique = this.activeTechnique;
        var passes = activeTechnique.passes;
        var numPasses = passes.length;
        var mask;

        activeTechnique.checkProperties(this);

        /*jslint bitwise: false*/
        if (1 === numPasses)
        {
            mask = (passes[0].semanticsMask & attributeMask);
            if (mask !== this.clientStateMask)
            {
                this.enableClientState(mask);
            }

            gl.drawElements(primitive, numIndices, format, offset);
        }
        else
        {
            for (var p = 0; p < numPasses; p += 1)
            {
                var pass = passes[p];

                mask = (pass.semanticsMask & attributeMask);
                if (mask !== this.clientStateMask)
                {
                    this.enableClientState(mask);
                }

                this.setPass(pass);

                gl.drawElements(primitive, numIndices, format, offset);
            }
        }
        /*jslint bitwise: true*/
    },

    draw : function drawFn(primitive, numVertices, first)
    {
        var gl = this.gl;

        var attributeMask = this.attributeMask;

        var activeTechnique = this.activeTechnique;
        var passes = activeTechnique.passes;
        var numPasses = passes.length;
        var mask;

        activeTechnique.checkProperties(this);

        /*jslint bitwise: false*/
        if (1 === numPasses)
        {
            mask = (passes[0].semanticsMask & attributeMask);
            if (mask !== this.clientStateMask)
            {
                this.enableClientState(mask);
            }

            gl.drawArrays(primitive, first, numVertices);
        }
        else
        {
            for (var p = 0; p < numPasses; p += 1)
            {
                var pass = passes[p];

                mask = (pass.semanticsMask & attributeMask);
                if (mask !== this.clientStateMask)
                {
                    this.enableClientState(mask);
                }

                this.setPass(pass);

                gl.drawArrays(primitive, first, numVertices);
            }
        }
        /*jslint bitwise: true*/
    },

    setTechniqueParameters : function setTechniqueParametersFn()
    {
        var activeTechnique = this.activeTechnique;
        var setParameters = (1 === activeTechnique.passes.length ? activeTechnique.setParametersImmediate : activeTechnique.setParametersDeferred);
        var numTechniqueParameters = arguments.length;
        for (var t = 0; t < numTechniqueParameters; t += 1)
        {
            setParameters.call(activeTechnique, this, arguments[t]);
        }
    },

    setTechnique : function setTechniqueFn(technique)
    {
        var activeTechnique = this.activeTechnique;
        if (activeTechnique !== technique)
        {
            if (activeTechnique)
            {
                activeTechnique.deactivate();
            }

            this.activeTechnique = technique;

            technique.activate(this);

            var passes = technique.passes;
            if (1 === passes.length)
            {
                this.setPass(passes[0]);
            }
        }
    },

    setStream : function setStreamFn(vertexBuffer, semantics, offset)
    {
        if (offset)
        {
            offset *= vertexBuffer.strideInBytes;
        }
        else
        {
            offset = 0;
        }

        this.bindVertexBuffer(vertexBuffer.glBuffer);

        var attributes = semantics;
        var numAttributes = attributes.length;
        if (numAttributes > vertexBuffer.numAttributes)
        {
            numAttributes = vertexBuffer.numAttributes;
        }

        /*jslint bitwise: false*/
        this.attributeMask |= vertexBuffer.bindAttributes(numAttributes, attributes, offset);
        /*jslint bitwise: true*/
    },

    setIndexBuffer : function setIndexBufferFn(indexBuffer)
    {
        if (this.activeIndexBuffer !== indexBuffer)
        {
            this.activeIndexBuffer = indexBuffer;
            var glBuffer;
            if (indexBuffer)
            {
                glBuffer = indexBuffer.glBuffer;
            }
            else
            {
                glBuffer = null;
            }
            var gl = this.gl;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBuffer);
        }
    },

    drawArray : function drawArrayFn(drawParametersArray, globalTechniqueParametersArray, sortMode)
    {
        var gl = this.gl;
        var bindBuffer = gl.bindBuffer;
        var drawElements = gl.drawElements;
        var drawArrays = gl.drawArrays;
        var ELEMENT_ARRAY_BUFFER = gl.ELEMENT_ARRAY_BUFFER;

        var setTechnique = this.setTechnique;
        var setTechniqueParameters = this.setTechniqueParameters;
        var setStream = this.setStream;
        var enableClientState = this.enableClientState;

        var numDrawParameters = drawParametersArray.length;
        if (numDrawParameters > 1 && sortMode)
        {
            if (sortMode > 0)
            {
                drawParametersArray.sort(function (a, b) {
                    return (b.sortKey - a.sortKey);
                });
            }
            else if (sortMode < 0)
            {
                drawParametersArray.sort(function (a, b) {
                    return (a.sortKey - b.sortKey);
                });
            }
        }

        var activeIndexBuffer = this.activeIndexBuffer;
        var lastTechnique = null;
        var lastNumStreams = -1;
        var lastStreams = null;
        var v, streamsMatch, offset;
        var passes, numPasses, mask, attributeMask, p, pass, format;

        for (var n = 0; n < numDrawParameters; n += 1)
        {
            var drawParameters = drawParametersArray[n];
            var technique = drawParameters.technique;
            var techniqueParametersArray = drawParameters.techniqueParameters;
            var indexBuffer = drawParameters.indexBuffer;
            var streamsArray = drawParameters.streams;
            var numStreams = streamsArray.length;
            var primitive = drawParameters.primitive;
            var count = drawParameters.count;
            var firstIndex = drawParameters.firstIndex;

            if (lastTechnique !== technique)
            {
                lastTechnique = technique;

                passes = technique.passes;
                numPasses = passes.length;

                setTechnique.call(this, technique);

                technique.checkProperties(this);

                setTechniqueParameters.apply(this, globalTechniqueParametersArray);
            }

            if (techniqueParametersArray)
            {
                setTechniqueParameters.apply(this, techniqueParametersArray);
            }

            streamsMatch = (lastNumStreams === numStreams);
            for (v = 0; streamsMatch && v < numStreams; v += 3)
            {
                streamsMatch = (lastStreams[v]     === streamsArray[v]     &&
                                lastStreams[v + 1] === streamsArray[v + 1] &&
                                lastStreams[v + 2] === streamsArray[v + 2]);
            }

            if (!streamsMatch)
            {
                lastNumStreams = numStreams;
                lastStreams = streamsArray;

                for (v = 0; v < numStreams; v += 3)
                {
                    setStream.call(this, streamsArray[v], streamsArray[v + 1], streamsArray[v + 2]);
                }

                attributeMask = this.attributeMask;
            }

            /*jslint bitwise: false*/
            if (indexBuffer)
            {
                if (activeIndexBuffer !== indexBuffer)
                {
                    activeIndexBuffer = indexBuffer;
                    bindBuffer.call(gl, ELEMENT_ARRAY_BUFFER, indexBuffer.glBuffer);
                }

                offset = firstIndex;
                if (offset)
                {
                    offset *= indexBuffer.stride;
                }

                format = indexBuffer.format;

                if (1 === numPasses)
                {
                    mask = (passes[0].semanticsMask & attributeMask);
                    if (mask !== this.clientStateMask)
                    {
                        enableClientState.call(this, mask);
                    }

                    drawElements.call(gl, primitive, count, format, offset);
                }
                else
                {
                    for (p = 0; p < numPasses; p += 1)
                    {
                        pass = passes[p];

                        mask = (pass.semanticsMask & attributeMask);
                        if (mask !== this.clientStateMask)
                        {
                            enableClientState.call(this, mask);
                        }

                        this.setPass(pass);

                        drawElements.call(gl, primitive, count, format, offset);
                    }
                }
            }
            else
            {
                if (1 === numPasses)
                {
                    mask = (passes[0].semanticsMask & attributeMask);
                    if (mask !== this.clientStateMask)
                    {
                        enableClientState.call(this, mask);
                    }

                    drawArrays.call(gl, primitive, firstIndex, count);
                }
                else
                {
                    for (p = 0; p < numPasses; p += 1)
                    {
                        pass = passes[p];

                        mask = (pass.semanticsMask & attributeMask);
                        if (mask !== this.clientStateMask)
                        {
                            enableClientState.call(this, mask);
                        }

                        this.setPass(pass);

                        drawArrays.call(gl, primitive, firstIndex, count);
                    }
                }
            }
            /*jslint bitwise: true*/
        }

        this.activeIndexBuffer = activeIndexBuffer;
    },

    beginDraw : function beginDrawFn(primitive, numVertices, formats, semantics)
    {
        this.immediatePrimitive = primitive;
        if (numVertices)
        {
            var n;
            var immediateSemantics = this.immediateSemantics;
            var attributes = semantics;
            if (!attributes)
            {
                attributes = semantics;
            }
            var numAttributes = attributes.length;
            immediateSemantics.length = numAttributes;
            for (n = 0; n < numAttributes; n += 1)
            {
                var attribute = attributes[n];
                if (typeof attribute === "string")
                {
                    attribute = this['SEMANTIC_' + attribute];
                }
                immediateSemantics[n] = attribute;
            }

            var immediateVertexBuffer = this.immediateVertexBuffer;

            var oldStride = immediateVertexBuffer.strideInBytes;
            var oldSize = (oldStride * immediateVertexBuffer.numVertices);

            var stride = immediateVertexBuffer.setAttributes(formats);
            if (stride !== oldStride)
            {
                immediateVertexBuffer.numVertices = Math.floor(oldSize / stride);
            }

            var size = (stride * numVertices);
            if (size > oldSize)
            {
                immediateVertexBuffer.resize(size);
            }

            return immediateVertexBuffer.map(0, numVertices);
        }
        return null;
    },

    endDraw : function endDrawFn(writer)
    {
        var immediateVertexBuffer = this.immediateVertexBuffer;

        var numVerticesWritten = writer.getNumWrittenVertices();

        immediateVertexBuffer.unmap(writer);

        if (numVerticesWritten)
        {
            var gl = this.gl;

            var stride = immediateVertexBuffer.strideInBytes;
            var offset = 0;

            /*jslint bitwise: false*/
            var vertexAttributes = immediateVertexBuffer.attributes;

            var semantics = this.immediateSemantics;
            var numSemantics = semantics.length;
            var deltaAttributeMask = 0;
            for (var n = 0; n < numSemantics; n += 1)
            {
                var vertexAttribute = vertexAttributes[n];

                var attribute = semantics[n];

                deltaAttributeMask |= (1 << attribute);

                gl.vertexAttribPointer(attribute,
                                       vertexAttribute.numComponents,
                                       vertexAttribute.format,
                                       vertexAttribute.normalized,
                                       stride,
                                       offset);

                offset += vertexAttribute.stride;
            }
            this.attributeMask |= deltaAttributeMask;
            /*jslint bitwise: true*/

            this.draw(this.immediatePrimitive, numVerticesWritten, 0);
        }
    },

    setViewport : function setViewportFn(x, y, w, h)
    {
        var currentBox = this.state.viewportBox;
        if (currentBox[0] !== x ||
            currentBox[1] !== y ||
            currentBox[2] !== w ||
            currentBox[3] !== h)
        {
            currentBox[0] = x;
            currentBox[1] = y;
            currentBox[2] = w;
            currentBox[3] = h;
            this.gl.viewport(x, y, w, h);
        }
    },

    setScissor : function setScissorFn(x, y, w, h)
    {
        var currentBox = this.state.scissorBox;
        if (currentBox[0] !== x ||
            currentBox[1] !== y ||
            currentBox[2] !== w ||
            currentBox[3] !== h)
        {
            currentBox[0] = x;
            currentBox[1] = y;
            currentBox[2] = w;
            currentBox[3] = h;
            this.gl.scissor(x, y, w, h);
        }
    },

    clear : function clearFn(color, depth, stencil)
    {
        var gl = this.gl;
        var state = this.state;

        var clearMask = 0;

        if (color)
        {
            clearMask += gl.COLOR_BUFFER_BIT;

            var currentColor = state.clearColor;
            var color0 = color[0];
            var color1 = color[1];
            var color2 = color[2];
            var color3 = color[3];
            if (currentColor[0] !== color0 ||
                currentColor[1] !== color1 ||
                currentColor[2] !== color2 ||
                currentColor[3] !== color3)
            {
                currentColor[0] = color0;
                currentColor[1] = color1;
                currentColor[2] = color2;
                currentColor[3] = color3;
                gl.clearColor(color0, color1, color2, color3);
            }
        }

        if (depth !== undefined)
        {
            clearMask += gl.DEPTH_BUFFER_BIT;

            if (state.clearDepth !== depth)
            {
                state.clearDepth = depth;
                gl.clearDepth(depth);
            }

            if (stencil !== undefined)
            {
                clearMask += gl.STENCIL_BUFFER_BIT;

                if (state.clearStencil !== stencil)
                {
                    state.clearStencil = stencil;
                    gl.clearStencil(stencil);
                }
            }
        }

        if (clearMask)
        {
            var colorMask = state.colorMask;
            var colorMaskEnabled = (colorMask[0] || colorMask[1] || colorMask[2] || colorMask[3]);
            var depthMask = state.depthMask;
            var program = state.program;

            if (color)
            {
                if (!colorMaskEnabled)
                {
                    // This is posibly a mistake, enable it for this call
                    gl.colorMask(true, true, true, true);
                }
            }

            if (depth !== undefined)
            {
                if (!depthMask)
                {
                    // This is posibly a mistake, enable it for this call
                    gl.depthMask(true);
                }
            }

            if (program)
            {
                gl.useProgram(null);    // Work around for Mac crash bug.
            }

            gl.clear(clearMask);

            if (color)
            {
                if (!colorMaskEnabled)
                {
                    gl.colorMask(false, false, false, false);
                }
            }

            if (depth !== undefined)
            {
                if (!depthMask)
                {
                    gl.depthMask(false);
                }
            }

            if (program)
            {
                gl.useProgram(program);
            }
        }
    },

    beginFrame : function beginFrameFn()
    {
        var gl = this.gl;

        this.attributeMask = 0;

        /*jslint bitwise: false*/
        var clientStateMask = this.clientStateMask;
        if (clientStateMask)
        {
            for (var n = 0; n < 16; n += 1)
            {
                if (clientStateMask & (1 << n))
                {
                    gl.disableVertexAttribArray(n);
                }
            }
            this.clientStateMask = 0;
        }
        /*jslint bitwise: true*/

        this.resetStates();

        return true;
    },

    beginRenderTarget : function beginRenderTargetFn(renderTarget)
    {
        this.activeRenderTarget = renderTarget;
        return renderTarget.bind();
    },

    endRenderTarget : function endRenderTargetFn()
    {
        this.activeRenderTarget.unbind();
        this.activeRenderTarget = null;
    },

    beginOcclusionQuery : function beginOcclusionQueryFn()
    {
        return false;
    },

    endOcclusionQuery : function endOcclusionQueryFn()
    {
    },

    endFrame : function endFrameFn()
    {
        var gl = this.gl;
        //gl.flush();

        if (this.activeTechnique)
        {
            this.activeTechnique.deactivate();
            this.activeTechnique = null;
        }

        if (this.activeIndexBuffer)
        {
            this.setIndexBuffer(null);
        }

        var state = this.state;
        if (state.program)
        {
            state.program = null;
            gl.useProgram(null);
        }

        this.numFrames += 1;
        var currentFrameTime = Date.now();
        var diffTime = (currentFrameTime - this.previousFrameTime);
        if (diffTime >= 1000.0)
        {
            this.fps = (this.numFrames / (diffTime * 0.001));
            this.numFrames = 0;
            this.previousFrameTime = currentFrameTime;
        }

        var canvas = gl.canvas;
        var width = (gl.drawingBufferWidth || canvas.width);
        var height = (gl.drawingBufferHeight || canvas.height);
        if (this.width !== width ||
            this.height !== height)
        {
            this.width = width;
            this.height = height;
            this.setViewport(0, 0, width, height);
            this.setScissor(0, 0, width, height);
        }

        this.checkFullScreen();
    },

    createTechniqueParameters : function createTechniqueParametersFn(params)
    {
        var techniqueParameters = {};
        if (params)
        {
            for (var p in params)
            {
                if (params.hasOwnProperty(p))
                {
                    techniqueParameters[p] = params[p];
                }
            }
        }
        return techniqueParameters;
    },

    createSemantics : function createSemanticsFn(attributes)
    {
        return WebGLSemantics.create(this, attributes);
    },

    createVertexBuffer : function createVertexBufferFn(params)
    {
        return WebGLVertexBuffer.create(this, params);
    },

    createIndexBuffer : function createIndexBufferFn(params)
    {
        return WebGLIndexBuffer.create(this, params);
    },

    createTexture : function createTextureFn(params)
    {
        return WebGLTexture.create(this, params);
    },

    createShader : function createShaderFn(params)
    {
        return WebGLShader.create(this, params);
    },

    createTechniqueParameterBuffer : function createTechniqueParameterBufferFn(params)
    {
        return techniqueParameterBufferCreate(params);
    },

    createRenderBuffer : function createRenderBufferFn(params)
    {
        return WebGLRenderBuffer.create(this, params);
    },

    createRenderTarget : function createRenderTargetFn(params)
    {
        return WebGLRenderTarget.create(this, params);
    },

    createOcclusionQuery : function createOcclusionQueryFn(params)
    {
        return null;
    },

    createDrawParameters : function createDrawParametersFn(params)
    {
        return WebGLDrawParameters.create(params);
    },

    isSupported : function isSupportedFn(name)
    {
        var gl = this.gl;
        if ("OCCLUSION_QUERIES" === name)
        {
            return false;
        }
        else if ("NPOT_MIPMAPPED_TEXTURES" === name)
        {
            return false;
        }
        else if ("TEXTURE_DXT1" === name ||
                 "TEXTURE_DXT3" === name ||
                 "TEXTURE_DXT5" === name)
        {
            var compressedTexturesExtension = this.compressedTexturesExtension;
            if (compressedTexturesExtension)
            {
                var compressedFormats = gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS);
                if (compressedFormats)
                {
                    var requestedFormat;
                    if ("TEXTURE_DXT1" === name)
                    {
                        requestedFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
                    }
                    else if ("TEXTURE_DXT3" === name)
                    {
                        requestedFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                    }
                    else //if ("TEXTURE_DXT5" === name)
                    {
                        requestedFormat = compressedTexturesExtension.COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    }
                    var numCompressedFormats = compressedFormats.length;
                    for (var n = 0; n < numCompressedFormats; n += 1)
                    {
                        if (compressedFormats[n] === requestedFormat)
                        {
                            return true;
                        }
                    }
                }
            }
        }
        else if ("INDEXFORMAT_UINT" === name)
        {
            if (gl.getExtension('OES_element_index_uint'))
            {
                return true;
            }
            return false;
        }
        return false;
    },

    maxSupported : function maxSupportedFn(name)
    {
        var gl = this.gl;
        if ("ANISOTROPY" === name)
        {
            return this.maxAnisotropy;
        }
        else if ("TEXTURE_SIZE" === name)
        {
            return gl.getParameter(gl.MAX_TEXTURE_SIZE);
        }
        else if ("CUBEMAP_TEXTURE_SIZE" === name)
        {
            return gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
        }
        else if ("3D_TEXTURE_SIZE" === name)
        {
            return 0;
        }
        else if ("RENDERTARGET_COLOR_TEXTURES" === name)
        {
            return 1;
        }
        else if ("RENDERBUFFER_SIZE" === name)
        {
            return gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
        }
        return 0;
    },

    loadTexturesArchive : function loadTexturesArchiveFn(params)
    {
        var src = params.src;
        if (typeof TARLoader !== 'undefined')
        {
            TARLoader.create({
                gd: this,
                src : src,
                mipmaps : params.mipmaps,
                ontextureload : function tarTextureLoadedFn(texture)
                {
                    params.ontextureload(texture);
                },
                onload : function tarLoadedFn(success, status)
                {
                    if (params.onload)
                    {
                        params.onload(true, status);
                    }
                },
                onerror : function tarFailedFn()
                {
                    if (params.onload)
                    {
                        params.onload(false, status);
                    }
                }
            });
            return true;
        }
        else
        {
            TurbulenzEngine.callOnError(
                'Missing archive loader required for ' + src);
            return false;
        }
    },

    getScreenshot : function getScreenshotFn(compress, x, y, width, height)
    {
        var gl = this.gl;
        var canvas = gl.canvas;

        if (compress)
        {
            return canvas.toDataURL('image/jpeg');
        }
        else
        {
            if (x === undefined)
            {
                x = 0;
            }

            if (y === undefined)
            {
                y = 0;
            }

            var target = this.activeRenderTarget;
            if (!target)
            {
                target = canvas;
            }

            if (width === undefined)
            {
                width = target.width;
            }

            if (height === undefined)
            {
                height = target.height;
            }

            var pixels = new Uint8Array(4 * width * height);

            gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            return pixels;
        }
    },

    // private
    checkFullScreen : function checkFullScreenFn()
    {
        var fullscreen = this.fullscreen;
        if (this.oldFullscreen !== fullscreen)
        {
            this.oldFullscreen = fullscreen;

            this.requestFullScreen(fullscreen);
        }
    },

    requestFullScreen : function requestFullScreenFn(fullscreen)
    {
        if (fullscreen)
        {
            var canvas = this.gl.canvas;
            if (canvas.webkitRequestFullScreenWithKeys)
            {
                canvas.webkitRequestFullScreenWithKeys();
            }
            else if (canvas.requestFullScreenWithKeys)
            {
                canvas.requestFullScreenWithKeys();
            }
            else if (canvas.webkitRequestFullScreen)
            {
                canvas.webkitRequestFullScreen(canvas.ALLOW_KEYBOARD_INPUT);
            }
            else if (canvas.mozRequestFullScreen)
            {
                canvas.mozRequestFullScreen();
            }
            else if (canvas.requestFullScreen)
            {
                canvas.requestFullScreen();
            }
            else if (canvas.requestFullscreen)
            {
                canvas.requestFullscreen();
            }
        }
        else
        {
            if (document.webkitCancelFullScreen)
            {
                document.webkitCancelFullScreen();
            }
            else if (document.cancelFullScreen)
            {
                document.cancelFullScreen();
            }
            else if (document.exitFullscreen)
            {
                document.exitFullscreen();
            }
        }
    },

    createSampler : function createSamplerFn(sampler)
    {
        var samplerKey = sampler.minFilter.toString() +
                   ':' + sampler.magFilter.toString() +
                   ':' + sampler.wrapS.toString() +
                   ':' + sampler.wrapT.toString() +
                   ':' + sampler.wrapR.toString() +
                   ':' + sampler.maxAnisotropy.toString();

        var cachedSamplers = this.cachedSamplers;
        var cachedSampler = cachedSamplers[samplerKey];
        if (!cachedSampler)
        {
            cachedSamplers[samplerKey] = sampler;
            return sampler;
        }
        return cachedSampler;
    },

    unsetIndexBuffer : function unsetIndexBufferFn(indexBuffer)
    {
        if (this.activeIndexBuffer === indexBuffer)
        {
            this.activeIndexBuffer = null;
            var gl = this.gl;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }
    },

    bindVertexBuffer : function bindVertexBufferFn(buffer)
    {
        if (this.bindedVertexBuffer !== buffer)
        {
            this.bindedVertexBuffer = buffer;
            var gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        }
    },

    unbindVertexBuffer : function unbindVertexBufferFn(buffer)
    {
        if (this.bindedVertexBuffer === buffer)
        {
            this.bindedVertexBuffer = null;
            var gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    },

    bindTextureUnit : function bindTextureUnitFn(unit, target, texture)
    {
        var state = this.state;
        var gl = this.gl;

        if (state.activeTextureUnit !== unit)
        {
            state.activeTextureUnit = unit;
            gl.activeTexture(gl.TEXTURE0 + unit);
        }
        gl.bindTexture(target, texture);
    },

    bindTexture : function bindTextureFn(target, texture)
    {
        var state = this.state;
        var gl = this.gl;

        var dummyUnit = (state.maxTextureUnit - 1);
        if (state.activeTextureUnit !== dummyUnit)
        {
            state.activeTextureUnit = dummyUnit;
            gl.activeTexture(gl.TEXTURE0 + dummyUnit);
        }
        gl.bindTexture(target, texture);
    },

    unbindTexture : function unbindTextureFn(texture)
    {
        var state = this.state;
        var lastMaxTextureUnit = state.lastMaxTextureUnit;
        var textureUnits = state.textureUnits;
        for (var u = 0; u < lastMaxTextureUnit; u += 1)
        {
            var textureUnit = textureUnits[u];
            if (textureUnit.texture === texture)
            {
                textureUnit.texture = null;
                this.bindTextureUnit(u, textureUnit.target, null);
            }
        }
    },

    setSampler : function setSamplerFn(sampler, target)
    {
        if (sampler)
        {
            var gl = this.gl;

            gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, sampler.minFilter);
            gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, sampler.magFilter);
            gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
            gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
            /*
            if (sSupports3DTextures)
            {
                gl.texParameteri(target, gl.TEXTURE_WRAP_R, sampler.wrapR);
            }
            */
            if (this.TEXTURE_MAX_ANISOTROPY_EXT)
            {
                gl.texParameteri(target, this.TEXTURE_MAX_ANISOTROPY_EXT, sampler.maxAnisotropy);
            }
        }
    },

    setPass : function setPassFn(pass)
    {
        var gl = this.gl;
        var state = this.state;

        // Set renderstates
        var renderStatesSet = pass.statesSet;
        var renderStates = pass.states;
        var numRenderStates = renderStates.length;
        var r, renderState;
        for (r = 0; r < numRenderStates; r += 1)
        {
            renderState = renderStates[r];
            renderState.set.apply(renderState, renderState.values);
        }

        // Reset previous renderstates
        var renderStatesToReset = state.renderStatesToReset;
        var numRenderStatesToReset = renderStatesToReset.length;
        for (r = 0; r < numRenderStatesToReset; r += 1)
        {
            renderState = renderStatesToReset[r];
            if (!(renderState.name in renderStatesSet))
            {
                renderState.reset();
            }
        }

        // Copy set renderstates to be reset later
        renderStatesToReset.length = numRenderStates;
        for (r = 0; r < numRenderStates; r += 1)
        {
            renderStatesToReset[r] = renderStates[r];
        }

        // Reset texture units
        var lastMaxTextureUnit = state.lastMaxTextureUnit;
        var textureUnits = state.textureUnits;
        var currentMaxTextureUnit = pass.numTextureUnits;
        if (currentMaxTextureUnit < lastMaxTextureUnit)
        {
            var u = currentMaxTextureUnit;
            do
            {
                var textureUnit = textureUnits[u];
                if (textureUnit.texture)
                {
                    textureUnit.texture = null;
                    this.bindTextureUnit(u, textureUnit.target, null);
                }
                u += 1;
            }
            while (u < lastMaxTextureUnit);
        }
        state.lastMaxTextureUnit = currentMaxTextureUnit;

        var program = pass.glProgram;
        if (state.program !== program)
        {
            state.program = program;
            gl.useProgram(program);
        }

        if (pass.dirty)
        {
            pass.updateParametersData(this);
        }
    },

    enableClientState : function enableClientStateFn(mask)
    {
        var gl = this.gl;

        var oldMask = this.clientStateMask;
        this.clientStateMask = mask;

        /*jslint bitwise: false*/
        var disableMask = (oldMask & (~mask));
        var enableMask  = ((~oldMask) & mask);
        var n;

        if (disableMask)
        {
            if ((disableMask & 0xff) === 0)
            {
                disableMask >>= 8;
                n = 8;
            }
            else
            {
                n = 0;
            }
            do
            {
                if (0 !== (0x01 & disableMask))
                {
                    gl.disableVertexAttribArray(n);
                }
                n += 1;
                disableMask >>= 1;
            }
            while (disableMask);
        }

        if (enableMask)
        {
            if ((enableMask & 0xff) === 0)
            {
                enableMask >>= 8;
                n = 8;
            }
            else
            {
                n = 0;
            }
            do
            {
                if (0 !== (0x01 & enableMask))
                {
                    gl.enableVertexAttribArray(n);
                }
                n += 1;
                enableMask >>= 1;
            }
            while (enableMask);
        }
        /*jslint bitwise: true*/
    },

    setTexture : function setTextureFn(textureUnitIndex, texture, sampler)
    {
        var state = this.state;
        var gl = this.gl;

        var textureUnit = state.textureUnits[textureUnitIndex];
        var oldgltarget = textureUnit.target;
        var oldglobject = textureUnit.texture;

        if (texture)
        {
            var gltarget = texture.target;
            var globject = texture.glTexture;
            if (oldgltarget !== gltarget ||
                oldglobject !== globject)
            {
                textureUnit.target = gltarget;
                textureUnit.texture = globject;

                if (state.activeTextureUnit !== textureUnitIndex)
                {
                    state.activeTextureUnit = textureUnitIndex;
                    gl.activeTexture(gl.TEXTURE0 + textureUnitIndex);
                }

                if (oldgltarget !== gltarget &&
                    oldglobject)
                {
                    gl.bindTexture(oldgltarget, null);
                }

                gl.bindTexture(gltarget, globject);

                if (texture.sampler !== sampler)
                {
                    texture.sampler = sampler;

                    this.setSampler(sampler, gltarget);
                }
            }
        }
        else
        {
            if (oldgltarget &&
                oldglobject)
            {
                textureUnit.target = 0;
                textureUnit.texture = null;

                if (state.activeTextureUnit !== textureUnitIndex)
                {
                    state.activeTextureUnit = textureUnitIndex;
                    gl.activeTexture(gl.TEXTURE0 + textureUnitIndex);
                }

                gl.bindTexture(oldgltarget, null);
            }
        }
    },

    setProgram : function setProgramFn(program)
    {
        var state = this.state;
        if (state.program !== program)
        {
            state.program = program;
            this.gl.useProgram(program);
        }
    },

    syncState : function syncStateFn()
    {
        var state = this.state;
        var gl = this.gl;

        if (state.depthTestEnable)
        {
            gl.enable(gl.DEPTH_TEST);
        }
        else
        {
            gl.disable(gl.DEPTH_TEST);
        }

        gl.depthFunc(state.depthFunc);

        gl.depthMask(state.depthMask);

        if (state.blendEnable)
        {
            gl.enable(gl.BLEND);
        }
        else
        {
            gl.disable(gl.BLEND);
        }

        gl.blendFunc(state.blendSrc, state.blendDst);

        if (state.cullFaceEnable)
        {
            gl.enable(gl.CULL_FACE);
        }
        else
        {
            gl.disable(gl.CULL_FACE);
        }

        gl.cullFace(state.cullFace);

        gl.frontFace(state.frontFace);

        var colorMask = state.colorMask;
        gl.colorMask(colorMask[0], colorMask[1], colorMask[2], colorMask[3]);

        if (state.stencilTestEnable)
        {
            gl.enable(gl.STENCIL_TEST);
        }
        else
        {
            gl.disable(gl.STENCIL_TEST);
        }

        gl.stencilFunc(state.stencilFunc, state.stencilRef, state.stencilMask);

        gl.stencilOp(state.stencilFail, state.stencilZFail, state.stencilZPass);

        if (state.polygonOffsetFillEnable)
        {
            gl.enable(gl.POLYGON_OFFSET_FILL);
        }
        else
        {
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }

        gl.polygonOffset(state.polygonOffsetFactor, state.polygonOffsetUnits);

        gl.lineWidth(state.lineWidth);

        gl.activeTexture(gl.TEXTURE0 + state.activeTextureUnit);

        var currentBox = this.state.viewportBox;
        gl.viewport(currentBox[0], currentBox[1], currentBox[2], currentBox[3]);

        currentBox = this.state.scissorBox;
        gl.scissor(currentBox[0], currentBox[1], currentBox[2], currentBox[3]);

        var currentColor = state.clearColor;
        gl.clearColor(currentColor[0], currentColor[1], currentColor[2], currentColor[3]);

        gl.clearDepth(state.clearDepth);

        gl.clearStencil(state.clearStencil);
    },

    resetStates : function resetStatesFn()
    {
        var state = this.state;

        var lastMaxTextureUnit = state.lastMaxTextureUnit;
        var textureUnits = state.textureUnits;
        for (var u = 0; u < lastMaxTextureUnit; u += 1)
        {
            var textureUnit = textureUnits[u];
            if (textureUnit.texture)
            {
                this.bindTextureUnit(u, textureUnit.target, null);
                textureUnit.texture = null;
                textureUnit.target = 0;
            }
        }
    },

    destroy : function graphicsDeviceDestroyFn()
    {
        delete this.activeTechnique;
        delete this.activeIndexBuffer;
        delete this.bindedVertexBuffer;

        if (this.immediateVertexBuffer)
        {
            this.immediateVertexBuffer.destroy();
            delete this.immediateVertexBuffer;
        }

        delete this.gl;
    }
};

// Constructor function
WebGLGraphicsDevice.create = function webGLGraphicsDeviceCreateFn(canvas, params)
{
    function getAvailableContext(canvas, params, contextList)
    {
        if (canvas.getContext)
        {
            var canvasParams = {
                    alpha: false,
                    stencil: true,
                    antialias: false
                };

            var multisample = params.multisample;
            if (multisample !== undefined && 1 < multisample)
            {
                canvasParams.antialias = true;
            }

            var numContexts = contextList.length, i;
            for (i = 0; i < numContexts; i += 1)
            {
                try
                {
                    var context = canvas.getContext(contextList[i], canvasParams);
                    if (context)
                    {
                        return context;
                    }
                }
                catch (ex)
                {
                }
            }
        }
        return null;
    }

    // TODO: Test if we can also use "webkit-3d" and "moz-webgl"
    var gl = getAvailableContext(canvas, params, ['webgl', 'experimental-webgl']);
    if (!gl)
    {
        return null;
    }

    var width = (gl.drawingBufferWidth || canvas.width);
    var height = (gl.drawingBufferHeight || canvas.height);

    gl.enable(gl.SCISSOR_TEST);
    gl.depthRange(0.0, 1.0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    //gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST);

    var gd = new WebGLGraphicsDevice();
    gd.gl = gl;
    gd.width = width;
    gd.height = height;

    var extensions = gl.getSupportedExtensions().join(' ');
    gd.extensions = extensions;
    gd.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    gd.rendererVersion = gl.getParameter(gl.VERSION);
    gd.renderer = gl.getParameter(gl.RENDERER);
    gd.vendor = gl.getParameter(gl.VENDOR);

    if (extensions.indexOf('WEBGL_compressed_texture_s3tc') !== -1)
    {
        gd.WEBGL_compressed_texture_s3tc = true;
        if (extensions.indexOf('WEBKIT_WEBGL_compressed_texture_s3tc') !== -1)
        {
            gd.compressedTexturesExtension = gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
        }
        else if (extensions.indexOf('MOZ_WEBGL_compressed_texture_s3tc') !== -1)
        {
            gd.compressedTexturesExtension = gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc');
        }
        else
        {
            gd.compressedTexturesExtension = gl.getExtension('WEBGL_compressed_texture_s3tc');
        }
    }
    else if (extensions.indexOf('WEBKIT_WEBGL_compressed_textures') !== -1)
    {
        gd.compressedTexturesExtension = gl.getExtension('WEBKIT_WEBGL_compressed_textures');
    }

    var anisotropyExtension;
    if (extensions.indexOf('EXT_texture_filter_anisotropic') !== -1)
    {
        if (extensions.indexOf('MOZ_EXT_texture_filter_anisotropic') !== -1)
        {
            anisotropyExtension = gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
        }
        else if (extensions.indexOf('WEBKIT_EXT_texture_filter_anisotropic') !== -1)
        {
            anisotropyExtension = gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
        }
        else
        {
            anisotropyExtension = gl.getExtension('EXT_texture_filter_anisotropic');
        }
    }
    if (anisotropyExtension)
    {
        gd.TEXTURE_MAX_ANISOTROPY_EXT = anisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT;
        gd.maxAnisotropy = gl.getParameter(anisotropyExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    }
    else
    {
        gd.maxAnisotropy = 1;
    }

    gd.PRIMITIVE_POINTS         = gl.POINTS;
    gd.PRIMITIVE_LINES          = gl.LINES;
    gd.PRIMITIVE_LINE_LOOP      = gl.LINE_LOOP;
    gd.PRIMITIVE_LINE_STRIP     = gl.LINE_STRIP;
    gd.PRIMITIVE_TRIANGLES      = gl.TRIANGLES;
    gd.PRIMITIVE_TRIANGLE_STRIP = gl.TRIANGLE_STRIP;
    gd.PRIMITIVE_TRIANGLE_FAN   = gl.TRIANGLE_FAN;

    gd.INDEXFORMAT_UBYTE  = gl.UNSIGNED_BYTE;
    gd.INDEXFORMAT_USHORT = gl.UNSIGNED_SHORT;
    gd.INDEXFORMAT_UINT   = gl.UNSIGNED_INT;

    function getNormalizationScale(format)
    {
        if (format === gl.BYTE)
        {
            return 0x7f;
        }
        else if (format === gl.UNSIGNED_BYTE)
        {
            return 0xff;
        }
        else if (format === gl.SHORT)
        {
            return 0x7fff;
        }
        else if (format === gl.UNSIGNED_SHORT)
        {
            return 0xffff;
        }
        else if (format === gl.INT)
        {
            return 0x7fffffff;
        }
        else if (format === gl.UNSIGNED_INT)
        {
            return 0xffffffff;
        }
        else //if (format === gl.FLOAT)
        {
            return 1;
        }
    }

    function makeVertexformat(n, c, s, f, name)
    {
        var attributeFormat = {
                numComponents: c,
                stride: s,
                componentStride: (s / c),
                format: f,
                name: name
            };
        if (n)
        {
            attributeFormat.normalized = true;
            attributeFormat.normalizationScale = getNormalizationScale(f);
        }
        else
        {
            attributeFormat.normalized = false;
            attributeFormat.normalizationScale = 1;
        }

        if (typeof DataView !== 'undefined' && 'setFloat32' in DataView.prototype)
        {
            if (f === gl.BYTE)
            {
                attributeFormat.typedSetter = DataView.prototype.setInt8;
            }
            else if (f === gl.UNSIGNED_BYTE)
            {
                attributeFormat.typedSetter = DataView.prototype.setUint8;
            }
            else if (f === gl.SHORT)
            {
                attributeFormat.typedSetter = DataView.prototype.setInt16;
            }
            else if (f === gl.UNSIGNED_SHORT)
            {
                attributeFormat.typedSetter = DataView.prototype.setUint16;
            }
            else if (f === gl.INT)
            {
                attributeFormat.typedSetter = DataView.prototype.setInt32;
            }
            else if (f === gl.UNSIGNED_INT)
            {
                attributeFormat.typedSetter = DataView.prototype.setUint32;
            }
            else //if (f === gl.FLOAT)
            {
                attributeFormat.typedSetter = DataView.prototype.setFloat32;
            }
        }
        else
        {
            if (f === gl.BYTE)
            {
                attributeFormat.typedArray = Int8Array;
            }
            else if (f === gl.UNSIGNED_BYTE)
            {
                attributeFormat.typedArray = Uint8Array;
            }
            else if (f === gl.SHORT)
            {
                attributeFormat.typedArray = Int16Array;
            }
            else if (f === gl.UNSIGNED_SHORT)
            {
                attributeFormat.typedArray = Uint16Array;
            }
            else if (f === gl.INT)
            {
                attributeFormat.typedArray = Int32Array;
            }
            else if (f === gl.UNSIGNED_INT)
            {
                attributeFormat.typedArray = Uint32Array;
            }
            else //if (f === gl.FLOAT)
            {
                attributeFormat.typedArray = Float32Array;
            }
        }
        return attributeFormat;
    }

    gd.VERTEXFORMAT_BYTE4    = makeVertexformat(0, 4,  4, gl.BYTE, 'BYTE4');
    gd.VERTEXFORMAT_BYTE4N   = makeVertexformat(1, 4,  4, gl.BYTE, 'BYTE4N');
    gd.VERTEXFORMAT_UBYTE4   = makeVertexformat(0, 4,  4, gl.UNSIGNED_BYTE, 'UBYTE4');
    gd.VERTEXFORMAT_UBYTE4N  = makeVertexformat(1, 4,  4, gl.UNSIGNED_BYTE, 'UBYTE4N');
    gd.VERTEXFORMAT_SHORT2   = makeVertexformat(0, 2,  4, gl.SHORT, 'SHORT2');
    gd.VERTEXFORMAT_SHORT2N  = makeVertexformat(1, 2,  4, gl.SHORT, 'SHORT2N');
    gd.VERTEXFORMAT_SHORT4   = makeVertexformat(0, 4,  8, gl.SHORT, 'SHORT4');
    gd.VERTEXFORMAT_SHORT4N  = makeVertexformat(1, 4,  8, gl.SHORT, 'SHORT4N');
    gd.VERTEXFORMAT_USHORT2  = makeVertexformat(0, 2,  4, gl.UNSIGNED_SHORT, 'USHORT2');
    gd.VERTEXFORMAT_USHORT2N = makeVertexformat(1, 2,  4, gl.UNSIGNED_SHORT, 'USHORT2N');
    gd.VERTEXFORMAT_USHORT4  = makeVertexformat(0, 4,  8, gl.UNSIGNED_SHORT, 'USHORT4');
    gd.VERTEXFORMAT_USHORT4N = makeVertexformat(1, 4,  8, gl.UNSIGNED_SHORT, 'USHORT4N');
    gd.VERTEXFORMAT_FLOAT1   = makeVertexformat(0, 1,  4, gl.FLOAT, 'FLOAT1');
    gd.VERTEXFORMAT_FLOAT2   = makeVertexformat(0, 2,  8, gl.FLOAT, 'FLOAT2');
    gd.VERTEXFORMAT_FLOAT3   = makeVertexformat(0, 3, 12, gl.FLOAT, 'FLOAT3');
    gd.VERTEXFORMAT_FLOAT4   = makeVertexformat(0, 4, 16, gl.FLOAT, 'FLOAT4');

    gd.DEFAULT_SAMPLER = {
        minFilter : gl.LINEAR_MIPMAP_LINEAR,
        magFilter : gl.LINEAR,
        wrapS : gl.REPEAT,
        wrapT : gl.REPEAT,
        wrapR : gl.REPEAT,
        maxAnisotropy : 1
    };

    gd.cachedSamplers = {};

    var maxTextureUnit = 1;
    var maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    if (maxTextureUnit < maxUnit)
    {
        maxTextureUnit = maxUnit;
    }
    maxUnit = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    if (maxTextureUnit < maxUnit)
    {
        maxTextureUnit = maxUnit;
    }

    var textureUnits = [];
    textureUnits.length = maxTextureUnit;
    for (var t = 0; t < maxTextureUnit; t += 1)
    {
        textureUnits[t] = {};
    }

    var defaultDepthFunc = gl.LEQUAL;
    var defaultBlendFuncSrc = gl.SRC_ALPHA;
    var defaultBlendFuncDst = gl.ONE_MINUS_SRC_ALPHA;
    var defaultCullFace = gl.BACK;
    var defaultFrontFace = gl.CCW;
    var defaultStencilFunc = gl.ALWAYS;
    var defaultStencilOp = gl.KEEP;

    var currentState = {
            depthTestEnable         : true,
            blendEnable             : false,
            cullFaceEnable          : true,
            stencilTestEnable       : false,
            polygonOffsetFillEnable : false,
            depthMask               : true,
            depthFunc               : defaultDepthFunc,
            blendSrc                : defaultBlendFuncSrc,
            blendDst                : defaultBlendFuncDst,
            cullFace                : defaultCullFace,
            frontFace               : defaultFrontFace,
            colorMask               : [true, true, true, true],
            stencilFunc             : defaultStencilFunc,
            stencilRef              : 0,
            stencilMask             : 0xffffffff,
            stencilFail             : defaultStencilOp,
            stencilZFail            : defaultStencilOp,
            stencilZPass            : defaultStencilOp,
            polygonOffsetFactor     : 0,
            polygonOffsetUnits      : 0,
            lineWidth               : 1,

            renderStatesToReset : [],

            viewportBox : [0, 0, width, height],
            scissorBox  : [0, 0, width, height],

            clearColor   : [0, 0, 0, 1],
            clearDepth   : 1.0,
            clearStencil : 0,

            activeTextureUnit : 0,
            maxTextureUnit    : maxTextureUnit,
            lastMaxTextureUnit: 0,
            textureUnits      : textureUnits,

            program : null
        };
    gd.state = currentState;

    // State handlers
    function setDepthTestEnable(enable)
    {
        if (currentState.depthTestEnable !== enable)
        {
            currentState.depthTestEnable = enable;
            if (enable)
            {
                gl.enable(gl.DEPTH_TEST);
            }
            else
            {
                gl.disable(gl.DEPTH_TEST);
            }
        }
    }

    function setDepthFunc(func)
    {
        if (currentState.depthFunc !== func)
        {
            currentState.depthFunc = func;
            gl.depthFunc(func);
        }
    }

    function setDepthMask(enable)
    {
        if (currentState.depthMask !== enable)
        {
            currentState.depthMask = enable;
            gl.depthMask(enable);
        }
    }

    function setBlendEnable(enable)
    {
        if (currentState.blendEnable !== enable)
        {
            currentState.blendEnable = enable;
            if (enable)
            {
                gl.enable(gl.BLEND);
            }
            else
            {
                gl.disable(gl.BLEND);
            }
        }
    }

    function setBlendFunc(src, dst)
    {
        if (currentState.blendSrc !== src || currentState.blendDst !== dst)
        {
            currentState.blendSrc = src;
            currentState.blendDst = dst;
            gl.blendFunc(src, dst);
        }
    }

    function setCullFaceEnable(enable)
    {
        if (currentState.cullFaceEnable !== enable)
        {
            currentState.cullFaceEnable = enable;
            if (enable)
            {
                gl.enable(gl.CULL_FACE);
            }
            else
            {
                gl.disable(gl.CULL_FACE);
            }
        }
    }

    function setCullFace(face)
    {
        if (currentState.cullFace !== face)
        {
            currentState.cullFace = face;
            gl.cullFace(face);
        }
    }

    function setFrontFace(face)
    {
        if (currentState.frontFace !== face)
        {
            currentState.frontFace = face;
            gl.frontFace(face);
        }
    }

    function setColorMask(mask0, mask1, mask2, mask3)
    {
        var colorMask = currentState.colorMask;
        if (colorMask[0] !== mask0 ||
            colorMask[1] !== mask1 ||
            colorMask[2] !== mask2 ||
            colorMask[3] !== mask3)
        {
            colorMask[0] = mask0;
            colorMask[1] = mask1;
            colorMask[2] = mask2;
            colorMask[3] = mask3;
            gl.colorMask(mask0, mask1, mask2, mask3);
        }
    }

    function setStencilTestEnable(enable)
    {
        if (currentState.stencilTestEnable !== enable)
        {
            currentState.stencilTestEnable = enable;
            if (enable)
            {
                gl.enable(gl.STENCIL_TEST);
            }
            else
            {
                gl.disable(gl.STENCIL_TEST);
            }
        }
    }

    function setStencilFunc(stencilFunc, stencilRef, stencilMask)
    {
        if (currentState.stencilFunc !== stencilFunc ||
            currentState.stencilRef !== stencilRef ||
            currentState.stencilMask !== stencilMask)
        {
            currentState.stencilFunc = stencilFunc;
            currentState.stencilRef = stencilRef;
            currentState.stencilMask = stencilMask;
            gl.stencilFunc(stencilFunc, stencilRef, stencilMask);
        }
    }

    function setStencilOp(stencilFail, stencilZfail, stencilZpass)
    {
        if (currentState.stencilFail !== stencilFail ||
            currentState.stencilZFail !== stencilZfail ||
            currentState.stencilZPass !== stencilZpass)
        {
            currentState.stencilFail = stencilFail;
            currentState.stencilZFail = stencilZfail;
            currentState.stencilZPass = stencilZpass;
            gl.stencilOp(stencilFail, stencilZfail, stencilZpass);
        }
    }

    function setPolygonOffsetFillEnable(enable)
    {
        if (currentState.polygonOffsetFillEnable !== enable)
        {
            currentState.polygonOffsetFillEnable = enable;
            if (enable)
            {
                gl.enable(gl.POLYGON_OFFSET_FILL);
            }
            else
            {
                gl.disable(gl.POLYGON_OFFSET_FILL);
            }
        }
    }

    function setPolygonOffset(factor, units)
    {
        if (currentState.polygonOffsetFactor !== factor ||
            currentState.polygonOffsetUnits !== units)
        {
            currentState.polygonOffsetFactor = factor;
            currentState.polygonOffsetUnits = units;
            gl.polygonOffset(factor, units);
        }
    }

    function setLineWidth(lineWidth)
    {
        if (currentState.lineWidth !== lineWidth)
        {
            currentState.lineWidth = lineWidth;
            gl.lineWidth(lineWidth);
        }
    }

    function resetDepthTestEnable()
    {
        //setDepthTestEnable(true);
        if (!currentState.depthTestEnable)
        {
            currentState.depthTestEnable = true;
            gl.enable(gl.DEPTH_TEST);
        }
    }

    function resetDepthFunc()
    {
        //setDepthFunc(defaultDepthFunc);
        var func = defaultDepthFunc;
        if (currentState.depthFunc !== func)
        {
            currentState.depthFunc = func;
            gl.depthFunc(func);
        }
    }

    function resetDepthMask()
    {
        //setDepthMask(true);
        if (!currentState.depthMask)
        {
            currentState.depthMask = true;
            gl.depthMask(true);
        }
    }

    function resetBlendEnable()
    {
        //setBlendEnable(false);
        if (currentState.blendEnable)
        {
            currentState.blendEnable = false;
            gl.disable(gl.BLEND);
        }
    }

    function resetBlendFunc()
    {
        //setBlendFunc(defaultBlendFuncSrc, defaultBlendFuncDst);
        var src = defaultBlendFuncSrc;
        var dst = defaultBlendFuncDst;
        if (currentState.blendSrc !== src || currentState.blendDst !== dst)
        {
            currentState.blendSrc = src;
            currentState.blendDst = dst;
            gl.blendFunc(src, dst);
        }
    }

    function resetCullFaceEnable()
    {
        //setCullFaceEnable(true);
        if (!currentState.cullFaceEnable)
        {
            currentState.cullFaceEnable = true;
            gl.enable(gl.CULL_FACE);
        }
    }

    function resetCullFace()
    {
        //setCullFace(defaultCullFace);
        var face = defaultCullFace;
        if (currentState.cullFace !== face)
        {
            currentState.cullFace = face;
            gl.cullFace(face);
        }
    }

    function resetFrontFace()
    {
        //setFrontFace(defaultFrontFace);
        var face = defaultFrontFace;
        if (currentState.frontFace !== face)
        {
            currentState.frontFace = face;
            gl.frontFace(face);
        }
    }

    function resetColorMask()
    {
        //setColorMask(true, true, true, true);
        var colorMask = currentState.colorMask;
        if (colorMask[0] !== true ||
            colorMask[1] !== true ||
            colorMask[2] !== true ||
            colorMask[3] !== true)
        {
            colorMask[0] = true;
            colorMask[1] = true;
            colorMask[2] = true;
            colorMask[3] = true;
            gl.colorMask(true, true, true, true);
        }
    }

    function resetStencilTestEnable()
    {
        //setStencilTestEnable(false);
        if (currentState.stencilTestEnable)
        {
            currentState.stencilTestEnable = false;
            gl.disable(gl.STENCIL_TEST);
        }
    }

    function resetStencilFunc()
    {
        //setStencilFunc(defaultStencilFunc, 0, 0xffffffff);
        var stencilFunc = defaultStencilFunc;
        if (currentState.stencilFunc !== stencilFunc ||
            currentState.stencilRef !== 0 ||
            currentState.stencilMask !== 0xffffffff)
        {
            currentState.stencilFunc = stencilFunc;
            currentState.stencilRef = 0;
            currentState.stencilMask = 0xffffffff;
            gl.stencilFunc(stencilFunc, 0, 0xffffffff);
        }
    }

    function resetStencilOp()
    {
        //setStencilOp(defaultStencilOp, defaultStencilOp, defaultStencilOp);
        var stencilOp = defaultStencilOp;
        if (currentState.stencilFail !== stencilOp ||
            currentState.stencilZFail !== stencilOp ||
            currentState.stencilZPass !== stencilOp)
        {
            currentState.stencilFail = stencilOp;
            currentState.stencilZFail = stencilOp;
            currentState.stencilZPass = stencilOp;
            gl.stencilOp(stencilOp, stencilOp, stencilOp);
        }
    }

    function resetPolygonOffsetFillEnable()
    {
        //setPolygonOffsetFillEnable(false);
        if (currentState.polygonOffsetFillEnable)
        {
            currentState.polygonOffsetFillEnable = false;
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
    }

    function resetPolygonOffset()
    {
        //setPolygonOffset(0, 0);
        if (currentState.polygonOffsetFactor !== 0 ||
            currentState.polygonOffsetUnits !== 0)
        {
            currentState.polygonOffsetFactor = 0;
            currentState.polygonOffsetUnits = 0;
            gl.polygonOffset(0, 0);
        }
    }

    function resetLineWidth()
    {
        //setLineWidth(1);
        if (currentState.lineWidth !== 1)
        {
            currentState.lineWidth = 1;
            gl.lineWidth(1);
        }
    }

    function parseBoolean(state)
    {
        if (typeof state === 'number')
        {
            return (state ? true : false);
        }
        if (typeof state !== 'boolean')
        {
            // TODO
            return null;
        }
        return [state];
    }

    function parseEnum(state)
    {
        if (typeof state !== 'number')
        {
            // TODO
            return null;
        }
        return [state];
    }

    function parseEnum2(state)
    {
        if (typeof state === 'object')
        {
            var value0 = state[0], value1 = state[1];
            if (typeof value0 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value1 !== 'number')
            {
                // TODO
                return null;
            }
            return [value0, value1];
        }
        return null;
    }

    function parseEnum3(state)
    {
        if (typeof state === 'object')
        {
            var value0 = state[0], value1 = state[1], value2 = state[2];
            if (typeof value0 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value1 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value2 !== 'number')
            {
                // TODO
                return null;
            }
            return [value0, value1, value2];
        }
        return null;
    }

    function parseFloat(state)
    {
        if (typeof state !== 'number')
        {
            // TODO
            return null;
        }
        return [state];
    }

    function parseFloat2(state)
    {
        if (typeof state === 'object')
        {
            var value0 = state[0], value1 = state[1];
            if (typeof value0 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value1 !== 'number')
            {
                // TODO
                return null;
            }
            return [value0, value1];
        }
        return null;
    }

    function parseColorMask(state)
    {
        if (typeof state === 'object')
        {
            var value0 = state[0], value1 = state[1], value2 = state[2], value3 = state[3];
            if (typeof value0 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value1 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value2 !== 'number')
            {
                // TODO
                return null;
            }
            if (typeof value3 !== 'number')
            {
                // TODO
                return null;
            }
            return [value0, value1, value2, value3];
        }
        return null;
    }

    var stateHandlers = {};
    function addStateHandler(name, sf, rf, pf, dv)
    {
        stateHandlers[name] = {
            set: sf,
            reset: rf,
            parse: pf,
            defaultValues: dv
        };
    }
    addStateHandler("DepthTestEnable", setDepthTestEnable, resetDepthTestEnable, parseBoolean, [true]);
    addStateHandler("DepthFunc", setDepthFunc, resetDepthFunc, parseEnum, [defaultDepthFunc]);
    addStateHandler("DepthMask", setDepthMask, resetDepthMask, parseBoolean, [true]);
    addStateHandler("BlendEnable", setBlendEnable, resetBlendEnable, parseBoolean, [false]);
    addStateHandler("BlendFunc", setBlendFunc, resetBlendFunc, parseEnum2, [defaultBlendFuncSrc, defaultBlendFuncDst]);
    addStateHandler("CullFaceEnable", setCullFaceEnable, resetCullFaceEnable, parseBoolean, [true]);
    addStateHandler("CullFace", setCullFace, resetCullFace, parseEnum, [defaultCullFace]);
    addStateHandler("FrontFace", setFrontFace, resetFrontFace, parseEnum, [defaultFrontFace]);
    addStateHandler("ColorMask", setColorMask, resetColorMask, parseColorMask, [true, true, true, true]);
    addStateHandler("StencilTestEnable", setStencilTestEnable, resetStencilTestEnable, parseBoolean, [false]);
    addStateHandler("StencilFunc", setStencilFunc, resetStencilFunc, parseEnum3, [defaultStencilFunc, 0, 0xffffffff]);
    addStateHandler("StencilOp", setStencilOp, resetStencilOp, parseEnum3, [defaultStencilOp, defaultStencilOp, defaultStencilOp]);
    addStateHandler("PolygonOffsetFillEnable", setPolygonOffsetFillEnable, resetPolygonOffsetFillEnable, parseBoolean, [false]);
    addStateHandler("PolygonOffset", setPolygonOffset, resetPolygonOffset, parseFloat2, [0, 0]);
    addStateHandler("LineWidth", setLineWidth, resetLineWidth, parseFloat, [1]);
    gd.stateHandlers = stateHandlers;

    gd.syncState();

    gd.videoRam = 0;
    gd.desktopWidth = window.screen.width;
    gd.desktopHeight = window.screen.height;

    if (Object.defineProperty)
    {
        Object.defineProperty(gd, "fullscreen", {
                get : function getFullscreenFn() {
                    return (document.fullscreenEnabled ||
                            document.mozFullScreen ||
                            document.webkitIsFullScreen ||
                            false);
                },
                set : function setFullscreenFn(newFullscreen) {
                    gd.requestFullScreen(newFullscreen);
                },
                enumerable : true,
                configurable : false
            });

        gd.checkFullScreen = function dummyCheckFullScreenFn()
        {
        };
    }
    else
    {
        gd.fullscreen = false;
        gd.oldFullscreen = false;
    }

    gd.clientStateMask = 0;
    gd.attributeMask = 0;
    gd.activeTechnique = null;
    gd.activeIndexBuffer = null;
    gd.bindedVertexBuffer = 0;
    gd.activeRenderTarget = null;

    gd.immediateVertexBuffer = gd.createVertexBuffer({
            numVertices: (256 * 1024 / 16),
            attributes: ['FLOAT4'],
            dynamic: true,
            'transient': true
        });
    gd.immediatePrimitive = -1;
    gd.immediateSemantics = [];

    gd.fps = 0;
    gd.numFrames = 0;
    gd.previousFrameTime = Date.now();

    return gd;
};
