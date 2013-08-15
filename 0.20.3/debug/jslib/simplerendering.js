// Copyright (c) 2012 Turbulenz Limited

//
// SimpleRendering
//
/*global renderingCommonCreateRendererInfoFn: false,  renderingCommonGetTechniqueIndexFn: false
         renderingCommonSortKeyFn: false */
/*global TurbulenzEngine: false */
/*global Effect: false */

function SimpleRendering() {}

SimpleRendering.numPasses = 3;
SimpleRendering.passIndex =  { opaque: 0, decal: 1, transparent: 2 };

SimpleRendering.prototype =
{
    version : 1,

    updateShader: function simpleRenderingUpdateShaderFn(sm)
    {
    },

    sortRenderablesAndLights: function simpleRenderingSortRenderablesAndLightsFn(camera, scene)
    {
        var index;
        var passes = this.passes;
        var numPasses = SimpleRendering.numPasses;
        for (index = 0; index < numPasses; index += 1)
        {
            passes[index] = [];
        }

        var drawParametersArray;
        var numDrawParameters;
        var drawParameters;
        var drawParametersIndex;

        var visibleRenderables = scene.getCurrentVisibleRenderables();
        var numVisibleRenderables = visibleRenderables.length;
        if (numVisibleRenderables > 0)
        {
            var renderable, meta, pass, passIndex;
            var transparent = SimpleRendering.passIndex.transparent;
            var n = 0;
            do
            {
                renderable = visibleRenderables[n];

                var rendererInfo = renderable.rendererInfo;
                if (!rendererInfo)
                {
                    rendererInfo = renderingCommonCreateRendererInfoFn(renderable);
                }

                meta = renderable.sharedMaterial.meta;

                if (meta.far)
                {
                    renderable.distance = 1.e38;
                }

                rendererInfo.renderUpdate.call(renderable, camera);

                drawParametersArray = renderable.drawParameters;
                numDrawParameters = drawParametersArray.length;
                for (drawParametersIndex = 0; drawParametersIndex < numDrawParameters; drawParametersIndex += 1)
                {
                    drawParameters = drawParametersArray[drawParametersIndex];
                    passIndex = drawParameters.userData.passIndex;
                    if (passIndex === transparent)
                    {
                        drawParameters.sortKey = renderable.distance;
                    }
                    pass = passes[passIndex];
                    pass[pass.length] = drawParameters;
                }

                // this renderer does not care about lights

                n += 1;
            }
            while (n < numVisibleRenderables);

        }
    },

    update: function simpleRenderingUpdateFn(gd, camera, scene, currentTime)
    {
        scene.updateVisibleNodes(camera);

        this.sortRenderablesAndLights(camera, scene);

        this.eyePosition = this.md.m43Pos(camera.matrix, this.eyePosition);
        this.globalTechniqueParameters.time = currentTime;
        this.camera = camera;
        this.scene = scene;
    },

    updateBuffers: function simpleRenderingUpdateBuffersFn(gd, deviceWidth, deviceHeight)
    {
        return true;
    },

    draw: function simpleRenderingDrawFn(gd,
                                         clearColor,
                                         drawDecalsFn,
                                         drawTransparentFn,
                                         drawDebugFn)
    {
        var globalTechniqueParameters = this.globalTechniqueParameters;
        var globalTechniqueParametersArray = [globalTechniqueParameters];

        gd.clear(clearColor, 1.0, 0);

        if (this.wireframe)
        {
            this.scene.drawWireframe(gd, this.sm, this.camera, this.wireframeInfo);

            if (drawDecalsFn)
            {
                drawDecalsFn();
            }

            if (drawTransparentFn)
            {
                drawTransparentFn();
            }
        }
        else
        {

            gd.drawArray(this.passes[SimpleRendering.passIndex.opaque], globalTechniqueParametersArray, -1);

            gd.drawArray(this.passes[SimpleRendering.passIndex.decal], globalTechniqueParametersArray, -1);

            if (drawDecalsFn)
            {
                drawDecalsFn();
            }

            gd.drawArray(this.passes[SimpleRendering.passIndex.transparent], globalTechniqueParametersArray, 1);

            if (drawTransparentFn)
            {
                drawTransparentFn();
            }
        }

        if (drawDebugFn)
        {
            drawDebugFn();
        }

        this.lightPositionUpdated = false;
    },


    setGlobalLightPosition: function simpleRenderingSetGlobalLightPositionFn(pos)
    {
        this.lightPositionUpdated = true;
        this.lightPosition = pos;
    },

    setGlobalLightColor: function simpleRenderingSetGlobalLightColorFn(color)
    {
        this.globalTechniqueParameters.lightColor = color;
    },

    setAmbientColor: function simpleRenderingSetAmbientColorFn(color)
    {
        this.globalTechniqueParameters.ambientColor = color;
    },

    setDefaultTexture: function simpleRenderingSetDefaultTextureFn(tex)
    {
        this.globalTechniqueParameters.diffuse = tex;
    },

    setWireframe: function simpleRenderingSetWireframe(wireframeEnabled, wireframeInfo)
    {
        this.wireframeInfo = wireframeInfo;
        this.wireframe = wireframeEnabled;
    },

    destroy: function destroyFn()
    {
        delete this.globalTechniqueParameters;
        delete this.lightPosition;
        delete this.eyePosition;
        delete this.passes;
    }
};

//
// simplePrepareFn
//
SimpleRendering.simplePrepareFn = function simplePrepareFn(geometryInstance)
{
    var drawParameters = TurbulenzEngine.getGraphicsDevice().createDrawParameters();
    drawParameters.userData = {};
    geometryInstance.drawParameters = [drawParameters];
    geometryInstance.prepareDrawParameters(drawParameters);

    var sharedMaterial = geometryInstance.sharedMaterial;

    drawParameters.technique = this.technique;

    drawParameters.setTechniqueParameters(0, sharedMaterial.techniqueParameters);
    drawParameters.setTechniqueParameters(1, geometryInstance.techniqueParameters);

    if (sharedMaterial.meta.decal)
    {
        drawParameters.userData.passIndex = SimpleRendering.passIndex.decal;
    }
    else if (sharedMaterial.meta.transparent)
    {
        drawParameters.userData.passIndex = SimpleRendering.passIndex.transparent;
    }
    else
    {
        drawParameters.userData.passIndex = SimpleRendering.passIndex.opaque;
    }

    drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, sharedMaterial.meta.materialIndex);

    geometryInstance.rendererInfo.renderUpdate = this.update;
};

//
// Constructor function
//
SimpleRendering.create = function simpleRenderingCreateFn(gd, md, shaderManager, effectsManager)
{
    var dr = new SimpleRendering();

    dr.md = md;
    dr.sm = shaderManager;

    dr.lightPositionUpdated = true;
    dr.lightPosition = md.v3Build(1000.0, 1000.0, 0.0);

    dr.eyePosition = md.v3Build(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);

    dr.globalTechniqueParameters = gd.createTechniqueParameters({
            lightColor : md.v3BuildOne(),
            ambientColor : md.v3Build(0.2, 0.2, 0.3),
            time : 0.0
        });

    dr.passes = [[], [], []];

    var simpleCGFX = 'shaders/simplerendering.cgfx';
    var debugCGFX = 'shaders/debug.cgfx';

    shaderManager.load(simpleCGFX);
    shaderManager.load(debugCGFX);

    // Prepare effects
    var m43MulM44 = md.m43MulM44;
    var m43Inverse = md.m43Inverse;
    var m43TransformPoint = md.m43TransformPoint;
    var m33Transpose = md.m33Transpose;
    var m33InverseTranspose = md.m33InverseTranspose;

    function simpleUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        var lightPositionUpdated, worldInverse;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);

        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.worldInverse = worldInverse = m43Inverse.call(md, matrix, worldInverse);
            lightPositionUpdated = true;
        }
        else
        {
            lightPositionUpdated = dr.lightPositionUpdated;
            worldInverse = this.worldInverse;
        }

        if (lightPositionUpdated)
        {
            techniqueParameters.lightPosition = m43TransformPoint.call(md,
                                                                       worldInverse,
                                                                       dr.lightPosition,
                                                                       techniqueParameters.lightPosition);
        }

        techniqueParameters.eyePosition = m43TransformPoint.call(md,
                                                                 worldInverse,
                                                                 dr.eyePosition,
                                                                 techniqueParameters.eyePosition);
    }

    function simpleSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        var lightPositionUpdated, worldInverse;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);

        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.worldInverse = worldInverse = m43Inverse.call(md, matrix, worldInverse);
            lightPositionUpdated = true;
        }
        else
        {
            lightPositionUpdated = dr.lightPositionUpdated;
            worldInverse = this.worldInverse;
        }

        if (lightPositionUpdated)
        {
            techniqueParameters.lightPosition = m43TransformPoint.call(md,
                                                                       worldInverse,
                                                                       dr.lightPosition,
                                                                       techniqueParameters.lightPosition);
        }

        techniqueParameters.eyePosition = m43TransformPoint.call(md,
                                                                 worldInverse,
                                                                 dr.eyePosition,
                                                                 techniqueParameters.eyePosition);

        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function simpleNoLightUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, this.node.world, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
    }

    function simpleNoLightSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, this.node.world, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function simpleDebugNormalsUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
    }

    function simpleDebugNormalsSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function simpleEnvUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        var worldInverse;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);

        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.worldInverse = worldInverse = m43Inverse.call(md, matrix, worldInverse);
            techniqueParameters.worldInverseTranspose = m33Transpose.call(md, worldInverse, techniqueParameters.worldInverseTranspose);
        }
        else
        {
            worldInverse = this.worldInverse;
        }

        techniqueParameters.eyePosition = m43TransformPoint.call(md,
                                                                 worldInverse,
                                                                 dr.eyePosition,
                                                                 techniqueParameters.eyePosition);
    }

    function simpleEnvSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var node = this.node;
        var matrix = node.world;
        var worldUpdate = node.worldUpdate;

        var worldInverse;

        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);

        if (this.techniqueParametersUpdated !== worldUpdate)
        {
            this.techniqueParametersUpdated = worldUpdate;
            this.worldInverse = worldInverse = m43Inverse.call(md, matrix, worldInverse);
            techniqueParameters.worldInverseTranspose = m33Transpose.call(md, worldInverse, techniqueParameters.worldInverseTranspose);
        }
        else
        {
            worldInverse = this.worldInverse;
        }

        techniqueParameters.eyePosition = m43TransformPoint.call(md,
                                                                 worldInverse,
                                                                 dr.eyePosition,
                                                                 techniqueParameters.eyePosition);

        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function debugLinesPrepareFn(geometryInstance)
    {
        SimpleRendering.simplePrepareFn.call(this, geometryInstance);
        var techniqueParameters = geometryInstance.techniqueParameters;
        techniqueParameters.constantColor = geometryInstance.sharedMaterial.meta.constantColor;
    }

    function simplePrepareFn(geometryInstance)
    {
        SimpleRendering.simplePrepareFn.call(this, geometryInstance);
        //For untextured objects we need to choose a technique that uses materialColor instead.
        var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
        var diffuse = techniqueParameters.diffuse;
        if (diffuse === undefined)
        {
            if (!techniqueParameters.materialColor)
            {
                techniqueParameters.materialColor = md.v4BuildOne();
            }
        }
        else if (diffuse.length === 4)
        {
            techniqueParameters.diffuse = techniqueParameters.diffuse_map;
            techniqueParameters.materialColor = md.v4Build.apply(md, diffuse);
        }
    }

    function flatPrepareFn(geometryInstance)
    {
        simplePrepareFn.call(this, geometryInstance);

        //For untextured objects we need to switch techniques.
        var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
        if (!techniqueParameters.diffuse)
        {
            var shader = shaderManager.get(simpleCGFX);
            if (geometryInstance.geometryType === "skinned")
            {
                geometryInstance.drawParameters[0].technique = shader.getTechnique("flat_skinned");
            }
            else
            {
                geometryInstance.drawParameters[0].technique = shader.getTechnique("flat");
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
    }

    dr.simplePrepareFn = simplePrepareFn;
    dr.simpleUpdateFn = simpleUpdateFn;

    var effect;
    var effectTypeData;
    var skinned = "skinned";
    var rigid = "rigid";

    // Register the effects

    //
    // constant
    //
    effect = Effect.create("constant");
    effectsManager.add(effect);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "flat",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "flat_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // lambert
    //
    effect = Effect.create("lambert");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blinn
    //
    effect = Effect.create("blinn");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blinn_nocull
    //
    effect = Effect.create("blinn_nocull");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_nocull",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned_nocull",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // phong
    //
    effect = Effect.create("phong");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_lines_constant
    //
    effect = Effect.create("debug_lines_constant");
    effectsManager.add(effect);

    effectTypeData = {  prepare : debugLinesPrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_lines_constant",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // debug_normals
    //
    effect = Effect.create("debug_normals");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_normals",
                        update : simpleDebugNormalsUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_normals_skinned",
                        update : simpleDebugNormalsSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_tangents
    //
    effect = Effect.create("debug_tangents");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_tangents",
                        update : simpleDebugNormalsUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_tangents_skinned",
                        update : simpleDebugNormalsSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_binormals
    //
    effect = Effect.create("debug_binormals");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_binormals",
                        update : simpleDebugNormalsUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : debugCGFX,
                        techniqueName : "debug_binormals_skinned",
                        update : simpleDebugNormalsSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap
    //
    effect = Effect.create("normalmap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap
    //
    effect = Effect.create("normalmap_specularmap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_alphamap
    //
    effect = Effect.create("normalmap_specularmap_alphamap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_alphamap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // normalmap_alphatest
    //
    effect = Effect.create("normalmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_alphatest",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_alphatest_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);


    //
    // normalmap_specularmap_alphatest
    //
    effect = Effect.create("normalmap_specularmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_alphatest",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_alphatest_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_glowmap
    //
    effect = Effect.create("normalmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_glowmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_glowmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_glowmap
    //
    effect = Effect.create("normalmap_specularmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_glowmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_glowmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap
    //
    effect = Effect.create("rxgb_normalmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_alphatest",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_alphatest_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_alphatest",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_alphatest_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_glowmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_glowmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_glowmap",
                        update : simpleUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blinn_specularmap_glowmap_skinned",
                        update : simpleSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add
    //
    effect = Effect.create("add");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "add",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "add_skinned",
                        update : simpleNoLightSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add_particle
    //
    effect = Effect.create("add_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "add_particle",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // blend
    //
    effect = Effect.create("blend");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blend",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blend_skinned",
                        update : simpleNoLightSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blend_particle
    //
    effect = Effect.create("blend_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "blend_particle",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // translucent
    //
    effect = Effect.create("translucent");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "translucent",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "translucent_skinned",
                        update : simpleNoLightSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // translucent_particle
    //
    effect = Effect.create("translucent_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "translucent_particle",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // filter
    //
    effect = Effect.create("filter");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "filter",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "filter_skinned",
                        update : simpleNoLightSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // invfilter
    //
    effect = Effect.create("invfilter");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "invfilter",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // invfilter_particle
    //
    effect = Effect.create("invfilter_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "invfilter_particle",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass
    //
    effect = Effect.create("glass");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "glass",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass_env
    //
    effect = Effect.create("glass_env");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "glass_env",
                        update : simpleEnvUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // modulate2
    //
    effect = Effect.create("modulate2");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "modulate2",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "modulate2_skinned",
                        update : simpleNoLightSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // skybox
    //
    effect = Effect.create("skybox");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "skybox",
                        update : simpleEnvUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // env
    //
    effect = Effect.create("env");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "env",
                        update : simpleEnvUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "env_skinned",
                        update : simpleEnvSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // flare
    //
    effect = Effect.create("flare");
    effectsManager.add(effect);
    effectTypeData = {  prepare : simplePrepareFn,
                        shaderName : simpleCGFX,
                        techniqueName : "add",
                        update : simpleNoLightUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectsManager.map("simple", "blinn");

    return dr;
};
