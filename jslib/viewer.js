// Copyright (c) 2009-2011 Turbulenz Limited

/*global Camera: false*/
/*global CameraController: false*/
/*global Floor: false*/
/*global ResourceLoader: false*/
/*global RequestHandler: false*/
/*global TextureManager: false*/
/*global ShaderManager: false*/
/*global EffectManager: false*/
/*global AnimationManager: false*/
/*global PhysicsManager: false*/
/*global Scene: false*/
/*global DefaultRendering: false*/
/*global VMath: false*/
/*global InterpolatorController: false*/
/*global PoseController: false*/
/*global NodeTransformController: false*/
/*global SkinnedNode: false*/

/*global jQuery: false*/
/*global window: false*/
/*global alert: false*/

//
// Viewer
//
function Viewer() {}
Viewer.prototype =
{
    version : 1
};

// Constructor function
Viewer.create = function viewerCreateFn(tz, applicationSettings)
{
    var errorCallback = function errorCallback(msg)
    {
        alert(msg);
    };

    var mathDeviceParameters = {};
    var md = tz.createMathDevice(mathDeviceParameters);

    var graphicsDeviceParameters = { };
    var gd = tz.createGraphicsDevice(graphicsDeviceParameters);

    var inputDeviceParameters = { };
    var id = tz.createInputDevice(inputDeviceParameters);

    var physicsDeviceParameters = { };
    var pd = tz.createPhysicsDevice(physicsDeviceParameters);

    var dynamicsWorldParameters = { };
    var dw = pd.createDynamicsWorld(dynamicsWorldParameters);

    var materialData =
    {
        debugNormalsMaterial :
        {
            effect : "debug_normals"
        },

        debugLinesNormalsMaterial :
        {
            effect : "debug_lines_constant",
            meta:
            {
                constantColor : [0, 1, 0, 1]
            }
        },

        debugTangentsMaterial :
        {
            effect : "debug_tangents",
            meta :
            {
                materialcolor : true
            }
        },

        debugLinesTangentsMaterial :
        {
            effect : "debug_lines_constant",
            meta:
            {
                constantColor : [1, 0, 0, 1]
            }
        },

        debugBinormalsMaterial :
        {
            effect : "debug_binormals"
        },

        debugLinesBinormalsMaterial :
        {
            effect : "debug_lines_constant",
            meta:
            {
                constantColor : [0, 0, 1, 1]
            }
        }

    };

    var camera = Camera.create(md);
    var halfFov = Math.tan(30 * Math.PI / 180);
    camera.recipViewWindowX = 1.0 / halfFov;
    camera.recipViewWindowY = 1.0 / halfFov;
    camera.updateProjectionMatrix();
    var yAxis = md.v3BuildYAxis();
    camera.lookAt(yAxis, yAxis, md.v3Build(0.0, 50.0, 200.0));
    camera.updateViewMatrix();

    var cameraController = CameraController.create(gd, id, camera);

    var floor = Floor.create(gd, md);

    var rh = RequestHandler.create({});

    var tm = TextureManager.create(gd, rh, null, errorCallback);
    var sm = ShaderManager.create(gd, rh, null, errorCallback);
    var em = EffectManager.create(gd, md, sm, null, errorCallback);
    var animationManager = AnimationManager.create(errorCallback);

    var physicsManager = PhysicsManager.create(md, pd, dw);

    var scene = Scene.create(md);
    var sceneLoaded = false;

    var maxSpeed = cameraController.maxSpeed;
    var objectCenter = [0, 0, 0];
    var lightRadius = 1000;
    var lightAngle = 0;

    var vi = new Viewer();
    vi.camera = camera;
    vi.cameraController = cameraController;
    vi.scene = scene;
    vi.pathPrefix = applicationSettings.assetPrefix;
    vi.assetServer = applicationSettings.mappingTablePrefix;
    vi.gameId = applicationSettings.gameId;
    vi.prevNormalsScale = -1;

    var urlRemapping = null;
    var urlRemappingReceived = false;

    var request = function requestFn(url, onload)
    {
        return rh.request({
            src: ((urlRemapping && urlRemapping[url]) || (vi.pathPrefix + url)),
            onload: onload
        });
    };

    function remappingTableReceivedFn(text)
    {
        if (text)
        {
            var urlMappingData = JSON.parse(text);
            urlRemapping = urlMappingData.urnmapping || urlMappingData.urnremapping || {};

            // Prepend all the remapped targets with the asset server if there is one
            var assetServer = vi.assetServer;
            if (assetServer && assetServer.length > 0)
            {
                for (var source in urlRemapping)
                {
                    if (urlRemapping.hasOwnProperty(source))
                    {
                        urlRemapping[source] = assetServer + urlRemapping[source];
                    }
                }
            }
        }
        tm.setPathRemapping(urlRemapping, vi.pathPrefix);
        sm.setPathRemapping(urlRemapping, vi.pathPrefix);
        animationManager.setPathRemapping(urlRemapping, vi.pathPrefix);

        vi.renderer = DefaultRendering.create(gd, md, sm, em);

        urlRemappingReceived = true;
    }

    request(applicationSettings.remappingTableURL, remappingTableReceivedFn);

    var baseMaterialsScene = Scene.create(md);
    baseMaterialsScene.load({
            data : {
                version : 1,
                effects :
                {
                    "default" :
                    {
                        type : "lambert"
                    }
                },
                materials :
                {
                    "default" :
                    {
                        effect : "default"
                    }
                }
            },
            graphicsDevice : gd,
            keepVertexData : true
        });


    function addAnimationExtentsToScene(scene)
    {
        // no extents found so far so try using the animations to calculate them
        var maxValue = Number.MAX_VALUE;
        var animExtentMin0 = maxValue;
        var animExtentMin1 = maxValue;
        var animExtentMin2 = maxValue;
        var animExtentMax0 = -maxValue;
        var animExtentMax1 = -maxValue;
        var animExtentMax2 = -maxValue;
        var animations = animationManager.getAll();

        for (var a in animations)
        {
            if (animations.hasOwnProperty(a))
            {
                var anim = animations[a];
                var bounds = anim.bounds;
                var numFrames = anim.bounds.length;
                for (var i = 0; i < numFrames; i = i + 1)
                {
                    var bound = bounds[i];
                    var center = bound.center;
                    var halfExtent = bound.halfExtent;
                    var c0 = center[0];
                    var c1 = center[1];
                    var c2 = center[2];
                    var h0 = halfExtent[0];
                    var h1 = halfExtent[1];
                    var h2 = halfExtent[2];
                    var min0 = (c0 - h0);
                    var min1 = (c1 - h1);
                    var min2 = (c2 - h2);
                    var max0 = (c0 + h0);
                    var max1 = (c1 + h1);
                    var max2 = (c2 + h2);
                    animExtentMin0 = (animExtentMin0 < min0 ? animExtentMin0 : min0);
                    animExtentMin1 = (animExtentMin1 < min1 ? animExtentMin1 : min1);
                    animExtentMin2 = (animExtentMin2 < min2 ? animExtentMin2 : min2);
                    animExtentMax0 = (animExtentMax0 > max0 ? animExtentMax0 : max0);
                    animExtentMax1 = (animExtentMax1 > max1 ? animExtentMax1 : max1);
                    animExtentMax2 = (animExtentMax2 > max2 ? animExtentMax2 : max2);
                }
            }
        }

        // If any of the min values are less than or equal to the max values we found animations
        if (animExtentMin0 <= animExtentMax0)
        {
            scene.extents[0] = animExtentMin0 < scene.extents[0] ? animExtentMin0 :  scene.extents[0];
            scene.extents[1] = animExtentMin1 < scene.extents[1] ? animExtentMin1 :  scene.extents[1];
            scene.extents[2] = animExtentMin2 < scene.extents[2] ? animExtentMin2 :  scene.extents[2];

            scene.extents[3] = animExtentMax0 > scene.extents[3] ? animExtentMax0 :  scene.extents[3];
            scene.extents[4] = animExtentMax1 > scene.extents[4] ? animExtentMax1 :  scene.extents[4];
            scene.extents[5] = animExtentMax2 > scene.extents[5] ? animExtentMax2 :  scene.extents[5];
        }
    }

    function loadSceneFinishedFn(scene)
    {
        // For the viewer we include the extents of all the animations to try and get a better camera setup
        addAnimationExtentsToScene(scene);
        var sceneExtents = scene.getExtents();
        var sceneMinExtent = md.v3Build(sceneExtents[0], sceneExtents[1], sceneExtents[2]);
        var sceneMaxExtent = md.v3Build(sceneExtents[3], sceneExtents[4], sceneExtents[5]);
        var c = md.v3ScalarMul(md.v3Add(sceneMaxExtent, sceneMinExtent), 0.5);
        var e = md.v3Sub(c, sceneMinExtent);

        camera.lookAt(c, yAxis, md.v3Build(c[0] + e[0] * 4.0, c[1] + e[1] * 2.0, c[2] + e[2] * 4.0));
        camera.updateViewMatrix();

        var len = VMath.v3Length(e);
        if (len < 4.0)
        {
            camera.nearPlane = len * 0.1;
        }
        else
        {
            camera.nearPlane = 1.0;
        }
        camera.farPlane = Math.ceil(len) * 100.0;
        camera.updateProjectionMatrix();

        maxSpeed = (len < 100 ? (len * 2) : (len * 0.5));
        objectCenter = c;
        lightRadius = (len * 4);

        scene.skinnedNodes = [];
        var nodeHasSkeleton = animationManager.nodeHasSkeleton;

        var animations = animationManager.getAll();
        var sceneNodes = scene.rootNodes;
        var numNodes = sceneNodes.length;
        var a, anim, interp, skinnedNode, nodeController;
        for (var n = 0; n < numNodes; n += 1)
        {
            var node = sceneNodes[n];
            var skeleton = nodeHasSkeleton(node);
            if (skeleton && skeleton.numNodes)
            {
                interp = InterpolatorController.create(skeleton);
                skinnedNode = SkinnedNode.create(gd, md, node, skeleton, interp);
                scene.skinnedNodes.push(skinnedNode);
                skinnedNode.animController = interp;

                for (a in animations)
                {
                    if (animations.hasOwnProperty(a))
                    {
                        anim = animations[a];
                        if (anim.numNodes === skeleton.numNodes)
                        {
                            interp.setAnimation(anim, true);
                            break;
                        }
                    }
                }

                // Build a pose controller to allow the viewer to render bind poses
                var poseController = PoseController.create(skeleton);
                var numJoints = skeleton.numNodes;
                var parents = skeleton.parents;
                var bindPoses = skeleton.bindPoses;
                var hasScale = false;

                // Check if the bind pose includes any scale
                var j;
                for (j = 0; j < numJoints; j += 1)
                {
                    var poseMatrix = bindPoses[j];
                    if (!VMath.v3Equal([md.v3LengthSq(md.m43Right(poseMatrix)),
                                        md.v3LengthSq(md.m43Up(poseMatrix)),
                                        md.v3LengthSq(md.m43At(poseMatrix))],
                                        [1, 1, 1]))
                    {
                        hasScale = true;
                        break;
                    }
                }

                // Dependent on whether we have scale setup the output channels on the pose controller
                if (hasScale)
                {
                    poseController.setOutputChannels({ rotation: true, translation: true, scale: true });
                }
                else
                {
                    poseController.setOutputChannels({ rotation: true, translation: true });
                }

                var v3Build = md.v3Build;

                for (j = 0; j < numJoints; j += 1)
                {
                    var joint = bindPoses[j];
                    var parentIndex = parents[j];
                    if (parentIndex !== -1)
                    {
                        var parentJoint = bindPoses[parentIndex];
                        var invParent = md.m43Inverse(parentJoint);
                        joint = md.m43Mul(joint, invParent);
                    }
                    var sx, sy, sz;
                    if (hasScale)
                    {
                        sx = md.v3Length(md.m43Right(joint));
                        sy = md.v3Length(md.m43Up(joint));
                        sz = md.v3Length(md.m43At(joint));
                        md.m43SetRight(joint, md.v3ScalarMul(md.m43Right(joint), 1 / sx));
                        md.m43SetUp(joint, md.v3ScalarMul(md.m43Up(joint), 1 / sy));
                        md.m43SetAt(joint, md.v3ScalarMul(md.m43At(joint), 1 / sz));
                    }
                    var quat = md.quatFromM43(joint);
                    var pos = v3Build.call(md, joint[9], joint[10], joint[11]);

                    var scale;
                    if (hasScale)
                    {
                        scale = v3Build.call(md, sx, sy, sz);
                    }

                    poseController.setJointPose(j, quat, pos, scale);
                }
                skinnedNode.poseController = poseController;

                // If no suitable animation was found swap to poseController and drop reference to interp
                if (!interp.currentAnim)
                {
                    delete skinnedNode.animController;
                    skinnedNode.setInputController(skinnedNode.poseController);
                }
            }
        }

        scene.nodeControllers = [];
        // If there are no skinned nodes try creating some controllers to update nodes. Note these will work
        // to drive the animations even when no nodes are present
        if (scene.skinnedNodes.length === 0)
        {
            for (a in animations)
            {
                if (animations.hasOwnProperty(a))
                {
                    anim = animations[a];
                    interp = InterpolatorController.create(anim.hierarchy);
                    interp.setAnimation(anim, true);
                    nodeController = NodeTransformController.create(anim.hierarchy, scene);
                    nodeController.setInputController(interp);
                    scene.nodeControllers.push(nodeController);
                }
            }
        }

        var globalLights = scene.getGlobalLights();
        var numGlobalLights = globalLights.length;
        for (var g = 0; g < numGlobalLights; g += 1)
        {
            var globalLight = globalLights[g];
            if (globalLight.ambient)
            {
                vi.renderer.setAmbientColor(globalLight.color);
                break;
            }
        }

        vi.renderer.setDefaultTexture(tm.get("default"));

        if (scene.loadMaterial(gd, tm, em, "debugNormalsMaterial", materialData.debugNormalsMaterial))
        {
            scene.getMaterial("debugNormalsMaterial").reference.add();
            materialData.debugNormalsMaterial.loaded = true;
        }
        if (scene.loadMaterial(gd, tm, em, "debugLinesNormalsMaterial", materialData.debugLinesNormalsMaterial))
        {
            scene.getMaterial("debugLinesNormalsMaterial").reference.add();
            materialData.debugLinesNormalsMaterial.loaded = true;
        }
        if (scene.loadMaterial(gd, tm, em, "debugTangentsMaterial", materialData.debugTangentsMaterial))
        {
            scene.getMaterial("debugTangentsMaterial").reference.add();
            materialData.debugTangentsMaterial.loaded = true;
        }
        if (scene.loadMaterial(gd, tm, em, "debugLinesTangentsMaterial", materialData.debugLinesTangentsMaterial))
        {
            scene.getMaterial("debugLinesTangentsMaterial").reference.add();
            materialData.debugLinesTangentsMaterial.loaded = true;
        }
        if (scene.loadMaterial(gd, tm, em, "debugBinormalsMaterial", materialData.debugBinormalsMaterial))
        {
            scene.getMaterial("debugBinormalsMaterial").reference.add();
            materialData.debugBinormalsMaterial.loaded = true;
        }
        if (scene.loadMaterial(gd, tm, em, "debugLinesBinormalsMaterial", materialData.debugLinesBinormalsMaterial))
        {
            scene.getMaterial("debugLinesBinormalsMaterial").reference.add();
            materialData.debugLinesBinormalsMaterial.loaded = true;
        }

        if (physicsManager.physicsNodes.length >= 0)
        {
            // Floor is represented by a plane shape
            var floorShape = pd.createPlaneShape({
                    normal : md.v3Build(0, 1, 0),
                    distance : 0,
                    margin : 0.001
                });

            var extents = scene.getExtents();

            var floorObject = pd.createCollisionObject({
                    shape : floorShape,
                    transform : md.m43BuildTranslation(extents[0], extents[1], extents[2]),
                    friction : 0.5,
                    restitution : 0.3,
                    group: pd.FILTER_STATIC,
                    mask: pd.FILTER_ALL
                });

            // Adds the floor collision object to the world
            dw.addCollisionObject(floorObject);
        }

        sceneLoaded = true;

        jQuery(function ($j) {
            $j('#loading').toggle();
        });
    }

    vi.load = function viewerLoadFn(assetPath, append, onload)
    {
        jQuery(function ($j) {
            $j('#loading').toggle();
        });

        sceneLoaded = false;

        if (!append)
        {
            scene.clear();
        }

        var loadSceneFinished;
        if (onload)
        {
            loadSceneFinished = function (scene)
            {
                loadSceneFinishedFn(scene);
                onload(scene);
            };
        }
        else
        {
            loadSceneFinished = loadSceneFinishedFn;
        }

        var sceneReceived = function sceneReceivedFn(sceneData)
        {
            var checkMapping = function checkMappingFn()
            {
                if (urlRemappingReceived)
                {
                    // If we were supplied an animation manager let that load any animations from the resolved data
                    animationManager.loadData(sceneData);

                    tm.loadArchive(assetPath + ".images.tar");

                    var yieldFn = function sceneLoadYieldFn(callback)
                    {
                        tz.setTimeout(callback, 0);
                    };

                    scene.load({
                            data : sceneData,
                            graphicsDevice : gd,
                            mathDevice : md,
                            physicsDevice : pd,
                            textureManager : tm,
                            effectManager : em,
                            baseScene : baseMaterialsScene,
                            append : append,
                            keepLights : true,
                            yieldFn : yieldFn,
                            onload : loadSceneFinished,
                            physicsManager : physicsManager,
                            keepVertexData : true
                        });
                }
                else
                {
                    window.setTimeout(checkMappingFn, 100);
                }
            };
            checkMapping();
        };

        function loadResolve(text)
        {
            var sceneData = {};
            if (text)
            {
                sceneData = JSON.parse(text);
            }
            var resourceLoader = ResourceLoader.create();
            resourceLoader.resolve({
                data : sceneData,
                append : false,
                requestHandler: rh,
                onload : sceneReceived
            });
        }
        request(assetPath, loadResolve);
    };

    var clearColor = [0.95, 0.95, 1.0, 0.0];
    var previousFrameTime = 0;
    var nextUpdateTime = 0;
    vi.doUpdate = true;
    vi.drawInterpolators = true;
    vi.drawSkeleton = true;
    vi.drawLights = true;
    vi.drawPortals = false;
    vi.drawPhysicsGeometry = false;
    vi.drawPhysicsExtents = false;
    vi.drawOpaqueNodesExtents = false;
    vi.drawSceneNodeHierarchy = false;
    vi.drawNormals = false;
    vi.drawTangents = false;
    vi.drawBinormals = false;
    vi.isDefaultWireframeOn = false;
    vi.isBlueprintWireframeOn = false;
    vi.isDebugTangentsOn = false;
    vi.isDebugNormalsOn = false;
    vi.isDebugBinormalsOn = false;
    vi.drawAreasExtents = false;
    vi.animScale = 1;
    vi.movementScale = 1;
    vi.normalsScale = 1;

    if (gd.beginFrame())
    {
        gd.clear(clearColor, 1.0, 0);
        gd.endFrame();
    }

    function drawDebugCB()
    {
        if (vi.prevDrawNormals !== vi.drawNormals ||
            vi.prevDrawTangents !== vi.drawTangents ||
            vi.prevDrawBinormals !== vi.drawBinormals ||
            vi.normalsScale !== vi.prevNormalsScale)
        {
            vi.prevDrawNormals = vi.drawNormals;
            vi.prevDrawTangents = vi.drawTangents;
            vi.prevDrawBinormals = vi.drawBinormals;
            vi.prevNormalsScale = vi.normalsScale;

            scene.updateNormals(gd,
                                vi.normalsScale,
                                vi.drawNormals, scene.getMaterial("debugLinesNormalsMaterial"),
                                vi.drawTangents, scene.getMaterial("debugLinesTangentsMaterial"),
                                vi.drawBinormals, scene.getMaterial("debugLinesBinormalsMaterial"));
        }

        // TODO: draw the hierarchies at the correct positions
        if (vi.drawInterpolators)
        {
            var nodeControllers = scene.nodeControllers;
            var numNodeControllers = nodeControllers.length;
            for (var i = 0; i < numNodeControllers; i += 1)
            {
                var nodeController = nodeControllers[i];
                var interp = nodeController.inputController;
                var hierarchy = interp.currentAnim.hierarchy;
                scene.drawAnimationHierarchy(gd, sm, camera,
                                             hierarchy,
                                             hierarchy.numNodes,
                                             interp);
            }
        }

        if (vi.drawSkeleton)
        {
            var skinnedNodes = scene.skinnedNodes;
            var numSkins = skinnedNodes.length;
            for (var skin = 0; skin < numSkins; skin += 1)
            {
                var skinnedNode = skinnedNodes[skin];
                var controller = skinnedNode.skinController;
                var nodeTM = skinnedNode.node.world;
                scene.drawAnimationHierarchy(gd, sm, camera,
                                             controller.skeleton,
                                             controller.skeleton.numNodes,
                                             controller.inputController,
                                             nodeTM);
            }
        }

        if (vi.drawLights)
        {
            scene.drawLights(gd, sm, camera);
        }

        if (vi.drawPortals)
        {
            scene.drawPortals(gd, sm, camera);
        }

        if (vi.drawAreasExtents)
        {
            scene.drawAreas(gd, sm, camera);
        }

        if (vi.drawPhysicsGeometry)
        {
            scene.drawPhysicsGeometry(gd, sm, camera, physicsManager);
        }

        if (vi.drawPhysicsExtents)
        {
            scene.drawPhysicsNodes(gd, sm, camera, physicsManager);
        }

        if (vi.drawOpaqueNodesExtents)
        {
            scene.drawOpaqueNodesExtents(gd, sm, camera);
        }

        if (vi.drawSceneNodeHierarchy)
        {
            scene.drawSceneNodeHierarchy(gd, sm, camera);
        }

        floor.render(gd, camera);
    }

    function renderFrameFn()
    {
        var nodeControllers, numNodeControllers, nodeController;
        var skinnedNodes, numSkins, skinnedNode, skin;
        var i;
        var currentTime = tz.time;
        var deltaTime = (currentTime - previousFrameTime);
        if (deltaTime > 1)
        {
            deltaTime = 1;
        }
        cameraController.maxSpeed = (deltaTime * maxSpeed * vi.movementScale);

        id.update();

        cameraController.update();

        var deviceWidth = gd.width;
        var deviceHeight = gd.height;
        var aspectRatio = (deviceWidth / deviceHeight);
        if (aspectRatio !== camera.aspectRatio)
        {
            camera.aspectRatio = aspectRatio;
            camera.updateProjectionMatrix();
        }
        camera.updateViewProjectionMatrix();

        var renderer = vi.renderer;

        if (vi.doUpdate)
        {
            renderer.setGlobalLightPosition(md.v3Build((objectCenter[0] + lightRadius * Math.cos(lightAngle)),
                                                  (objectCenter[1] + lightRadius),
                                                  (objectCenter[2] + lightRadius * Math.sin(lightAngle))));

            lightAngle += deltaTime;
            if (lightAngle >= (2 * Math.PI))
            {
                lightAngle -= (2 * Math.PI);
            }

            dw.update();
            physicsManager.update(scene);

            // Update all the animations in the scene
            nodeControllers = scene.nodeControllers;
            numNodeControllers = nodeControllers.length;
            for (i = 0; i < numNodeControllers; i += 1)
            {
                nodeController = nodeControllers[i];
                nodeController.addTime(deltaTime * vi.animScale);
                nodeController.update();
            }

            skinnedNodes = scene.skinnedNodes;
            numSkins = skinnedNodes.length;
            for (skin = 0; skin < numSkins; skin += 1)
            {
                skinnedNode = skinnedNodes[skin];
                if (vi.drawSkinBindPose || !skinnedNode.animController ||
                    vi.drawNormals ||
                    vi.drawTangents ||
                    vi.drawBinormals)
                {
                    skinnedNode.skinController.setInputController(skinnedNode.poseController);
                }
                else
                {
                    skinnedNode.skinController.setInputController(skinnedNode.animController);
                }
                skinnedNode.addTime(deltaTime * vi.animScale);
                skinnedNode.update();
            }

            if (currentTime >= nextUpdateTime)
            {
                nextUpdateTime = (currentTime + 1.0);
                renderer.updateShader(sm);
            }

            scene.update();

            renderer.update(gd, camera, scene, currentTime);
        }

        if (gd.beginFrame())
        {
            if (renderer.updateBuffers(gd, deviceWidth, deviceHeight))
            {
                renderer.draw(gd, clearColor, null, null, drawDebugCB);
            }

            gd.endFrame();
        }

        vi.fps = gd.fps;

        previousFrameTime = currentTime;
    }

    var intervalID;

    function loadingLoopFn()
    {
        var deviceWidth = gd.width;
        var deviceHeight = gd.height;
        var aspectRatio = (deviceWidth / deviceHeight);
        if (aspectRatio !== camera.aspectRatio)
        {
            camera.aspectRatio = aspectRatio;
            camera.updateProjectionMatrix();
        }
        camera.updateViewProjectionMatrix();

        if (gd.beginFrame())
        {
            gd.clear(clearColor, 1.0, 0);

            floor.render(gd, camera);

            gd.endFrame();
        }

        if (sceneLoaded)
        {
            window.clearInterval(intervalID);

            intervalID = window.setInterval(renderFrameFn, 1000 / 60);
        }
    }

    intervalID = window.setInterval(loadingLoopFn, 1000 / 30);

    vi.reloadTextures = function viewerreloadTexturesFn()
    {
        nextUpdateTime = 0;
        tm.reloadAll();
    };

    vi.reloadShaders = function viewerreloadShadersFn()
    {
        nextUpdateTime = 0;
        sm.reloadAll();
    };

    vi.destroy = function destroyFn()
    {
        window.clearInterval(intervalID);
        sceneLoaded = false;
        physicsManager = null;
        vi.renderer = null;
        vi.scene = null;
        if (scene)
        {
            scene.destroy();
            scene = null;
        }
        em = null;
        sm = null;
        tm = null;
        floor = null;
        cameraController = null;
        camera = null;
        tz.flush();
        pd = null;
        id = null;
        gd = null;
        md = null;
    };


    vi.hasNodeSemantic = function hasNodeSemantic(node, semanticCondition)
    {
        if (node.hasRenderables())
        {
            var numRenderables = node.renderables.length;
            for (var r = 0; r < numRenderables; r += 1)
            {
                var renderable = node.renderables[r];
                if (renderable.geometry)
                {
                    var geometry = renderable.geometry;
                    var semantics = geometry.semantics;
                    var numSemantics = semantics.length;
                    for (var i = 0; i < numSemantics; i += 1)
                    {
                        if (semantics[i] === semanticCondition)
                        {
                            return true;
                        }
                    }
                }
            }
        }
        return vi.hasChildrenNodesSemantic(node, semanticCondition);
    };

    vi.hasChildrenNodesSemantic = function hasChildrenNodesSemantic(node, semanticCondition)
    {
        var children = node.children;

        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                var child = children[c];
                if (vi.hasNodeSemantic(child, semanticCondition))
                {
                    return true;
                }
            }
        }

        return false;

    };

    vi.convertSemantic = function convertSemanticFn(checkSemanticsString)
    {
        var semanticCondition;
        if (checkSemanticsString === "SEMANTIC_NORMAL")
        {
            semanticCondition = gd.SEMANTIC_NORMAL;
        }
        else if (checkSemanticsString === "SEMANTIC_TANGENT")
        {
            semanticCondition = gd.SEMANTIC_TANGENT;
        }
        else if (checkSemanticsString === "SEMANTIC_BINORMAL")
        {
            semanticCondition = gd.SEMANTIC_BINORMAL;
        }
        else
        {
            return null;
        }
        return semanticCondition;
    };

    vi.hasSemantic = function hasSemanticFn(checkSemanticsString)
    {
        var sceneNodes = scene.rootNodes;
        var semanticCondition = vi.convertSemantic(checkSemanticsString);

        var numNodes = sceneNodes.length;
        for (var n = 0; n < numNodes; n += 1)
        {
            var node = sceneNodes[n];
            if (vi.hasNodeSemantic(node, semanticCondition))
            {
                return true;
            }
        }
        return false;

    };

    function setNodeHierarchyMaterialFn(materialName, node, checkSemanticsString)
    {
        var children = node.children;

        if (node.hasRenderables())
        {
            var semanticCondition;
            semanticCondition = vi.convertSemantic(checkSemanticsString);

            var numRenderables = node.renderables.length;
            for (var r = 0; r < numRenderables; r += 1)
            {
                var renderable = node.renderables[r];
                if (renderable.geometry)
                {
                    var geometry = renderable.geometry;
                    var semantics = geometry.semantics;
                    var numSemantics = semantics.length;
                    for (var i = 0; i < numSemantics; i += 1)
                    {
                        if (!semanticCondition || semantics[i] === semanticCondition)
                        {
                            if (materialName && !renderable.lastMaterial)
                            {
                                //changing node to new material
                                renderable.lastMaterial = renderable.getMaterial();
                                renderable.lastMaterial.reference.add();
                                renderable.setMaterial(scene.getMaterial(materialName));
                            }

                            else if (materialName === null)
                            {
                                if (renderable.lastMaterial)
                                {
                                    // restoring node's old material
                                    renderable.setMaterial(renderable.lastMaterial);
                                    renderable.lastMaterial.reference.remove();
                                    delete renderable.lastMaterial;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                var child = children[c];
                setNodeHierarchyMaterialFn(materialName, child, checkSemanticsString);
            }
        }
    }

    vi.enableDebugShader = function enableDebugShaderFn(choiceString)
    {
        var node, numNodes, n;
        var sceneNodes = scene.rootNodes;
        var checkSemantics, materialName;

        if (vi.isDebugTangentsOn || vi.isDebugBinormalsOn || vi.isDebugNormalsOn)
        {
            vi.isDebugTangentsOn = false;
            vi.isDebugBinormalsOn = false;
            vi.isDebugNormalsOn = false;

            numNodes = sceneNodes.length;
            for (n = 0; n < numNodes; n += 1)
            {
                node = sceneNodes[n];
                setNodeHierarchyMaterialFn(null, node, checkSemantics);
            }
        }

        if (choiceString === "enableDebugNormals")
        {
            checkSemantics = "SEMANTIC_NORMAL";
            materialName = "debugNormalsMaterial";
            vi.isDebugNormalsOn = true;
        }
        else if (choiceString === "enableDebugBinormals")
        {
            checkSemantics = "SEMANTIC_BINORMAL";
            materialName = "debugBinormalsMaterial";
            vi.isDebugBinormalsOn = true;
        }
        else if (choiceString === "enableDebugTangents")
        {
            checkSemantics = "SEMANTIC_TANGENT";
            materialName = "debugTangentsMaterial";
            vi.isDebugTangentsOn = true;
        }

        var material = materialData[materialName];

        if (material && material.loaded)
        {
            numNodes = sceneNodes.length;
            for (n = 0; n < numNodes; n += 1)
            {
                node = sceneNodes[n];
                setNodeHierarchyMaterialFn(materialName, node, checkSemantics);
            }
        }
    };

    vi.removeDebugShaders = function removeDebugShadersFn()
    {
        var node, numNodes, n;
        var sceneNodes = scene.rootNodes;

        vi.isDebugBinormalsOn = false;
        vi.isDebugNormalsOn = false;
        vi.isDebugTangentsOn = false;

        numNodes = sceneNodes.length;
        for (n = 0; n < numNodes; n += 1)
        {
            node = sceneNodes[n];
            setNodeHierarchyMaterialFn(null, node, null);
        }

    };

    vi.enableWireframe = function enableWireframeFn(choiceString)
    {
        var wireframeInfo = {
            wireColor : null,
            fillColor : null,
            alphaRef  : null
        };

        vi.isDefaultWireframeOn = false;
        vi.isBlueprintWireframeOn = false;

        if (choiceString === "enableDefaultWireframe")
        {
            vi.isDefaultWireframeOn = true;
            wireframeInfo.wireColor = md.v4Build(0, 0, 0, 1); //choose color for the wireframe lines
            wireframeInfo.fillColor = md.v4Build(1, 1, 1, 0); //choose color for the interior of the polygons,
                                                        //leave alpha as zero to allow removing interior of polygons
            wireframeInfo.alphaRef = 0.35; //set to greater than zero (e.g. 0.1) to remove interior of polygons
        }
        else if (choiceString === "enableBlueprintWireframe")
        {
            vi.isBlueprintWireframeOn = true;
            wireframeInfo.wireColor = md.v4Build(1, 1, 1, 1);
            wireframeInfo.fillColor = md.v4Build(0, 0.2, 0.6, 0);
            wireframeInfo.alphaRef = 0;
        }

        if (vi.isDefaultWireframeOn || vi.isBlueprintWireframeOn)
        {
            vi.renderer.setWireframe(true, wireframeInfo);
        }
    };

    vi.deselectWireframe = function deselectWireframeFn()
    {
        vi.isDefaultWireframeOn = false;
        vi.isBlueprintWireframeOn = false;

        vi.renderer.setWireframe(false, null);
    };

    return vi;

};
