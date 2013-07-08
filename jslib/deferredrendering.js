// Copyright (c) 2009-2012 Turbulenz Limited

//
// DeferredRendering
//
/*global ShadowMapping: false, VMath: false, Effect: false,
         renderingCommonCreateRendererInfoFn: false,  renderingCommonGetTechniqueIndexFn: false,
         renderingCommonSortKeyFn: false*/

function DeferredRendering() {}

DeferredRendering.prototype =
{
    version : 1,

    minPixelCount: 256,

    updateShader: function deferredRenderingUpdateShaderFn(sm)
    {
        var shader = sm.get("shaders/deferredlights.cgfx");
        if (shader !== this.deferredShader)
        {
            this.deferredShader = shader;
            this.ambientLightTechnique = shader.getTechnique("ambient_light");
            this.ambientDirectionalLightTechnique = shader.getTechnique("ambient_directional_light");
            this.directionalLightTechnique = shader.getTechnique("directional_light");
            this.spotLightTechnique = shader.getTechnique("spot_light");
            this.pointLightTechnique = shader.getTechnique("point_light");
            this.pointLightSpecularTechnique = shader.getTechnique("point_light_specular");
            this.pointLightSpecularOpaqueTechnique = shader.getTechnique("point_light_specular_opaque");
            this.fogLightTechnique = shader.getTechnique("fog_light");
            this.mixTechnique = shader.getTechnique("mix");
            if (this.shadowMaps)
            {
                this.spotLightShadowTechnique = shader.getTechnique("spot_light_shadow");
                this.pointLightSpecularShadowTechnique = shader.getTechnique("point_light_specular_shadow");
                this.pointLightSpecularShadowOpaqueTechnique = shader.getTechnique("point_light_specular_shadow_opaque");
            }
        }

        var shadowMaps = this.shadowMaps;
        if (shadowMaps)
        {
            shadowMaps.updateShader(sm);
        }
    },

    sortRenderablesAndLights: function deferredRenderingSortRenderablesAndLightsFn(camera, scene)
    {
        function distanceReverseCompareFn(objA, objB)
        {
            return (objB.distance - objA.distance);
        }

        var pointLights = this.pointLights;
        var spotLights = this.spotLights;
        var fogLights = this.fogLights;

        var numPoint = 0;
        var numSpot = 0;
        var numFog = 0;

        var index;
        var passes = this.passes;
        var numPasses = this.numPasses;
        for (index = 0; index < numPasses; index += 1)
        {
            passes[index] = [];
        }

        var visibleRenderables = scene.getCurrentVisibleRenderables();
        var numVisibleRenderables = visibleRenderables.length;
        if (numVisibleRenderables > 0)
        {
            var n, renderable, rendererInfo, userData;
            var drawParametersArray, numDrawParameters, drawParametersIndex, drawParameters;
            var transparentPassIndex = this.passIndex.transparent;
            var pass;
            n = 0;
            do
            {
                renderable = visibleRenderables[n];

                rendererInfo = renderable.rendererInfo;
                if (!rendererInfo)
                {
                    rendererInfo = renderingCommonCreateRendererInfoFn(renderable);
                }

                if (rendererInfo.far)
                {
                    renderable.distance = 1.e38;
                }

                rendererInfo.renderUpdate.call(renderable, camera);

                drawParametersArray = renderable.drawParameters;
                numDrawParameters = drawParametersArray.length;
                for (drawParametersIndex = 0; drawParametersIndex < numDrawParameters; drawParametersIndex += 1)
                {
                    drawParameters = drawParametersArray[drawParametersIndex];
                    userData = drawParameters.userData;
                    if (userData.passIndex === transparentPassIndex)
                    {
                        drawParameters.sortKey = renderable.distance;
                    }
                    pass = passes[userData.passIndex];
                    pass[pass.length] = drawParameters;
                }

                n += 1;
            }
            while (n < numVisibleRenderables);
        }

        var visibleLights = scene.getCurrentVisibleLights();
        var numVisibleLights = visibleLights.length;
        if (numVisibleLights)
        {
            var lightInstance, light, l;
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
                    else if (light.fog)
                    {
                        fogLights[numFog] = lightInstance;
                        numFog += 1;
                    }
                    else
                    {
                        // this includes local ambient and directional lights
                        pointLights[numPoint] = lightInstance;
                        numPoint += 1;
                    }
                }

                l += 1;
            }
            while (l < numVisibleLights);
        }

        pointLights.length = numPoint;
        spotLights.length = numSpot;
        fogLights.length = numFog;

        if (1 < numFog)
        {
            // Sort fog lights back to front
            fogLights.sort(distanceReverseCompareFn);
        }
    },

    update: function deferredRenderingUpdateFn(gd, camera, scene, currentTime)
    {
        scene.updateVisibleNodes(camera);

        this.sceneMaxDistance = scene.maxDistance;
        this.sceneExtents = scene.extents.slice();
        this.sceneGlobalLights = scene.globalLights;

        this.sortRenderablesAndLights(camera, scene);

        var viewMatrix = camera.viewMatrix;
        var viewProjectionMatrix = camera.viewProjectionMatrix;

        var md = this.md;
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

        this.globalCameraMatrix = camera.matrix;

        var sharedTechniqueParameters = this.sharedTechniqueParameters;
        sharedTechniqueParameters.viewProjection = viewProjectionMatrix;
        sharedTechniqueParameters.maxDepth = -maxDepth;

        var l, node, light, lightInstance, matrix, techniqueParameters, origin, halfExtents, worldView;
        var lightFindVisibleRenderables = this.lightFindVisibleRenderables;
        var m43InverseTransposeProjection = md.m43InverseTransposeProjection;
        var m43Mul = md.m43Mul;
        var m43Transpose = md.m43Transpose;
        var m43TransformPoint = md.m43TransformPoint;
        var m43Pos = md.m43Pos;
        var v3Build = md.v3Build;

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
                    halfExtents = light.halfExtents;

                    worldView = m43Mul.call(md, matrix, viewMatrix, worldView);

                    techniqueParameters.world = matrix;
                    techniqueParameters.worldViewTranspose = m43Transpose.call(md, worldView, techniqueParameters.worldViewTranspose);
                    if (origin)
                    {
                        techniqueParameters.lightOrigin = m43TransformPoint.call(md, worldView, origin, techniqueParameters.lightOrigin);
                    }
                    else
                    {
                        techniqueParameters.lightOrigin = m43Pos.call(md, worldView, techniqueParameters.lightOrigin);
                    }
                    techniqueParameters.lightColor = light.color;

                    techniqueParameters.lightExtents = halfExtents;
                    techniqueParameters.lightViewInverseTranspose = m43InverseTransposeProjection.call(md, worldView, halfExtents,
                                                                                                       techniqueParameters.lightViewInverseTranspose);

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

        var spotInstances = this.spotLights;
        var numSpotInstances = spotInstances.length;
        if (numSpotInstances)
        {
            var lightView, lightViewInverse, lightProjection, lightViewInverseProjection;
            var m33MulM43 = md.m33MulM43;
            var m43Inverse = md.m43Inverse;

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

                    techniqueParameters.world = matrix;
                    techniqueParameters.worldViewTranspose = m43Transpose.call(md, worldView, techniqueParameters.worldViewTranspose);
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
                    techniqueParameters.lightFrustum = frustum;
                    techniqueParameters.lightViewInverseTranspose = m43Transpose.call(md, lightViewInverseProjection, techniqueParameters.lightViewInverseTranspose);

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

        var fogInstances = this.fogLights;
        var numFogInstances = fogInstances.length;
        if (numFogInstances)
        {
            var halfExtentsInverse, lightViewInverseTranspose;
            var m34Pos = md.m34Pos;

            l = 0;
            do
            {
                lightInstance = fogInstances[l];
                node = lightInstance.node;
                light = lightInstance.light;
                matrix = node.world;
                techniqueParameters = lightInstance.techniqueParameters;
                if (!techniqueParameters)
                {
                    techniqueParameters = gd.createTechniqueParameters();
                    lightInstance.techniqueParameters = techniqueParameters;
                }

                halfExtents = light.halfExtents;
                var he0 = halfExtents[0];
                var he1 = halfExtents[1];
                var he2 = halfExtents[2];
                if (he1)
                {
                    halfExtents = v3Build.call(md, he0, he1, he2);

                    var he1inv = 1.0 / he1;
                    halfExtentsInverse = v3Build.call(md, he0 * he1inv, 1.0, he2 * he1inv);
                }
                else
                {
                    halfExtents = v3Build.call(md, 0, 0, 0);
                    halfExtentsInverse = v3Build.call(md, 0, 0, 0);
                }

                worldView = m43Mul.call(md, matrix, viewMatrix, worldView);
                lightViewInverseTranspose = m43InverseTransposeProjection.call(md, worldView, halfExtents,
                                                                               techniqueParameters.lightViewInverseTranspose);

                techniqueParameters.world = matrix;
                techniqueParameters.worldViewTranspose = m43Transpose.call(md, worldView, techniqueParameters.worldViewTranspose);
                techniqueParameters.lightOrigin = m43Pos.call(md, worldView, techniqueParameters.lightOrigin);
                techniqueParameters.lightColor = light.color;
                techniqueParameters.lightExtents = halfExtents;
                techniqueParameters.lightExtentsInverse = halfExtentsInverse;
                techniqueParameters.eyePositionLightSpace = m34Pos.call(md, lightViewInverseTranspose, techniqueParameters.eyePositionLightSpace);
                techniqueParameters.lightViewInverseTranspose = lightViewInverseTranspose;

                l += 1;
            }
            while (l < numFogInstances);
        }
    },

    lightFindVisibleRenderables: function lightFindVisibleRenderablesFn(lightInstance, scene)
    {
        var origin, overlappingRenderables, numOverlappingRenderables;
        var overlapQueryRenderables, numOverlapQueryRenderables, renderable;
        var n, meta, extents, lightFrameVisible;
        var node, light;

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
                    renderable.getWorldExtents(); // Make sure extents are updated
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

        if (overlappingRenderables.length !== numOverlappingRenderables)
        {
            overlappingRenderables.length = numOverlappingRenderables;
        }

        var shadowMaps = this.shadowMaps;
        if (shadowMaps && light.shadows)
        {
            shadowMaps.findVisibleRenderables(lightInstance);
        }

        // Check if any overlapping node is visible, note we compare renderable.frameVisible against
        // lightFrameVisible which is the frame on which the light was last visible, since we're processing the
        // light that number must be the current frame
        for (n = 0; n < numOverlappingRenderables; n += 1)
        {
            renderable = overlappingRenderables[n];
            if (renderable.frameVisible === lightFrameVisible &&
                !renderable.disabled &&
                !renderable.node.disabled)
            {
                return true;
            }
        }

        return false;
    },

    destroyBuffers: function deferredRenderingDestroyBuffersFn()
    {
        if (this.mixRenderTarget)
        {
            this.mixRenderTarget.destroy();
            this.mixRenderTarget = null;
        }
        if (this.lightingRenderTarget)
        {
            this.lightingRenderTarget.destroy();
            this.lightingRenderTarget = null;
        }
        if (this.baseRenderTarget)
        {
            this.baseRenderTarget.destroy();
            this.baseRenderTarget = null;
        }
        if (this.depthBuffer)
        {
            this.depthBuffer.destroy();
            this.depthBuffer = null;
        }
        if (this.depthTexture)
        {
            this.depthTexture.destroy();
            this.depthTexture = null;
        }
        if (this.finalTexture)
        {
            this.finalTexture.destroy();
            this.finalTexture = null;
        }
        if (this.specularLightingTexture)
        {
            this.specularLightingTexture.destroy();
            this.specularLightingTexture = null;
        }
        if (this.diffuseLightingTexture)
        {
            this.diffuseLightingTexture.destroy();
            this.diffuseLightingTexture = null;
        }
        if (this.normalTexture)
        {
            this.normalTexture.destroy();
            this.normalTexture = null;
        }
        if (this.specularTexture)
        {
            this.specularTexture.destroy();
            this.specularTexture = null;
        }
        if (this.albedoTexture)
        {
            this.albedoTexture.destroy();
            this.albedoTexture = null;
        }
    },

    updateBuffers: function deferredRenderingUpdateBuffersFn(gd, deviceWidth, deviceHeight)
    {
        if (this.bufferWidth === deviceWidth && this.bufferHeight === deviceHeight)
        {
            return true;
        }

        this.destroyBuffers();

        this.albedoTexture = gd.createTexture({
                name: "albedo",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.specularTexture = gd.createTexture({
                name: "specular",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.normalTexture = gd.createTexture({
                name: "normal",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.depthTexture = gd.createTexture({
                name: "depthTexture",
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

        this.diffuseLightingTexture = gd.createTexture({
                name: "diffuseLighting",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.specularLightingTexture = gd.createTexture({
                name: "specularLighting",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        this.finalTexture = gd.createTexture({
                name: "final",
                width: deviceWidth,
                height: deviceHeight,
                format: "R8G8B8A8",
                mipmaps: false,
                renderable: true
            });

        if (this.albedoTexture &&
            this.specularTexture &&
            this.normalTexture &&
            this.depthTexture &&
            this.depthBuffer &&
            this.diffuseLightingTexture &&
            this.specularLightingTexture &&
            this.finalTexture)
        {
            var sharedTechniqueParameters = this.sharedTechniqueParameters;
            sharedTechniqueParameters.normalTexture = this.normalTexture;
            sharedTechniqueParameters.depthTexture = this.depthTexture;

            var mixTechniqueParameters = this.mixTechniqueParameters;
            mixTechniqueParameters.albedoTexture = this.albedoTexture;
            mixTechniqueParameters.specularTexture = this.specularTexture;
            mixTechniqueParameters.diffuseLightingTexture = this.diffuseLightingTexture;
            mixTechniqueParameters.specularLightingTexture = this.specularLightingTexture;

            this.baseRenderTarget = gd.createRenderTarget({
                    colorTexture0: this.albedoTexture,
                    colorTexture1: this.specularTexture,
                    colorTexture2: this.normalTexture,
                    colorTexture3: this.depthTexture,
                    depthBuffer: this.depthBuffer
                });

            this.lightingRenderTarget = gd.createRenderTarget({
                    colorTexture0: this.diffuseLightingTexture,
                    colorTexture1: this.specularLightingTexture,
                    depthBuffer: this.depthBuffer
                });

            this.mixRenderTarget = gd.createRenderTarget({
                    colorTexture0: this.finalTexture,
                    depthBuffer: this.depthBuffer
                });

            if (this.baseRenderTarget &&
                this.lightingRenderTarget &&
                this.mixRenderTarget)
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

    draw: function deferredRenderingDrawFn(gd,
                                           clearColor,
                                           drawDecalsFn,
                                           drawTransparentFn,
                                           drawDebugFn,
                                           postFXsetupFn)
    {
        var md = this.md;
        var globalTechniqueParameters = this.globalTechniqueParameters;
        var minPixelCount = this.minPixelCount;

        // Extract albedo, specular and normals
        if (gd.beginRenderTarget(this.baseRenderTarget))
        {
            gd.clear(clearColor, 1.0, 0);

            gd.drawArray(this.passes[this.passIndex.opaque], [globalTechniqueParameters], -1);

            gd.endRenderTarget();
        }

        // Prepare lights for rendering
        function pixelCountCompareFn(nodeA, nodeB)
        {
            return (nodeB.pixelCount - nodeA.pixelCount);
        }

        var l, query, light, lightInstance;
        var pointInstances = this.pointLights;
        var numPointInstances = pointInstances.length;
        if (numPointInstances)
        {
            l = 0;
            do
            {
                lightInstance = pointInstances[l];

                query = lightInstance.occlusionQuery;
                if (undefined === query)
                {
                    lightInstance.occlusionQuery = gd.createOcclusionQuery();
                    lightInstance.pixelCount = minPixelCount;
                }
                else if (null === query)
                {
                    lightInstance.pixelCount = minPixelCount;
                }
                else
                {
                    lightInstance.pixelCount = query.pixelCount;
                }

                l += 1;
            }
            while (l < numPointInstances);

            if (1 < numPointInstances)
            {
                pointInstances.sort(pixelCountCompareFn);
            }
        }

        var spotInstances = this.spotLights;
        var numSpotInstances = spotInstances.length;
        if (numSpotInstances)
        {
            l = 0;
            do
            {
                lightInstance = spotInstances[l];

                query = lightInstance.occlusionQuery;
                if (undefined === query)
                {
                    lightInstance.occlusionQuery = gd.createOcclusionQuery();
                    lightInstance.pixelCount = minPixelCount;
                }
                else if (null === query)
                {
                    lightInstance.pixelCount = minPixelCount;
                }
                else
                {
                    lightInstance.pixelCount = query.pixelCount;
                }

                l += 1;
            }
            while (l < numSpotInstances);

            if (1 < numSpotInstances)
            {
                spotInstances.sort(pixelCountCompareFn);
            }
        }

        // Shadow Maps
        var shadowMaps = this.shadowMaps;
        var globalCameraMatrix = this.globalCameraMatrix;
        if (shadowMaps)
        {
            var lightShadowMapDraw = shadowMaps.drawShadowMap;
            var sceneExtents = this.sceneExtents;
            var minExtentsHigh = (Math.max((sceneExtents[3] - sceneExtents[0]),
                                           (sceneExtents[4] - sceneExtents[1]),
                                           (sceneExtents[5] - sceneExtents[2])) / 6);
            shadowMaps.lowIndex = 0;
            shadowMaps.highIndex = 0;

            if (numPointInstances)
            {
                l = 0;
                do
                {
                    lightInstance = pointInstances[l];
                    light = lightInstance.light;
                    if (light.shadows &&
                        !light.ambient)
                    {
                        if (lightInstance.pixelCount >= minPixelCount)
                        {
                            lightShadowMapDraw.call(shadowMaps, globalCameraMatrix, minExtentsHigh, lightInstance);
                        }
                        else
                        {
                            break;
                        }
                    }

                    l += 1;
                }
                while (l < numPointInstances);
            }

            if (numSpotInstances)
            {
                l = 0;
                do
                {
                    lightInstance = spotInstances[l];
                    light = lightInstance.light;
                    if (light.shadows &&
                        !light.ambient)
                    {
                        if (lightInstance.pixelCount >= minPixelCount)
                        {
                            lightShadowMapDraw.call(shadowMaps, globalCameraMatrix, minExtentsHigh, lightInstance);
                        }
                        else
                        {
                            break;
                        }
                    }

                    l += 1;
                }
                while (l < numSpotInstances);
            }

            shadowMaps.blurShadowMaps(gd);
        }

        // Apply lights
        var setStream = gd.setStream;
        var setTechnique = gd.setTechnique;
        var setTechniqueParameters = gd.setTechniqueParameters;
        var draw = gd.draw;
        var beginOcclusionQuery = gd.beginOcclusionQuery;
        var endOcclusionQuery = gd.endOcclusionQuery;

        var sharedTechniqueParameters = this.sharedTechniqueParameters;
        var quadPrimitive = this.quadPrimitive;
        var quadVertexBuffer = this.quadVertexBuffer;
        var quadSemantics = this.quadSemantics;
        var lightPrimitive = this.lightPrimitive;
        var lightSemantics = this.lightSemantics;

        var techniqueParameters, lightTechniqueParameters, currentLightTechniqueParameters;

        if (gd.beginRenderTarget(this.lightingRenderTarget))
        {
            var firstLight = true;

            // Global lights
            var globalLights = this.sceneGlobalLights;
            var numGlobalLights = globalLights.length;
            if (numGlobalLights)
            {
                var directionalLights = [];
                var numDirectionalLights = 0;
                var ambientColor0 = 0;
                var ambientColor1 = 0;
                var ambientColor2 = 0;
                var g, globalLight;
                for (g = 0; g < numGlobalLights; g += 1)
                {
                    globalLight = globalLights[g];
                    if (!globalLight.disabled)
                    {
                        if (globalLight.ambient)
                        {
                            var globalLightColor = globalLight.color;
                            ambientColor0 += globalLightColor[0];
                            ambientColor1 += globalLightColor[1];
                            ambientColor2 += globalLightColor[2];
                        }
                        else if (globalLight.directional)
                        {
                            directionalLights[numDirectionalLights] = globalLight;
                            numDirectionalLights += 1;
                        }
                    }
                }

                if (numDirectionalLights)
                {
                    var ambientDirectionalLightTechnique = this.ambientDirectionalLightTechnique;
                    var directionalLightTechnique = this.directionalLightTechnique;

                    var viewMatrix = md.m43InverseOrthonormal(this.globalCameraMatrix);

                    setStream.call(gd, quadVertexBuffer, quadSemantics);

                    setTechnique.call(gd, ambientDirectionalLightTechnique);
                    ambientDirectionalLightTechnique.normalTexture = this.normalTexture;
                    ambientDirectionalLightTechnique.ambientColor = md.v3Build(ambientColor0, ambientColor1, ambientColor2);

                    globalLight = directionalLights[0];
                    ambientDirectionalLightTechnique.lightColor = globalLight.color;
                    ambientDirectionalLightTechnique.lightDirection = md.m43TransformVector(viewMatrix, globalLight.direction);
                    draw.call(gd, quadPrimitive, 4);

                    if (1 < numDirectionalLights)
                    {
                        setTechnique.call(gd, directionalLightTechnique);
                        directionalLightTechnique.normalTexture = this.normalTexture;

                        for (g = 1; g < numDirectionalLights; g += 1)
                        {
                            globalLight = directionalLights[g];
                            directionalLightTechnique.lightColor = globalLight.color;
                            directionalLightTechnique.lightDirection = md.m43TransformVector(viewMatrix, globalLight.direction);
                            draw.call(gd, quadPrimitive, 4);
                        }
                    }

                    firstLight = false;
                }
                else if (ambientColor0 !== 0 || ambientColor1 !== 0 || ambientColor1 !== 0)
                {
                    setStream.call(gd, quadVertexBuffer, quadSemantics);

                    setTechnique.call(gd, this.ambientLightTechnique);

                    this.ambientLightTechnique.lightColor = md.v3Build(ambientColor0, ambientColor1, ambientColor2);

                    draw.call(gd, quadPrimitive, 4);

                    firstLight = false;
                }
                else
                {
                    gd.clear(this.black);
                }
            }
            else
            {
                gd.clear(this.black);
            }

            // Local lights
            var technique, currentTechnique;

            if (numPointInstances)
            {
                var pointLightTechnique = this.pointLightTechnique;
                var pointLightSpecularTechnique = this.pointLightSpecularTechnique;
                var pointLightSpecularShadowTechnique = this.pointLightSpecularShadowTechnique;

                setStream.call(gd, this.pointLightVolumeVertexBuffer, lightSemantics);

                // draw lights
                l = 0;
                do
                {
                    lightInstance = pointInstances[l];
                    light = lightInstance.light;
                    query = lightInstance.occlusionQuery;
                    techniqueParameters = lightInstance.techniqueParameters;
                    lightTechniqueParameters = light.techniqueParameters;

                    if (lightInstance.pixelCount < minPixelCount || light.ambient)
                    {
                        firstLight = false;
                        technique = pointLightTechnique;
                    }
                    else
                    {
                        if (firstLight)
                        {
                            firstLight = false;

                            if (lightInstance.shadows)
                            {
                                technique = this.pointLightSpecularShadowOpaqueTechnique;
                            }
                            else
                            {
                                technique = this.pointLightSpecularOpaqueTechnique;
                            }
                        }
                        else
                        {
                            if (lightInstance.shadows)
                            {
                                technique = pointLightSpecularShadowTechnique;
                            }
                            else
                            {
                                technique = pointLightSpecularTechnique;
                            }
                        }
                    }

                    if (currentTechnique !== technique)
                    {
                        currentTechnique = technique;
                        currentLightTechniqueParameters = lightTechniqueParameters;

                        setTechnique.call(gd, technique);

                        setTechniqueParameters.call(gd, sharedTechniqueParameters, lightTechniqueParameters, techniqueParameters);
                    }
                    else if (currentLightTechniqueParameters !== lightTechniqueParameters)
                    {
                        currentLightTechniqueParameters = lightTechniqueParameters;
                        setTechniqueParameters.call(gd, lightTechniqueParameters, techniqueParameters);
                    }
                    else
                    {
                        setTechniqueParameters.call(gd, techniqueParameters);
                    }

                    if (null !== query)
                    {
                        if (beginOcclusionQuery.call(gd, query))
                        {
                            draw.call(gd, lightPrimitive, 14);

                            endOcclusionQuery.call(gd, query);
                        }
                    }
                    else
                    {
                        draw.call(gd, lightPrimitive, 14);
                    }

                    l += 1;
                }
                while (l < numPointInstances);
            }

            if (numSpotInstances)
            {
                var spotLightTechnique = this.spotLightTechnique;
                var spotLightShadowTechnique = this.spotLightShadowTechnique;

                setStream.call(gd, this.spotLightVolumeVertexBuffer, lightSemantics);

                l = 0;
                do
                {
                    lightInstance = spotInstances[l];
                    query = lightInstance.occlusionQuery;
                    techniqueParameters = lightInstance.techniqueParameters;
                    light = lightInstance.light;
                    lightTechniqueParameters = light.techniqueParameters;

                    if (lightInstance.shadows)
                    {
                        technique = spotLightShadowTechnique;
                    }
                    else
                    {
                        technique = spotLightTechnique;
                    }

                    if (currentTechnique !== technique)
                    {
                        currentTechnique = technique;
                        currentLightTechniqueParameters = lightTechniqueParameters;
                        setTechnique.call(gd, technique);
                        setTechniqueParameters.call(gd, sharedTechniqueParameters, lightTechniqueParameters, techniqueParameters);
                    }
                    else if (currentLightTechniqueParameters !== lightTechniqueParameters)
                    {
                        currentLightTechniqueParameters = lightTechniqueParameters;
                        setTechniqueParameters.call(gd, lightTechniqueParameters, techniqueParameters);
                    }
                    else
                    {
                        setTechniqueParameters.call(gd, techniqueParameters);
                    }

                    if (null !== query)
                    {
                        if (beginOcclusionQuery.call(gd, query))
                        {
                            draw.call(gd, lightPrimitive, 8);

                            endOcclusionQuery.call(gd, query);
                        }
                    }
                    else
                    {
                        draw.call(gd, lightPrimitive, 8);
                    }

                    l += 1;
                }
                while (l < numSpotInstances);
            }

            gd.endRenderTarget();
        }

        // Mix everything together and draw decal and transparent objects
        if (gd.beginRenderTarget(this.mixRenderTarget))
        {
            setStream.call(gd, quadVertexBuffer, quadSemantics);

            setTechnique.call(gd, this.mixTechnique);

            setTechniqueParameters.call(gd, this.mixTechniqueParameters);

            draw.call(gd, quadPrimitive, 4);

            gd.drawArray(this.passes[this.passIndex.decal], [globalTechniqueParameters], -1);

            if (drawDecalsFn)
            {
                drawDecalsFn();
            }

            // Fog volumes
            var fogInstances = this.fogLights;
            var numFogInstances = fogInstances.length;
            if (numFogInstances)
            {
                setStream.call(gd, this.pointLightVolumeVertexBuffer, lightSemantics);
                setTechnique.call(gd, this.fogLightTechnique);

                currentLightTechniqueParameters = undefined;

                l = 0;
                do
                {
                    lightInstance = fogInstances[l];
                    techniqueParameters = lightInstance.techniqueParameters;
                    light = lightInstance.light;
                    lightTechniqueParameters = light.techniqueParameters;

                    if (l === 0)
                    {
                        currentLightTechniqueParameters = lightTechniqueParameters;
                        setTechniqueParameters.call(gd, sharedTechniqueParameters, lightTechniqueParameters, techniqueParameters);
                    }
                    else if (currentLightTechniqueParameters !== lightTechniqueParameters)
                    {
                        currentLightTechniqueParameters = lightTechniqueParameters;
                        setTechniqueParameters.call(gd, lightTechniqueParameters, techniqueParameters);
                    }
                    else
                    {
                        setTechniqueParameters.call(gd, techniqueParameters);
                    }

                    draw.call(gd, lightPrimitive, 14);

                    l += 1;
                }
                while (l < numFogInstances);
            }

            gd.drawArray(this.passes[this.passIndex.transparent], [globalTechniqueParameters], 1);

            if (drawTransparentFn)
            {
                drawTransparentFn();
            }

            if (drawDebugFn)
            {
                drawDebugFn();
            }

            gd.endRenderTarget();
        }

        // Apply postfx into backbuffer
        var finalTexture = this.finalTexture;
        if (this.ft)
        {
            finalTexture = this[this.ft] || finalTexture;
        }
        else if (this.sm)
        {
            var sm = (this.sm - 1);
            var shadowMapsHigh = shadowMaps.shadowMapsHigh;
            var shadowMapsLow = shadowMaps.shadowMapsLow;
            if (sm < shadowMapsHigh.length)
            {
                finalTexture = shadowMapsHigh[sm].texture;
            }
            else
            {
                finalTexture = shadowMapsLow[sm - shadowMapsHigh.length].texture;
            }
        }
        postFXsetupFn(gd, finalTexture);

        setStream.call(gd, quadVertexBuffer, quadSemantics);

        draw.call(gd, quadPrimitive, 4);
    },

    setLightingScale: function setLightingScaleFn(scale)
    {
        this.mixTechniqueParameters.lightingScale = scale;
    },

    destroy: function destroyFn()
    {
        delete this.deferredShader;
        delete this.ambientLightTechnique;
        delete this.ambientDirectionalLightTechnique;
        delete this.directionalLightTechnique;
        delete this.spotLightTechnique;
        delete this.pointLightTechnique;
        delete this.pointLightSpecularTechnique;
        delete this.pointLightSpecularOpaqueTechnique;
        delete this.fogLightTechnique;
        delete this.mixTechnique;
        delete this.spotLightShadowTechnique;
        delete this.pointLightSpecularShadowTechnique;
        delete this.pointLightSpecularShadowOpaqueTechnique;
        delete this.sharedTechniqueParameters;
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

        delete this.quadPrimitive;
        delete this.quadSemantics;

        if (this.quadVertexBuffer)
        {
            this.quadVertexBuffer.destroy();
            delete this.quadVertexBuffer;
        }

        delete this.mixTechniqueParameters;
        delete this.globalCameraMatrix;
        delete this.globalTechniqueParameters;

        delete this.passes;
        delete this.passIndex;
        delete this.opaqueRenderables;
        delete this.decalRenderables;
        delete this.transparentRenderables;
        delete this.spotLights;
        delete this.pointLights;
        delete this.fogLights;
        delete this.sceneExtents;
        delete this.sceneGlobalLights;

        var shadowMaps = this.shadowMaps;
        if (shadowMaps)
        {
            shadowMaps.destroy();
            delete this.shadowMaps;
        }

        delete this.bufferWidth;
        delete this.bufferHeight;

        this.destroyBuffers();

        delete this.black;
        delete this.md;
    }
};


// Constructor function
DeferredRendering.create = function deferredRenderingCreateFn(gd, md, shaderManager, effectManager, settings)
{
    if (gd.maxSupported("RENDERTARGET_COLOR_TEXTURES") < 4)
    {
        return null;
    }

    var dr = new DeferredRendering();

    dr.md = md;

    dr.black = md.v4BuildZero();

    dr.numPasses = 3;
    dr.passIndex = {opaque: 0, decal: 1, transparent: 2};
    dr.passes = [[], [], []];

    dr.globalTechniqueParameters = gd.createTechniqueParameters();
    dr.sharedTechniqueParameters = gd.createTechniqueParameters();
    dr.mixTechniqueParameters = gd.createTechniqueParameters({
            lightingScale: 2.0
        });

    dr.lightPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;
    dr.quadPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;

    dr.lightSemantics = gd.createSemantics(['POSITION']);
    dr.quadSemantics = gd.createSemantics(['POSITION', 'TEXCOORD0']);

    /*jslint white: false*/
    dr.spotLightVolumeVertexBuffer = gd.createVertexBuffer({
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

    dr.pointLightVolumeVertexBuffer = gd.createVertexBuffer({
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

    dr.quadVertexBuffer = gd.createVertexBuffer({
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

    dr.deferredShader = null;

    dr.bufferWidth = 0;
    dr.bufferHeight = 0;

    dr.opaqueRenderables = [];
    dr.decalRenderables = [];
    dr.transparentRenderables = [];
    dr.spotLights = [];
    dr.pointLights = [];
    dr.fogLights = [];

    shaderManager.load("shaders/deferredlights.cgfx");
    shaderManager.load("shaders/deferredopaque.cgfx");
    shaderManager.load("shaders/deferredtransparent.cgfx");

    // Prepare effects
    var shadowMappingUpdateFn;
    var shadowMappingSkinnedUpdateFn;

    if (settings && settings.shadowRendering)
    {
        var shadowMaps = ShadowMapping.create(gd, md, shaderManager, effectManager, settings.shadowSizeLow, settings.shadowSizeHigh);
        dr.shadowMaps = shadowMaps;
        shadowMappingUpdateFn = shadowMaps.update;
        shadowMappingSkinnedUpdateFn = shadowMaps.skinnedUpdate;
    }

    var worldView; // Temp variable for reused matrix
    var flareIndexBuffer, flareSemantics;

    var m43BuildIdentity = md.m43BuildIdentity;
    var m33Mul = md.m33Mul;
    var m33InverseTranspose = md.m33InverseTranspose;

    var lightProjectionRight = md.v3Build(0.5, 0.0, 0.0);
    var lightProjectionUp    = md.v3Build(0.0, 0.5, 0.0);
    var lightProjectionAt    = md.v3Build(0.5, 0.5, 1.0);
    var lightProjectionPos   = md.v3Build(0.0, 0.0, 0.0);

    dr.lightProjection = md.m43Build(lightProjectionRight,
                                        lightProjectionUp,
                                        lightProjectionAt,
                                        lightProjectionPos);

    function deferredUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        worldView = m33Mul.call(md, matrix, camera.viewMatrix, worldView);
        techniqueParameters.worldViewInverseTranspose = m33InverseTranspose.call(md, worldView, techniqueParameters.worldViewInverseTranspose);
        this.frameUpdated = this.frameVisible;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.world = matrix;
        }
    }

    function deferredSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        worldView = m33Mul.call(md, matrix, camera.viewMatrix, worldView);
        techniqueParameters.worldViewInverseTranspose = m33InverseTranspose.call(md, worldView, techniqueParameters.worldViewInverseTranspose);
        this.frameUpdated = this.frameVisible;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.world = matrix;
        }
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function deferredPrepareFn(geometryInstance)
    {
        var meta = geometryInstance.sharedMaterial.meta;
        var rendererInfo = geometryInstance.rendererInfo;
        var drawParameters = gd.createDrawParameters();
        drawParameters.userData = {};
        geometryInstance.prepareDrawParameters(drawParameters);
        geometryInstance.drawParameters = [drawParameters];

        if (meta.transparent)
        {
            drawParameters.userData.passIndex = dr.passIndex.transparent;
        }
        else if (meta.decal)
        {
            drawParameters.userData.passIndex = dr.passIndex.decal;
        }
        else
        {
            drawParameters.userData.passIndex = dr.passIndex.opaque;
        }

        drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, meta.materialIndex);
        //Now add common for world and skin data
        drawParameters.setTechniqueParameters(0, geometryInstance.sharedMaterial.techniqueParameters);
        drawParameters.setTechniqueParameters(1, geometryInstance.techniqueParameters);
        drawParameters.technique = this.technique;

        rendererInfo.renderUpdate = this.update;

        //
        // shadows
        //
        if (dr.shadowMaps)
        {
            if (this.shadowMappingUpdate &&
                !geometryInstance.sharedMaterial.meta.noshadows)
            {
                drawParameters = gd.createDrawParameters();
                drawParameters.userData = {};
                geometryInstance.prepareDrawParameters(drawParameters);
                geometryInstance.shadowMappingDrawParameters = [drawParameters];

                drawParameters.userData.passIndex = dr.passIndex.shadow;

                rendererInfo.shadowMappingUpdate = this.shadowMappingUpdate;
                drawParameters.technique = this.shadowTechnique;

                drawParameters.sortKey = renderingCommonSortKeyFn(this.shadowTechniqueIndex, 0);
                drawParameters.setTechniqueParameters(0, geometryInstance.techniqueParameters);   //TODO: This is excessive
            }
            else
            {
                geometryInstance.sharedMaterial.meta.noshadows = true;
            }
        }
    }

    function deferredBlendUpdateFn(camera)
    {
        this.frameUpdated = this.frameVisible;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.techniqueParameters.world = node.world;
        }
    }

    function deferredBlendSkinnedUpdateFn(camera)
    {
        this.frameUpdated = this.frameVisible;
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


    function deferredEnvUpdateFn(camera)
    {
        this.frameUpdated = this.frameVisible;
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            var techniqueParameters = this.techniqueParameters;
            var matrix = node.world;
            techniqueParameters.world = matrix;
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
    }

    function deferredEnvSkinnedUpdateFn(camera)
    {
        this.frameUpdated = this.frameVisible;
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

    function deferredFlarePrepareFn(geometryInstance)
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

            deferredPrepareFn.call(this, geometryInstance);
        }
    }

    function deferredFlareUpdateFn(camera)
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
            geometry.tb = [tb0, tb1, tb2];
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

    function deferredSkyboxUpdateFn(camera)
    {
        var node = this.node;
        var worldUpdate = node.worldUpdate;
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.techniqueParameters.world = node.world;
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

        if (this.shadowMappingTechniqueName)
        {
            var shadowCallback = function shaderLoadedShadowCallbackFn(shader)
            {
                that.shadowShader = shader;
                that.shadowTechnique = shader.getTechnique(that.shadowMappingTechniqueName);
                that.shadowTechniqueIndex =  renderingCommonGetTechniqueIndexFn(that.shadowMappingTechniqueName);
            };
            shaderManager.load(this.shadowMappingShaderName, shadowCallback);
        }
    }

    var effect;
    var effectTypeData;
    var skinned = "skinned";
    var rigid = "rigid";
    var particle = "rigid";//"particle";
    var flare = "rigid"; //flare"; //TODO: change geometry type...

    //
    // rxgb_normalmap
    //
    effect = Effect.create("rxgb_normalmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    // Light filling effects

    //
    // skybox
    //
    effect = Effect.create("skybox");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "skybox",
                        update : deferredSkyboxUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // add
    //
    effect = Effect.create("add");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "add",
                        update : deferredBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "add_skinned",
                        update : deferredBlendSkinnedUpdateFn,
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

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "add_particle",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(particle, effectTypeData);

    //
    // blend
    //
    effect = Effect.create("blend");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "blend",
                        update : deferredBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "blend_skinned",
                        update : deferredBlendSkinnedUpdateFn,
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

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "blend_particle",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(particle, effectTypeData);

    //
    // translucent
    //
    effect = Effect.create("translucent");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "translucent",
                        update : deferredBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "translucent_skinned",
                        update : deferredBlendSkinnedUpdateFn,
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

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "translucent_particle",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(particle, effectTypeData);

    //
    // filter
    //
    effect = Effect.create("filter");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "filter",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "filter_skinned",
                        update : deferredBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // invfilter
    //
    effect = Effect.create("invfilter");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "invfilter",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // invfilter_particle
    //
    effect = Effect.create("invfilter_particle");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "invfilter_particle",
                        update : deferredBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(particle, effectTypeData);

    //
    // glass
    //
    effect = Effect.create("glass");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "glass",
                        update : deferredBlendUpdateFn,
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

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "glass_env",
                        update : deferredEnvUpdateFn,
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

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "modulate2",
                        update : deferredBlendUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "modulate2_skinned",
                        update : deferredBlendSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // env
    //
    effect = Effect.create("env");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "env",
                        update : deferredEnvUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "env_skinned",
                        update : deferredEnvSkinnedUpdateFn,
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

    effectTypeData = {  prepare : deferredFlarePrepareFn,
                        shaderName : "shaders/deferredtransparent.cgfx",
                        techniqueName : "add",
                        update : deferredFlareUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(flare, effectTypeData);

    //
    // blinn
    //
    effect = Effect.create("blinn");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "blinn",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "blinn_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap
    //
    effect = Effect.create("normalmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap
    //
    effect = Effect.create("normalmap_specularmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_alphamap
    //
    effect = Effect.create("normalmap_specularmap_alphamap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_alphamap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // normalmap_alphatest
    //
    effect = Effect.create("normalmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_alphatest",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_alphatest_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_alphatest
    //
    effect = Effect.create("normalmap_specularmap_alphatest");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_glowmap
    //
    effect = Effect.create("normalmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_glowmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_glowmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_glowmap
    //
    effect = Effect.create("normalmap_specularmap_glowmap");
    effectManager.add(effect);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap",
                        update : deferredUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "rigid",
                        shadowMappingUpdate : shadowMappingUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : deferredPrepareFn,
                        shaderName : "shaders/deferredopaque.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap_skinned",
                        update : deferredSkinnedUpdateFn,
                        shadowMappingShaderName : "shaders/shadowmapping.cgfx",
                        shadowMappingTechniqueName : "skinned",
                        shadowMappingUpdate : shadowMappingSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    effectManager.map("default", "blinn");
    effectManager.map("lambert", "blinn");
    effectManager.map("phong", "blinn");

    return dr;
};
