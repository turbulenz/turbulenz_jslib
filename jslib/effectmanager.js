// Copyright (c) 2009-2011 Turbulenz Limited
/*global Utilities: false*/

"use strict";

function Effect() {}

Effect.prototype =
{
    version : 1,

    //
    // prepareMaterial
    //
    prepareMaterial : function effectPrepareMaterialFn(material)
    {
        material.meta.materialIndex = this.numMaterials;
        material.effect = this;
        this.numMaterials += 1;
    },

    //
    // add
    //
    add : function effectAddFn(geometryType, prepareObject)
    {
        this.geometryType[geometryType] = prepareObject;
    },

    //
    // remove
    //
    remove : function effectRemoveFn(geometryType)
    {
        delete this.geometryType[geometryType];
    },

    //
    // get
    //
    get : function effectGetFn(geometryType)
    {
        return this.geometryType[geometryType];
    },

    //
    // prepare
    //
    prepare : function effectPrepareFn(renderable)
    {
        var prepareObject = this.geometryType[renderable.geometryType];
        if (prepareObject)
        {
            prepareObject.prepare(renderable);
        }
        else
        {
            Utilities.assert(false, "Unsupported or missing geometryType");
        }
    }

};

Effect.create = function effectCreateFn(name)
{
    var effect = new Effect();

    effect.name = name;
    effect.geometryType = {};
    effect.numMaterials = 0;

    return effect;
};


//
// EffectManager
//
function EffectManager() {}

EffectManager.prototype =
{
    version : 1,

    //
    // add
    //
    add : function effectAddFn(effect)
    {
        Utilities.assert(this.effects[effect.name] === undefined);
        this.effects[effect.name] = effect;
    },

    //
    // remove
    //
    remove : function effectManagerRemoveFn(name)
    {
        delete this.effects[name];
    },

    //
    // map
    //
    map : function effectManagerMapFn(destination, source)
    {
        this.effects[destination] = this.effects[source];
    },

    //
    // get
    //
    get : function effectManagerGetFn(name)
    {
        var effect = this.effects[name];
        if (!effect)
        {
            return this.effects["default"];
        }
        return effect;
    }
};

EffectManager.create = function effectManagerCreateFn()
{
    var effectManager = new EffectManager();

    effectManager.effects = {};

    return effectManager;
};
