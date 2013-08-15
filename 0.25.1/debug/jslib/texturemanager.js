/* This file was generated from TypeScript source tslib/texturemanager.ts */

// Copyright (c) 2009-2012 Turbulenz Limited
"use strict";
/*global Reference: false*/
/*global Observer: false*/
/*global TurbulenzEngine: false*/
/// <reference path="turbulenz.d.ts" />
/// <reference path="observer.ts" />
/// <reference path="requesthandler.ts" />
var TextureInstance = (function () {
    function TextureInstance() { }
    TextureInstance.version = 1;
    TextureInstance.prototype.setTexture = //
    // setTexture
    //
    function (texture) {
        this.texture = texture;
        if(this.textureChangedObserver) {
            this.textureChangedObserver.notify(this);
        }
    };
    TextureInstance.prototype.getTexture = //
    // getTexture
    //
    function () {
        return this.texture;
    };
    TextureInstance.prototype.subscribeTextureChanged = //
    // subscribeTextureChanged
    //
    function (observerFunction) {
        if(!this.textureChangedObserver) {
            this.textureChangedObserver = Observer.create();
        }
        this.textureChangedObserver.subscribe(observerFunction);
    };
    TextureInstance.prototype.unsubscribeTextureChanged = //
    // usubscribeTextureChanged
    //
    function (observerFunction) {
        this.textureChangedObserver.unsubscribe(observerFunction);
    };
    TextureInstance.prototype.destroy = //
    // destroy
    //
    function () {
        if(this.texture.name !== "default") {
            this.texture.destroy();
        }
        delete this.texture;
        delete this.textureChangedObserver;
    };
    TextureInstance.create = //
    // TextureInstance.create
    //
    function create(name, texture) {
        var textureInstance = new TextureInstance();
        textureInstance.name = name;
        textureInstance.texture = texture;
        textureInstance.reference = Reference.create(textureInstance);
        return textureInstance;
    };
    return TextureInstance;
})();



/**
@class  Texture manager
@private

@since TurbulenzEngine 0.1.0
*/
var TextureManager = (function () {
    function TextureManager() { }
    TextureManager.version = 1;
    TextureManager.prototype.add = /**
    Adds external texture
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name add
    
    @param {string} name Name of the texture
    @param {Texture} texture Texture
    */
    function (name, texture, internal) {
        var textureInstance = this.textureInstances[name];
        if(!textureInstance) {
            this.textureInstances[name] = TextureInstance.create(name, texture);
            this.textureInstances[name].reference.subscribeDestroyed(this.onTextureInstanceDestroyed);
        } else {
            textureInstance.setTexture(texture);
        }
        if(internal) {
            this.internalTexture[name] = true;
            this.textureInstances[name].reference.add();
        }
    };
    TextureManager.prototype.get = /**
    Get texture created from a given file or with the given name
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name get
    
    @param {string} path Path or name of the texture
    
    @return {Texture} object, returns the default texture if the texture is not yet loaded or the file didn't exist
    */
    function (path) {
        var instance = this.textureInstances[path];
        if(!instance) {
            return this.defaultTexture;
        }
        return instance.getTexture();
    };
    TextureManager.prototype.getInstance = //
    // getInstanceFn
    //
    function (path) {
        return this.textureInstances[path];
    };
    TextureManager.prototype.load = /**
    Creates texture from an image file
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name load
    
    @param {string} path Path to the image file
    @param {boolean} nomipmaps True to disable mipmaps
    @param {function()} onTextureLoaded function to call once the texture is loaded
    
    @return {Texture} object, returns the default Texture if the file at given path is not yet loaded
    */
    function (path, nomipmaps, onTextureLoaded) {
        var that = this;
        if(path === undefined) {
            this.errorCallback("Invalid texture path passed to TextureManager.Load");
        }
        var textureInstance = this.textureInstances[path];
        if(!textureInstance || (textureInstance.texture === this.defaultTexture && path !== "default")) {
            if(!textureInstance) {
                this.add(path, this.defaultTexture, false);
            }
            if(!(path in this.loadingTexture)) {
                if(0 === this.numLoadingArchives) {
                    this.loadingTexture[path] = true;
                    this.numLoadingTextures += 1;
                    var mipmaps = true;
                    if(nomipmaps) {
                        mipmaps = false;
                    }
                    var loadedObserver = Observer.create();
                    this.loadedTextureObservers[path] = loadedObserver;
                    if(onTextureLoaded) {
                        loadedObserver.subscribe(onTextureLoaded);
                    }
                    var textureLoaded = function textureLoadedFn(texture, status) {
                        if(status === 200 && texture) {
                            that.add(path, texture, false);
                        }
                        loadedObserver.notify(texture);
                        delete that.loadedTextureObservers[path];
                        //Missing textures are left with the previous, usually default, texture.
                        delete that.loadingTexture[path];
                        that.numLoadingTextures -= 1;
                    };
                    var textureRequest = function textureRequestFn(url, onload/*, callContext */ ) {
                        var texture = that.graphicsDevice.createTexture({
                            src: url,
                            mipmaps: mipmaps,
                            onload: onload
                        });
                        if(!texture) {
                            that.errorCallback("Texture '" + url + "' not created.");
                        }
                    };
                    this.requestHandler.request({
                        src: ((this.pathRemapping && this.pathRemapping[path]) || (this.pathPrefix + path)),
                        requestFn: textureRequest,
                        onload: textureLoaded
                    });
                } else {
                    this.delayedTextures[path] = {
                        nomipmaps: nomipmaps,
                        onload: onTextureLoaded
                    };
                    return this.get(path);
                }
            } else if(onTextureLoaded) {
                this.loadedTextureObservers[path].subscribe(onTextureLoaded);
            }
            return this.get(path);
        } else {
            var texture = this.get(path);
            if(onTextureLoaded) {
                // the callback should always be called asynchronously
                TurbulenzEngine.setTimeout(function textureAlreadyLoadedFn() {
                    onTextureLoaded(texture);
                }, 0);
            }
            return texture;
        }
    };
    TextureManager.prototype.map = /**
    Alias one texture to another name
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name map
    
    @param {string} dst Name of the alias
    @param {string} src Name of the texture to be aliased
    */
    function (dst, src) {
        if(!this.textureInstances[dst]) {
            this.textureInstances[dst] = TextureInstance.create(dst, this.textureInstances[src].getTexture());
            this.textureInstances[dst].reference.subscribeDestroyed(this.onTextureInstanceDestroyed);
        } else {
            this.textureInstances[dst].setTexture(this.textureInstances[src].getTexture());
        }
        this.internalTexture[dst] = true;
    };
    TextureManager.prototype.remove = /**
    Removes a texture from the manager
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name remove
    
    @param {string} path Path or name of the texture
    */
    function (path) {
        if(!this.internalTexture[path]) {
            if(path in this.textureInstances) {
                this.textureInstances[path].reference.unsubscribeDestroyed(this.onTextureInstanceDestroyed);
                delete this.textureInstances[path];
            }
        }
    };
    TextureManager.prototype.loadArchive = /**
    Loads a textures archive
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name loadArchive
    
    @param {string} path Path to the archive file
    @param {boolean} nomipmaps True to disable mipmaps
    */
    function (path, nomipmaps, onTextureLoaded, onArchiveLoaded) {
        var that = this;
        var archive = this.archivesLoaded[path];
        if(!archive) {
            if(!(path in this.loadingArchives)) {
                var mipmaps = true;
                if(nomipmaps) {
                    mipmaps = false;
                }
                this.loadingArchives[path] = {
                    textures: {
                    }
                };
                this.numLoadingArchives += 1;
                var observer = Observer.create();
                this.loadedArchiveObservers[path] = observer;
                if(onArchiveLoaded) {
                    observer.subscribe(onArchiveLoaded);
                }
                var textureArchiveLoaded = function textureArchiveLoadedFn(success, status) {
                    var loadedArchive;
                    if(status === 200 && success) {
                        loadedArchive = {
                            textures: that.loadingArchives[path].textures
                        };
                        that.archivesLoaded[path] = loadedArchive;
                    }
                    observer.notify(loadedArchive);
                    delete that.loadedArchiveObservers[path];
                    delete that.loadingArchives[path];
                    that.numLoadingArchives -= 1;
                    if(0 === that.numLoadingArchives) {
                        var name;
                        for(name in that.delayedTextures) {
                            if(that.delayedTextures.hasOwnProperty(name)) {
                                var delayedTexture = that.delayedTextures[name];
                                that.load(name, delayedTexture.nomipmaps, delayedTexture.onload);
                            }
                        }
                        that.delayedTextures = {
                        };
                    }
                };
                var requestTextureArchive = function requestTextureArchiveFn(url, onload) {
                    var ontextureload = function ontextureloadFn(texture) {
                        var name = texture.name;
                        if(!(name in that.textureInstances) || that.textureInstances[name].texture === that.defaultTexture) {
                            that.add(name, texture, false);
                            that.loadingArchives[path].textures[name] = texture;
                        }
                        if(onTextureLoaded) {
                            onTextureLoaded(texture);
                        }
                        delete that.delayedTextures[name];
                        if(path in that.loadingTexture) {
                            delete that.loadingTexture[path];
                            that.numLoadingTextures -= 1;
                        }
                    };
                    if(!that.graphicsDevice.loadTexturesArchive({
                        src: url,
                        mipmaps: mipmaps,
                        ontextureload: ontextureload,
                        onload: onload
                    })) {
                        that.errorCallback("Archive '" + path + "' not loaded.");
                    }
                };
                that.requestHandler.request({
                    src: ((that.pathRemapping && that.pathRemapping[path]) || (that.pathPrefix + path)),
                    requestFn: requestTextureArchive,
                    onload: textureArchiveLoaded
                });
            } else if(onTextureLoaded) {
                this.loadedArchiveObservers[path].subscribe(function textureArchiveLoadedFn() {
                    var archive = that.archivesLoaded[path];
                    var texturesInArchive = archive.textures;
                    var t;
                    for(t in texturesInArchive) {
                        if(texturesInArchive.hasOwnProperty(t)) {
                            // the texture has already been loaded so we call onload manaually
                            onTextureLoaded(texturesInArchive[t]);
                        }
                    }
                    if(onArchiveLoaded) {
                        onArchiveLoaded(archive);
                    }
                });
            }
        } else {
            if(onTextureLoaded) {
                var texturesInArchive = archive.textures;
                var numTexturesLoading = 0;
                var textureAlreadyLoadedWrapper = function textureAlreadyLoadedWrapper(texture) {
                    return function textureAlreadyLoadedFn() {
                        onTextureLoaded(texture);
                        numTexturesLoading -= 1;
                        if(numTexturesLoading === 0 && onArchiveLoaded) {
                            onArchiveLoaded(archive);
                        }
                    };
                };
                var t;
                for(t in texturesInArchive) {
                    if(texturesInArchive.hasOwnProperty(t)) {
                        numTexturesLoading += 1;
                        // the callback should always be called asynchronously
                        TurbulenzEngine.setTimeout(textureAlreadyLoadedWrapper(texturesInArchive[t]), 0);
                    }
                }
            }
        }
    };
    TextureManager.prototype.isArchiveLoaded = /**
    Check if an archive is not pending
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name isArchiveLoaded
    
    @param {string} path Path or name of the archive
    
    @return {boolean}
    */
    function (path) {
        return path in this.archivesLoaded;
    };
    TextureManager.prototype.removeArchive = /**
    Removes a textures archive and all the textures it references.
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name removeArchive
    
    @param {string} path Path of the archive file
    */
    function (path) {
        if(path in this.archivesLoaded) {
            var archiveTextures = this.archivesLoaded[path].textures;
            var texture;
            for(texture in archiveTextures) {
                if(archiveTextures.hasOwnProperty(texture)) {
                    this.remove(texture);
                }
            }
            delete this.archivesLoaded[path];
        }
    };
    TextureManager.prototype.getAll = /**
    Get object containing all loaded textures
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name getAll
    
    @return {object}
    */
    function () {
        return this.textureInstances;
    };
    TextureManager.prototype.getNumPendingTextures = /**
    Get number of textures pending
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name getNumLoadingTextures
    
    @return {number}
    */
    function () {
        return (this.numLoadingTextures + this.numLoadingArchives);
    };
    TextureManager.prototype.isTextureLoaded = /**
    Check if a texture is not pending
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name isTextureLoaded
    
    @param {string} path Path or name of the texture
    
    @return {boolean}
    */
    function (path) {
        return (!(path in this.loadingTexture) && !(path in this.delayedTextures));
    };
    TextureManager.prototype.isTextureMissing = /**
    Check if a texture is missing
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name isTextureMissing
    
    @param {string} path Path or name of the texture
    
    @return {boolean}
    */
    function (path) {
        return !(path in this.textureInstances);
    };
    TextureManager.prototype.setPathRemapping = /**
    Set path remapping dictionary
    
    @memberOf TextureManager.prototype
    @public
    @function
    @name setPathRemapping
    
    @param {string} prm Path remapping dictionary
    @param {string} assetUrl Asset prefix for all assets loaded
    */
    function (prm, assetUrl) {
        this.pathRemapping = prm;
        this.pathPrefix = assetUrl;
    };
    TextureManager.prototype.addProceduralTexture = function (params) {
        var name = params.name;
        var procTexture = this.graphicsDevice.createTexture(params);
        if(!procTexture) {
            this.errorCallback("Failed to create '" + name + "' texture.");
        } else {
            this.add(name, procTexture, true);
        }
    };
    TextureManager.prototype.destroy = function () {
        if(this.textureInstances) {
            var p;
            for(p in this.textureInstances) {
                if(this.textureInstances.hasOwnProperty(p)) {
                    var textureInstance = this.textureInstances[p];
                    if(textureInstance) {
                        textureInstance.destroy();
                    }
                }
            }
            this.textureInstances = null;
        }
        if(this.defaultTexture) {
            this.defaultTexture.destroy();
            this.defaultTexture = null;
        }
        this.loadingTexture = null;
        this.loadedTextureObservers = null;
        this.delayedTextures = null;
        this.numLoadingTextures = 0;
        this.archivesLoaded = null;
        this.loadingArchives = null;
        this.loadedArchiveObservers = null;
        this.numLoadingArchives = 0;
        this.internalTexture = null;
        this.pathRemapping = null;
        this.pathPrefix = null;
        this.requestHandler = null;
        this.graphicsDevice = null;
    };
    TextureManager.create = /**
    @constructs Constructs a TextureManager object.
    
    @param {GraphicsDevice} graphicsDevice Graphics device
    @param {Texture} dt Default texture
    @param {Element} log Logging element
    
    @return {TextureManager} object, null if failed
    */
    function create(graphicsDevice, requestHandler, dt, errorCallback, log) {
        var textureManager = new TextureManager();
        if(!errorCallback) {
            errorCallback = function () {
                /* e */             };
        }
        var defaultTextureName = "default";
        var defaultTexture;
        if(dt) {
            defaultTexture = dt;
        } else {
            defaultTexture = graphicsDevice.createTexture({
                name: defaultTextureName,
                width: 2,
                height: 2,
                depth: 1,
                format: 'R8G8B8A8',
                cubemap: false,
                mipmaps: true,
                dynamic: false,
                data: [
                    255, 
                    20, 
                    147, 
                    255, 
                    255, 
                    0, 
                    0, 
                    255, 
                    255, 
                    255, 
                    255, 
                    255, 
                    255, 
                    20, 
                    147, 
                    255
                ]
            });
            if(!defaultTexture) {
                errorCallback("Default texture not created.");
            }
        }
        textureManager.textureInstances = {
        };
        textureManager.loadingTexture = {
        };
        textureManager.loadedTextureObservers = {
        };
        textureManager.delayedTextures = {
        };
        textureManager.numLoadingTextures = 0;
        textureManager.archivesLoaded = {
        };
        textureManager.loadingArchives = {
        };
        textureManager.loadedArchiveObservers = {
        };
        textureManager.numLoadingArchives = 0;
        textureManager.internalTexture = {
        };
        textureManager.pathRemapping = null;
        textureManager.pathPrefix = "";
        textureManager.graphicsDevice = graphicsDevice;
        textureManager.requestHandler = requestHandler;
        textureManager.defaultTexture = defaultTexture;
        textureManager.errorCallback = errorCallback;
        //
        // onTextureInstanceDestroyed callback
        //
        var onTextureInstanceDestroyed = function onTextureInstanceDestroyedFn(textureInstance) {
            textureInstance.reference.unsubscribeDestroyed(onTextureInstanceDestroyed);
            delete textureManager.textureInstances[textureInstance.name];
        };
        textureManager.onTextureInstanceDestroyed = onTextureInstanceDestroyed;
        if(log) {
            textureManager.add = function addTextureLogFn(name, tex) {
                log.innerHTML += "TextureManager.add:&nbsp;'" + name + "'";
                return textureManager.prototype.add(name, tex);
            };
            textureManager.load = function loadTextureLogFn(path, nomipmaps) {
                log.innerHTML += "TextureManager.load:&nbsp;'" + path + "'";
                return textureManager.prototype.load(path, nomipmaps);
            };
            textureManager.loadArchive = function loadArchiveLogFn(path, nomipmaps) {
                log.innerHTML += "TextureManager.loadArchive:&nbsp;'" + path + "'";
                return textureManager.prototype.loadArchive(path, nomipmaps);
            };
            textureManager.isArchiveLoaded = function isArchiveLoadedLogFn(path) {
                log.innerHTML += "TextureManager.isArchiveLoaded:&nbsp;'" + path + "'";
                return textureManager.prototype.isArchiveLoaded(path);
            };
            textureManager.removeArchive = function removeArchiveLogFn(path) {
                log.innerHTML += "TextureManager.removeArchive:&nbsp;'" + path + "'";
                return textureManager.prototype.removeArchive(path);
            };
            textureManager.map = function mapTextureLogFn(dst, src) {
                log.innerHTML += "TextureManager.map:&nbsp;'" + src + "' -> '" + dst + "'";
                textureManager.prototype.map(dst, src);
            };
            textureManager.get = function getTextureLogFn(path) {
                log.innerHTML += "TextureManager.get:&nbsp;'" + path + "'";
                return textureManager.prototype.get(path);
            };
            textureManager.getInstance = function getTextureInstanceLogFn(path) {
                log.innerHTML += "TextureManager.getInstance:&nbsp;'" + path + "'";
                return textureManager.prototype.getInstance(path);
            };
            textureManager.remove = function removeTextureLogFn(path) {
                log.innerHTML += "TextureManager.remove:&nbsp;'" + path + "'";
                textureManager.prototype.remove(path);
            };
        }
        // Add procedural textures
        textureManager.add(defaultTextureName, defaultTexture, true);
        textureManager.addProceduralTexture({
            name: "white",
            width: 2,
            height: 2,
            depth: 1,
            format: 'R8G8B8A8',
            cubemap: false,
            mipmaps: true,
            dynamic: false,
            data: [
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255, 
                255
            ]
        });
        textureManager.addProceduralTexture({
            name: "black",
            width: 2,
            height: 2,
            depth: 1,
            format: 'R8G8B8A8',
            cubemap: false,
            mipmaps: true,
            dynamic: false,
            data: [
                0, 
                0, 
                0, 
                255, 
                0, 
                0, 
                0, 
                255, 
                0, 
                0, 
                0, 
                255, 
                0, 
                0, 
                0, 
                255
            ]
        });
        textureManager.addProceduralTexture({
            name: "flat",
            width: 2,
            height: 2,
            depth: 1,
            format: 'R8G8B8A8',
            cubemap: false,
            mipmaps: true,
            dynamic: false,
            data: [
                128, 
                128, 
                255, 
                255, 
                128, 
                128, 
                255, 
                255, 
                128, 
                128, 
                255, 
                255, 
                128, 
                128, 
                255, 
                255
            ]
        });
        var abs = Math.abs;
        var x, y;
        var quadraticData = [];
        for(y = 0; y < 4; y += 1) {
            for(x = 0; x < 32; x += 1) {
                var s = ((x + 0.5) * (2.0 / 32.0) - 1.0);
                s = abs(s) - (1.0 / 32.0);
                var value = (1.0 - (s * 2.0) + (s * s));
                if(value <= 0) {
                    quadraticData.push(0);
                } else if(value >= 1) {
                    quadraticData.push(255);
                } else {
                    quadraticData.push(value * 255);
                }
            }
        }
        textureManager.addProceduralTexture({
            name: "quadratic",
            width: 32,
            height: 4,
            depth: 1,
            format: 'L8',
            cubemap: false,
            mipmaps: true,
            dynamic: false,
            data: quadraticData
        });
        quadraticData = null;
        var nofalloffData = [];
        for(y = 0; y < 4; y += 1) {
            nofalloffData.push(0);
            for(x = 1; x < 31; x += 1) {
                nofalloffData.push(255);
            }
            nofalloffData.push(0);
        }
        textureManager.addProceduralTexture({
            name: "nofalloff",
            width: 32,
            height: 4,
            depth: 1,
            format: 'L8',
            cubemap: false,
            mipmaps: true,
            dynamic: false,
            data: nofalloffData
        });
        nofalloffData = null;
        return textureManager;
    };
    return TextureManager;
})();

