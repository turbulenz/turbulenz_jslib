/* This file was generated from TypeScript source tslib/material.ts */

// Copyright (c) 2010-2012 Turbulenz Limited
/*global Reference: false */
/// <reference path="turbulenz.d.ts" />
/// <reference path="utilities.ts" />
/// <reference path="scene.ts" />
/// <reference path="texturemanager.ts" />
//
// Material
//
var Material = (function () {
    function Material() { }
    Material.version = 1;
    Material.create = function create(graphicsDevice) {
        var newMaterial = new Material();
        newMaterial.reference = Reference.create(newMaterial);
        newMaterial.techniqueParameters = graphicsDevice.createTechniqueParameters();
        newMaterial.meta = {
        };
        newMaterial.onTextureChanged = function materialOnTextureChangedFn(textureInstance) {
            var textureInstanceTexture = textureInstance.texture;
            var material = newMaterial;
            var materialTechniqueParameters = material.techniqueParameters;
            var materialTextureInstances = material.textureInstances;
            for(var p in materialTextureInstances) {
                if(materialTextureInstances.hasOwnProperty(p)) {
                    if(materialTextureInstances[p] === textureInstance) {
                        materialTechniqueParameters[p] = textureInstanceTexture;
                    }
                }
            }
        };
        return newMaterial;
    };
    Material.prototype.getName = function () {
        return this.name;
    };
    Material.prototype.setName = function (name) {
        this.name = name;
    };
    Material.prototype.loadTextures = function (textureManager) {
        var materialTextureNames = this.texturesNames;
        for(var p in materialTextureNames) {
            if(materialTextureNames.hasOwnProperty(p)) {
                var textureName = materialTextureNames[p];
                textureManager.load(textureName);
                this.setTextureInstance(p, textureManager.getInstance(textureName));
            }
        }
    };
    Material.prototype.setTextureInstance = function (propertryName, textureInstance) {
        if(!this.textureInstances) {
            this.textureInstances = {
            };
        }
        var oldInstance = this.textureInstances[propertryName];
        if(oldInstance !== textureInstance) {
            if(oldInstance && oldInstance.unsubscribeTextureChanged) {
                oldInstance.unsubscribeTextureChanged(this.onTextureChanged);
            }
            this.textureInstances[propertryName] = textureInstance;
            this.techniqueParameters[propertryName] = textureInstance.texture;
            textureInstance.subscribeTextureChanged(this.onTextureChanged);
            textureInstance.reference.add();
        }
    };
    Material.prototype.destroy = function () {
        delete this.techniqueParameters;
        var textureInstance;
        var textureInstances = this.textureInstances;
        for(var p in textureInstances) {
            if(textureInstances.hasOwnProperty(p)) {
                textureInstance = textureInstances[p];
                textureInstance.unsubscribeTextureChanged(this.onTextureChanged);
                textureInstance.reference.remove();
            }
        }
        delete this.textureInstances;
        delete this.texturesNames;
    };
    return Material;
})();

