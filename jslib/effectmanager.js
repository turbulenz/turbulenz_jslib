/* This file was generated from TypeScript source tslib/effectmanager.ts */

// Copyright (c) 2009-2013 Turbulenz Limited
/*global Utilities: false*/
/// <reference path="turbulenz.d.ts" />
/// <reference path="shadermanager.ts" />
/// <reference path="material.ts" />
/// <reference path="geometry.ts" />
/// <reference path="utilities.ts" />
"use strict";

//
// Effect
//
var Effect = (function () {
    function Effect() { }
    Effect.version = 1;
    Effect.create = function create(name) {
        var effect = new Effect();
        effect.name = name;
        effect.geometryType = {
        };
        effect.numMaterials = 0;
        effect.materialsMap = {
        };
        return effect;
    };
    Effect.prototype.hashMaterial = function (material) {
        var texturesNames = material.texturesNames;
        var hashArray = [];
        var numTextures = 0;
        for(var p in texturesNames) {
            if(texturesNames.hasOwnProperty(p)) {
                hashArray[numTextures] = texturesNames[p];
                numTextures += 1;
            }
        }
        if(1 < numTextures) {
            hashArray.sort();
            return hashArray.join(',');
        } else {
            return hashArray[0];
        }
    };
    Effect.prototype.prepareMaterial = function (material) {
        var hash = this.hashMaterial(material);
        var index = this.materialsMap[hash];
        if(index === undefined) {
            index = this.numMaterials;
            this.numMaterials += 1;
            this.materialsMap[hash] = index;
        }
        material.meta.materialIndex = index;
        material.effect = this;
    };
    Effect.prototype.add = function (geometryType, prepareObject) {
        this.geometryType[geometryType] = prepareObject;
    };
    Effect.prototype.remove = function (geometryType) {
        delete this.geometryType[geometryType];
    };
    Effect.prototype.get = function (geometryType) {
        return this.geometryType[geometryType];
    };
    Effect.prototype.prepare = function (renderable) {
        var prepareObject = this.geometryType[renderable.geometryType];
        if(prepareObject) {
            prepareObject.prepare(renderable);
        } else {
            debug.abort("Unsupported or missing geometryType");
        }
    };
    return Effect;
})();

//
// EffectManager
//
var EffectManager = (function () {
    function EffectManager() { }
    EffectManager.version = 1;
    EffectManager.create = // { [effectName: string]: Effect; };
    function create() {
        var effectManager = new EffectManager();
        effectManager.effects = {
        };
        return effectManager;
    };
    EffectManager.prototype.add = function (effect) {
        debug.assert(this.effects[effect.name] === undefined);
        this.effects[effect.name] = effect;
    };
    EffectManager.prototype.remove = function (name) {
        delete this.effects[name];
    };
    EffectManager.prototype.map = function (destination, source) {
        this.effects[destination] = this.effects[source];
    };
    EffectManager.prototype.get = function (name) {
        var effect = this.effects[name];
        if(!effect) {
            return this.effects["default"];
        }
        return effect;
    };
    return EffectManager;
})();

