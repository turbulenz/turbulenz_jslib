// Copyright (c) 2009-2012 Turbulenz Limited

function DrawPrimitives() {}
DrawPrimitives.prototype =
{
    version : 1,

    device : null,
    technique : null,

    rectPositionsParameters :
    {
        numVertices: 4,
        attributes: ['SHORT2'],
        dynamic: true
    },

    rectNumVertices: 4,

    rectPositions : null,
    rectSemantics: ['POSITION'],

    rectTexPositionsParameters :
    {
        numVertices: 4,
        attributes: ['SHORT2', 'SHORT2'],
        dynamic: true
    },

    rectTexNumVertices: 4,

    rectTexPositions : null,
    rectTexSemantics: ['POSITION', 'TEXCOORD0'],

    boxPositionsParameters :
    {
        numVertices: 36,
        attributes: ['FLOAT3'],
        dynamic: true
    },

    boxNumVertices: 36,

    boxPositions : null,
    boxSemantics: ['POSITION'],

    initalize : function initalizeFn(gd, shaderPath)
    {
        this.device = gd;
        this.boxPrimitive = gd.PRIMITIVE_TRIANGLES;
        this.boxPositions = gd.createVertexBuffer(this.boxPositionsParameters);
        this.rectPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;
        this.rectPositions = gd.createVertexBuffer(this.rectPositionsParameters);
        this.rectTexPrimitive = gd.PRIMITIVE_TRIANGLE_STRIP;
        this.rectTexPositions = gd.createVertexBuffer(this.rectTexPositionsParameters);

        Utilities.assert((this.boxPositions && this.rectPositions && this.rectTexPositions),
                         "Buffers not created.");

        if (this.boxPositions &&
            this.rectPositions &&
            this.rectTexPositions)
        {
            var that = this;
            var fileName = shaderPath + this.shaderName;
            TurbulenzEngine.request(fileName,
                            function shaderReceivedFn(shaderText)
                            {
                                if (shaderText)
                                {
                                    var shaderParameters = JSON.parse(shaderText);
                                    var shader = gd.createShader(shaderParameters);
                                    if (shader)
                                    {
                                        that.technique = shader.getTechnique(that.techniqueName);
                                    }
                                }
                            });
        }
    },

    setTechnique : function setTechniqueFn(technique, isTechnique2D)
    {
        this.technique = technique;
        this.isTechnique2D = isTechnique2D;
    },

    updateParameters : function updateParametersFn(params)
    {
        var gd = this.device;
        var parameters = {
            worldViewProjection : null
        };

        for (var p in params)
        {
            if (params.hasOwnProperty(p))
            {
                parameters[p] = params[p];
            }
        }

        this.techniqueParameters = gd.createTechniqueParameters(parameters);
    },

    update2DTex : function update2DTexFn(posa, posb)
    {
        var positions = this.rectTexPositions;
        var writer = positions.map();
        if (writer)
        {
            var v = [
                [ posa[0], posa[1] ],
                [ posa[0], posb[1] ],
                [ posb[0], posb[1] ],
                [ posb[0], posa[1] ]
            ];

            var t = [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0]
            ];

            var index = [
                0, 1, 3, 2
            ];

            var i, j;
            for (i = 0; i < 4; i += 1)
            {
                j = index[i];
                writer(v[j], t[j]);
            }

            positions.unmap(writer);
            this.isTextured = true;
        }
    },

    update2D : function update2DFn(posa, posb)
    {
        var positions = this.rectPositions;
        var writer = positions.map();
        if (writer)
        {
            var v = [
                [ posa[0], posa[1] ],
                [ posa[0], posb[1] ],
                [ posb[0], posb[1] ],
                [ posb[0], posa[1] ]
            ];

            var index = [
                0, 1, 3, 2
            ];

            var i;
            for (i = 0; i < 4; i += 1)
            {
                writer(v[index[i]]);
            }

            positions.unmap(writer);
        }
    },

    update : function updateFn(posa, posb)
    {
        var positions = this.boxPositions;
        var writer = positions.map();
        if (writer)
        {
            var v = [
                [ posa[0], posa[1], posa[2] ],
                [ posa[0], posa[1], posb[2] ],
                [ posa[0], posb[1], posa[2] ],
                [ posa[0], posb[1], posb[2] ],
                [ posb[0], posa[1], posa[2] ],
                [ posb[0], posa[1], posb[2] ],
                [ posb[0], posb[1], posa[2] ],
                [ posb[0], posb[1], posb[2] ]
            ];

            var index = [
                0, 2, 1,    1, 2, 3,
                0, 1, 4,    1, 5, 4,
                1, 3, 5,    3, 7, 5,
                3, 2, 7,    2, 6, 7,
                0, 4, 2,    2, 4, 6,
                4, 5, 6,    5, 7, 6
            ];

            var i;
            for (i = 0; i < 3 * 12; i += 1)
            {
                writer(v[index[i]]);
            }

            positions.unmap(writer);
        }
    },

    dispatch : function dispatchFn(camera)
    {
        var gd = this.device;
        var technique = this.technique;
        var isTechnique2D = this.isTechnique2D;
        var isTextured = this.isTextured;

        var vertexBuffer, semantics, primitive, numVertices;

        if (isTechnique2D)
        {
            if (isTextured)
            {
                vertexBuffer = this.rectTexPositions;
                semantics = this.rectTexSemantics;
                primitive = this.rectTexPrimitive;
                numVertices = this.rectTexNumVertices;
            }
            else
            {
                vertexBuffer = this.rectPositions;
                semantics = this.rectSemantics;
                primitive = this.rectPrimitive;
                numVertices = this.rectNumVertices;
            }
        }
        else
        {
            vertexBuffer = this.boxPositions;
            semantics = this.boxSemantics;
            primitive = this.boxPrimitive;
            numVertices = this.boxNumVertices;
        }

        var techniqueParameters = this.techniqueParameters;

        if (technique !== null)
        {
            techniqueParameters.worldViewProjection = camera.viewProjectionMatrix;

            gd.setTechnique(technique);
            gd.setTechniqueParameters(techniqueParameters);
            gd.setStream(vertexBuffer, semantics);
            gd.draw(primitive, numVertices);
        }
    }
};

// Constructor function
DrawPrimitives.create = function drawPrimitivesCreateFn(gd, shaderPath, shaderName, techniqueName)
{
    var dp = new DrawPrimitives();
    dp.shaderName = shaderName ? shaderName: "generic3D.cgfx";
    dp.techniqueName = techniqueName ? techniqueName: "constantColor3D";
    dp.isTechnique2D = false;
    dp.isTextured = false;
    dp.initalize(gd, shaderPath);
    return dp;
};
