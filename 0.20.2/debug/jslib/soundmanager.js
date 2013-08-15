// Copyright (c) 2009-2012 Turbulenz Limited

/*global Observer: false*/
/*global TurbulenzEngine: false*/

"use strict";

/**
  @class  Sound manager
  @private

  @since TurbulenzEngine 0.1.0
*/
function SoundManager() {}
SoundManager.prototype =
{
    /**
      Version number
      @memberOf SoundManager
      @constant
      @type number
    */
    version : 1,

    /**
      Generates beep sound data

      @memberOf SoundManager
      @public
      @function
      @name beep

      @param {number} frequency Samples per second of the beep sound
      @param {number} wavefrequency Frequency of the beep sound wave
      @param {number} length Length in seconds of the beep sound

      @return {array} returns an Array of numbers with the sample data
    */
    beep : function beepFn(frequency, wavefrequency, length)
    {
        var sin = Math.sin;
        var twoPI = (2.0 * Math.PI);
        var dphi = (twoPI * wavefrequency / frequency);
        var numSamples = (frequency * length);
        var phase, value;
        var data = [];
        data.length = numSamples;

        phase = 0;
        for (var k = 0; k < numSamples; k += 1)
        {
            value = (sin(phase) * 32767);

            phase += dphi;
            if (phase >= twoPI)
            {
                phase -= twoPI;
            }

            data[k] = value;
        }

        return data;
    }
};

/**
  @constructs Constructs a SoundManager object.

  @param {SoundDevice} sd Sound device
  @param {Sound} ds Default sound
  @param {Element} log Logging element

  @return {SoundManager} object, null if failed
*/
SoundManager.create = function soundManagerCreateFn(sd, rh, ds, errorCallback, log)
{
    if (!errorCallback)
    {
        errorCallback = function (e) {};
    }

    var defaultSoundName = "default";

    var defaultSound;
    if (ds)
    {
        defaultSound = ds;
    }
    else
    {
        var soundParams =
        {
            name : defaultSoundName,
            data   : SoundManager.prototype.beep(4000, 400, 1),
            channels : 1,
            frequency : 4000,
            onload : function (s)
            {
                defaultSound = s;
            }
        };

        if (!sd.createSound(soundParams))
        {
            errorCallback("Default sound not created.");
        }
    }

    var sounds = {};
    var loadingSound = {};
    var loadedObservers = {};
    var numLoadingSounds = 0;
    var pathRemapping = null;
    var pathPrefix = "";

    sounds[defaultSoundName] = defaultSound;

    /**
      Loads a sound

      @memberOf SoundManager.prototype
      @public
      @function
      @name load

      @param {string} path Path to the sound file
      @param {bool} uncompress Uncompress the sound for faster playback
      @param {function} onSoundLoaded function called once the sound has loaded

      @return {Sound} object, returns the default sound if the file at given path is not yet loaded
    */
    function loadSoundFn(path, uncompress, onSoundLoaded)
    {
        var sound = sounds[path];
        if (!sound)
        {
            if (!loadingSound[path])
            {
                loadingSound[path] = true;
                numLoadingSounds += 1;

                var observer = Observer.create();
                loadedObservers[path] = observer;
                if (onSoundLoaded)
                {
                    observer.subscribe(onSoundLoaded);
                }

                var soundLoaded = function soundLoadedFn(sound, status)
                {
                    if (sound)
                    {
                        sounds[path] = sound;
                        observer.notify(sound);
                        delete loadedObservers[path];
                    }
                    else
                    {
                        delete sounds[path];
                    }
                    delete loadingSound[path];
                    numLoadingSounds -= 1;
                };

                var requestSound = function requestSoundFn(url, onload, callContext)
                {
                    var sound = sd.createSound({
                            src : url,
                            uncompress : uncompress,
                            onload : onload
                        });
                    if (!sound)
                    {
                        errorCallback("Sound '" + path + "' not created.");
                    }
                };

                rh.request({
                        src: ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                        requestFn: requestSound,
                        onload: soundLoaded
                    });
            }
            else if (onSoundLoaded)
            {
                loadedObservers[path].subscribe(onSoundLoaded);
            }

            return defaultSound;
        }
        else if (onSoundLoaded)
        {
            // the callback should always be called asynchronously
            TurbulenzEngine.setTimeout(function soundAlreadyLoadedFn()
                {
                    onSoundLoaded(sound);
                }, 0);
        }
        return sound;
    }

    /**
      Alias one sound to another name

      @memberOf SoundManager.prototype
      @public
      @function
      @name map

      @param {string} dst Name of the alias
      @param {string} src Name of the sound to be aliased
    */
    function mapSoundFn(dst, src)
    {
        sounds[dst] = sounds[src];
    }

    /**
      Get sound created from a given sound file or with the given name

      @memberOf SoundManager.prototype
      @public
      @function
      @name get

      @param {string} path Path or name of the sound

      @return {Sound} object, returns the default sound if the sound is not yet loaded or the sound file didn't exist
    */
    function getSoundFn(path)
    {
        var sound = sounds[path];
        if (!sound)
        {
            return defaultSound;
        }
        return sound;
    }

    /**
      Removes a sound from the manager

      @memberOf SoundManager.prototype
      @public
      @function
      @name remove

      @param {string} path Path or name of the sound
    */
    function removeSoundFn(path)
    {
        if (typeof sounds[path] !== 'undefined')
        {
            delete sounds[path];
        }
    }

    /**
      Reloads a sound

      @memberOf SoundManager.prototype
      @public
      @function
      @name reload

      @param {string} path Path or name of the sound
    */
    function reloadSoundFn(path)
    {
        removeSoundFn(path);
        loadSoundFn(path);
    }

    var sm = new SoundManager();

    if (log)
    {
        sm.load = function loadSoundLogFn(path, uncompress)
        {
            log.innerHTML += "SoundManager.load:&nbsp;'" + path + "'";
            return loadSoundFn(path, uncompress);
        };

        sm.map = function mapSoundLogFn(dst, src)
        {
            log.innerHTML += "SoundManager.map:&nbsp;'" + src + "' -> '" + dst + "'";
            mapSoundFn(dst, src);
        };

        sm.get = function getSoundLogFn(path)
        {
            log.innerHTML += "SoundManager.get:&nbsp;'" + path + "'";
            return getSoundFn(path);
        };

        sm.remove = function removeSoundLogFn(path)
        {
            log.innerHTML += "SoundManager.remove:&nbsp;'" + path + "'";
            removeSoundFn(path);
        };

        sm.reload = function reloadSoundLogFn(path)
        {
            log.innerHTML += "SoundManager. reload:&nbsp;'" + path + "'";
            reloadSoundFn(path);
        };
    }
    else
    {
        sm.load = loadSoundFn;
        sm.map = mapSoundFn;
        sm.get = getSoundFn;
        sm.remove = removeSoundFn;
        sm.reload = reloadSoundFn;
    }

    /**
      Reloads all sounds

      @memberOf SoundManager.prototype
      @public
      @function
      @name reloadAll
    */
    sm.reloadAll = function reloadAllSoundsFn()
    {
        for (var t in sounds)
        {
            if (sounds.hasOwnProperty(t) && t !== defaultSoundName)
            {
                reloadSoundFn(t);
            }
        }
    };

    /**
      Get object containing all loaded sounds

      @memberOf SoundManager.prototype
      @public
      @function
      @name getAll

      @return {object}
    */
    sm.getAll = function getAllSoundsFn()
    {
        return sounds;
    };

    /**
      Get number of sounds pending

      @memberOf SoundManager.prototype
      @public
      @function
      @name getNumLoadingSounds

      @return {number}
    */
    sm.getNumPendingSounds = function getNumPendingSoundsFn()
    {
        return numLoadingSounds;
    };

    /**
      Check if a sound is not pending

      @memberOf SoundManager.prototype
      @public
      @function
      @name isSoundLoaded

      @param {string} path Path or name of the sound

      @return {boolean}
    */
    sm.isSoundLoaded = function isSoundLoadedFn(path)
    {
        return !loadingSound[path];
    };

    /**
      Check if a sound is missing

      @memberOf SoundManager.prototype
      @public
      @function
      @name isSoundMissing

      @param {string} path Path or name of the sound

      @return {boolean}
    */
    sm.isSoundMissing = function isSoundMissingFn(path)
    {
        return !sounds[path];
    };

    /**
      Set path remapping dictionary

      @memberOf SoundManager.prototype
      @public
      @function
      @name setPathRemapping

      @param {string} prm Path remapping dictionary
      @param {string} assetUrl Asset prefix for all assets loaded
    */
    sm.setPathRemapping = function setPathRemappingFn(prm, assetUrl)
    {
        pathRemapping = prm;
        pathPrefix = assetUrl;
    };

    sm.destroy = function shaderManagerDestroyFn()
    {
        if (sounds)
        {
            var p;
            for (p in sounds)
            {
                if (sounds.hasOwnProperty(p))
                {
                    var sound = sounds[p];
                    if (sound)
                    {
                        sound.destroy();
                    }
                }
            }
            sounds = null;
        }

        defaultSound = null;
        loadingSound = null;
        loadedObservers = null;
        numLoadingSounds = 0;
        pathRemapping = null;
        pathPrefix = null;
        rh = null;
        sd = null;
    };

    return sm;
};
