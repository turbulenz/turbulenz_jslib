// Copyright (c) 2010-2011 Turbulenz Limited
/*global TurbulenzEngine: false */

//
// Light
//
function Light() {}

Light.prototype =
{
    version: 1,

    //
    // clone
    //
    clone : function lightCloneFn()
    {
        var clone = Light.create(this);
        return clone;
    },

    //
    // isGlobal
    //
    isGlobal : function lightIsGlobalFn()
    {
        return this.global;
    }
};

//
// Light create
//
Light.create = function lightCreateFn(params)
{
    var light = new Light();

    var mathDevice = TurbulenzEngine.getMathDevice();
    var v3Build = mathDevice.v3Build;

    var abs = Math.abs;
    var max = Math.max;

    if (params.name)
    {
        light.name = params.name;
    }

    light.color = params.color && params.color.length ? params.color :  mathDevice.v3BuildOne();

    if (params.directional)
    {
        light.directional = true;
    }
    else if (params.spot)
    {
        light.spot = true;
    }
    else if (params.ambient)
    {
        light.ambient = true;
    }
    else
    {
        light.point = true;
    }

    light.origin = params.origin;

    var target = params.target;
    if (target || light.spot)
    {
        if (!target)
        {
            target = v3Build.call(mathDevice, 0, 0, -(params.radius || 1));
        }

        var right = params.right || mathDevice.v3BuildXAxis();
        var up = params.up || mathDevice.v3BuildYAxis();
        var end = params.end || target;

        light.frustum = mathDevice.m33Build(right, up, end);
        var d0 = (abs(right[0]) + abs(up[0]));
        var d1 = (abs(right[1]) + abs(up[1]));
        var d2 = (abs(right[2]) + abs(up[2]));
        var e0 = end[0];
        var e1 = end[1];
        var e2 = end[2];
        var c0, c1, c2;
        var start = params.start;
        if (start)
        {
            target = mathDevice.v3Normalize(target);
            light.frustumNear = (mathDevice.v3Dot(target, start) / mathDevice.v3Dot(target, end));
            c0 = ((e0 + start[0]) * 0.5);
            c1 = ((e1 + start[1]) * 0.5);
            c2 = ((e2 + start[2]) * 0.5);
        }
        else
        {
            light.frustumNear = 0;
            c0 = (e0 * 0.5);
            c1 = (e1 * 0.5);
            c2 = (e2 * 0.5);
        }
        light.center = mathDevice.v3Build(c0, c1, c2);
        light.halfExtents = mathDevice.v3Build(max(abs(e0 - d0 - c0), abs(e0 + d0 - c0)),
                                               max(abs(e1 - d1 - c1), abs(e1 + d1 - c1)),
                                               max(abs(e2 - d2 - c2), abs(e2 + d2 - c2)));
    }
    else
    {
        var halfExtents = params.halfExtents;
        if (halfExtents)
        {
            light.halfExtents = (halfExtents.length && halfExtents) || mathDevice.v3BuildZero();
        }
        else
        {
            var radius = params.radius;
            if (radius)
            {
                light.radius = radius;
                light.halfExtents = mathDevice.v3ScalarBuild(radius);
            }
        }
    }

    light.direction = params.direction;

    if (params.shadows || params.dynamicshadows)
    {
        light.shadows = true;

        if (params.dynamicshadows)
        {
            light.dynamicshadows = true;
        }
    }

    if (params.disabled)
    {
        light.disabled = true;
    }

    var material = params.material;
    if (material)
    {
        var techniqueParameters = material.techniqueParameters;

        light.techniqueParameters = techniqueParameters;

        var metaMaterial = material.meta;
        if (metaMaterial)
        {
            var ambient = metaMaterial.ambient;
            if (ambient)
            {
                light.ambient = true;
            }

            var fog = metaMaterial.fog;
            if (fog)
            {
                light.fog = true;
            }
        }
    }

    if (!light.halfExtents &&
        !light.radius &&
        !light.target)
    {
        light.global = true;
    }

    return light;
};


//
// Light Instance
//
function LightInstance() {}

LightInstance.prototype =
{
    version: 1,

    //
    // setMaterial
    //
    setMaterial : function lightInstanceSetMaterialFn(material)
    {
        // TODO: this is really being set on the light not the instance so
        // we either need to move the materials and meta to the instance or remove this
        // and create Scene.setLightMaterial

        this.light.sharedMaterial = material;

        var meta = material.meta;
        if (material.meta)
        {
            var ambient = meta.ambient;
            if (ambient)
            {
                this.light.ambient = true;
            }
            else
            {
                if (this.light.ambient)
                {
                    delete this.light.ambient;
                }
            }

            var fog = meta.fog;
            if (fog)
            {
                this.light.fog = true;
            }
            else
            {
                if (this.light.fog)
                {
                    delete this.light.fog;
                }
            }
        }
    },

    //
    // setNode
    //
    setNode : function lightInstanceSetNodeFn(node)
    {
        this.node = node;
        delete this.worldExtentsUpdate;
    },

    //
    // getNode
    //
    getNode : function lightInstanceGetNodeFn(node)
    {
        return this.node;
    },

    //
    // getWorldExtents
    //
    getWorldExtents: function  lightInstanceGetWorldExtentsFn()
    {
        //Note: This method is only valid on a clean node.
        var worldExtents = this.worldExtents;
        var node = this.node;
        if (node.worldUpdate !== this.worldExtentsUpdate)
        {
            //Note: delete this.worldExtentsUpdate if local extents change.
            // If we need custom extents we can set worldExtentsUpdate to some distinct value <0.
            this.worldExtentsUpdate = node.worldUpdate;

            var light = this.light;
            var center = light.center;
            var halfExtents = light.halfExtents;

            var world = node.world;
            var m0 = world[0];
            var m1 = world[1];
            var m2 = world[2];
            var m3 = world[3];
            var m4 = world[4];
            var m5 = world[5];
            var m6 = world[6];
            var m7 = world[7];
            var m8 = world[8];

            var ct0 = world[9];
            var ct1 = world[10];
            var ct2 = world[11];
            if (center)
            {
                var c0 = center[0];
                var c1 = center[1];
                var c2 = center[2];
                ct0 += (m0 * c0 + m3 * c1 + m6 * c2);
                ct1 += (m1 * c0 + m4 * c1 + m7 * c2);
                ct2 += (m2 * c0 + m5 * c1 + m8 * c2);
            }

            var h0 = halfExtents[0];
            var h1 = halfExtents[1];
            var h2 = halfExtents[2];
            var ht0 = ((m0 < 0 ? -m0 : m0) * h0 + (m3 < 0 ? -m3 : m3) * h1 + (m6 < 0 ? -m6 : m6) * h2);
            var ht1 = ((m1 < 0 ? -m1 : m1) * h0 + (m4 < 0 ? -m4 : m4) * h1 + (m7 < 0 ? -m7 : m7) * h2);
            var ht2 = ((m2 < 0 ? -m2 : m2) * h0 + (m5 < 0 ? -m5 : m5) * h1 + (m8 < 0 ? -m8 : m8) * h2);

            worldExtents[0] = (ct0 - ht0);
            worldExtents[1] = (ct1 - ht1);
            worldExtents[2] = (ct2 - ht2);
            worldExtents[3] = (ct0 + ht0);
            worldExtents[4] = (ct1 + ht1);
            worldExtents[5] = (ct2 + ht2);
        }
        return worldExtents;
    },

    //
    // clone
    //
    clone: function lightInstanceCloneFn()
    {
        var newInstance = LightInstance.create(this.light);
        return newInstance;
    }
};

//
// Constructor function
//
LightInstance.create = function lightInstanceCreateFn(light)
{
    var instance = new LightInstance();

    instance.light = light;
    instance.worldExtents = [];

    return instance;
};
