// Copyright (c) 2009-2011 Turbulenz Limited

"use strict";

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
TextureManager.create = function textureManagerCreateFn(gd, dt, errorCallback, log)
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
    var delayedTexture = {};
    var numLoadingTextures = 0;
    var archivesLoaded = {};
    var loadingArchives = {};
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

      @return {Texture} object, returns the default texture if the file at given path is not yet loaded
    */
    function loadTextureFn(path, nomipmaps, reload)
    {
        if (path === undefined)
        {
            errorCallback("Invalid texture path passed to TextureManager.Load");
        }
        var textureInstance = textureInstances[path];
        if (reload || !textureInstance || textureInstance.texture === defaultTexture)
        {
            if (!textureInstance)
            {
                addTextureFn(path, defaultTexture, false);
            }

            if (!(path in loadingTexture))
            {
                if (0 === numLoadingArchives)
                {
                    var mipmaps = true;
                    if (nomipmaps)
                    {
                        mipmaps = false;
                    }
                    loadingTexture[path] = true;
                    numLoadingTextures += 1;


                    if (!gd.createTexture({
                        src     : ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                        mipmaps : mipmaps,
                        onload  : function (texture)
                        {
                            if (texture)
                            {
                                addTextureFn(path, texture, false);
                            }
                            //Missing textures are left with the previous, usually default, texture.

                            delete loadingTexture[path];
                            numLoadingTextures -= 1;
                        }
                    }))
                    {
                        errorCallback("Texture '" + path + "' not created.");
                    }
                }
                else
                {
                    delayedTexture[path] = nomipmaps;
                }
            }
        }
        return getTextureFn(path);
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
      Reloads a texture

      @memberOf TextureManager.prototype
      @public
      @function
      @name reload

      @param {string} path Path or name of the texture
    */
    function reloadTextureFn(path)
    {
        if (!loadingTexture[path] && !internalTexture[path])
        {
            var mipmaps = true;
            var textureInstance = textureInstances[path];

            if (textureInstance)
            {
                mipmaps = textureInstance.texture.mipmaps;
            }
            loadTextureFn(path, !mipmaps, true);
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
    function loadArchiveFn(path, nomipmaps)
    {
        if (!(path in archivesLoaded))
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
                if (!gd.loadTexturesArchive({
                    src     : ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                    mipmaps : mipmaps,
                    ontextureload  : function (texture)
                    {
                        var name = texture.name;
                        if (!(name in textureInstances) || textureInstances[name].texture === defaultTexture)
                        {
                            addTextureFn(name, texture, false);
                            loadingArchives[path].textures[name] = true;
                        }
                        delete delayedTexture[name];
                        if (path in loadingTexture)
                        {
                            delete loadingTexture[path];
                            numLoadingTextures -= 1;
                        }
                    },
                    onload: function (success)
                    {
                        if (success)
                        {
                            archivesLoaded[path] = { textures: loadingArchives[path].textures };
                        }
                        delete loadingArchives[path];
                        numLoadingArchives -= 1;
                        if (0 === numLoadingArchives)
                        {
                            for (var name in delayedTexture)
                            {
                                if (delayedTexture.hasOwnProperty(name))
                                {
                                    var delayedNoMipmaps = delayedTexture[name];
                                    loadTextureFn(name, delayedNoMipmaps);
                                }
                            }
                            delayedTexture = {};
                        }
                    }
                }))
                {
                    errorCallback("Archive '" + path + "' not loaded.");
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

        tm.reload = function reloadTextureLogFn(path)
        {
            log.innerHTML += "TextureManager.reload:&nbsp;'" + path + "'";
            reloadTextureFn(path);
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
        tm.reload = reloadTextureFn;
    }

    /**
      Reloads all textures

      @memberOf TextureManager.prototype
      @public
      @function
      @name reloadAll
    */
    tm.reloadAll = function reloadAllTexturesFn()
    {
        for (var t in textureInstances)
        {
            if (textureInstances.hasOwnProperty(t))
            {
                reloadTextureFn(t);
            }
        }
    };

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
        return (!(path in loadingTexture) && !(path in delayedTexture));
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

    return tm;
};
