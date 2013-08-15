// Copyright (c) 2009-2012 Turbulenz Limited

//
// ForwardRendering
//
/*global ShadowMapping: false, VMath: false, Effect: false,
         renderingCommonCreateRendererInfoFn: false,  renderingCommonGetTechniqueIndexFn: false,
         renderingCommonSortKeyFn: false*/

function ForwardRendering() {}

ForwardRendering.prototype =
{
    version : 1,

    minPixelCount: 256,

    updateShader: function forwardRenderingUpdateShaderFn(shaderManager)
    {
        var shader = shaderManager.get("shaders/zonly.cgfx");
        if (shader !== this.zonlyShader)
        {
            this.zonlyShader = shader;
            this.zonlyRigidTechnique = shader.getTechnique("rigid");
            this.zonlySkinnedTechnique = shader.getTechnique("skinned");
            this.zonlyRigidAlphaTechnique = shader.getTechnique("rigid_alphatest");
            this.zonlySkinnedAlphaTechnique = shader.getTechnique("skinned_alphatest");
            this.zonlyRigidNoCullTechnique = shader.getTechnique("rigid_nocull");
            this.zonlySkinnedNoCullTechnique = shader.getTechnique("skinned_nocull");
            this.stencilSetTechnique = shader.getTechnique("stencil_set");
            this.stencilClearTechnique = shader.getTechnique("stencil_clear");
            this.stencilSetSpotLightTechnique = shader.getTechnique("stencil_set_spotlight");
            this.stencilClearSpotLightTechnique = shader.getTechnique("stencil_clear_spotlight");
        }

        shader = shaderManager.get("shaders/forwardrendering.cgfx");
        if (shader !== this.forwardShader)
        {
            this.forwardShader = shader;
            this.skyboxTechnique = shader.getTechnique("skybox");
            this.ambientRigidTechnique = shader.getTechnique("ambient");
            this.ambientSkinnedTechnique = shader.getTechnique("ambient_skinned");
            this.ambientGlowmapRigidTechnique = shader.getTechnique("ambient_glowmap");
            this.ambientGlowmapSkinnedTechnique = shader.getTechnique("ambient_glowmap_skinned");
            this.glowmapRigidTechnique = shader.getTechnique("glowmap");
            this.glowmapSkinnedTechnique = shader.getTechnique("glowmap_skinned");
        }

        var shadowMaps = this.shadowMaps;
        if (shadowMaps)
        {
            shadowMaps.updateShader(shaderManager);
        }
    },

    createRendererInfo : function createRendererInfoFn(renderable)
    {
        var rendererInfo = renderingCommonCreateRendererInfoFn(renderable);
        renderable.rendererInfo = rendererInfo;
        var meta = renderable.sharedMaterial.meta;

        rendererInfo.far = meta.far;

        var sharedMaterialTechniqueParameters = renderable.sharedMaterial.techniqueParameters;
        if (!(sharedMaterialTechniqueParameters.env_map &&
              !sharedMaterialTechniqueParameters.normal_map))
        {   //not skybox
            if (!sharedMaterialTechniqueParameters.materialColor &&
                !renderable.techniqueParameters.materialColor)
            {
                renderable.techniqueParameters.materialColor = this.v4One;
            }
        }

        return rendererInfo;
    },

    sortRenderablesAndLights: function forwardRenderingSortRenderablesAndLightsFn(camera, scene)
    {
        var pointLights = this.pointLights;
        var spotLights = this.spotLights;
        var directionalLights = this.directionalLights;

        var numPoint = 0;
        var numSpot = 0;
        var numDirectional = 0;
        var index;
        var passes = this.passes;
        var numPasses = this.numPasses;
        for (index = 0; index < numPasses; index += 1)
        {
            passes[index] = [];
        }

        var visibleRenderables = scene.getCurrentVisibleRenderables();
        this.visibleRenderables = visibleRenderables;
        var numVisibleRenderables = visibleRenderables.length;
        if (numVisibleRenderables > 0)
        {
            var n, renderable, rendererInfo, pass, passIndex;
            var drawParametersArray, numDrawParameters, drawParametersIndex, drawParameters, sortDistance;
            var transparentPassIndex = this.passIndex.transparent;
            var fillZPassIndex = this.passIndex.fillZ;
            var maxDistance = scene.maxDistance;
            var invMaxDistance = (0.0 < maxDistance ? (1.0 / maxDistance) : 0.0);
            n = 0;
            do
            {
                renderable = visibleRenderables[n];

                rendererInfo = renderable.rendererInfo;
                if (!rendererInfo)
                {
                    rendererInfo = this.createRendererInfo(renderable);
                }

                if (rendererInfo.far)
                {
                    renderable.distance = 1.e38;
                }

                rendererInfo.renderUpdate.call(renderable, camera);

                drawParametersArray = renderable.drawParameters;
                numDrawParameters = drawParametersArray.length;

                sortDistance = renderable.distance;
                if (0.0 < sortDistance)
                {
                    sortDistance *= invMaxDistance;
                    // Make sure it is lower than 1.0 to avoid changing the integer part of sortKey
                    if (0.999 < sortDistance)
                    {
                        sortDistance = 0.999;
                    }
                }
                else
                {
                    // Make sure it is positive to avoid changing the integer part of sortKey
                    sortDistance = 0;
                }

                for (drawParametersIndex = 0; drawParametersIndex < numDrawParameters; drawParametersIndex += 1)
                {
                    drawParameters = drawParametersArray[drawParametersIndex];
                    passIndex = drawParameters.userData.passIndex;
                    if (passIndex === transparentPassIndex)
                    {
                        drawParameters.sortKey = sortDistance;
                    }
                    else if (passIndex === fillZPassIndex)
                    {
                        /*jslint bitwise:false*/
                        drawParameters.sortKey = ((drawParameters.sortKey | 0) + sortDistance);
                        /*jslint bitwise:true*/
                    }
                    pass = passes[passIndex];
                    pass[pass.length] = drawParameters;
                }

                n += 1;
            }
            while (n < numVisibleRenderables);
        }

        var visibleLights = scene.getCurrentVisibleLights();
        var numVisibleLights = visibleLights.length;
        var lightInstance, light, l;
        if (numVisibleLights)
        {
            l = 0;
            do
            {
                lightInstance = visibleLights[l];

                light = lightInstance.light;
                if (light)
                {
                    if (light.global)
                    {
                        continue;
                    }

                    if (light.spot)
                    {
                        spotLights[numSpot] = lightInstance;
                        numSpot += 1;
                    }
                    else if (!light.fog) // this renderer does not support fog lights yet
                    {
                        // this includes local ambient lights
                        pointLights[numPoint] = lightInstance;
                        numPoint += 1;
                    }
                }

                l += 1;
            }
            while (l < numVisibleLights);
        }

        var globalLights = scene.getGlobalLights();
        var numGlobalLights = globalLights.length;
        if (numGlobalLights)
        {
            l = 0;
            do
            {
                light = globalLights[l];
                if (light && !light.disabled && light.directional)
                {
                    directionalLights[numDirectional] = light;
                    numDirectional += 1;
                }

                l += 1;
            }
            while (l < numGlobalLights);
        }

        // Clear remaining deleted lights from the last frame
        directionalLights.length = numDirectional;
        pointLights.length = numPoint;
        spotLights.length = numSpot;

    },

    //TODO name.
    lightFindVisibleRenderables: function lightFindVisibleRenderablesFn(lightInstance, scene)
    {
        var origin, overlappingRenderables, numOverlappingRenderables;
        var overlapQueryRenderables, numOverlapQueryRenderables, renderable;
        var n, meta, extents, lightFrameVisible;
        var node, light;
        var shadowMaps = this.shadowMaps;

        node = lightInstance.node;
        light = lightInstance.light;

        extents = lightInstance.getWorldExtents();

        lightFrameVisible = lightInstance.frameVisible;

        overlapQueryRenderables = [];

        overlappingRenderables = lightInstance.overlappingRenderables;

        if (node.dynamic ||
            lightInstance.staticNodesChangeCounter !== scene.staticNodesChangeCounter)
        {
            var md = this.md;
            var matrix = node.world;
            var lightOrigin = light.origin;
            if (lightOrigin)
            {
                origin = md.m43TransformPoint(matrix, lightOrigin);
            }
            else
            {
                origin = md.m43Pos(matrix);
            }
            lightInstance.lightOrigin = origin;

            if (!overlappingRenderables)
            {
                overlappingRenderables = [];
                lightInstance.overlappingRenderables = overlappingRenderables;
            }
            numOverlappingRenderables = 0;

            lightInstance.staticNodesChangeCounter = scene.staticNodesChangeCounter;

            scene.findStaticOverlappingRenderables(origin, extents, overlapQueryRenderables);
            numOverlapQueryRenderables = overlapQueryRenderables.length;
            for (n = 0; n < numOverlapQueryRenderables; n += 1)
            {
                renderable = overlapQueryRenderables[n];
                meta = renderable.sharedMaterial.meta;
                if (!meta.transparent && !meta.decal && !meta.far)
                {
                    overlappingRenderables[numOverlappingRenderables] = renderable;
                    renderable.getWorldExtents();
                    numOverlappingRenderables += 1;
                }
            }
            overlapQueryRenderables.length = 0;

            overlappingRenderables.length = numOverlappingRenderables;
            lightInstance.numStaticOverlappingRenderables = numOverlappingRenderables;
        }
        else
        {
            origin = lightInstance.lightOrigin;
            numOverlappingRenderables = lightInstance.numStaticOverlappingRenderables;
        }

        // Query the dynamic renderables from the scene and filter out non lit geometries
        scene.findDynamicOverlappingRenderables(origin, extents, overlapQueryRenderables);
        numOverlapQueryRenderables = overlapQueryRenderables.length;
        for (n = 0; n < numOverlapQueryRenderables; n += 1)
        {
            renderable = overlapQueryRenderables[n];
            meta = renderable.sharedMaterial.meta;
            if (!meta.transparent && !meta.decal && !meta.far)
            {
                overlappingRenderables[numOverlappingRenderables] = renderable;
                numOverlappingRenderables += 1;
            }
        }
        overlapQueryRenderables = null;

        // Build a list of the geometries which are visible this frame, note we compare renderable.frameVisible against
        // lightFrameVisible which is the frame on which the light was last visible, since we're processing the
        // light that number must be the current frame
        lightInstance.diffuseDrawParametersQueue = [];
        var diffuseDrawParametersQueue = lightInstance.diffuseDrawParametersQueue;

        var drawParameterIndex, numDrawParameters, drawParametersArray;
        var numVisibleDrawParameters = 0;

        var usingShadows = false;
        if (shadowMaps && light.shadows)
        {
            shadowMaps.findVisibleRenderables(lightInstance);

            var shadowRenderables = lightInstance.shadowRenderables;
            usingShadows = (shadowRenderables && shadowRenderables.length);
        }

        for (n = 0; n < numOverlappingRenderables; n += 1)
        {
            renderable = overlappingRenderables[n];
            if (renderable.frameVisible === lightFrameVisible &&
                !renderable.disabled &&
                !renderable.node.disabled)
            {
                if (usingShadows)
                {
                    drawParametersArray = renderable.diffuseShadowDrawParameters;
                }
                else
                {
                    drawParametersArray = renderable.diffuseDrawParameters;
                }
                numDrawParameters = drawParametersArray.length;
                for (drawParameterIndex = 0; drawParameterIndex < numDrawParameters; drawParameterIndex += 1)
                {
                    diffuseDrawParametersQueue[numVisibleDrawParameters] = drawParametersArray[drawParameterIndex];
                    numVisibleDrawParameters += 1;
                }
            }
        }

        return (0 < numVisibleDrawParameters);
    },

    directionalLightsUpdateVisibleRenderables : function directionalLightsUpdateVisibleRenderablesFn(scene)
    {
        this.diffuseDrawParametersQueue = [];
        var diffuseDrawParametersQueue = this.diffuseDrawParametersQueue;
        var visibleRenderables = this.visibleRenderables;
        var numVisibleRenderables = visibleRenderables.length;

        var drawParameterIndex, numDrawParameters, drawParametersArray;
        var numVisibleDrawParameters = 0;
        var n, renderable;

        for (n = 0; n < numVisibleRenderables; n += 1)
        {
            renderable = visibleRenderables[n];
            if (!renderable.disabled &&
                !renderable.node.disabled)
            {
                drawParametersArray = renderable.diffuseDrawParameters;
                if (drawParametersArray)
                {
                    numDrawParameters = drawParametersArray.length;
                    for (drawParameterIndex = 0; drawParameterIndex < numDrawParameters; drawParameterIndex += 1)
                    {
                        diffuseDrawParametersQueue[numVisibleDrawParameters] = drawParametersArray[drawParameterIndex];
                        numVisibleDrawParameters += 1;
                    }
                }
            }
        }

        return (0 < numVisibleDrawParameters);
    },

    update: function forwardRenderingUpdateFn(gd, camera, scene, currentTime)
    {
        this.camera = camera;
        this.globalCameraMatrix = camera.matrix;

        scene.updateVisibleNodes(camera);
        this.sceneExtents = scene.extents.slice();

        this.sortRenderablesAndLights(camera, scene);

        var md = this.md;
        var m43InverseTransposeProjection = md.m43InverseTransposeProjection;
        var m43Mul = md.m43Mul;
        var m43TransformPoint = md.m43TransformPoint;
        var m43Pos = md.m43Pos;
        var v3Build = md.v3Build;
        var v4Build = md.v4Build;

        var viewProjectionMatrix = camera.viewProjectionMatrix;
        var viewMatrix = camera.viewMatrix;
        var globalTechniqueParameters = this.globalTechniqueParameters;
        globalTechniqueParameters.viewProjection = viewProjectionMatrix;
        globalTechniqueParameters.eyePosition = md.m43Pos(camera.matrix, globalTechniqueParameters.eyePosition);
        globalTechniqueParameters.time = currentTime;

        var maxDepth = (scene.maxDistance + camera.nearPlane);
        var maxDepthReciprocal = (1.0 / maxDepth);
        globalTechniqueParameters.viewDepth = md.v4Build(-viewMatrix[2]  * maxDepthReciprocal,
                                                         -viewMatrix[5]  * maxDepthReciprocal,
                                                         -viewMatrix[8]  * maxDepthReciprocal,
                                                         -viewMatrix[11] * maxDepthReciprocal,
                                                         globalTechniqueParameters.viewDepth);

        var globalLights = scene.globalLights;
        var numGlobalLights = globalLights.length;
        var ambientColorR = 0, ambientColorG = 0, ambientColorB = 0;
        var globalLight, globalLightColor;
        var g;
        for (g = 0; g < numGlobalLights; g += 1)
        {
            globalLight = globalLights[g];
            if (!globalLight.disabled)
            {
                if (globalLight.ambient)
                {
                    globalLightColor = globalLight.color;
                    ambientColorR += globalLightColor[0];
                    ambientColorG += globalLightColor[1];
                    ambientColorB += globalLightColor[2];
                }
            }
        }

        if (ambientColorR || ambientColorG || ambientColorB)
        {
            var lightingScale = this.globalTechniqueParameters.lightingScale;
            this.ambientColor = v3Build.call(md,
                                        (lightingScale * ambientColorR),
                                        (lightingScale * ambientColorG),
                                        (lightingScale * ambientColorB),
                                        this.ambientColor);
        }
        else
        {
            delete this.ambientColor;
        }

        var l, node, light, lightInstance, matrix, techniqueParameters, origin, halfExtents, worldView;
        var lightViewInverseTranspose;
        var lightFindVisibleRenderables = this.lightFindVisibleRenderables;

        var pointInstances = this.pointLights;
        var numPointInstances = pointInstances.length;
        if (numPointInstances)
        {

            l = 0;
            do
            {
                lightInstance = pointInstances[l];
                node = lightInstance.node;
                light = lightInstance.light;
                lightInstance.shadows = false;

                if (lightFindVisibleRenderables.call(this, lightInstance, scene))
                {
                    matrix = node.world;
                    techniqueParameters = lightInstance.techniqueParameters;
                    if (!techniqueParameters)
                    {
                        techniqueParameters = gd.createTechniqueParameters();
                        lightInstance.techniqueParameters = techniqueParameters;
                    }

                    origin = light.origin;

                    worldView = m43Mul.call(md, matrix, viewMatrix, worldView);

                    if (origin)
                    {
                        techniqueParameters.lightOrigin = m43TransformPoint.call(md, worldView, origin, techniqueParameters.lightOrigin);
                    }
                    else
                    {
                        techniqueParameters.lightOrigin = m43Pos.call(md, worldView, techniqueParameters.lightOrigin);
                    }
                    techniqueParameters.lightColor = light.color;

                    lightViewInverseTranspose = m43InverseTransposeProjection.call(md, worldView, light.halfExtents,
                                                                                   techniqueParameters.lightViewInverseTranspose);
                    techniqueParameters.lightFalloff = v4Build.call(md,
                                                                    lightViewInverseTranspose[8],
                                                                    lightViewInverseTranspose[9],
                                                                    lightViewInverseTranspose[10],
                                                                    lightViewInverseTranspose[11],
                                                                    techniqueParameters.lightFalloff);
                    lightViewInverseTranspose[8] = 0;
                    lightViewInverseTranspose[9] = 0;
                    lightViewInverseTranspose[10] = 0;
                    lightViewInverseTranspose[11] = 1.0;
                    techniqueParameters.lightViewInverseTranspose = lightViewInverseTranspose;

                    l += 1;
                }
                else
                {
                    numPointInstances -= 1;
                    if (l < numPointInstances)
                    {
                        pointInstances[l] = pointInstances[numPointInstances];
                    }
                    else
                    {
                        break;
                    }
                }
            }
            while (l < numPointInstances);

            if (numPointInstances < pointInstances.length)
            {
                pointInstances.length = numPointInstances;
            }
        }

        var directionalLights = this.directionalLights;
        var numDirectionalLights = directionalLights.length;
        if (numDirectionalLights)
        {
            if (this.directionalLightsUpdateVisibleRenderables())
            {
                techniqueParameters = this.directionalLightsTechniqueParameters;
                var extents = scene.extents;
                halfExtents = v3Build.call(md, extents[3] - extents[0],
                                               extents[4] - extents[1],
                                               extents[5] - extents[2]);
                this.sceneDirectionalLightDistance = ((extents[3] - extents[0]) +
                                                      (extents[4] - extents[1]) +
                                                      (extents[5] - extents[2])) * 1e6;

                lightViewInverseTranspose = m43InverseTransposeProjection.call(md, viewMatrix, halfExtents,
                                                                               techniqueParameters.lightViewInverseTranspose);

                techniqueParameters.lightFalloff = v4Build.call(md,
                                                                lightViewInverseTranspose[8],
                                                                lightViewInverseTranspose[9],
                                                                lightViewInverseTranspose[10],
                                                                lightViewInverseTranspose[11],
                                                                techniqueParameters.lightFalloff);
                lightViewInverseTranspose[8] = 0;
                lightViewInverseTranspose[9] = 0;
                lightViewInverseTranspose[10] = 0;
                lightViewInverseTranspose[11] = 1.0;
                techniqueParameters.lightViewInverseTranspose = lightViewInverseTranspose;
            }
            else
            {
                directionalLights.length = 0;
            }
        }

        var spotInstances = this.spotLights;
        var numSpotInstances = spotInstances.length;
        if (numSpotInstances)
        {
            var lightView, lightViewInverse, lightProjection, lightViewInverseProjection;
            var m33MulM43 = md.m33MulM43;
            var m43Inverse = md.m43Inverse;
            var m43Transpose = md.m43Transpose;

            lightProjection = md.m43Copy(this.lightProjection);

            l = 0;
            do
            {
                lightInstance = spotInstances[l];
                node = lightInstance.node;
                light = lightInstance.light;
                lightInstance.shadows = false;

                if (lightFindVisibleRenderables.call(this, lightInstance, scene))
                {
                    matrix = node.world;
                    techniqueParameters = lightInstance.techniqueParameters;
                    if (!techniqueParameters)
                    {
                        techniqueParameters = gd.createTechniqueParameters();
                        lightInstance.techniqueParameters = techniqueParameters;
                    }

                    origin = light.origin;

                    worldView = m43Mul.call(md, matrix, viewMatrix, worldView);

                    if (origin)
                    {
                        techniqueParameters.lightOrigin = m43TransformPoint.call(md, worldView, origin, techniqueParameters.lightOrigin);
                    }
                    else
                    {
                        techniqueParameters.lightOrigin = m43Pos.call(md, worldView, techniqueParameters.lightOrigin);
                    }
                    techniqueParameters.lightColor = light.color;

                    var frustum = light.frustum;
                    var frustumNear = light.frustumNear;
                    var invFrustumNear = 1.0 / (1 - frustumNear);
                    lightView = m33MulM43.call(md, frustum, worldView, lightView);
                    lightViewInverse = m43Inverse.call(md, lightView, lightViewInverse);
                    lightProjection[8] = invFrustumNear;
                    lightProjection[11] = -(frustumNear * invFrustumNear);
                    lightViewInverseProjection = m43Mul.call(md, lightViewInverse, lightProjection, lightViewInverseProjection);
                    lightViewInverseTranspose = m43Transpose.call(md, lightViewInverseProjection, techniqueParameters.lightViewInverseTranspose);
                    techniqueParameters.lightViewInverseTranspose = lightViewInverseTranspose;
                    techniqueParameters.lightFalloff = v4Build.call(md,
                                                                    lightViewInverseTranspose[8],
                                                                    lightViewInverseTranspose[9],
                                                                    lightViewInverseTranspose[10],
                                                                    lightViewInverseTranspose[11],
                                                                    techniqueParameters.lightFalloff);
                    l += 1;
                }
                else
                {
                    numSpotInstances -= 1;
                    if (l < numSpotInstances)
                    {
                        spotInstances[l] = spotInstances[numSpotInstances];
                    }
                    else
                    {
                        break;
                    }
                }
            }
            while (l < numSpotInstances);

            if (numSpotInstances < spotInstances.length)
            {
                spotInstances.length = numSpotInstances;
            }
        }
    },

    destroyBuffers: function destroyBuffersFn()
    {
        if (this.finalRenderTarget)
        {
            this.finalRenderTarget.destroy();
            this.finalRenderTarget = null;
        }
        if (this.finalTexture)
        {
            this.finalTexture.destroy();
            this.finalTexture = null;
        }
        if (this.depthBuffer)
        {
            this.depthBuffer.destroy();
            this.depthBuffer = null;
        }
    },

    updateBuffers: function forwardRenderingUpdateBuffersFn(gd, deviceWidth, deviceHeight)
    {
        if (this.bufferWidth === deviceWidth && this.bufferHeight === deviceHeight)
        {
            return true;
        }

        this.destroyBuffers();

        this.finalTexture = gd.createTexture({
                name: "final",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.depthBuffer = gd.createRenderBuffer({
                width: deviceWidth,
                height: deviceHeight,
                format: "D24S8"
            });

        if (this.finalTexture &&
            this.depthBuffer)
        {
            this.finalRenderTarget = gd.createRenderTarget({
                    colorTexture0: this.finalTexture,
                    depthBuffer: this.depthBuffer
                });

            if (this.finalRenderTarget)
            {
                this.bufferWidth = deviceWidth;
                this.bufferHeight = deviceHeight;
                return true;
            }
        }

        this.bufferWidth = 0;
        this.bufferHeight = 0;
        this.destroyBuffers();
        return false;
    },

    fillZBuffer: function forwardRenderingFillZBufferFn(gd)
    {
        gd.drawArray(this.passes[this.passIndex.fillZ], [this.globalTechniqueParameters], -1);
    },

    drawAmbientPass: function forwardRenderingDrawAmbientPassFn(gd, ambientColor)
    {
        this.ambientTechniqueParameters.ambientColor = ambientColor;
        gd.drawArray(this.passes[this.passIndex.ambient], [this.globalTechniqueParameters, this.ambientTechniqueParameters], -1);
    },

    drawGlowPass: function forwardRenderingDrawGlowPassFn(gd)
    {
        gd.drawArray(this.passes[this.passIndex.glow], [this.globalTechniqueParameters], -1);
    },

    drawDirectionalLights: function forwardRenderingDrawDirectionalLightsFn(gd, globalTechniqueParameters, directionalLights)
    {
        var numLights = directionalLights.length;
        if (!numLights)
        {
            return;
        }

        var camera = this.camera;
        var viewMatrix = camera.viewMatrix;
        var directionalLightsTechniqueParameters = this.directionalLightsTechniqueParameters;

        var light, lightTechniqueParameters, origin;
        var md = this.md;
        var v3Normalize = md.v3Normalize;
        var v3ScalarMul = md.v3ScalarMul;
        var m43TransformPoint = md.m43TransformPoint;

        gd.clear(null, null, 1.0);

        var diffuseDrawParametersQueue = this.diffuseDrawParametersQueue;
        if (diffuseDrawParametersQueue.length)
        {
            var lightAt = md.v3BuildZero();
            var l = 0;
            do
            {
                light = directionalLights[l];
                lightTechniqueParameters = light.techniqueParameters;

                v3Normalize.call(md, light.direction, lightAt);
                origin = v3ScalarMul.call(md, lightAt, -this.sceneDirectionalLightDistance);
                lightTechniqueParameters.lightOrigin = m43TransformPoint.call(md, viewMatrix, origin, lightTechniqueParameters.lightOrigin);
                lightTechniqueParameters.lightColor = light.color;

                // force update of techniqueParameters and geometry
                gd.drawArray(diffuseDrawParametersQueue, [globalTechniqueParameters,
                                                          lightTechniqueParameters,
                                                          directionalLightsTechniqueParameters], -1);

                l += 1;
            }
            while (l < numLights);
        }
        gd.clear(null, null, 0.0);
    },

    drawShadowMaps: function drawShadowMapsFn(gd, globalTechniqueParameters, lightInstances, shadowMaps, minExtentsHigh)
    {
        var numInstances = lightInstances.length;
        if (!numInstances)
        {
            return;
        }

        var lightShadowMapDraw = shadowMaps.drawShadowMap;

        var diffuseDrawParametersQueue;
        var lightInstance, light;
        var l;
        var globalCameraMatrix = this.globalCameraMatrix;

        l = 0;
        do
        {
            lightInstance = lightInstances[l];
            diffuseDrawParametersQueue = lightInstance.diffuseDrawParametersQueue;
            if (!diffuseDrawParametersQueue.length)
            {
                l += 1;
                continue;
            }
            light = lightInstance.light;

            // TODO: pixel count test
            if (light.shadows &&
                !light.ambient)
            {
                lightShadowMapDraw.call(shadowMaps, globalCameraMatrix, minExtentsHigh, lightInstance);
            }

            l += 1;
        }
        while (l < numInstances);
    },

    drawSpotLights: function forwardRenderingDrawLightsFn(gd, globalTechniqueParameters)
    {
        var lightInstances = this.spotLights;
        var numInstances = lightInstances.length;
        if (!numInstances)
        {
            return;
        }

        var stencilSetTechnique = this.stencilSetSpotLightTechnique;
        var stencilClearTechnique = this.stencilClearSpotLightTechnique;
        var lightPrimitive = this.lightPrimitive;
        var lightSemantics = this.lightSemantics;
        var lightVolumeVertexBuffer = this.spotLightVolumeVertexBuffer;

        var viewProjectionMatrix = this.camera.viewProjectionMatrix;
        stencilSetTechnique.viewProjection = viewProjectionMatrix;
        stencilClearTechnique.viewProjection = viewProjectionMatrix;

        var setTechnique = gd.setTechnique;
        var setStream = gd.setStream;
        var draw = gd.draw;
        var diffuseDrawParametersQueue;
        var lightInstance, lightInstanceTechniqueParameters, light, lightTechniqueParameters, lightNode, lightWorld;
        var l;

        l = 0;
        do
        {
            lightInstance = lightInstances[l];

            diffuseDrawParametersQueue = lightInstance.diffuseDrawParametersQueue;
            if (!diffuseDrawParametersQueue.length)
            {
                l += 1;
                continue;
            }
            lightInstanceTechniqueParameters = lightInstance.techniqueParameters;
            light = lightInstance.light;
            lightNode = lightInstance.node;
            lightTechniqueParameters = light.techniqueParameters;
            lightWorld = lightNode.world;
            var frustum = light.frustum;

            // Draw light box to mask stencil
            setTechnique.call(gd, stencilSetTechnique);

            stencilSetTechnique.lightFrustum = frustum;
            stencilSetTechnique.world = lightWorld;
            setStream.call(gd, lightVolumeVertexBuffer, lightSemantics);
            draw.call(gd, lightPrimitive, 8);

            // force update of techniqueParameters and geometry
            gd.drawArray(diffuseDrawParametersQueue, [globalTechniqueParameters,
                                                      lightTechniqueParameters,
                                                      lightInstanceTechniqueParameters], -1);

            // Draw light box to clear stencil
            setTechnique.call(gd, stencilClearTechnique);
            stencilClearTechnique.lightFrustum = frustum;
            stencilClearTechnique.world = lightWorld;
            setStream.call(gd, lightVolumeVertexBuffer, lightSemantics);
            draw.call(gd, lightPrimitive, 8);

            l += 1;
        }
        while (l < numInstances);
    },

    drawPointLights: function forwardRenderingDrawPointLightsFn(gd, globalTechniqueParameters)
    {
        var lightInstances = this.pointLights;
        var numInstances = lightInstances.length;
        if (!numInstances)
        {
            return;
        }

        var stencilSetTechnique = this.stencilSetTechnique;
        var stencilClearTechnique = this.stencilClearTechnique;
        var lightVolumeVertexBuffer = this.pointLightVolumeVertexBuffer;
        var lightPrimitive = this.lightPrimitive;
        var lightSemantics = this.lightSemantics;
        var md = this.md;

        var viewProjectionMatrix = this.camera.viewProjectionMatrix;
        stencilSetTechnique.viewProjection = viewProjectionMatrix;
        stencilClearTechnique.viewProjection = viewProjectionMatrix;

        var setTechnique = gd.setTechnique;
        var setStream = gd.setStream;
        var draw = gd.draw;
        var drawArray = gd.drawArray;
        var m43Offset = md.m43Offset;
        var m43Scale = md.m43Scale;
        var diffuseDrawParametersQueue;
        var lightInstance, lightInstanceTechniqueParameters, light, lightTechniqueParameters, lightNode, lightWorld;
        var lightCenter, lightTransform, center;
        var l;

        l = 0;
        do
        {
            lightInstance = lightInstances[l];

            diffuseDrawParametersQueue = lightInstance.diffuseDrawParametersQueue;
            if (!diffuseDrawParametersQueue.length)
            {
                l += 1;
                continue;
            }
            lightInstanceTechniqueParameters = lightInstance.techniqueParameters;
            light = lightInstance.light;
            lightNode = lightInstance.node;
            lightTechniqueParameters = light.techniqueParameters;
            lightWorld = lightNode.world;

            center = light.center;
            if (center)
            {
                lightCenter = m43Offset.call(md, lightWorld, center, lightCenter);
                lightTransform = m43Scale.call(md, lightCenter, light.halfExtents, lightTransform);
            }
            else
            {
                lightTransform = m43Scale.call(md, lightWorld, light.halfExtents, lightTransform);
            }

            // Draw light box to mask stencil
            setTechnique.call(gd, stencilSetTechnique);

            stencilSetTechnique.world = lightTransform;
            setStream.call(gd, lightVolumeVertexBuffer, lightSemantics);
            draw.call(gd, lightPrimitive, 14);

            // force update of techniqueParameters and geometry
            drawArray.call(gd, diffuseDrawParametersQueue, [globalTechniqueParameters,
                                                            lightTechniqueParameters,
                                                            lightInstanceTechniqueParameters], -1);

            // Draw light box to clear stencil
            setTechnique.call(gd, stencilClearTechnique);
            stencilClearTechnique.world = lightTransform;
            setStream.call(gd, lightVolumeVertexBuffer, lightSemantics);
            draw.call(gd, lightPrimitive, 14);

            l += 1;
        }
        while (l < numInstances);
    },

    draw: function forwardRenderingDrawFn(gd,
                                          clearColor,
                                          drawDecalsFn,
                                          drawTransparentFn,
                                          drawDebugFn,
                                          postFXsetupFn)
    {
        var globalTechniqueParameters = this.globalTechniqueParameters;
        var ambientColor = this.ambientColor;

        // draw the shadow maps
        var shadowMaps = this.shadowMaps;
        if (shadowMaps)
        {
            var sceneExtents = this.sceneExtents;
            var minExtentsHigh = (Math.max((sceneExtents[3] - sceneExtents[0]),
                                           (sceneExtents[4] - sceneExtents[1]),
                                           (sceneExtents[5] - sceneExtents[2])) / 6);

            shadowMaps.lowIndex = 0;
            shadowMaps.highIndex = 0;
            this.drawShadowMaps(gd, globalTechniqueParameters, this.pointLights, shadowMaps, minExtentsHigh);
            this.drawShadowMaps(gd, globalTechniqueParameters, this.spotLights, shadowMaps, minExtentsHigh);
            shadowMaps.blurShadowMaps(gd);
        }

        var usingRenderTarget;
        if (postFXsetupFn)
        {
            usingRenderTarget = gd.beginRenderTarget(this.finalRenderTarget);
        }
        else
        {
            usingRenderTarget = false;
        }

        if (clearColor)
        {
            gd.clear(clearColor, 1.0, 0);
        }
        else if (ambientColor)
        {
            gd.clear(null, 1.0, 0);
        }
        else
        {
            gd.clear(this.v4Zero, 1.0, 0);
        }

        // z-only prepass
        this.fillZBuffer(gd);

        //Skybox next
        gd.drawArray(this.passes[this.passIndex.skybox], [globalTechniqueParameters], -1);

        // ambient and emissive pass
        if (clearColor &&
            (clearColor[0] ||
             clearColor[1] ||
             clearColor[2] ||
             clearColor[3]))
        {
            if (!ambientColor)
            {
                // Need to draw everything on black to cope with the external clear color
                ambientColor = this.v3Zero;
            }

            this.drawAmbientPass(gd, ambientColor);
        }
        else if (ambientColor)
        {
            this.drawAmbientPass(gd, ambientColor);
        }
        else
        {
            this.drawGlowPass(gd);
        }

        // Draw lights
        this.drawDirectionalLights(gd, globalTechniqueParameters, this.directionalLights);

        this.drawPointLights(gd, globalTechniqueParameters);
        this.drawSpotLights(gd, globalTechniqueParameters);

        // decals
        gd.drawArray(this.passes[this.passIndex.decal], [globalTechniqueParameters], -1);

        if (drawDecalsFn)
        {
            drawDecalsFn();
        }

        // transparent objects
        gd.drawArray(this.passes[this.passIndex.transparent], [globalTechniqueParameters], 1);

        if (drawTransparentFn)
        {
            drawTransparentFn();
        }

        if (drawDebugFn)
        {
            drawDebugFn();
        }

        if (usingRenderTarget)
        {
            gd.endRenderTarget();
            var finalTexture = this.finalTexture;

            postFXsetupFn(gd, finalTexture);

            gd.setStream(this.quadVertexBuffer, this.quadSemantics);
            gd.draw(this.quadPrimitive, 4);
        }
    },

    setLightingScale: function setLightingScaleFn(scale)
    {
        this.globalTechniqueParameters.lightingScale = scale;
    },

    destroy: function destroyFn()
    {
        delete this.globalTechniqueParameters;
        delete this.ambientTechniqueParameters;
        delete this.directionalLightsTechniqueParameters;
        delete this.passes;
        delete this.passIndex;

        delete this.sceneExtents;
        delete this.visibleRenderables;

        delete this.globalCameraMatrix;

        delete this.diffuseDrawParametersQueue;

        delete this.spotLights;
        delete this.pointLights;
        delete this.directionalLights;
        delete this.fogLights;

        delete this.v3Zero;
        delete this.v4Zero;
        delete this.v4One;

        delete this.lightPrimitive;
        delete this.lightSemantics;

        if (this.spotLightVolumeVertexBuffer)
        {
            this.spotLightVolumeVertexBuffer.destroy();
            delete this.spotLightVolumeVertexBuffer;
        }

        if (this.pointLightVolumeVertexBuffer)
        {
            this.pointLightVolumeVertexBuffer.destroy();
            delete this.pointLightVolumeVertexBuffer;
        }

        delete this.lightProjection;

        delete this.quadPrimitive;
        delete this.quadSemantics;

        if (this.quadVertexBuffer)
        {
            this.quadVertexBuffer.destroy();
            delete this.quadVertexBuffer;
        }

        delete this.camera;
        delete this.ambientColor;

        if (this.zonlyShader)
        {
            delete this.zonlyShader;
            delete this.zonlyRigidTechnique;
            delete this.zonlySkinnedTechnique;
            delete this.zonlyRigidAlphaTechnique;
            delete this.zonlySkinnedAlphaTechnique;
            delete this.zonlyRigidNoCullTechnique;
            delete this.zonlySkinnedNoCullTechnique;
            delete this.stencilSetTechnique;
            delete this.stencilClearTechnique;
            delete this.stencilSetSpotLightTechnique;
            delete this.stencilClearSpotLightTechnique;
        }

        if (this.forwardShader)
        {
            delete this.forwardShader;
            delete this.skyboxTechnique;
            delete this.ambientRigidTechnique;
            delete this.ambientSkinnedTechnique;
            delete this.ambientGlowmapRigidTechnique;
            delete this.ambientGlowmapSkinnedTechnique;
            delete this.glowmapRigidTechnique;
            delete this.glowmapSkinnedTechnique;
        }

        var shadowMaps = this.shadowMaps;
        if (shadowMaps)
        {
            shadowMaps.destroy();
            delete this.shadowMaps;
        }

        this.destroyBuffers();

        delete this.md;
    }
};


// Constructor function
ForwardRendering.create = function forwardRenderingCreateFn(gd, md, shaderManager, effectManager, settings)
{
    var fr = new ForwardRendering();

    fr.md = md;

    fr.globalTechniqueParameters = gd.createTechniqueParameters({
        lightingScale: 2.0,
        time : 0.0
    });

    fr.ambientTechniqueParameters = gd.createTechniqueParameters({
        ambientColor: md.v3BuildZero()
    });

    fr.directionalLightsTechniqueParameters = gd.createTechniqueParameters();

    fr.passIndex = { fillZ: 0, skybox: 1, glow: 2, ambient: 3, shadow: 4, diffuse: 5, decal: 6, transparent: 7};
    fr.numPasses = fr.passIndex.transparent + 1;

    fr.passes = [[], [], [], [], [], [], []];

    fr.spotLights = [];
    fr.pointLights = [];
    fr.directionalLights = [];
    fr.fogLights = [];

    fr.v3Zero = md.v3BuildZero();
    fr.v4Zero = md.v4BuildZero();
    fr.v4One = md.v4BuildOne();

    fr.lightPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;
    fr.quadPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;

    fr.lightSemantics = gd.createSemantics(['POSITION']);
    fr.quadSemantics = gd.createSemantics(['POSITION', 'TEXCOORD0']);

    /*jslint white: false*/
    fr.spotLightVolumeVertexBuffer = gd.createVertexBuffer({
            numVertices: 8,
            attributes: ['FLOAT3'],
            dynamic: false,
            data: [
                0.0,  0.0,  0.0,
               -1.0, -1.0,  1.0,
                1.0, -1.0,  1.0,
                1.0,  1.0,  1.0,
                0.0,  0.0,  0.0,
               -1.0,  1.0,  1.0,
               -1.0, -1.0,  1.0,
                1.0,  1.0,  1.0
            ]
        });

    fr.pointLightVolumeVertexBuffer = gd.createVertexBuffer({
            numVertices: 14,
            attributes: ['FLOAT3'],
            dynamic: false,
            data: [
                1.0,  1.0,  1.0,
               -1.0,  1.0,  1.0,
                1.0, -1.0,  1.0,
               -1.0, -1.0,  1.0,
               -1.0, -1.0, -1.0,
               -1.0,  1.0,  1.0,
               -1.0,  1.0, -1.0,
                1.0,  1.0,  1.0,
                1.0,  1.0, -1.0,
                1.0, -1.0,  1.0,
                1.0, -1.0, -1.0,
               -1.0, -1.0, -1.0,
                1.0,  1.0, -1.0,
               -1.0,  1.0, -1.0
            ]
        });

    fr.quadVertexBuffer = gd.createVertexBuffer({
            numVertices: 4,
            attributes: ['FLOAT2', 'FLOAT2'],
            dynamic: false,
            data: [
                -1.0,  1.0, 0.0, 1.0,
                 1.0,  1.0, 1.0, 1.0,
                -1.0, -1.0, 0.0, 0.0,
                 1.0, -1.0, 1.0, 0.0
            ]
        });
    /*jslint white: true*/

    shaderManager.load("shaders/zonly.cgfx");
    shaderManager.load("shaders/forwardrendering.cgfx");

    // Prepare effects
    var shadowMappingUpdateFn;
    var shadowMappingSkinnedUpdateFn;

    if (settings && settings.shadowRendering)
    {
        shaderManager.load("shaders/forwardrenderingshadows.cgfx");

        var shadowMaps = ShadowMapping.create(gd, md, shaderManager, effectManager, settings.shadowSizeLow, settings.shadowSizeHigh);
        fr.shadowMaps = shadowMaps;
        shadowMappingUpdateFn = shadowMaps.update;
        shadowMappingSkinnedUpdateFn = shadowMaps.skinnedUpdate;
    }

    var flareIndexBuffer, flareSemantics;

    var m33InverseTranspose = md.m33InverseTranspose;
    var m43Mul = md.m43Mul;
    var m43BuildIdentity = md.m43BuildIdentity;

    var lightProjectionRight = md.v3Build(0.5, 0.0, 0.0);
    var lightProjectionUp    = md.v3Build(0.0, 0.5, 0.0);
    var lightProjectionAt    = md.v3Build(0.5, 0.5, 1.0);
    var lightProjectionPos   = md.v3Build(0.0, 0.0, 0.0);

    fr.lightProjection = md.m43Build(lightProjectionRight,
                                   lightProjectionUp,
                                   lightProjectionAt,
                                   lightProjectionPos);

    var forwardUpdateFn = function forwardUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldView = m43Mul.call(md, matrix, camera.viewMatrix, techniqueParameters.worldView);
        techniqueParameters.world = matrix;
        techniqueParameters.worldView = worldView;
        techniqueParameters.worldViewInverseTranspose = m33InverseTranspose.call(md, worldView, techniqueParameters.worldViewInverseTranspose);
        this.techniqueParametersUpdated = node.worldUpdate;
    };

    var forwardSkinnedUpdateFn = function forwardSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldView = m43Mul.call(md, matrix, camera.viewMatrix, techniqueParameters.worldView);
        techniqueParameters.world = matrix;
        techniqueParameters.worldView = worldView;
        techniqueParameters.worldViewInverseTranspose = m33InverseTranspose.call(md, worldView, techniqueParameters.worldViewInverseTranspose);
        this.techniqueParametersUpdated = node.worldUpdate;
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    };

    //
    // forwardPrepareFn
    //
    var forwardPrepareFn = function forwardPrepareFn(geometryInstance)
    {
        var drawParameters;
        var techniqueParameters;
        var rendererInfo = geometryInstance.rendererInfo;
        var geometryInstanceSharedMaterial = geometryInstance.sharedMaterial;
        var meta = geometryInstanceSharedMaterial.meta;
        var sharedMaterialTechniqueParameters = geometryInstanceSharedMaterial.techniqueParameters;
        var geometryInstanceTechniqueParameters = geometryInstance.techniqueParameters;
        var materialColor = geometryInstanceTechniqueParameters.materialColor || sharedMaterialTechniqueParameters.materialColor || this.v4One;
        geometryInstance.drawParameters = [];
        var numTechniqueParameters;

        //
        // fillZ pass
        //
        if (!meta.transparent &&
            !meta.decal)
        {
            drawParameters = gd.createDrawParameters();
            drawParameters.userData = {};
            geometryInstance.prepareDrawParameters(drawParameters);
            drawParameters.userData.passIndex = fr.passIndex.fillZ;
            geometryInstance.drawParameters.push(drawParameters);
            numTechniqueParameters = 0;

            var alpha = false, nocull = false;
            if (sharedMaterialTechniqueParameters.alpha_map)
            {
                alpha = true;

                techniqueParameters = gd.createTechniqueParameters();
                techniqueParameters.alpha_map = sharedMaterialTechniqueParameters.alpha_map;
                techniqueParameters.alphaFactor = materialColor[3];

                drawParameters.setTechniqueParameters(numTechniqueParameters, techniqueParameters);
                numTechniqueParameters += 1;
            }
            else
            {
                var techniqueName = this.technique.name;
                if (-1 !== techniqueName.indexOf("_alpha"))
                {
                    alpha = true;

                    techniqueParameters = gd.createTechniqueParameters();
                    techniqueParameters.alpha_map = sharedMaterialTechniqueParameters.diffuse;
                    techniqueParameters.alphaFactor = materialColor[3];

                    drawParameters.setTechniqueParameters(numTechniqueParameters, techniqueParameters);
                    numTechniqueParameters += 1;
                }
                else if (-1 !== techniqueName.indexOf("_nocull"))
                {
                    nocull = true;
                }
            }

            if (geometryInstance.skinController)
            {
                if (alpha)
                {
                    drawParameters.technique = fr.zonlySkinnedAlphaTechnique;
                }
                else if (nocull)
                {
                    drawParameters.technique = fr.zonlySkinnedNoCullTechnique;
                }
                else
                {
                    drawParameters.technique = fr.zonlySkinnedTechnique;
                }
            }
            else
            {
                if (alpha)
                {
                    drawParameters.technique = fr.zonlyRigidAlphaTechnique;
                }
                else if (nocull)
                {
                    drawParameters.technique = fr.zonlyRigidNoCullTechnique;
                }
                else
                {
                    drawParameters.technique = fr.zonlyRigidTechnique;
                }
            }
            var techniqueIndex = renderingCommonGetTechniqueIndexFn(drawParameters.technique.name);
            if (alpha)
            {
                drawParameters.sortKey = renderingCommonSortKeyFn(techniqueIndex, meta.materialIndex);
            }
            else
            {
                drawParameters.sortKey = renderingCommonSortKeyFn(techniqueIndex, 0);
            }
            //Now add common for world and skin data
            drawParameters.setTechniqueParameters(numTechniqueParameters, geometryInstanceTechniqueParameters);
        }

        //
        // glow pass, if no ambient
        //
        if (sharedMaterialTechniqueParameters.glow_map)
        {
            drawParameters = drawParameters = gd.createDrawParameters();
            drawParameters.userData = {};
            geometryInstance.prepareDrawParameters(drawParameters);
            drawParameters.userData.passIndex = fr.passIndex.glow;
            geometryInstance.drawParameters.push(drawParameters);

            if (geometryInstance.skinController)
            {
                drawParameters.technique = fr.glowmapSkinnedTechnique;
            }
            else
            {
                drawParameters.technique = fr.glowmapRigidTechnique;
            }

            drawParameters.sortKey = renderingCommonSortKeyFn(renderingCommonGetTechniqueIndexFn(drawParameters.technique.name), meta.materialIndex);
            //Now add common for world and skin data. materialColor is also copied here.
            drawParameters.setTechniqueParameters(0, sharedMaterialTechniqueParameters);
            drawParameters.setTechniqueParameters(1, geometryInstanceTechniqueParameters);
        }

        //
        // Ambient Pass, which also does glow.
        //
        if (!meta.transparent &&
            !meta.decal)
        {
            drawParameters = gd.createDrawParameters();
            drawParameters.userData = {};
            geometryInstance.prepareDrawParameters(drawParameters);
            drawParameters.userData.passIndex = fr.passIndex.ambient;
            geometryInstance.drawParameters.push(drawParameters);

            if (geometryInstance.skinController)
            {
                if (sharedMaterialTechniqueParameters.glow_map)
                {
                    drawParameters.technique = fr.ambientGlowmapSkinnedTechnique;
                }
                else
                {
                    drawParameters.technique = fr.ambientSkinnedTechnique;
                }
            }
            else
            {
                if (sharedMaterialTechniqueParameters.glow_map)
                {
                    drawParameters.technique = fr.ambientGlowmapRigidTechnique;
                }
                else
                {
                    drawParameters.technique = fr.ambientRigidTechnique;
                }
            }
            drawParameters.sortKey = renderingCommonSortKeyFn(renderingCommonGetTechniqueIndexFn(drawParameters.technique.name), meta.materialIndex);
            //Now add common for world and skin data. materialColor is also copied here.
            drawParameters.setTechniqueParameters(0, sharedMaterialTechniqueParameters);
            drawParameters.setTechniqueParameters(1, geometryInstanceTechniqueParameters);
        }

        //
        // Diffuse Pass
        //
        drawParameters = gd.createDrawParameters();
        drawParameters.userData = {};
        geometryInstance.prepareDrawParameters(drawParameters);

        drawParameters.technique = this.technique;
        drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, meta.materialIndex);
        rendererInfo.renderUpdate = this.update;

        drawParameters.setTechniqueParameters(0, sharedMaterialTechniqueParameters);
        drawParameters.setTechniqueParameters(1, geometryInstanceTechniqueParameters);

        if (meta.decal)
        {
            drawParameters.userData.passIndex = fr.passIndex.decal;
            geometryInstance.drawParameters.push(drawParameters);
        }
        else if (meta.transparent)
        {
            drawParameters.userData.passIndex = fr.passIndex.transparent;
            geometryInstance.drawParameters.push(drawParameters);
        }
        else
        {
            drawParameters.userData.passIndex = fr.passIndex.diffuse;
            geometryInstance.diffuseDrawParameters = [drawParameters];

            if (fr.shadowMaps && this.shadowTechnique)
            {
                var shadowDrawParameters = gd.createDrawParameters();
                shadowDrawParameters.userData = {};
                geometryInstance.prepareDrawParameters(shadowDrawParameters);

                shadowDrawParameters.technique = this.shadowTechnique;
                shadowDrawParameters.sortKey = renderingCommonSortKeyFn(this.shadowTechniqueIndex, meta.materialIndex);
                // for now force all shadows to be updated in the default update loop
                //rendererInfo.renderUpdateShadow = this.shadowUpdate;

                shadowDrawParameters.setTechniqueParameters(0, sharedMaterialTechniqueParameters);
                shadowDrawParameters.setTechniqueParameters(1, geometryInstanceTechniqueParameters);

                geometryInstance.diffuseShadowDrawParameters = [shadowDrawParameters];
            }
            else
            {
                geometryInstance.diffuseShadowDrawParameters = [drawParameters];
            }
        }

        //
        // shadow maps
        //
        if (fr.shadowMaps)
        {
            if (this.shadowMappingUpdate &&
                !geometryInstance.sharedMaterial.meta.noshadows)
            {
                drawParameters = gd.createDrawParameters();
                drawParameters.userData = {};
                geometryInstance.prepareDrawParameters(drawParameters);
                geometryInstance.shadowMappingDrawParameters = [drawParameters];

                drawParameters.userData.passIndex = fr.passIndex.shadow;

                rendererInfo.shadowMappingUpdate = this.shadowMappingUpdate;
                drawParameters.technique = this.shadowMappingTechnique;

                drawParameters.sortKey = renderingCommonSortKeyFn(this.shadowMappingTechniqueIndex, 0);
                drawParameters.setTechniqueParameters(0, geometryInstance.techniqueParameters);   //TODO: This is excessive
            }
            else
            {
                geometryInstance.sharedMaterial.meta.noshadows = true;
            }
        }
    };

    fr.defaultUpdateFn = forwardUpdateFn;
    fr.defaultSkinnedUpdateFn = forwardSkinnedUpdateFn;
    fr.defaultPrepareFn = forwardPrepareFn;

    function forwardSkyboxPrepareFn(geometryInstance)
    {
        var drawParameters;
        var geometryInstanceSharedMaterial = geometryInstance.sharedMaterial;
        var meta = geometryInstanceSharedMaterial.meta;
        var sharedMaterialTechniqueParameters = geometryInstanceSharedMaterial.techniqueParameters;
        var geometryInstanceTechniqueParameters = geometryInstance.techniqueParameters;

        //
        // skybox pass
        //
        drawParameters = gd.createDrawParameters();
        drawParameters.userData = {};
        geometryInstance.prepareDrawParameters(drawParameters);
        drawParameters.userData.passIndex = fr.passIndex.skybox;
        geometryInstance.drawParameters = [drawParameters];
        drawParameters.technique = fr.skyboxTechnique;
        drawParameters.setTechniqueParameters(0, sharedMaterialTechniqueParameters);
        drawParameters.setTechniqueParameters(1, geometryInstanceTechniqueParameters);
        drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, meta.materialIndex);
        geometryInstance.diffuseDrawParameters = [];
        geometryInstance.diffuseShadowDrawParameters = [];
        geometryInstance.rendererInfo.renderUpdate = this.update;
    }

    function forwardBlendUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.world = node.world;
        }
    }

    function forwardBlendSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.world = node.world;
        }
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function forwardSkyboxUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.world = node.world;
        }
    }

    function forwardEnvUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            var matrix = node.world;
            techniqueParameters.world = matrix;
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
    }

    function forwardEnvSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            var matrix = node.world;
            techniqueParameters.world = matrix;
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function forwardFlarePrepareFn(geometryInstance)
    {
        if (!geometryInstance.customGeometry)
        {
            geometryInstance.customGeometry = true;

            if (!flareIndexBuffer)
            {
                flareIndexBuffer = gd.createIndexBuffer({
                        numIndices: 8,
                        format: 'USHORT',
                        dynamic: false,
                        data: [1, 0, 2, 5, 4, 3, 2, 1]
                    });

                flareSemantics = gd.createSemantics(['POSITION', 'TEXCOORD']);
            }

            var oldGeometry = geometryInstance.geometry;
            var oldSemantics = oldGeometry.semantics;
            var oldVertexBuffer = oldGeometry.vertexBuffer;
            var oldSurface = geometryInstance.surface;
            var oldVertexData = oldSurface.vertexData;
            var oldIndexData = oldSurface.indexData;

            var vertexBuffer = gd.createVertexBuffer({
                    numVertices: 6,
                    attributes: ['FLOAT3', 'FLOAT2'],
                    dynamic: true
                });

            var geometry = {
                    halfExtents: oldGeometry.halfExtents,
                    primitive: gd.PRIMITIVE_TRIANGLE_STRIP,
                    semantics: flareSemantics,
                    vertexBuffer: vertexBuffer,
                    numIndices: 8,
                    first: 0,
                    indexBuffer: flareIndexBuffer,
                    lastTimeVisible: true
                };

            var oldCenter = oldGeometry.center;
            if (oldCenter)
            {
                geometry.center = oldCenter;
            }

            geometryInstance.geometry = geometry;
            geometryInstance.surface = geometry;
            geometryInstance.semantics = flareSemantics;

            // Extract positions from old geometry
            //var sempos = gd.SEMANTIC_POSITION;
            var semnor = gd.SEMANTIC_NORMAL;
            var semtex = gd.SEMANTIC_TEXCOORD;
            var stride = oldVertexBuffer.stride;
            var offset = 0;
            if (oldSemantics[0] === semnor)
            {
                offset += 3;
                if (oldSemantics[1] === semtex)
                {
                    offset += 2;
                }
            }
            else if (oldSemantics[0] === semtex)
            {
                offset += 2;
                if (oldSemantics[1] === semnor)
                {
                    offset += 3;
                }
            }

            var faces;
            if (oldIndexData[3] !== 0 && oldIndexData[4] !== 0 && oldIndexData[5] !== 0)
            {
                faces = [0, 2, 1, 3];
            }
            else if (oldIndexData[3] !== 1 && oldIndexData[4] !== 1 && oldIndexData[5] !== 1)
            {
                faces = [1, 0, 2, 3];
            }
            else //if (oldIndexData[3] !== 2 && oldIndexData[4] !== 2 && oldIndexData[5] !== 2)
            {
                faces = [3, 0, 1, 2];
            }
            oldIndexData = null;

            var tlOff = (faces[0] * stride + offset);
            var trOff = (faces[1] * stride + offset);
            var blOff = (faces[2] * stride + offset);
            var brOff = (faces[3] * stride + offset);
            var v00 = oldVertexData[tlOff + 0];
            var v01 = oldVertexData[tlOff + 1];
            var v02 = oldVertexData[tlOff + 2];
            var v10 = oldVertexData[trOff + 0];
            var v11 = oldVertexData[trOff + 1];
            var v12 = oldVertexData[trOff + 2];
            var v20 = oldVertexData[blOff + 0];
            var v21 = oldVertexData[blOff + 1];
            var v22 = oldVertexData[blOff + 2];
            var v30 = oldVertexData[brOff + 0];
            var v31 = oldVertexData[brOff + 1];
            var v32 = oldVertexData[brOff + 2];
            oldVertexData = null;

            var va01 = [(v00 + v10) * 0.5, (v01 + v11) * 0.5, (v02 + v12) * 0.5];
            var va02 = [(v00 + v20) * 0.5, (v01 + v21) * 0.5, (v02 + v22) * 0.5];
            var va13 = [(v10 + v30) * 0.5, (v11 + v31) * 0.5, (v12 + v32) * 0.5];
            var va23 = [(v20 + v30) * 0.5, (v21 + v31) * 0.5, (v22 + v32) * 0.5];

            var oldTop, oldBottom;
            if (VMath.v3LengthSq(VMath.v3Sub(va01, va23)) > VMath.v3LengthSq(VMath.v3Sub(va02, va13)))
            {
                oldTop    = va01;
                oldBottom = va23;
            }
            else
            {
                oldTop    = va02;
                oldBottom = va13;
            }

            var c10 = VMath.v3Normalize([(v10 - v00), (v11 - v01), (v12 - v02)]);
            var c20 = VMath.v3Normalize([(v20 - v00), (v21 - v01), (v22 - v02)]);
            var oldNormal = VMath.v3Cross(c10, c20);

            var v3Build = md.v3Build;
            geometry.sourceVertices = [v3Build.apply(md, oldTop),
                                       v3Build.apply(md, oldBottom),
                                       v3Build.apply(md, oldNormal)];

            oldGeometry.reference.remove();

            forwardPrepareFn.call(this, geometryInstance);
        }
    }

    function forwardFlareUpdateFn(camera)
    {
        var geometry = this.geometry;
        var node = this.node;

        var top, bottom, normal, tb;
        var top0, top1, top2, bottom0, bottom1, bottom2, tb0, tb1, tb2, normal0, normal1, normal2;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            var matrix = node.world;
            this.techniqueParameters.world = m43BuildIdentity.call(md);
            var sourceVertices = geometry.sourceVertices;
            top    = md.m43TransformPoint(matrix, sourceVertices[0], geometry.top);
            bottom = md.m43TransformPoint(matrix, sourceVertices[1], geometry.bottom);
            normal = md.m43TransformVector(matrix, sourceVertices[2], geometry.normal);
            top0 = top[0];
            top1 = top[1];
            top2 = top[2];
            bottom0 = bottom[0];
            bottom1 = bottom[1];
            bottom2 = bottom[2];
            normal0 = normal[0];
            normal1 = normal[1];
            normal2 = normal[2];
            // Normalize top to bottom
            tb0 = (top0 - bottom0);
            tb1 = (top1 - bottom1);
            tb2 = (top2 - bottom2);
            var tblensq = ((tb0 * tb0) + (tb1 * tb1) + (tb2 * tb2));
            var tblenrec = (tblensq > 0.0 ? (1.0 / Math.sqrt(tblensq)) : 0);
            tb0 *= tblenrec;
            tb1 *= tblenrec;
            tb2 *= tblenrec;
            if (node.dynamic)
            {
                geometry.top    = top;
                geometry.bottom = bottom;
                geometry.normal = normal;
            }
            else
            {
                geometry.top    = [top0, top1, top2];
                geometry.bottom = [bottom0, bottom1, bottom2];
                geometry.normal = [normal0, normal1, normal2];
            }
            geometry.tb     = [tb0, tb1, tb2];
        }
        else
        {
            top    = geometry.top;
            bottom = geometry.bottom;
            tb     = geometry.tb;
            normal = geometry.normal;
            top0 = top[0];
            top1 = top[1];
            top2 = top[2];
            bottom0 = bottom[0];
            bottom1 = bottom[1];
            bottom2 = bottom[2];
            tb0 = tb[0];
            tb1 = tb[1];
            tb2 = tb[2];
            normal0 = normal[0];
            normal1 = normal[1];
            normal2 = normal[2];
        }

        var vertexBuffer = geometry.vertexBuffer;
        var cameraMatrix = camera.matrix;
        var cameraToBottom0 = (bottom0 - cameraMatrix[9]);
        var cameraToBottom1 = (bottom1 - cameraMatrix[10]);
        var cameraToBottom2 = (bottom2 - cameraMatrix[11]);
        var writer;
        if (((normal0 * cameraToBottom0) + (normal1 * cameraToBottom1) + (normal2 * cameraToBottom2)) < 0)
        {
            geometry.lastTimeVisible = true;

            var flareScale = this.sharedMaterial.meta.flareScale;

            // Normalize camera to bottom
            var ctblensq = ((cameraToBottom0 * cameraToBottom0) + (cameraToBottom1 * cameraToBottom1) + (cameraToBottom2 * cameraToBottom2));
            var ctblenrec = (ctblensq > 0.0 ? (1.0 / Math.sqrt(ctblensq)) : 0);
            cameraToBottom0 *= ctblenrec;
            cameraToBottom1 *= ctblenrec;
            cameraToBottom2 *= ctblenrec;

            // Cross camera to bottom with top to bottom
            var flareRight0 = ((cameraToBottom1 * tb2) - (cameraToBottom2 * tb1));
            var flareRight1 = ((cameraToBottom2 * tb0) - (cameraToBottom0 * tb2));
            var flareRight2 = ((cameraToBottom0 * tb1) - (cameraToBottom1 * tb0));

            // Cross flareRight with camera to bottom
            var flareUp0 = ((flareRight1 * cameraToBottom2) - (flareRight2 * cameraToBottom1));
            var flareUp1 = ((flareRight2 * cameraToBottom0) - (flareRight0 * cameraToBottom2));
            var flareUp2 = ((flareRight0 * cameraToBottom1) - (flareRight1 * cameraToBottom0));

            // Scale axis
            flareRight0 *= flareScale;
            flareRight1 *= flareScale;
            flareRight2 *= flareScale;
            flareUp0    *= flareScale;
            flareUp1    *= flareScale;
            flareUp2    *= flareScale;

            var atScale  = (-2.5 * flareScale);
            var flareAt0 = (cameraToBottom0 * atScale);
            var flareAt1 = (cameraToBottom1 * atScale);
            var flareAt2 = (cameraToBottom2 * atScale);

            var tl0 = (top0    - flareRight0 + flareUp0 + flareAt0);
            var tl1 = (top1    - flareRight1 + flareUp1 + flareAt1);
            var tl2 = (top2    - flareRight2 + flareUp2 + flareAt2);
            var tr0 = (top0    + flareRight0 + flareUp0 + flareAt0);
            var tr1 = (top1    + flareRight1 + flareUp1 + flareAt1);
            var tr2 = (top2    + flareRight2 + flareUp2 + flareAt2);
            var bl0 = (bottom0 - flareRight0 - flareUp0 + flareAt0);
            var bl1 = (bottom1 - flareRight1 - flareUp1 + flareAt1);
            var bl2 = (bottom2 - flareRight2 - flareUp2 + flareAt2);
            var br0 = (bottom0 + flareRight0 - flareUp0 + flareAt0);
            var br1 = (bottom1 + flareRight1 - flareUp1 + flareAt1);
            var br2 = (bottom2 + flareRight2 - flareUp2 + flareAt2);

            writer = vertexBuffer.map();
            if (writer)
            {
                writer(tl0,     tl1,     tl2,     1.0, 0.0);
                writer(tr0,     tr1,     tr2,     1.0, 1.0);
                writer(top0,    top1,    top2,    0.5, 0.0);
                writer(br0,     br1,     br2,     1.0, 0.0);
                writer(bottom0, bottom1, bottom2, 0.5, 1.0);
                writer(bl0,     bl1,     bl2,     1.0, 1.0);
                vertexBuffer.unmap(writer);
            }
        }
        else
        {
            if (geometry.lastTimeVisible)
            {
                geometry.lastTimeVisible = false;
                writer = vertexBuffer.map();
                if (writer)
                {
                    writer(0, 0, 0, 0, 0);
                    writer(0, 0, 0, 0, 0);
                    writer(0, 0, 0, 0, 0);
                    writer(0, 0, 0, 0, 0);
                    writer(0, 0, 0, 0, 0);
                    writer(0, 0, 0, 0, 0);
                    vertexBuffer.unmap(writer);
                }
            }
        }
    }

    function loadTechniques(shaderManager)
    {
        var that = this;

        var callback = function shaderLoadedCallbackFn(shader)
        {
            that.shader = shader;
            that.technique = shader.getTechnique(that.techniqueName);
            that.techniqueIndex =  renderingCommonGetTechniqueIndexFn(that.techniqueName);
        };
        shaderManager.load(this.shaderName, callback);

        if (fr.shadowMaps)
        {
            if (this.shadowMappingTechniqueName)
            {
                var shadowMappingCallback = function shaderLoadedShadowMappingCallbackFn(shader)
                {
                    that.shadowMappingShader = shader;
                    that.shadowMappingTechnique = shader.getTechnique(that.shadowMappingTechniqueName);
                    that.shadowMappingTechniqueIndex = renderingCommonGetTechniqueIndexFn(that.shadowMappingTechniqueName);
                };
                shaderManager.load(this.shadowMappingShaderName, shadowMappingCallback);
            }

            if (this.shadowTechniqueName)
            {
                var shadowCallback = function shaderLoadedShadowCallbackFn(shader)
                {
                    that.shadowShader = shader;
                    that.shadowTechnique = shader.getTechnique(that.shadowTechniqueName);
                    that.shadowTechniqueIndex = renderingCommonGetTechniqueIndexFn(that.shadowTechniqueName);
                };
                shaderManager.load(this.shadowShaderName, shadowCallback);
            }
        }
    }

    var effect;
    var effectTypeData;
    var skinned = "skinned";
    var rigid = "rigid";

    //
    // rxgb_normalmap
    //
    effect = Effect.create("rxgb_normalmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_alphatest_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_alphatest_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_alphatest_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_alphatest_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_glowmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_glowmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_glowmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "rxgb_normalmap_specularmap_glowmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add
    //
    effect = Effect.create("add");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "add",
                        update : forwardBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "add_skinned",
                        update : forwardBlendSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add_particle
    //
    effect = Effect.create("add_particle");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "add_particle",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // blend
    //
    effect = Effect.create("blend");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blend",
                        update : forwardBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blend_skinned",
                        update : forwardBlendSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blend_particle
    //
    effect = Effect.create("blend_particle");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blend_particle",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // translucent
    //
    effect = Effect.create("translucent");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "translucent",
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "translucent_skinned",
                        update : forwardBlendSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // translucent_particle
    //
    effect = Effect.create("translucent_particle");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "translucent_particle",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // filter
    //
    effect = Effect.create("filter");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "filter",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "filter_skinned",
                        update : forwardBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // invfilter
    //
    effect = Effect.create("invfilter");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "invfilter",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // invfilter_particle
    //
    effect = Effect.create("invfilter_particle");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "invfilter_particle",
                        update : forwardBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass
    //
    effect = Effect.create("glass");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "glass",
                        update : forwardBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass_env
    //
    effect = Effect.create("glass_env");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "glass_env",
                        update : forwardEnvUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // modulate2
    //
    effect = Effect.create("modulate2");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "modulate2",
                        update : forwardBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "modulate2_skinned",
                        update : forwardBlendSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // skybox
    //
    effect = Effect.create("skybox");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardSkyboxPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "skybox",
                        update : forwardSkyboxUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // env
    //
    effect = Effect.create("env");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "env",
                        update : forwardEnvUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "env_skinned",
                        update : forwardEnvSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // flare
    //
    effect = Effect.create("flare");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardFlarePrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "add",
                        update : forwardFlareUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // blinn
    //
    effect = Effect.create("blinn");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blinn",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "blinn_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blinn_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "blinn_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blinn_nocull
    //
    effect = Effect.create("blinn_nocull");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blinn_nocull",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "blinn_shadows_nocull",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "blinn_skinned_nocull",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "blinn_skinned_shadows_nocull",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap
    //
    effect = Effect.create("normalmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap
    //
    effect = Effect.create("normalmap_specularmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_alphamap
    //
    effect = Effect.create("normalmap_specularmap_alphamap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphamap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_alphamap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphamap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_alphamap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_alphatest
    //
    effect = Effect.create("normalmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_alphatest",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_alphatest_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // normalmap_specularmap_alphatest
    //
    effect = Effect.create("normalmap_specularmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_alphatest_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_alphatest_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_glowmap
    //
    effect = Effect.create("normalmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_glowmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_glowmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_glowmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_glowmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_glowmap
    //
    effect = Effect.create("normalmap_specularmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap",
                        update : forwardUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_glowmap_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : forwardPrepareFn,
                        shaderName : "shaders/forwardrendering.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap_skinned",
                        update : forwardSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        shadowShaderName : "shaders/forwardrenderingshadows.cgfx",
                        shadowTechniqueName : "normalmap_specularmap_glowmap_skinned_shadows",
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    effectManager.map("default", "blinn");
    effectManager.map("lambert", "blinn");
    effectManager.map("phong", "blinn");

    return fr;
};
