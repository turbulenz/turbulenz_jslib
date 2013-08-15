// Copyright (c) 2009-2011 Turbulenz Limited

//
// DefaultRendering
//
/*global renderingCommonCreateRendererInfoFn: false,  renderingCommonGetTechniqueIndexFn: false
         renderingCommonSortKeyFn: false */

function DefaultRendering() {}

DefaultRendering.numPasses = 3;
DefaultRendering.passIndex =  { opaque: 0, decal: 1, transparent: 2 };

DefaultRendering.prototype =
{
    version : 1,

    updateShader: function defaultRenderingUpdateShaderFn(sm)
    {
    },

    sortRenderablesAndLights: function defaultRenderingSortRenderablesAndLightsFn(camera, scene)
    {
        var index;
        var passes = this.passes;
        var numPasses = DefaultRendering.numPasses;
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
            var transparent = DefaultRendering.passIndex.transparent;
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

    update: function defaultRenderingUpdateFn(gd, camera, scene, currentTime)
    {
        scene.updateVisibleNodes(camera);

        this.sortRenderablesAndLights(camera, scene);

        var md = this.md;
        var globalTechniqueParameters = this.globalTechniqueParameters;
        globalTechniqueParameters.eyePosition = md.m43Pos(camera.matrix, globalTechniqueParameters.eyePosition);
        globalTechniqueParameters.time = currentTime;
        this.camera = camera;
        this.scene = scene;
    },

    updateBuffers: function defaultRenderingUpdateBuffersFn(gd, deviceWidth, deviceHeight)
    {
        return true;
    },

    draw: function defaultRenderingDrawFn(gd,
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

            gd.drawArray(this.passes[DefaultRendering.passIndex.opaque], globalTechniqueParametersArray, -1);

            gd.drawArray(this.passes[DefaultRendering.passIndex.decal], globalTechniqueParametersArray, -1);

            if (drawDecalsFn)
            {
                drawDecalsFn();
            }

            gd.drawArray(this.passes[DefaultRendering.passIndex.transparent], globalTechniqueParametersArray, 1);

            if (drawTransparentFn)
            {
                drawTransparentFn();
            }
        }

        if (drawDebugFn)
        {
            drawDebugFn();
        }
    },


    setGlobalLightPosition: function defaultRenderingSetGlobalLightPositionFn(pos)
    {
        this.globalTechniqueParameters.lightPosition = pos;
    },

    setGlobalLightColor: function defaultRenderingSetGlobalLightColorFn(color)
    {
        this.globalTechniqueParameters.lightColor = color;
    },

    setAmbientColor: function defaultRenderingSetAmbientColorFn(color)
    {
        this.globalTechniqueParameters.ambientColor = color;
    },

    setDefaultTexture: function defaultRenderingSetDefaultTextureFn(tex)
    {
        this.globalTechniqueParameters.diffuse = tex;
    },

    setWireframe: function defaultRenderingSetWireframe(wireframeEnabled, wireframeInfo)
    {
        this.wireframeInfo = wireframeInfo;
        this.wireframe = wireframeEnabled;
    },

    destroy: function destroyFn()
    {
        delete this.globalTechniqueParameters;
        delete this.passes;
    }
};

//
// defaultPrepareFn
//
DefaultRendering.defaultPrepareFn = function defaultPrepareFn(geometryInstance)
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
        drawParameters.userData.passIndex = DefaultRendering.passIndex.decal;
    }
    else if (sharedMaterial.meta.transparent)
    {
        drawParameters.userData.passIndex = DefaultRendering.passIndex.transparent;
    }
    else
    {
        drawParameters.userData.passIndex = DefaultRendering.passIndex.opaque;
    }

    drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, sharedMaterial.meta.materialIndex);

    geometryInstance.rendererInfo.renderUpdate = this.update;
};

//
// Constructor function
//
DefaultRendering.create = function defaultRenderingCreateFn(gd, md, shaderManager, effectsManager)
{
    var dr = new DefaultRendering();

    dr.md = md;
    dr.sm = shaderManager;

    dr.globalTechniqueParameters = gd.createTechniqueParameters({
            lightPosition : md.v3Build(1000.0, 1000.0, 0.0),
            lightColor : md.v3BuildOne(),
            ambientColor : md.v3Build(0.2, 0.2, 0.3),
            eyePosition : md.v3BuildZero(),
            time : 0.0
        });

    dr.passes = [[], [], []];

    shaderManager.load("shaders/defaultrendering.cgfx");
    shaderManager.load("shaders/standard.cgfx");
    shaderManager.load("shaders/debug.cgfx");

    // Prepare effects
    var m43MulM44 = md.m43MulM44;
    var m43Transpose = md.m43Transpose;
    var m33InverseTranspose = md.m33InverseTranspose;

    function defaultUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var matrix = this.node.world;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        if (this.techniqueParametersUpdated !== this.node.worldUpdate)
        {
            this.techniqueParametersUpdated = this.node.worldUpdate;
            techniqueParameters.worldTranspose = m43Transpose.call(md, matrix, techniqueParameters.worldTranspose);
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
    }

    function defaultSkinnedUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var matrix = this.node.world;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        if (this.techniqueParametersUpdated !== this.node.worldUpdate)
        {
            this.techniqueParametersUpdated = this.node.worldUpdate;
            techniqueParameters.worldTranspose = m43Transpose.call(md, matrix, techniqueParameters.worldTranspose);
            techniqueParameters.worldInverseTranspose = m33InverseTranspose.call(md, matrix, techniqueParameters.worldInverseTranspose);
        }
        var skinController = this.skinController;
        if (skinController)
        {
            techniqueParameters.skinBones = skinController.output;
            skinController.update();
        }
    }

    function defaultBlendUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, this.node.world, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
    }

    function defaultBlendSkinnedUpdateFn(camera)
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

    function defaultSkyboxUpdateFn(camera)
    {
        var techniqueParameters = this.techniqueParameters;
        var matrix = this.node.world;
        techniqueParameters.worldViewProjection = m43MulM44.call(md, matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        if (this.techniqueParametersUpdated !== this.node.worldUpdate)
        {
            this.techniqueParametersUpdated = this.node.worldUpdate;
            techniqueParameters.worldTranspose = m43Transpose.call(md, matrix, techniqueParameters.worldTranspose);
        }
    }

    function debugLinesPrepareFn(geometryInstance)
    {
        DefaultRendering.defaultPrepareFn.call(this, geometryInstance);
        var techniqueParameters = geometryInstance.techniqueParameters;
        techniqueParameters.constantColor = geometryInstance.sharedMaterial.meta.constantColor;
    }

    function defaultPrepareFn(geometryInstance)
    {
        DefaultRendering.defaultPrepareFn.call(this, geometryInstance);
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
        defaultPrepareFn.call(this, geometryInstance);

        //For untextured objects we need to switch techniques.
        var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
        if (!techniqueParameters.diffuse)
        {
            var shader = shaderManager.get("shaders/standard.cgfx");
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

    dr.defaultPrepareFn = defaultPrepareFn;
    dr.defaultUpdateFn = defaultUpdateFn;

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
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "flat",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "flat_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // lambert
    //
    effect = Effect.create("lambert");
    effectsManager.add(effect);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "lambert",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "lambert_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blinn
    //
    effect = Effect.create("blinn");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blinn",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blinn_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blinn_nocull
    //
    effect = Effect.create("blinn_nocull");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blinn_nocull",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blinn_skinned_nocull",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // phong
    //
    effect = Effect.create("phong");
    effectsManager.add(effect);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "phong",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : flatPrepareFn,
                        shaderName : "shaders/standard.cgfx",
                        techniqueName : "phong_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_lines_constant
    //
    effect = Effect.create("debug_lines_constant");
    effectsManager.add(effect);

    effectTypeData = {  prepare : debugLinesPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_lines_constant",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // debug_normals
    //
    effect = Effect.create("debug_normals");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_normals",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_normals_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_tangents
    //
    effect = Effect.create("debug_tangents");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_tangents",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_tangents_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // debug_binormals
    //
    effect = Effect.create("debug_binormals");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_binormals",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/debug.cgfx",
                        techniqueName : "debug_binormals_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap
    //
    effect = Effect.create("normalmap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap
    //
    effect = Effect.create("normalmap_specularmap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_alphamap
    //
    effect = Effect.create("normalmap_specularmap_alphamap");
    effectsManager.add(effect);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphamap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // normalmap_alphatest
    //
    effect = Effect.create("normalmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_alphatest",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_alphatest_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);


    //
    // normalmap_specularmap_alphatest
    //
    effect = Effect.create("normalmap_specularmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_alphatest_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_glowmap
    //
    effect = Effect.create("normalmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_glowmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_glowmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // normalmap_specularmap_glowmap
    //
    effect = Effect.create("normalmap_specularmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "normalmap_specularmap_glowmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap
    //
    effect = Effect.create("rxgb_normalmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_alphatest_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_alphatest
    //
    effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_alphatest_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_glowmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // rxgb_normalmap_specularmap_glowmap
    //
    effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "rxgb_normalmap_specularmap_glowmap_skinned",
                        update : defaultSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add
    //
    effect = Effect.create("add");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "add",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "add_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // add_particle
    //
    effect = Effect.create("add_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "add_particle",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // blend
    //
    effect = Effect.create("blend");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blend",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blend_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // blend_particle
    //
    effect = Effect.create("blend_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "blend_particle",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // translucent
    //
    effect = Effect.create("translucent");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "translucent",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "translucent_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // translucent_particle
    //
    effect = Effect.create("translucent_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "translucent_particle",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // filter
    //
    effect = Effect.create("filter");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "filter",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "filter_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // invfilter
    //
    effect = Effect.create("invfilter");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "invfilter",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // invfilter_particle
    //
    effect = Effect.create("invfilter_particle");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "invfilter_particle",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass
    //
    effect = Effect.create("glass");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "glass",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // glass_env
    //
    effect = Effect.create("glass_env");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "glass_env",
                        update : defaultUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // modulate2
    //
    effect = Effect.create("modulate2");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "modulate2",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "modulate2_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // skybox
    //
    effect = Effect.create("skybox");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "skybox",
                        update : defaultSkyboxUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    //
    // env
    //
    effect = Effect.create("env");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "env",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "env_skinned",
                        update : defaultBlendSkinnedUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(skinned, effectTypeData);

    //
    // flare
    //
    effect = Effect.create("flare");
    effectsManager.add(effect);
    effectTypeData = {  prepare : defaultPrepareFn,
                        shaderName : "shaders/defaultrendering.cgfx",
                        techniqueName : "add",
                        update : defaultBlendUpdateFn,
                        loadTechniques : loadTechniques };
    effectTypeData.loadTechniques(shaderManager);
    effect.add(rigid, effectTypeData);

    effectsManager.map("default", "blinn");

    return dr;
};
