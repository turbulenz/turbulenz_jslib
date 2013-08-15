// Copyright (c) 2011 Turbulenz Limited
/*global window*/
"use strict";


function webGLPhysicsClone(dst, src)
{
    for (var p in src)
    {
        if (src.hasOwnProperty(p))
        {
            var v = src[p];
            if (typeof v === "object")
            {
                if ("slice" in v)
                {
                    v = v.slice();
                }
                else
                {
                    v = webGLPhysicsClone({}, v);
                }
            }
            dst[p] = v;
        }
    }
    return dst;
}


//
// WebGL Physics Shapes
//
function WebGLPhysicsPlaneShape(params)
{
    var normal = params.normal;
    var distance = params.distance;
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var maxValue = Number.MAX_VALUE;
    var abs = Math.abs;

    this.type = "PLANE";
    this.normal = normal;
    this.distance = distance;
    this.radius = maxValue;
    this.margin = margin;
    if (abs(normal[0]) === 1)
    {
        this.halfExtents = [abs(distance), maxValue, maxValue];
    }
    else if (abs(normal[1]) === 1)
    {
        this.halfExtents = [maxValue, abs(distance), maxValue];
    }
    else if (abs(normal[2]) === 1)
    {
        this.halfExtents = [maxValue, maxValue, abs(distance)];
    }
    this.inertia = [0, 0, 0];
}

function WebGLPhysicsSphereShape(params)
{
    var radius = params.radius;
    var i = (0.4 * radius * radius);

    this.type = "SPHERE";
    this.radius = radius;
    this.margin = radius;
    this.halfExtents = [radius, radius, radius];
    this.inertia = [i, i, i];
}

function WebGLPhysicsBoxShape(params)
{
    var halfExtents = params.halfExtents;
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var h0 = (halfExtents[0] + margin);
    var h1 = (halfExtents[1] + margin);
    var h2 = (halfExtents[2] + margin);

    var lx = (2.0 * h0);
    var ly = (2.0 * h1);
    var lz = (2.0 * h2);
    lx *= lx;
    ly *= ly;
    lz *= lz;

    this.type = "BOX";
    this.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.inertia = [(1.0 / 12.0) * (ly + lz),
                    (1.0 / 12.0) * (lx + lz),
                    (1.0 / 12.0) * (lx + ly)];
}

function WebGLPhysicsCapsuleShape(params)
{
    var radius = params.radius;
    var height = params.height;
    var halfHeight = (0.5 * height);
    var maxRadius = (radius + halfHeight);
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var h0 = (radius + margin);
    var h1 = (maxRadius + margin);
    var h2 = (radius + margin);

    var lx = (2.0 * h0);
    var ly = (2.0 * h1);
    var lz = (2.0 * h2);
    lx *= lx;
    ly *= ly;
    lz *= lz;

    var massRatio = (1.0 / 12.0);

    this.type = "CAPSULE";
    this.radius = maxRadius;
    this.halfHeight = halfHeight;
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.inertia = [massRatio * (ly + lz),
                    massRatio * (lx + lz),
                    massRatio * (lx + ly)];
}

function WebGLPhysicsCylinderShape(params)
{
    var halfExtents = params.halfExtents;
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var h0 = (halfExtents[0] + margin);
    var h1 = (halfExtents[1] + margin);
    var h2 = (halfExtents[2] + margin);

    var radius2 = (h0 * h0);
    var height2 = (4.0 * h1 * h1);

    var t1 = (((1.0 / 12.0) * height2) + ((1.0 / 4.0) * radius2));
    var t2 = ((1.0 / 2.0) * radius2);

    this.type = "CYLINDER";
    this.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.inertia = [t1, t2, t1];
}

function WebGLPhysicsConeShape(params)
{
    var radius = params.radius;
    var height = params.height;
    var halfHeight = (0.5 * height);
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var h0 = (radius + margin);
    var h1 = (halfHeight + margin);
    var h2 = (radius + margin);

    var lx = (2.0 * h0);
    var ly = (2.0 * h1);
    var lz = (2.0 * h2);
    lx *= lx;
    ly *= ly;
    lz *= lz;

    var massRatio = (1.0 / 12.0);

    this.type = "CONE";
    this.height = height;
    this.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.inertia = [massRatio * (ly + lz),
                    massRatio * (lx + lz),
                    massRatio * (lx + ly)];
}

function WebGLPhysicsTriangleMeshShape(params)
{
    var triangleArray = params.triangleArray;
    var quantize = params.quantize;
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var extents = triangleArray.extents;
    var e0 = extents[0];
    var e1 = extents[1];
    var e2 = extents[2];
    var e3 = extents[3];
    var e4 = extents[4];
    var e5 = extents[5];

    var h0 = ((0.5 * (e3 - e0)) + margin);
    var h1 = ((0.5 * (e4 - e1)) + margin);
    var h2 = ((0.5 * (e5 - e2)) + margin);
    var c0 = (0.5 * (e0 + e3));
    var c1 = (0.5 * (e1 + e4));
    var c2 = (0.5 * (e2 + e5));

    this.type = "TRIANGLE_MESH";
    this.triangleArray = triangleArray;
    this.quantize = quantize;
    this.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.center = [c0, c1, c2];
    this.inertia = [0, 0, 0];
}

function WebGLPhysicsConvexHullShape(params)
{
    var points = params.points;
    var margin = params.margin;
    if (margin === undefined)
    {
        margin = 0.04;
    }

    var min0 = points[0];
    var min1 = points[1];
    var min2 = points[2];
    var max0 = min0;
    var max1 = min1;
    var max2 = min2;
    var maxN = points.length;
    for (var n = 3; n < maxN; n += 3)
    {
        var v0 = points[n];
        var v1 = points[n + 1];
        var v2 = points[n + 2];
        if (min0 > v0)
        {
            min0 = v0;
        }
        else if (max0 < v0)
        {
            max0 = v0;
        }
        if (min1 > v1)
        {
            min1 = v1;
        }
        else if (max1 < v1)
        {
            max1 = v1;
        }
        if (min2 > v2)
        {
            min2 = v2;
        }
        else if (max2 < v2)
        {
            max2 = v2;
        }
    }

    var h0 = ((0.5 * (max0 - min0)) + margin);
    var h1 = ((0.5 * (max1 - min1)) + margin);
    var h2 = ((0.5 * (max2 - min2)) + margin);
    var c0 = (0.5 * (min0 + max0));
    var c1 = (0.5 * (min1 + max1));
    var c2 = (0.5 * (min2 + max2));

    var lx = (2.0 * h0);
    var ly = (2.0 * h1);
    var lz = (2.0 * h2);
    lx *= lx;
    ly *= ly;
    lz *= lz;

    var massRatio = (1.0 / 12.0);

    this.type = "CONVEX_HULL";
    this.points = points;
    this.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
    this.margin = margin;
    this.halfExtents = [h0, h1, h2];
    this.center = [c0, c1, c2];
    this.inertia = [massRatio * (ly + lz),
                    massRatio * (lx + lz),
                    massRatio * (lx + ly)];
}


//
// WebGLPhysicsCollisionObject
//
function WebGLPhysicsCollisionObject() {}
WebGLPhysicsCollisionObject.prototype = {

    version : 1,

    transform : [1, 0, 0,
                 0, 1, 0,
                 0, 0, 1,
                 0, 0, 0],
    group : 0,
    mask : 0,
    friction : 1,
    restitution : 1,
    kinematic : false,
    userData : null,

    calculateExtents : function collisionObjectCalculateExtentsFn(extents)
    {
        var shape = this.shape;
        var center = shape.center;
        var halfExtents = shape.halfExtents;
        var h0 = halfExtents[0];
        var h1 = halfExtents[1];
        var h2 = halfExtents[2];

        var transform = this.transform;
        var m0 = transform[0];
        var m1 = transform[1];
        var m2 = transform[2];
        var m3 = transform[3];
        var m4 = transform[4];
        var m5 = transform[5];
        var m6 = transform[6];
        var m7 = transform[7];
        var m8 = transform[8];

        var ct0 = transform[9];
        var ct1 = transform[10];
        var ct2 = transform[11];
        if (center)
        {
            var c0 = center[0];
            var c1 = center[1];
            var c2 = center[2];

            if (c0 !== 0 ||
                c1 !== 0 ||
                c2 !== 0)
            {
                ct0 += (m0 * c0 + m3 * c1 + m6 * c2);
                ct1 += (m1 * c0 + m4 * c1 + m7 * c2);
                ct2 += (m2 * c0 + m5 * c1 + m8 * c2);
            }
        }

        var ht0 = ((m0 < 0 ? -m0 : m0) * h0 + (m3 < 0 ? -m3 : m3) * h1 + (m6 < 0 ? -m6 : m6) * h2);
        var ht1 = ((m1 < 0 ? -m1 : m1) * h0 + (m4 < 0 ? -m4 : m4) * h1 + (m7 < 0 ? -m7 : m7) * h2);
        var ht2 = ((m2 < 0 ? -m2 : m2) * h0 + (m5 < 0 ? -m5 : m5) * h1 + (m8 < 0 ? -m8 : m8) * h2);

        extents[0] = (ct0 - ht0);
        extents[1] = (ct1 - ht1);
        extents[2] = (ct2 - ht2);
        extents[3] = (ct0 + ht0);
        extents[4] = (ct1 + ht1);
        extents[5] = (ct2 + ht2);
    },

    clone : function collisionObjectCloneFn()
    {
        return webGLPhysicsClone(new WebGLPhysicsCollisionObject(), this);
    }
};

WebGLPhysicsCollisionObject.create = function webGLPhysicsCollisionObjectFn(params)
{
    var s = new WebGLPhysicsCollisionObject();
    webGLPhysicsClone(s, params);
    return s;
};


//
// WebGLPhysicsRigidBody
//
function WebGLPhysicsRigidBody() {}
WebGLPhysicsRigidBody.prototype = {

    version : 1,

    transform : [1, 0, 0,
                 0, 1, 0,
                 0, 0, 1,
                 0, 0, 0],
    mass : 1,
    group : 0,
    mask : 0,
    frozen : 0,
    linearVelocity : [0, 0, 0],
    angularVelocity : [0, 0, 0],
    friction : 1,
    restitution : 1,
    kinematic : false,
    userData : null,

    calculateExtents : WebGLPhysicsCollisionObject.prototype.calculateExtents,

    clone : function rigidBodyCloneFn()
    {
        return webGLPhysicsClone(new WebGLPhysicsRigidBody(), this);
    }
};

WebGLPhysicsRigidBody.create = function webGLPhysicsRigidBodyFn(params)
{
    var r = new WebGLPhysicsRigidBody();
    webGLPhysicsClone(r, params);
    var shape = params.shape;
    r.inertia = shape.inertia;
    r.active = false;
    return r;
};


//
// WebGLPhysicsConstraint
//
function WebGLPhysicsConstraint() {}
WebGLPhysicsConstraint.prototype = {

    version : 1
};

WebGLPhysicsConstraint.create = function webGLPhysicsConstraintFn(type, params)
{
    var s = new WebGLPhysicsConstraint();
    webGLPhysicsClone(s, params);
    s.type = type;
    return s;
};


//
// WebGLPhysicsTriangleArray
//
function WebGLPhysicsTriangleArray() {}
WebGLPhysicsTriangleArray.prototype = {

    version : 1
};

WebGLPhysicsTriangleArray.create = function webGLPhysicsTriangleArrayFn(params)
{
    var t = new WebGLPhysicsTriangleArray();

    var vertices = params.vertices;
    var numVertices = (vertices.length / 3);
    var indices = params.indices;
    var numTriangles = (indices.length / 3);

    var minExtent = params.minExtent;
    var maxExtent = params.maxExtent;
    if (!minExtent || !maxExtent)
    {
        var min0 = vertices[0];
        var min1 = vertices[1];
        var min2 = vertices[2];
        var max0 = min0;
        var max1 = min1;
        var max2 = min2;
        var maxN = vertices.length;
        for (var n = 3; n < maxN; n += 3)
        {
            var v0 = vertices[n];
            var v1 = vertices[n + 1];
            var v2 = vertices[n + 2];
            if (min0 > v0)
            {
                min0 = v0;
            }
            else if (max0 < v0)
            {
                max0 = v0;
            }
            if (min1 > v1)
            {
                min1 = v1;
            }
            else if (max1 < v1)
            {
                max1 = v1;
            }
            if (min2 > v2)
            {
                min2 = v2;
            }
            else if (max2 < v2)
            {
                max2 = v2;
            }
        }
        minExtent = [min0, min1, min2];
        maxExtent = [max0, max1, max2];
    }

    t.vertices = vertices;
    t.numVertices = numVertices;
    t.indices = indices;
    t.numTriangles = numTriangles;
    t.extents = [minExtent[0], minExtent[1], minExtent[2],
                 maxExtent[0], maxExtent[1], maxExtent[2]];

    return t;
};


//
// WebGLPhysicsCharacter
//
function WebGLPhysicsCharacter() {}
WebGLPhysicsCharacter.prototype = {

    version : 1,

    velocity : [0, 0, 0],
    onGround : true,
    crouch : false,
    dead : false,
    maxJumpHeight : 10,
    userData : null,

    calculateExtents : function characterCalculateExtentsFn(extents)
    {
        extents[0] = 0;
        extents[1] = 0;
        extents[2] = 0;
        extents[3] = 0;
        extents[4] = 0;
        extents[5] = 0;
    },

    jump : function characterJumpFn()
    {
    }
};

WebGLPhysicsCharacter.create = function webGLPhysicsCharacterFn(params)
{
    var c = new WebGLPhysicsCharacter();
    webGLPhysicsClone(c, params);
    c.position = params.transform.slice(9, 12);
    return c;
};


//
// WebGLPhysicsWorld
//
function WebGLPhysicsWorld() {}
WebGLPhysicsWorld.prototype = {

    version : 1,

    maxSubSteps: 10,
    fixedTimeStep: 0.01666666753590107,
    gravity: [0, -10, 0],

    update : function physicsUpdateFn()
    {
    },

    rayTest : function rayTestFn(params)
    {
        return null;
    },

    convexSweepTest : function convexSweepTestFn(params)
    {
        return null;
    },

    addCollisionObject : function addCollisionObjectFn(collisionObjet)
    {
    },

    removeCollisionObject : function removeCollisionObjectFn(collisionObjet)
    {
    },

    addRigidBody : function addRigidBodyFn(rigidBody)
    {
    },

    removeRigidBody : function removeRigidBodyFn(rigidBody)
    {
    },

    addConstraint : function addConstraintFn(constraint)
    {
    },

    removeConstraint : function removeConstraintFn(constraint)
    {
    },

    addCharacter : function addCharacterFn(character)
    {
    },

    removeCharacter : function removeCharacterFn(character)
    {
    },

    flush : function physicsFlushFn()
    {
    }
};

WebGLPhysicsWorld.create = function webGLPhysicsWorldFn(params)
{
    var s = new WebGLPhysicsWorld();
    webGLPhysicsClone(s, params);
    return s;
};


//
// WebGLPhysicsDevice
//
function WebGLPhysicsDevice() {}
WebGLPhysicsDevice.prototype = {

    version : 1,

    vendor : "Turbulenz",

    FILTER_DYNAMIC : 1,
    FILTER_STATIC : 2,
    FILTER_KINEMATIC : 4,
    FILTER_DEBRIS : 8,
    FILTER_TRIGGER : 16,
    FILTER_CHARACTER : 32,
    FILTER_PROJECTILE : 64,
    FILTER_USER_MIN : 128,
    FILTER_USER_MAX : 0x8000,
    FILTER_ALL : 0xffff,

    createDynamicsWorld : function createDynamicsWorldFn(params)
    {
        return WebGLPhysicsWorld.create(params);
    },

    createPlaneShape : function createPlaneShapeFn(params)
    {
        return new WebGLPhysicsPlaneShape(params);
    },

    createBoxShape : function createBoxShapeFn(params)
    {
        return new WebGLPhysicsBoxShape(params);
    },

    createSphereShape : function createSphereShapeFn(params)
    {
        return new WebGLPhysicsSphereShape(params);
    },

    createCapsuleShape : function createCapsuleShapeFn(params)
    {
        return new WebGLPhysicsCapsuleShape(params);
    },

    createCylinderShape : function createCylinderShapeFn(params)
    {
        return new WebGLPhysicsCylinderShape(params);
    },

    createConeShape : function createConeShapeFn(params)
    {
        return new WebGLPhysicsConeShape(params);
    },

    createTriangleMeshShape : function createTriangleMeshShapeFn(params)
    {
        return new WebGLPhysicsTriangleMeshShape(params);
    },

    createConvexHullShape : function createConvexHullShapeFn(params)
    {
        return new WebGLPhysicsConvexHullShape(params);
    },

    createTriangleArray : function createTriangleArrayFn(params)
    {
        return WebGLPhysicsTriangleArray.create(params);
    },

    createCollisionObject : function createCollisionObjectFn(params)
    {
        return WebGLPhysicsCollisionObject.create(params);
    },

    createRigidBody : function createRigidBodyFn(params)
    {
        return WebGLPhysicsRigidBody.create(params);
    },

    createPoint2PointConstraint : function createPoint2PointConstraintFn(params)
    {
        return WebGLPhysicsConstraint.create("POINT2POINT", params);
    },

    createHingeConstraint : function createHingeConstraintFn(params)
    {
        return WebGLPhysicsConstraint.create("HINGE", params);
    },

    createConeTwistConstraint : function createConeTwistConstraintFn(params)
    {
        return WebGLPhysicsConstraint.create("CONETWIST", params);
    },

    create6DOFConstraint : function create6DOFConstraintFn(params)
    {
        return WebGLPhysicsConstraint.create("D6", params);
    },

    createSliderConstraint : function createSliderConstraintFn(params)
    {
        return WebGLPhysicsConstraint.create("SLIDER", params);
    },

    createCharacter : function createCharacterFn(params)
    {
        return WebGLPhysicsCharacter.create(params);
    }
};

WebGLPhysicsDevice.create = function webGLPhysicsDeviceFn(params)
{
    var pd = new WebGLPhysicsDevice();

    return pd;
};
