// Copyright (c) 2010-2011 Turbulenz Limited

"use strict";

function AnimationManager() {}
AnimationManager.prototype =
{
    version : 1
};

AnimationManager.create = function animationManagerCreateFn(errorCallback, log)
{
    if (!errorCallback)
    {
        errorCallback = function (e) {};
    }

    var animations = {};
    var pathRemapping = null;
    var pathPrefix = "";

    function loadAnimationDataFn(data, prefix)
    {
        var fileAnimations = data.animations;
        for (var a in fileAnimations)
        {
            if (fileAnimations.hasOwnProperty(a))
            {
                var anim = fileAnimations[a];

                var numNodes = anim.numNodes;
                var nodeDataArray = anim.nodeData;
                for (var n = 0; n < numNodes; n += 1)
                {
                    var nodeData = nodeDataArray[n];
                    var baseframe = nodeData.baseframe;
                    if (baseframe)
                    {
                        if (baseframe.rotation)
                        {
                            baseframe.rotation = this.mathDevice.quatBuild(baseframe.rotation[0],
                                                                           baseframe.rotation[1],
                                                                           baseframe.rotation[2],
                                                                           baseframe.rotation[3]);
                        }
                        if (baseframe.translation)
                        {
                            baseframe.translation = this.mathDevice.v3Build(baseframe.translation[0],
                                                                            baseframe.translation[1],
                                                                            baseframe.translation[2]);
                        }
                        if (baseframe.scale)
                        {
                            baseframe.scale = this.mathDevice.v3Build(baseframe.scale[0],
                                                                      baseframe.scale[1],
                                                                      baseframe.scale[2]);
                        }
                    }
                    var keyframes = nodeData.keyframes;
                    if (keyframes)
                    {
                        var numKeys = keyframes.length;
                        for (var k = 0; k < numKeys; k += 1)
                        {
                            var keyframe = keyframes[k];
                            if (keyframe.rotation)
                            {
                                keyframe.rotation = this.mathDevice.quatBuild(keyframe.rotation[0],
                                                                              keyframe.rotation[1],
                                                                              keyframe.rotation[2],
                                                                              keyframe.rotation[3]);
                            }
                            if (keyframe.translation)
                            {
                                keyframe.translation = this.mathDevice.v3Build(keyframe.translation[0],
                                                                               keyframe.translation[1],
                                                                               keyframe.translation[2]);
                            }
                            if (keyframe.scale)
                            {
                                keyframe.scale = this.mathDevice.v3Build(keyframe.scale[0],
                                                                         keyframe.scale[1],
                                                                         keyframe.scale[2]);
                            }
                        }
                    }
                }

                var bounds = anim.bounds;
                var numFrames = bounds.length;

                for (var f = 0; f < numFrames; f += 1)
                {
                    var bound = bounds[f];
                    bound.center = this.mathDevice.v3Build(bound.center[0],
                                                           bound.center[1],
                                                           bound.center[2]);
                    bound.halfExtent = this.mathDevice.v3Build(bound.halfExtent[0],
                                                               bound.halfExtent[1],
                                                               bound.halfExtent[2]);
                }

                if (prefix !== undefined)
                {
                    animations[prefix + a] = anim;
                }
                else
                {
                    animations[a] = anim;
                }

            }
        }
    }

    function loadAnimationFileFn(path, onload)
    {

    }

    function getAnimationFn(name)
    {
        var animation = animations[name];
        return animation;
    }

    function removeAnimationFn(name)
    {
        if (typeof animations[name] !== 'undefined')
        {
            delete animations[name];
        }
    }

    function nodeHasSkeletonFn(node)
    {
        var renderables = node.renderables;
        if (renderables)
        {
            var skeleton;
            var numRenderables = renderables.length;
            for (var r = 0; r < numRenderables; r += 1)
            {
                if (renderables[r].geometry)
                {
                    skeleton = renderables[r].geometry.skeleton;
                    if (skeleton)
                    {
                        return skeleton;
                    }
                }
            }
        }

        var children = node.children;
        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                var childSkel = nodeHasSkeletonFn(children[c]);
                if (childSkel)
                {
                    return childSkel;
                }
            }
        }
        return undefined;
    }

    var animationManager = new AnimationManager();
    animationManager.mathDevice = TurbulenzEngine.getMathDevice();

    if (log)
    {
        animationManager.loadFile = function loadAnimationFileLogFn(path, callback)
        {
            log.innerHTML += "AnimationManager.loadFile:&nbsp;'" + path + "'";
            return loadAnimationFileFn(path, callback);
        };

        animationManager.loadData = function loadAnimationDataLogFn(data)
        {
            log.innerHTML += "AnimationManager.loadData";
            return loadAnimationDataFn(data);
        };

        animationManager.get = function getAnimationLogFn(name)
        {
            log.innerHTML += "AnimationManager.get:&nbsp;'" + name + "'";
            return getAnimationFn(name);
        };

        animationManager.remove = function removeAnimationLogFn(name)
        {
            log.innerHTML += "AnimationManager.remove:&nbsp;'" + name + "'";
            removeAnimationFn(name);
        };
    }
    else
    {
        animationManager.loadFile = loadAnimationFileFn;
        animationManager.loadData = loadAnimationDataFn;
        animationManager.get = getAnimationFn;
        animationManager.remove = removeAnimationFn;
        animationManager.nodeHasSkeleton = nodeHasSkeletonFn;
    }

    animationManager.getAll = function getAllAnimationsFn()
    {
        return animations;
    };

    animationManager.setPathRemapping = function setPathRemappingFn(prm, assetUrl)
    {
        pathRemapping = prm;
        pathPrefix = assetUrl;
    };

    return animationManager;
};
