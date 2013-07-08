// Copyright (c) 2011 Turbulenz Limited
/*global Uint8Array*/
/*global window*/
"use strict";

//
// TARLoader
//
function TARLoader() {}
TARLoader.prototype = {

    version : 1,

    processBytes : function processBytesFn(bytes)
    {
        var offset = 0;
        var totalSize = bytes.length;

        function getString(limit)
        {
            var nextOffset = (offset + limit);
            var s = [];
            var n = 0;
            var c = bytes[offset];
            offset += 1;
            while (c && n < limit)
            {
                s[n] = c;
                n += 1;

                c = bytes[offset];
                offset += 1;
            }
            offset = nextOffset;
            return String.fromCharCode.apply(null, s);
        }

        function getNumber(text)
        {
            /*jslint regexp: false*/
            text = text.replace(/[^\d]/g, '');
            /*jslint regexp: true*/
            return parseInt('0' + text, 8);
        }

        function parseHeader()
        {
            var header = {
                fileName : getString(100),
                mode : getString(8),
                uid : getString(8),
                gid : getString(8),
                length : getNumber(getString(12)),
                lastModified : getString(12),
                checkSum : getString(8),
                fileType : getString(1),
                linkName : getString(100),
                ustarSignature : getString(6),
                ustarVersion : getString(2),
                ownerUserName : getString(32),
                ownerGroupName : getString(32),
                deviceMajor : getString(8),
                deviceMinor : getString(8),
                fileNamePrefix : getString(155)
            };
            offset += 12;
            return header;
        }

        var gd = this.gd;
        var mipmaps = this.mipmaps;
        var ontextureload = this.ontextureload;
        var result = true;

        this.texturesLoading = 0;
        var that = this;
        function onload(texture)
        {
            that.texturesLoading -= 1;
            if (texture)
            {
                ontextureload(texture);
            }
            else
            {
                offset = totalSize;
                result = false;
            }
        }

        var header;
        while ((offset + 512) <= totalSize)
        {
            header = parseHeader();
            if (0 < header.length)
            {
                var fileName;
                if (header.fileName === "././@LongLink")
                {
                    // name in next chunk
                    fileName = getString(256);
                    offset += 256;

                    header = parseHeader();
                }
                else
                {
                    if (header.fileNamePrefix &&
                        header.ustarSignature === "ustar")
                    {
                        fileName = (header.fileNamePrefix + header.fileName);
                    }
                    else
                    {
                        fileName = header.fileName;
                    }
                }
                if ('' === header.fileType || '0' === header.fileType)
                {
                    //console.log('Loading "' + fileName + '" (' + header.length + ')');
                    this.texturesLoading += 1;
                    gd.createTexture({
                        src : fileName,
                        data : bytes.subarray(offset, (offset + header.length)),
                        mipmaps : mipmaps,
                        onload : onload
                    });
                }
                offset += (Math.floor((header.length + 511) / 512) * 512);
            }
        }

        bytes = null;

        return result;
    },

    isValidHeader : function isValidHeaderFn(header)
    {
        return true;
    }
};

// Constructor function
TARLoader.create = function tgaLoaderFn(params)
{
    var loader = new TARLoader();
    loader.gd = params.gd;
    loader.mipmaps = params.mipmaps;
    loader.ontextureload = params.ontextureload;
    loader.onload = params.onload;
    loader.onerror = params.onerror;
    loader.texturesLoading = 0;

    var src = params.src;
    if (src)
    {
        loader.src = src;
        var xhr;
        if (window.XMLHttpRequest)
        {
            xhr = new window.XMLHttpRequest();
        }
        else if (window.ActiveXObject)
        {
            xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
        }
        else
        {
            if (params.onerror)
            {
                params.onerror("No XMLHTTPRequest object could be created");
            }
            return null;
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4)
            {
                if (!TurbulenzEngine || !TurbulenzEngine.isUnloading())
                {
                    if (xhr.status === 200 || xhr.status === 0)
                    {
                        var buffer;
                        if (xhr.responseType === "arraybuffer")
                        {
                            buffer = xhr.response;
                        }
                        else if (xhr.mozResponseArrayBuffer !== null)
                        {
                            buffer = xhr.mozResponseArrayBuffer;
                        }
                        else //if (xhr.responseText !== null)
                        {
                            /*jslint bitwise: false*/
                            var text = xhr.responseText;
                            var numChars = text.length;
                            buffer = [];
                            buffer.length = numChars;
                            for (var i = 0; i < numChars; i += 1)
                            {
                                buffer[i] = (text.charCodeAt(i) & 0xff);
                            }
                            /*jslint bitwise: true*/
                        }
                        if (loader.processBytes(new Uint8Array(buffer)))
                        {
                            if (loader.onload)
                            {
                                var callOnload = function callOnloadFn()
                                {
                                    if (0 < loader.texturesLoading)
                                    {
                                        if (!TurbulenzEngine || !TurbulenzEngine.isUnloading())
                                        {
                                            window.setTimeout(callOnloadFn, 100);
                                        }
                                    }
                                    else
                                    {
                                        loader.onload();
                                    }
                                };
                                callOnload();
                            }
                        }
                        else
                        {
                            if (loader.onerror)
                            {
                                loader.onerror();
                            }
                        }
                    }
                    else
                    {
                        if (loader.onerror)
                        {
                            loader.onerror();
                        }
                    }
                }
                // break circular reference
                xhr.onreadystatechange = null;
                xhr = null;
            }
        };
        xhr.open("GET", params.src, true);
        if (xhr.hasOwnProperty("responseType"))
        {
            xhr.responseType = "arraybuffer";
        }
        else
        {
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
        }
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.send(null);
    }

    return loader;
};
