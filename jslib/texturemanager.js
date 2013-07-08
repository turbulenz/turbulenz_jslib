// Copyright (c) 2009-2012 Turbulenz Limited

"use strict";

/*global Reference: false*/
/*global Observer: false*/
/*global TurbulenzEngine: false*/

function TextureInstance() {}
TextureInstance.prototype =
{
    version : 1,

    //
    // setTexture
    //
    setTexture: function textureInstanceSetTexture(texture)
    {
        this.texture = texture;
        if (this.textureChangedObserver)
        {
            this.textureChangedObserver.notify(this);
        }
    },

    //
    // getTexture
    //
    getTexture: function textureInstanceGetTexture()
    {
        return this.texture;
    },

    //
    // subscribeTextureChanged
    //
    subscribeTextureChanged: function textureInstanceSubscribeTextureChanged(observerFunction)
    {
        if (!this.textureChangedObserver)
        {
            this.textureChangedObserver = Observer.create();
        }
        this.textureChangedObserver.subscribe(observerFunction);
    },

    //
    // usubscribeTextureChanged
    //
    unsubscribeTextureChanged: function textureInstanceunsubscribeTextureChangedFn(observerFunction)
    {
        this.textureChangedObserver.unsubscribe(observerFunction);
    },

    //
    // destroy
    //
    destroy: function textureInstanceDestroy()
    {
        delete this.texture;
        delete this.textureChangedObserver;
    }
};

//
// TextureInstance.create
//
TextureInstance.create = function textureInstanceCreate(name, texture)
{
    var textureInstance = new TextureInstance();
    textureInstance.name = name;
    textureInstance.texture = texture;
    textureInstance.reference = Reference.create(textureInstance);

    return textureInstance;
};


/**
  @class  Texture manager
  @private

  @since TurbulenzEngine 0.1.0
*/
function TextureManager() {}
TextureManager.prototype =
{
    /**
      Version number
      @memberOf TextureManager
      @constant
      @type number
    */
    version : 1
};

/**
  @constructs Constructs a TextureManager object.

  @param {GraphicsDevice} gd Graphics device
  @param {Texture} dt Default texture
  @param {Element} log Logging element

  @return {TextureManager} object, null if failed
*/
TextureManager.create = function textureManagerCreateFn(gd, rh, dt, errorCallback, log)
{
    var tm = new TextureManager();

    if (!errorCallback)
    {
        errorCallback = function (e) {};
    }

    var defaultTextureName = "default";

    var defaultTexture;
    if (dt)
    {
        defaultTexture = dt;
    }
    else
    {
        defaultTexture = gd.createTexture({
            name    : defaultTextureName,
            width   : 2,
            height  : 2,
            depth   : 1,
            format  : 'R8G8B8A8',
            cubemap : false,
            mipmaps : true,
            dynamic : false,
            data    : [255,  20, 147, 255,
                       255,   0,   0, 255,
                       255, 255, 255, 255,
                       255,  20, 147, 255]
        });
        if (!defaultTexture)
        {
            errorCallback("Default texture not created.");
        }
    }

    var textureInstances = {};
    var loadingTexture = {};
    var loadedTextureObservers = {};
    var delayedTextures = {};
    var numLoadingTextures = 0;
    var archivesLoaded = {};
    var loadingArchives = {};
    var loadedArchiveObservers = {};
    var numLoadingArchives = 0;
    var internalTexture = {};
    var pathRemapping = null;
    var pathPrefix = "";

    //
    // onTextureInstanceDestroyed callback
    //
    function onTextureInstanceDestroyed(textureInstance)
    {
        textureInstance.reference.unsubscribeDestroyed(onTextureInstanceDestroyed);
        delete textureInstances[textureInstance.name];
    }

    /**
      Adds external texture

      @memberOf TextureManager.prototype
      @public
      @function
      @name add

      @param {string} name Name of the texture
      @param {Texture} texture Texture
    */
    function addTextureFn(name, texture, internal)
    {
        var textureInstance = textureInstances[name];
        if (!textureInstance)
        {
            textureInstances[name] = TextureInstance.create(name, texture);
            textureInstances[name].reference.subscribeDestroyed(onTextureInstanceDestroyed);
        }
        else
        {
            textureInstance.setTexture(texture);
        }

        if (internal)
        {
            internalTexture[name] = true;
            textureInstances[name].reference.add();
        }
    }

    /**
      Get texture created from a given file or with the given name

      @memberOf TextureManager.prototype
      @public
      @function
      @name get

      @param {string} path Path or name of the texture

      @return {Texture} object, returns the default texture if the texture is not yet loaded or the file didn't exist
    */
    function getTextureFn(path)
    {
        var tex = textureInstances[path];
        if (!tex)
        {
            return defaultTexture;
        }
        return tex.getTexture();
    }

    //
    // getTextureInstanceFn
    //
    function getTextureInstanceFn(path)
    {
        return textureInstances[path];
    }

    /**
      Creates texture from an image file

      @memberOf TextureManager.prototype
      @public
      @function
      @name load

      @param {string} path Path to the image file
      @param {boolean} nomipmaps True to disable mipmaps
      @param {function} onTextureLoaded function to call once the texture is loaded

      @return {Texture} object, returns the default texture if the file at given path is not yet loaded
    */

    function loadTextureFn(path, nomipmaps, onTextureLoaded)
    {
        if (path === undefined)
        {
            errorCallback("Invalid texture path passed to TextureManager.Load");
        }
        var textureInstance = textureInstances[path];
        if (!textureInstance || textureInstance.texture === defaultTexture)
        {
            if (!textureInstance)
            {
                addTextureFn(path, defaultTexture, false);
            }

            if (!(path in loadingTexture))
            {
                if (0 === numLoadingArchives)
                {
                    loadingTexture[path] = true;
                    numLoadingTextures += 1;

                    var mipmaps = true;
                    if (nomipmaps)
                    {
                        mipmaps = false;
                    }

                    var loadedObserver = Observer.create();
                    loadedTextureObservers[path] = loadedObserver;
                    if (onTextureLoaded)
                    {
                        loadedObserver.subscribe(onTextureLoaded);
                    }

                    var textureLoaded = function textureLoadedFn(texture, status)
                    {
                        if (status === 200 && texture)
                        {
                            addTextureFn(path, texture, false);
                        }

                        loadedObserver.notify(texture);
                        delete loadedTextureObservers[path];

                        //Missing textures are left with the previous, usually default, texture.
                        delete loadingTexture[path];
                        numLoadingTextures -= 1;
                    };

                    var textureRequest = function textureRequestFn(url, onload, callContext)
                    {
                        var texture = gd.createTexture({
                            src     : url,
                            mipmaps : mipmaps,
                            onload  : onload
                        });
                        if (!texture)
                        {
                            errorCallback("Texture '" + url + "' not created.");
                        }
                    };

                    rh.request({
                        src: ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                        requestFn: textureRequest,
                        onload: textureLoaded
                    });
                }
                else
                {
                    delayedTextures[path] = {
                        nomipmaps: nomipmaps,
                        onload: onTextureLoaded
                    };

                    return getTextureFn(path);
                }
            }
            else if (onTextureLoaded)
            {
                loadedTextureObservers[path].subscribe(onTextureLoaded);
            }

            return getTextureFn(path);
        }
        else
        {
            textureInstance = getTextureFn(path);
            if (onTextureLoaded)
            {
                // the callback should always be called asynchronously
                TurbulenzEngine.setTimeout(function textureAlreadyLoadedFn()
                    {
                        onTextureLoaded(textureInstance);
                    }, 0);
            }
            return textureInstance;
        }
    }

    /**
      Alias one texture to another name

      @memberOf TextureManager.prototype
      @public
      @function
      @name map

      @param {string} dst Name of the alias
      @param {string} src Name of the texture to be aliased
    */
    function mapTextureFn(dst, src)
    {
        if (!textureInstances[dst])
        {
            textureInstances[dst] = TextureInstance.create(dst, textureInstances[src].getTexture());
            textureInstances[dst].reference.subscribeDestroyed(onTextureInstanceDestroyed);
        }
        else
        {
            textureInstances[dst].setTexture(textureInstances[src].getTexture());
        }
        internalTexture[dst] = true;
    }

    /**
      Removes a texture from the manager

      @memberOf TextureManager.prototype
      @public
      @function
      @name remove

      @param {string} path Path or name of the texture
    */
    function removeTextureFn(path)
    {
        if (!internalTexture[path])
        {
            if (path in textureInstances)
            {
                textureInstances[path].reference.unsubscribeDestroyed(onTextureInstanceDestroyed);
                delete textureInstances[path];
            }
        }
    }

    /**
      Loads a textures archive

      @memberOf TextureManager.prototype
      @public
      @function
      @name loadArchive

      @param {string} path Path to the archive file
      @param {boolean} nomipmaps True to disable mipmaps
    */
    function loadArchiveFn(path, nomipmaps, onTextureLoaded, onArchiveLoaded)
    {
        var archive = archivesLoaded[path];
        if (!archive)
        {
            if (!(path in loadingArchives))
            {
                var mipmaps = true;
                if (nomipmaps)
                {
                    mipmaps = false;
                }
                loadingArchives[path] = { textures: {} };
                numLoadingArchives += 1;

                var observer = Observer.create();
                loadedArchiveObservers[path] = observer;
                if (onArchiveLoaded)
                {
                    observer.subscribe(onArchiveLoaded);
                }

                var textureArchiveLoaded = function textureArchiveLoadedFn(success, status)
                {
                    var loadedArchive;
                    if (status === 200 && success)
                    {
                        loadedArchive = { textures: loadingArchives[path].textures };
                        archivesLoaded[path] = loadedArchive;
                    }

                    observer.notify(loadedArchive);
                    delete loadedArchiveObservers[path];

                    delete loadingArchives[path];
                    numLoadingArchives -= 1;
                    if (0 === numLoadingArchives)
                    {
                        for (var name in delayedTextures)
                        {
                            if (delayedTextures.hasOwnProperty(name))
                            {
                                var delayedTexture = delayedTextures[name];
                                loadTextureFn(name,
                                              delayedTexture.nomipmaps,
                                              delayedTexture.onload);
                            }
                        }
                        delayedTextures = {};
                    }
                };

                var requestTextureArchive = function requestTextureArchiveFn(url, onload)
                {
                    var ontextureload = function ontextureloadFn(texture)
                    {
                        var name = texture.name;
                        if (!(name in textureInstances) || textureInstances[name].texture === defaultTexture)
                        {
                            addTextureFn(name, texture, false);
                            loadingArchives[path].textures[name] = texture;
                        }

                        if (onTextureLoaded)
                        {
                            onTextureLoaded(texture);
                        }

                        delete delayedTextures[name];
                        if (path in loadingTexture)
                        {
                            delete loadingTexture[path];
                            numLoadingTextures -= 1;
                        }
                    };

                    if (!gd.loadTexturesArchive({
                        src: url,
                        mipmaps: mipmaps,
                        ontextureload: ontextureload,
                        onload: onload
                    }))
                    {
                        errorCallback("Archive '" + path + "' not loaded.");
                    }
                };

                rh.request({
                    src: ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                    requestFn: requestTextureArchive,
                    onload: textureArchiveLoaded
                });
            }
            else if (onTextureLoaded)
            {
                loadedArchiveObservers[path].subscribe(function textureArchiveLoadedFn()
                    {
                        var archive = archivesLoaded[path];
                        var texturesInArchive = archive.textures;
                        for (var t in texturesInArchive)
                        {
                            if (texturesInArchive.hasOwnProperty(t))
                            {
                                // the texture has already been loaded so we call onload manaually
                                onTextureLoaded(texturesInArchive[t]);
                            }
                        }
                        if (onArchiveLoaded)
                        {
                            onArchiveLoaded(archive);
                        }
                    });
            }
        }
        else
        {
            if (onTextureLoaded)
            {
                var texturesInArchive = archive.textures;
                var numTexturesLoading = 0;

                var textureAlreadyLoadedWrapper = function textureAlreadyLoadedWrapper(texture)
                {
                    return function textureAlreadyLoadedFn()
                    {
                        onTextureLoaded(texture);
                        numTexturesLoading -= 1;
                        if (numTexturesLoading === 0 && onArchiveLoaded)
                        {
                            onArchiveLoaded(archive);
                        }
                    };
                };

                for (var t in texturesInArchive)
                {
                    if (texturesInArchive.hasOwnProperty(t))
                    {
                        numTexturesLoading += 1;
                        // the callback should always be called asynchronously
                        TurbulenzEngine.setTimeout(textureAlreadyLoadedWrapper(texturesInArchive[t]), 0);
                    }
                }
            }
        }
    }

    /**
      Check if an archive is not pending

      @memberOf TextureManager.prototype
      @public
      @function
      @name isArchiveLoaded

      @param {string} path Path or name of the archive

      @return {boolean}
    */
    function isArchiveLoadedFn(path)
    {
        return path in archivesLoaded;
    }

    /**
      Removes a textures archive and all the textures it references.

      @memberOf TextureManager.prototype
      @public
      @function
      @name removeArchive

      @param {string} path Path of the archive file
    */
    function removeArchiveFn(path)
    {
        if (path in archivesLoaded)
        {
            var archiveTextures = archivesLoaded[path].textures;
            for (var texture in archiveTextures)
            {
                if (archiveTextures.hasOwnProperty(texture))
                {
                    removeTextureFn(texture);
                }
            }
            delete archivesLoaded[path];
        }
    }


    if (log)
    {
        tm.add = function addTextureLogFn(name, tex)
        {
            log.innerHTML += "TextureManager.add:&nbsp;'" + name + "'";
            return addTextureFn(name, tex);
        };

        tm.load = function loadTextureLogFn(path, nomipmaps)
        {
            log.innerHTML += "TextureManager.load:&nbsp;'" + path + "'";
            return loadTextureFn(path, nomipmaps);
        };

        tm.loadArchive = function loadArchiveLogFn(path, nomipmaps)
        {
            log.innerHTML += "TextureManager.loadArchive:&nbsp;'" + path + "'";
            return loadArchiveFn(path, nomipmaps);
        };

        tm.isArchiveLoaded = function isArchiveLoadedLogFn(path)
        {
            log.innerHTML += "TextureManager.isArchiveLoaded:&nbsp;'" + path + "'";
            return isArchiveLoadedFn(path);
        };

        tm.removeArchive = function removeArchiveLogFn(path)
        {
            log.innerHTML += "TextureManager.removeArchive:&nbsp;'" + path + "'";
            return removeArchiveFn(path);
        };

        tm.map = function mapTextureLogFn(dst, src)
        {
            log.innerHTML += "TextureManager.map:&nbsp;'" + src + "' -> '" + dst + "'";
            mapTextureFn(dst, src);
        };

        tm.get = function getTextureLogFn(path)
        {
            log.innerHTML += "TextureManager.get:&nbsp;'" + path + "'";
            return getTextureFn(path);
        };

        tm.getInstance = function getTextureInstanceLogFn(path)
        {
            log.innerHTML += "TextureManager.getInstance:&nbsp;'" + path + "'";
            return getTextureInstanceFn(path);
        };

        tm.remove = function removeTextureLogFn(path)
        {
            log.innerHTML += "TextureManager.remove:&nbsp;'" + path + "'";
            removeTextureFn(path);
        };
    }
    else
    {
        tm.add = addTextureFn;
        tm.load = loadTextureFn;
        tm.loadArchive = loadArchiveFn;
        tm.isArchiveLoaded = isArchiveLoadedFn;
        tm.removeArchive = removeArchiveFn;
        tm.map = mapTextureFn;
        tm.get = getTextureFn;
        tm.getInstance = getTextureInstanceFn;
        tm.remove = removeTextureFn;
    }

    /**
      Get object containing all loaded textures

      @memberOf TextureManager.prototype
      @public
      @function
      @name getAll

      @return {object}
    */
    tm.getAll = function getAllTexturesFn()
    {
        return textureInstances;
    };

    /**
      Get number of textures pending

      @memberOf TextureManager.prototype
      @public
      @function
      @name getNumLoadingTextures

      @return {number}
    */
    tm.getNumPendingTextures = function getNumPendingTexturesFn()
    {
        return (numLoadingTextures + numLoadingArchives);
    };

    /**
      Check if a texture is not pending

      @memberOf TextureManager.prototype
      @public
      @function
      @name isTextureLoaded

      @param {string} path Path or name of the texture

      @return {boolean}
    */
    tm.isTextureLoaded = function isTextureLoadedFn(path)
    {
        return (!(path in loadingTexture) && !(path in delayedTextures));
    };

    /**
      Check if a texture is missing

      @memberOf TextureManager.prototype
      @public
      @function
      @name isTextureMissing

      @param {string} path Path or name of the texture

      @return {boolean}
    */
    tm.isTextureMissing = function isTextureMissingFn(path)
    {
        return !(path in textureInstances);
    };

    /**
      Set path remapping dictionary

      @memberOf TextureManager.prototype
      @public
      @function
      @name setPathRemapping

      @param {string} prm Path remapping dictionary
      @param {string} assetUrl Asset prefix for all assets loaded
    */
    tm.setPathRemapping = function setPathRemappingFn(prm, assetUrl)
    {
        pathRemapping = prm;
        pathPrefix = assetUrl;
    };

    // Add procedural textures
    addTextureFn(defaultTextureName, defaultTexture, true);

    function addProceduralTexture(params)
    {
        var name = params.name;
        var procTexture = gd.createTexture(params);
        if (!procTexture)
        {
            errorCallback("Failed to create '" + name + "' texture.");
        }
        else
        {
            addTextureFn(name, procTexture, true);
        }
    }

    addProceduralTexture({
        name    : "white",
        width   : 2,
        height  : 2,
        depth   : 1,
        format  : 'R8G8B8A8',
        cubemap : false,
        mipmaps : true,
        dynamic : false,
        data    : [255, 255, 255, 255,
                   255, 255, 255, 255,
                   255, 255, 255, 255,
                   255, 255, 255, 255]
    });

    addProceduralTexture({
        name    : "black",
        width   : 2,
        height  : 2,
        depth   : 1,
        format  : 'R8G8B8A8',
        cubemap : false,
        mipmaps : true,
        dynamic : false,
        data    : [0, 0, 0, 255,
                   0, 0, 0, 255,
                   0, 0, 0, 255,
                   0, 0, 0, 255]
    });

    addProceduralTexture({
        name    : "flat",
        width   : 2,
        height  : 2,
        depth   : 1,
        format  : 'R8G8B8A8',
        cubemap : false,
        mipmaps : true,
        dynamic : false,
        data    : [128, 128, 255, 255,
                   128, 128, 255, 255,
                   128, 128, 255, 255,
                   128, 128, 255, 255]
    });

    var abs = Math.abs;
    var x, y;
    var quadraticData = [];
    for (y = 0; y < 4; y += 1)
    {
        for (x = 0; x < 32; x += 1)
        {
            var s = ((x + 0.5) * (2.0 / 32.0) - 1.0);
            s = abs(s) - (1.0 / 32.0);
            var value = (1.0 - (s * 2.0) + (s * s));
            if (value <= 0)
            {
                quadraticData.push(0);
            }
            else if (value >= 1)
            {
                quadraticData.push(255);
            }
            else
            {
                quadraticData.push(value * 255);
            }
        }
    }
    addProceduralTexture({
        name    : "quadratic",
        width   : 32,
        height  : 4,
        depth   : 1,
        format  : 'L8',
        cubemap : false,
        mipmaps : true,
        dynamic : false,
        data    : quadraticData
    });
    quadraticData = null;

    var nofalloffData = [];
    for (y = 0; y < 4; y += 1)
    {
        nofalloffData.push(0);
        for (x = 1; x < 31; x += 1)
        {
            nofalloffData.push(255);
        }
        nofalloffData.push(0);
    }
    addProceduralTexture({
        name    : "nofalloff",
        width   : 32,
        height  : 4,
        depth   : 1,
        format  : 'L8',
        cubemap : false,
        mipmaps : true,
        dynamic : false,
        data    : nofalloffData
    });
    nofalloffData = null;

    tm.destroy = function textureManagerDestroyFn()
    {
        if (textureInstances)
        {
            var p;
            for (p in textureInstances)
            {
                if (textureInstances.hasOwnProperty(p))
                {
                    var textureInstance = textureInstances[p];
                    if (textureInstance)
                    {
                        var texture = textureInstance.getTexture();
                        if (texture)
                        {
                            texture.destroy();
                        }

                        textureInstance.destroy();
                    }
                }
            }
            textureInstances = null;
        }

        if (defaultTexture)
        {
            defaultTexture.destroy();
            defaultTexture = null;
        }

        loadingTexture = null;
        loadedTextureObservers = null;
        delayedTextures = null;
        numLoadingTextures = 0;
        archivesLoaded = null;
        loadingArchives = null;
        loadedArchiveObservers = null;
        numLoadingArchives = 0;
        internalTexture = null;
        pathRemapping = null;
        pathPrefix = null;
        rh = null;
        gd = null;
    };

    return tm;
};
