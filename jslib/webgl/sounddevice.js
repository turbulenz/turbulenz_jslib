// Copyright (c) 2011-2012 Turbulenz Limited
/*global TurbulenzEngine: false*/
/*global SoundTARLoader: false*/
/*global Audio: false*/
/*global VMath: false*/
/*global navigator: false*/
/*global window: false*/
/*global console*/
"use strict";


//
// WebGLSound
//
function WebGLSound() {}
WebGLSound.prototype =
{
    version : 1,

    destroy : function soundDestroyFn()
    {
        var audioContext = this.audioContext;
        if (audioContext)
        {
            delete this.audioContext;
            delete this.buffer;
        }
        else
        {
            delete this.audio;
        }
    }
};

WebGLSound.create = function webGLSoundCreateFn(sd, params)
{
    var sound = new WebGLSound();

    var soundPath = params.src;

    sound.name = (params.name || soundPath);
    sound.frequency = 0;
    sound.channels = 0;
    sound.bitrate = 0;
    sound.length = 0;
    sound.compressed = (!params.uncompress);

    var onload = params.onload;

    var data, numSamples, numChannels, samplerRate;

    var audioContext = sd.audioContext;
    if (audioContext)
    {
        sound.audioContext = audioContext;

        var buffer;
        if (soundPath)
        {
            if (!sd.isResourceSupported(soundPath))
            {
                if (onload)
                {
                    onload(null);
                }
                return null;
            }

            var bufferCreated = function bufferCreatedFn(buffer)
            {
                if (buffer)
                {
                    sound.buffer = buffer;
                    sound.frequency = buffer.sampleRate;
                    sound.channels = buffer.numberOfChannels;
                    sound.bitrate = (sound.frequency * sound.channels * 2 * 8);
                    sound.length = buffer.duration;

                    if (onload)
                    {
                        onload(sound, 200);
                    }
                }
                else
                {
                    if (onload)
                    {
                        onload(null);
                    }
                }
            };

            var bufferFailed = function bufferFailedFn()
            {
                if (onload)
                {
                    onload(null);
                }
            };

            data = params.data;
            if (data)
            {
                if (audioContext.decodeAudioData)
                {
                    audioContext.decodeAudioData(data, bufferCreated, bufferFailed);
                }
                else
                {
                    buffer = audioContext.createBuffer(data, false);
                    bufferCreated(buffer);
                }
            }
            else
            {
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
                    if (onload)
                    {
                        onload(null);
                    }
                    return null;
                }

                xhr.onreadystatechange = function ()
                {
                    if (xhr.readyState === 4)
                    {
                        if (!TurbulenzEngine || !TurbulenzEngine.isUnloading())
                        {
                            var xhrStatus = xhr.status;
                            var xhrStatusText = (xhrStatus !== 0 && xhr.statusText || 'No connection');
                            var response = xhr.response;

                            // Sometimes the browser sets status to 200 OK when the connection is closed
                            // before the message is sent (weird!).
                            // In order to address this we fail any completely empty responses.
                            // Hopefully, nobody will get a valid response with no headers and no body!
                            if (xhr.getAllResponseHeaders() === "" && !response && xhrStatus === 200 && xhrStatusText === 'OK')
                            {
                                if (onload)
                                {
                                    onload(null);
                                }
                            }
                            else if (xhrStatus === 200 || xhrStatus === 0)
                            {
                                if (audioContext.decodeAudioData)
                                {
                                    audioContext.decodeAudioData(response, bufferCreated, bufferFailed);
                                }
                                else
                                {
                                    var buffer = audioContext.createBuffer(response, false);
                                    bufferCreated(buffer);
                                }
                            }
                            else
                            {
                                if (onload)
                                {
                                    onload(null);
                                }
                            }
                        }
                        // break circular reference
                        xhr.onreadystatechange = null;
                        xhr = null;
                    }
                };
                xhr.open("GET", soundPath, true);
                xhr.responseType = "arraybuffer";
                xhr.setRequestHeader("Content-Type", "text/plain");
                xhr.send(null);
            }

            return sound;
        }
        else
        {
            data = params.data;
            if (data)
            {
                numSamples = data.length;
                numChannels = (params.channels || 1);
                samplerRate = params.frequency;

                var contextSampleRate = audioContext.sampleRate;
                var c, channel, i, j;

                if (contextSampleRate === samplerRate)
                {
                    buffer = audioContext.createBuffer(numChannels, (numSamples / numChannels), samplerRate);

                    // De-interleave data
                    for (c = 0; c < numChannels; c += 1)
                    {
                        channel = buffer.getChannelData(c);
                        for (i = c, j = 0; i < numSamples; i += numChannels, j += 1)
                        {
                            channel[j] = data[i];
                        }
                    }
                }
                else
                {
                    var ratio = (samplerRate / contextSampleRate);
                    var bufferLength = (numSamples / (ratio * numChannels));

                    buffer = audioContext.createBuffer(numChannels, bufferLength, contextSampleRate);

                    // De-interleave data
                    for (c = 0; c < numChannels; c += 1)
                    {
                        channel = buffer.getChannelData(c);
                        for (j = 0; j < bufferLength; j += 1)
                        {
                            /*jslint bitwise: false*/
                            /*jshint bitwise: false*/
                            channel[j] = data[c + (((j * ratio) | 0) * numChannels)];
                            /*jshint bitwise: true*/
                            /*jslint bitwise: true*/
                        }
                    }
                }

                if (buffer)
                {
                    sound.buffer = buffer;
                    sound.frequency = samplerRate;
                    sound.channels = numChannels;
                    sound.bitrate = (samplerRate * numChannels * 2 * 8);
                    sound.length = (numSamples / (samplerRate * numChannels));

                    if (onload)
                    {
                        onload(sound, 200);
                    }

                    return sound;
                }
            }
        }
    }
    else
    {
        var audio;

        if (soundPath)
        {
            if (!sd.isResourceSupported(soundPath))
            {
                if (onload)
                {
                    onload(null);
                }
                return null;
            }

            audio = new Audio();

            audio.preload = 'auto';
            audio.autobuffer = true;

            audio.src = soundPath;

            audio.onerror = function loadingSoundFailedFn(e)
            {
                if (onload)
                {
                    onload(null);
                    onload = null;
                }
            };

            sd.addLoadingSound(function checkLoadedFn() {
                if (3 <= audio.readyState)
                {
                    sound.frequency = (audio.sampleRate || audio.mozSampleRate);
                    sound.channels = (audio.channels || audio.mozChannels);
                    sound.bitrate = (sound.frequency * sound.channels * 2 * 8);
                    sound.length = audio.duration;

                    if (audio.buffered &&
                        audio.buffered.length &&
                        0 < audio.buffered.end(0))
                    {
                        if (isNaN(sound.length) ||
                            sound.length === Number.POSITIVE_INFINITY)
                        {
                            sound.length = audio.buffered.end(0);
                        }

                        if (onload)
                        {
                            onload(sound, 200);
                            onload = null;
                        }
                    }
                    else
                    {
                        // Make sure the data is actually loaded
                        var forceLoading = function forceLoadingFn()
                        {
                            audio.pause();
                            audio.removeEventListener('play', forceLoading, false);

                            if (onload)
                            {
                                onload(sound, 200);
                                onload = null;
                            }
                        };
                        audio.addEventListener('play', forceLoading, false);
                        audio.volume = 0;
                        audio.play();
                    }

                    return true;
                }
                return false;
            });

            sound.audio = audio;

            return sound;
        }
        else
        {
            data = params.data;
            if (data)
            {
                audio = new Audio();

                if (audio.mozSetup)
                {
                    numSamples = data.length;
                    numChannels = (params.channels || 1);
                    samplerRate = params.frequency;

                    audio.mozSetup(numChannels, samplerRate);

                    sound.data = data;
                    sound.frequency = samplerRate;
                    sound.channels = numChannels;
                    sound.bitrate = (samplerRate * numChannels * 2 * 8);
                    sound.length = (numSamples / (samplerRate * numChannels));

                    sound.audio = audio;

                    if (onload)
                    {
                        onload(sound, 200);
                    }

                    return sound;
                }
                else
                {
                    audio = null;
                }
            }
        }
    }

    if (onload)
    {
        onload(null);
    }

    return null;
};


//
// WebGLSoundSource
//
function WebGLSoundSource() {}
WebGLSoundSource.prototype =
{
    version : 1,

    stopSrcURL : (navigator.userAgent.match(/firefox/i) ? null : 'about:blank'),

    // Public API
    play : function sourcePlayFn(sound, seek)
    {
        var audioContext = this.audioContext;
        if (audioContext)
        {
            var bufferNode = this.bufferNode;

            if (this.sound !== sound)
            {
                if (bufferNode)
                {
                    bufferNode.noteOff(0);
                }
            }
            else
            {
                if (bufferNode)
                {
                    if (bufferNode.loop)
                    {
                        return true;
                    }
                }
            }

            bufferNode = this.createBufferNode(sound);

            this.sound = sound;

            if (!this.playing)
            {
                this.playing = true;
                this.paused = false;

                this.sd.addPlayingSource(this);
            }

            if (seek === undefined)
            {
                seek = 0;
            }

            if (0 < seek)
            {
                var buffer = sound.buffer;
                bufferNode.noteGrainOn(0, seek, (buffer.duration - seek));
                this.playStart = (audioContext.currentTime - seek);
            }
            else
            {
                bufferNode.noteOn(0);
                this.playStart = audioContext.currentTime;
            }
        }
        else
        {
            var audio;

            if (this.sound !== sound)
            {
                this.stop();

                audio = sound.audio.cloneNode(true);

                this.sound = sound;
                this.audio = audio;

                this.updateAudioVolume();

                audio.loop = this.looping;

                audio.addEventListener('ended', this.loopAudio, false);
            }
            else
            {
                if (this.playing && !this.paused)
                {
                    if (this.looping)
                    {
                        return true;
                    }
                }

                audio = this.audio;
            }

            if (!this.playing)
            {
                this.playing = true;
                this.paused = false;

                this.sd.addPlayingSource(this);
            }

            if (seek === undefined)
            {
                seek = 0;
            }

            if (0.05 < Math.abs(audio.currentTime - seek))
            {
                try
                {
                    audio.currentTime = seek;
                }
                catch (e)
                {
                    // There does not seem to be any reliable way of seeking
                }
            }

            if (this.data)
            {
                audio.mozWriteAudio(this.data);
            }
            else
            {
                audio.play();
            }
        }

        return true;
    },

    stop : function sourceStopFn()
    {
        var playing = this.playing;
        if (playing)
        {
            this.playing = false;
            this.paused = false;

            var audioContext = this.audioContext;
            if (audioContext)
            {
                this.sound = null;

                var bufferNode = this.bufferNode;
                if (bufferNode)
                {
                    bufferNode.noteOff(0);
                    this.bufferNode = null;
                }
            }
            else
            {
                var audio = this.audio;
                if (audio)
                {
                    this.sound = null;
                    this.audio = null;

                    audio.src = this.stopSrcURL;

                    audio.removeEventListener('ended', this.loopAudio, false);
                }
            }

            this.sd.removePlayingSource(this);
        }

        return playing;
    },

    pause : function sourcePauseFn()
    {
        if (this.playing)
        {
            if (!this.paused)
            {
                this.paused = true;

                var audioContext = this.audioContext;
                if (audioContext)
                {
                    this.playPaused = audioContext.currentTime;

                    this.bufferNode.noteOff(0);
                    this.bufferNode = null;
                }
                else
                {
                    this.audio.pause();
                }

                this.sd.removePlayingSource(this);
            }

            return true;
        }

        return false;
    },

    resume : function sourceResumeFn(seek)
    {
        if (this.paused)
        {
            this.paused = false;

            var audioContext = this.audioContext;
            if (audioContext)
            {
                if (seek === undefined)
                {
                    seek = (this.playPaused - this.playStart);
                }

                var bufferNode = this.createBufferNode(this.sound);

                if (0 < seek)
                {
                    var buffer = this.sound.buffer;
                    bufferNode.noteGrainOn(0, seek, (buffer.duration - seek));
                    this.playStart = (audioContext.currentTime - seek);
                }
                else
                {
                    bufferNode.noteOn(0);
                    this.playStart = audioContext.currentTime;
                }
            }
            else
            {
                var audio = this.audio;

                if (seek !== undefined)
                {
                    if (0.05 < Math.abs(audio.currentTime - seek))
                    {
                        try
                        {
                            audio.currentTime = seek;
                        }
                        catch (e)
                        {
                            // There does not seem to be any reliable way of seeking
                        }

                    }
                }

                audio.play();
            }

            this.sd.addPlayingSource(this);

            return true;
        }

        return false;
    },

    rewind : function sourceRewindFn()
    {
        if (this.playing)
        {
            var audioContext = this.audioContext;
            if (audioContext)
            {
                var bufferNode = this.bufferNode;
                if (bufferNode)
                {
                    bufferNode.noteOff(0);
                }

                bufferNode = this.createBufferNode(this.sound);

                bufferNode.noteOn(0);

                this.playStart = audioContext.currentTime;

                return true;
            }
            else
            {
                var audio = this.audio;
                if (audio)
                {
                    audio.currentTime = 0;

                    return true;
                }
            }
        }

        return false;
    },

    clear : function sourceClearFn()
    {
        this.stop();
    },

    setAuxiliarySendFilter : function setAuxiliarySendFilterFn()
    {
    },

    setDirectFilter : function setDirectFilterFn()
    {
    },

    destroy : function sourceDestroyFn()
    {
        this.stop();

        var audioContext = this.audioContext;
        if (audioContext)
        {
            var pannerNode = this.pannerNode;
            if (pannerNode)
            {
                pannerNode.disconnect();
                delete this.pannerNode;
            }

            delete this.audioContext;
        }
    }
};

WebGLSoundSource.create = function webGLSoundSourceCreateFn(sd, id, params)
{
    var source = new WebGLSoundSource();

    source.sd = sd;
    source.id = id;

    source.sound = null;
    source.playing = false;
    source.paused = false;

    var gain = (params.gain || 1);
    var looping = (params.looping || false);
    var pitch = (params.pitch || 1);

    var audioContext = sd.audioContext;
    if (audioContext)
    {
        source.audioContext = audioContext;
        source.bufferNode = null;
        source.playStart = -1;
        source.playPaused = -1;

        var pannerNode = audioContext.createPanner();
        source.pannerNode = pannerNode;
        pannerNode.connect(audioContext.destination);

        if (sd.linearDistance)
        {
            if (typeof pannerNode.LINEAR_DISTANCE === "number")
            {
                pannerNode.distanceModel = pannerNode.LINEAR_DISTANCE;
            }
        }

        pannerNode.panningModel = pannerNode.EQUALPOWER;

        var position, direction, velocity;

        Object.defineProperty(source, "position", {
                get : function getPositionFn() {
                    return position.slice();
                },
                set : function setPositionFn(newPosition) {
                    position = VMath.v3Copy(newPosition, position);
                    if (!source.relative)
                    {
                        pannerNode.setPosition(newPosition[0], newPosition[1], newPosition[2]);
                    }
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "direction", {
                get : function getDirectionFn() {
                    return direction.slice();
                },
                set : function setDirectionFn(newDirection) {
                    direction = VMath.v3Copy(newDirection, direction);
                    pannerNode.setOrientation(newDirection[0], newDirection[1], newDirection[2]);
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "velocity", {
                get : function getVelocityFn() {
                    return velocity.slice();
                },
                set : function setVelocityFn(newVelocity) {
                    velocity = VMath.v3Copy(newVelocity, velocity);
                    pannerNode.setVelocity(newVelocity[0], newVelocity[1], newVelocity[2]);
                },
                enumerable : true,
                configurable : false
            });

        source.createBufferNode = function createBufferNodeFn(sound)
        {
            var buffer = sound.buffer;

            var bufferNode = audioContext.createBufferSource();
            bufferNode.buffer = buffer;
            bufferNode.gain.value = gain;
            bufferNode.loop = looping;
            bufferNode.playbackRate.value = pitch;

            if (1 < sound.channels)
            {
                // We do not support panning of stereo sources
                bufferNode.connect(audioContext.destination);
            }
            else
            {
                bufferNode.connect(pannerNode);
            }

            this.bufferNode = bufferNode;

            return bufferNode;
        };

        Object.defineProperty(source, "gain", {
                get : function getGainFn() {
                    return gain;
                },
                set : function setGainFn(newGain) {
                    gain = newGain;
                    var bufferNode = this.bufferNode;
                    if (bufferNode)
                    {
                        bufferNode.gain.value = newGain;
                    }
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "looping", {
                get : function getLoopingFn() {
                    return looping;
                },
                set : function setLoopingFn(newLooping) {
                    looping = newLooping;
                    var bufferNode = this.bufferNode;
                    if (bufferNode)
                    {
                        bufferNode.loop = newLooping;
                    }
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "pitch", {
                get : function getPitchFn() {
                    return pitch;
                },
                set : function setPitchFn(newPitch) {
                    pitch = newPitch;
                    var bufferNode = this.bufferNode;
                    if (bufferNode)
                    {
                        bufferNode.playbackRate.value = newPitch;
                    }
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "tell", {
            get : function tellFn() {
                if (this.playing)
                {
                    if (this.paused)
                    {
                        return (this.playPaused - this.playStart);
                    }
                    else
                    {
                        return (audioContext.currentTime - this.playStart);
                    }
                }
                else
                {
                    return 0;
                }
            },
            enumerable : true,
            configurable : false
        });

        Object.defineProperty(source, "minDistance", {
                get : function getMinDistanceFn() {
                    return pannerNode.refDistance;
                },
                set : function setMinDistanceFn(minDistance) {
                    pannerNode.refDistance = minDistance;
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "maxDistance", {
                get : function getMaxDistanceFn() {
                    return pannerNode.maxDistance;
                },
                set : function setMaxDistanceFn(maxDistance) {
                    pannerNode.maxDistance = maxDistance;
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(source, "rollOff", {
                get : function getRolloffFactorFn() {
                    return pannerNode.rolloffFactor;
                },
                set : function setRolloffFactorFn(rollOff) {
                    pannerNode.rolloffFactor = rollOff;
                },
                enumerable : true,
                configurable : false
            });
    }
    else
    {
        source.audio = null;

        source.gainFactor = 1;
        source.pitch = pitch;

        source.updateAudioVolume = function updateAudioVolumeFn()
        {
            var audio = this.audio;
            if (audio)
            {
                audio.volume = Math.min((this.gainFactor * gain), 1);
            }
        };

        Object.defineProperty(source, "gain", {
                get : function getGainFn() {
                    return gain;
                },
                set : function setGainFn(newGain) {
                    gain = newGain;
                    source.updateAudioVolume();
                },
                enumerable : true,
                configurable : false
            });

        if (typeof new Audio().loop === 'boolean')
        {
            Object.defineProperty(source, "looping", {
                    get : function getLoopingFn() {
                        return looping;
                    },
                    set : function setLoopingFn(newLooping) {
                        looping = newLooping;
                        var audio = source.audio;
                        if (audio)
                        {
                            audio.loop = newLooping;
                        }
                    },
                    enumerable : true,
                    configurable : false
                });

            source.loopAudio = function loopAudioFn() {
                var audio = source.audio;
                if (audio)
                {
                    source.playing = false;
                    source.sd.removePlayingSource(source);
                }
            };
        }
        else
        {
            source.looping = looping;

            source.loopAudio = function loopAudioFn() {
                var audio = source.audio;
                if (audio)
                {
                    if (source.looping)
                    {
                        audio.currentTime = 0;
                        audio.play();
                    }
                    else
                    {
                        source.playing = false;
                        source.sd.removePlayingSource(source);
                    }
                }
            };
        }

        Object.defineProperty(source, "tell", {
            get : function tellFn() {
                var audio = source.audio;
                if (audio)
                {
                    return audio.currentTime;
                }
                else
                {
                    return 0;
                }
            },
            enumerable : true,
            configurable : false
        });
    }

    source.relative = params.relative;
    source.position = (params.position || VMath.v3BuildZero());
    source.direction = (params.direction || VMath.v3BuildZero());
    source.velocity = (params.velocity || VMath.v3BuildZero());
    source.minDistance = (params.minDistance || 1);
    source.maxDistance = (params.maxDistance || Number.MAX_VALUE);
    source.rollOff = (params.rollOff || 1);

    return source;
};


//
// WebGLSoundDevice
//
function WebGLSoundDevice() {}
WebGLSoundDevice.prototype =
{
    version : 1,

    vendor : "Turbulenz",

    // Public API
    createSource : function createSourceFn(params)
    {
        this.lastSourceID += 1;
        return WebGLSoundSource.create(this, this.lastSourceID, params);
    },

    createSound : function createSoundFn(params)
    {
        return WebGLSound.create(this, params);
    },

    loadSoundsArchive : function loadSoundsArchiveFn(params)
    {
        var src = params.src;
        if (typeof SoundTARLoader !== 'undefined')
        {
            SoundTARLoader.create({
                sd: this,
                src : src,
                uncompress : params.uncompress,
                onsoundload : function tarSoundLoadedFn(texture)
                {
                    params.onsoundload(texture);
                },
                onload : function soundTarLoadedFn(success, status)
                {
                    if (params.onload)
                    {
                        params.onload(true);
                    }
                },
                onerror : function soundTarFailedFn()
                {
                    if (params.onload)
                    {
                        params.onload(false);
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

    createEffect : function createEffectFn(params)
    {
        return null;
    },

    createEffectSlot : function createEffectSlotFn(params)
    {
        return null;
    },

    createFilter : function createFilterFn(params)
    {
        return null;
    },

    update : function soundUpdateFn()
    {
        var sqrt = Math.sqrt;

        var listenerTransform = this.listenerTransform;
        var listenerPosition0 = listenerTransform[9];
        var listenerPosition1 = listenerTransform[10];
        var listenerPosition2 = listenerTransform[11];

        var linearDistance = this.linearDistance;

        var playingSources = this.playingSources;
        var id;
        for (id in playingSources)
        {
            if (playingSources.hasOwnProperty(id))
            {
                var source = playingSources[id];

                // Change volume depending on distance to listener
                var minDistance = source.minDistance;
                var maxDistance = source.maxDistance;
                var position = source.position;
                var position0 = position[0];
                var position1 = position[1];
                var position2 = position[2];

                var distanceSq;
                if (source.relative)
                {
                    distanceSq = ((position0 * position0) + (position1 * position1) + (position2 * position2));
                }
                else
                {
                    var delta0 = (listenerPosition0 - position0);
                    var delta1 = (listenerPosition1 - position1);
                    var delta2 = (listenerPosition2 - position2);
                    distanceSq = ((delta0 * delta0) + (delta1 * delta1) + (delta2 * delta2));
                }

                var gainFactor;
                if (distanceSq <= (minDistance * minDistance))
                {
                    gainFactor = 1;
                }
                else if (distanceSq >= (maxDistance * maxDistance))
                {
                    gainFactor = 0;
                }
                else
                {
                    var distance = sqrt(distanceSq);
                    if (linearDistance)
                    {
                        gainFactor = ((maxDistance - distance) / (maxDistance - minDistance));
                    }
                    else
                    {
                        gainFactor = minDistance / (minDistance + (source.rollOff * (distance - minDistance)));
                    }
                }

                if (source.gainFactor !== gainFactor)
                {
                    source.gainFactor = gainFactor;
                    source.updateAudioVolume();
                }
            }
        }
    },

    isSupported : function isSupportedFn(name)
    {
        if ("FILEFORMAT_OGG" === name)
        {
            return ("ogg" in this.supportedExtensions);
        }
        else if ("FILEFORMAT_MP3" === name)
        {
            return ("mp3" in this.supportedExtensions);
        }
        else if ("FILEFORMAT_WAV" === name)
        {
            return ("wav" in this.supportedExtensions);
        }
        return false;
    },

    // Private API
    addLoadingSound : function addLoadingSoundFn(soundCheck)
    {
        var loadingSounds = this.loadingSounds;
        loadingSounds[loadingSounds.length] = soundCheck;

        var loadingInterval = this.loadingInterval;
        if (loadingInterval === null)
        {
            this.loadingInterval = loadingInterval = window.setInterval(function checkLoadingSources() {
                var numLoadingSounds = loadingSounds.length;
                var n = 0;
                do
                {
                    var soundCheck = loadingSounds[n];
                    if (soundCheck())
                    {
                        numLoadingSounds -= 1;
                        if (n < numLoadingSounds)
                        {
                            loadingSounds[n] = loadingSounds[numLoadingSounds];
                        }
                        loadingSounds.length = numLoadingSounds;
                    }
                    else
                    {
                        n += 1;
                    }
                }
                while (n < numLoadingSounds);
                if (numLoadingSounds === 0)
                {
                    window.clearInterval(loadingInterval);
                    this.loadingInterval = null;
                }
            }, 100);
        }
    },

    addPlayingSource : function addPlayingSourceFn(source)
    {
        this.playingSources[source.id] = source;
    },

    removePlayingSource : function removePlayingSourceFn(source)
    {
        delete this.playingSources[source.id];
    },

    isResourceSupported : function isResourceSupportedFn(soundPath)
    {
        var extension = soundPath.slice(-3).toLowerCase();
        return (extension in this.supportedExtensions);
    },

    destroy : function soundDeviceDestroyFn()
    {
        var loadingInterval = this.loadingInterval;
        if (loadingInterval !== null)
        {
            window.clearInterval(loadingInterval);
            this.loadingInterval = null;
        }

        var loadingSounds = this.loadingSounds;
        if (loadingSounds)
        {
            loadingSounds.length = 0;
            this.loadingSounds = null;
        }

        var playingSources = this.playingSources;
        var id;
        if (playingSources)
        {
            for (id in playingSources)
            {
                if (playingSources.hasOwnProperty(id))
                {
                    var source = playingSources[id];
                    if (source)
                    {
                        source.stop();
                    }
                }
            }
            this.playingSources = null;
        }
    }
};

// Constructor function
WebGLSoundDevice.create = function webGLSoundDeviceFn(params)
{
    var sd = new WebGLSoundDevice();

    sd.extensions = '';
    sd.renderer = 'HTML5 Audio';
    sd.aLCVersion = 0;
    sd.aLCExtensions = '';
    sd.aLCEFXVersion = 0;
    sd.aLCMaxAuxiliarySends = 0;

    sd.deviceSpecifier = (params.deviceSpecifier || null);
    sd.frequency = (params.frequency || 44100);
    sd.dopplerFactor = (params.dopplerFactor || 1);
    sd.dopplerVelocity = (params.dopplerVelocity || 1);
    sd.speedOfSound = (params.speedOfSound || 343.29998779296875);
    sd.linearDistance = (params.linearDistance !== undefined ? params.linearDistance : true);

    sd.loadingSounds = [];
    sd.loadingInterval = null;

    sd.playingSources = {};
    sd.lastSourceID = 0;

    var AudioContextConstructor = (window.AudioContext || window.webkitAudioContext);
    if (AudioContextConstructor)
    {
        var audioContext = new AudioContextConstructor();

        sd.renderer = 'WebAudio';
        sd.audioContext = audioContext;
        sd.frequency = audioContext.sampleRate;

        var listener = audioContext.listener;
        listener.dopplerFactor = sd.dopplerFactor;
        listener.speedOfSound = sd.speedOfSound;

        var listenerTransform, listenerVelocity;

        Object.defineProperty(sd, "listenerTransform", {
                get : function getListenerTransformFn() {
                    return listenerTransform.slice();
                },
                set : function setListenerTransformFn(transform) {
                    listenerTransform = VMath.m43Copy(transform, listenerTransform);

                    var position0 = transform[9];
                    var position1 = transform[10];
                    var position2 = transform[11];

                    listener.setPosition(position0, position1, position2);

                    listener.setOrientation(-transform[6], -transform[7], -transform[8],
                                            transform[3], transform[4], transform[5]);
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(sd, "listenerVelocity", {
                get : function getListenerVelocityFn() {
                    return listenerVelocity.slice();
                },
                set : function setListenerVelocityFn(velocity) {
                    listenerVelocity = VMath.v3Copy(velocity, listenerVelocity);
                    listener.setVelocity(velocity[0], velocity[1], velocity[2]);
                },
                enumerable : true,
                configurable : false
            });

        Object.defineProperty(sd, "gain", {
                get : function getGainFn() {
                    return listener.gain;
                },
                set : function setGainFn(newGain) {
                    listener.gain = newGain;
                },
                enumerable : true,
                configurable : false
            });

        sd.update = function soundDeviceUpdate()
        {
            var listenerPosition0 = listenerTransform[9];
            var listenerPosition1 = listenerTransform[10];
            var listenerPosition2 = listenerTransform[11];

            var playingSources = this.playingSources;
            var stopped = [];
            var id;

            for (id in playingSources)
            {
                if (playingSources.hasOwnProperty(id))
                {
                    var source = playingSources[id];

                    if (!source.looping)
                    {
                        var tell = (audioContext.currentTime - source.playStart);
                        if (source.bufferNode.buffer.duration < tell)
                        {
                            source.playing = false;
                            source.sound = null;
                            source.bufferNode = null;
                            stopped[stopped.length] = id;
                            continue;
                        }
                    }

                    if (source.relative)
                    {
                        var position = source.position;
                        var pannerNode = source.pannerNode;
                        pannerNode.setPosition(position[0] + listenerPosition0,
                                               position[1] + listenerPosition1,
                                               position[2] + listenerPosition2);
                    }
                }
            }

            var numStopped = stopped.length;
            var n;
            for (n = 0; n < numStopped; n += 1)
            {
                delete playingSources[stopped[n]];
            }
        };
    }

    sd.listenerTransform = (params.listenerTransform || VMath.m43BuildIdentity());
    sd.listenerVelocity = (params.listenerVelocity || VMath.v3BuildZero());
    sd.listenerGain = (params.listenerGain || 1);

    // Check for supported extensions
    var supportedExtensions = {};
    var audio = new Audio();
    if (audio.canPlayType('application/ogg'))
    {
        supportedExtensions.ogg = true;
    }
    if (audio.canPlayType('audio/mp3'))
    {
        supportedExtensions.mp3 = true;
    }
    if (audio.canPlayType('audio/wav'))
    {
        supportedExtensions.wav = true;
    }
    audio = null;
    sd.supportedExtensions = supportedExtensions;

    return sd;
};
