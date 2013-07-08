// Copyright (c) 2010-2011 Turbulenz Limited

//
// Material
//
function Material() {}
Material.prototype =
{
    version: 1,

    //
    // getName
    //
    getName: function materialGetNameFn()
    {
        return this.name;
    },

    //
    // setName
    //
    setName: function materialSetNameFn(name)
    {
        this.name = name;
    },

    //
    // loadTextures
    //
    loadTextures: function materialLoadTexturesFn(textureManager)
    {
        var materialTextureNames = this.texturesNames;
        for (var p in materialTextureNames)
        {
            if (materialTextureNames.hasOwnProperty(p))
            {
                var textureName = materialTextureNames[p];
                textureManager.load(textureName);
                this.setTextureInstance(p, textureManager.getInstance(textureName));
            }
        }
    },

    //
    // setTextureInstance
    //
    setTextureInstance: function materialSetTextureInstanceFn(propertryName, textureInstance)
    {
        if (!this.textureInstances)
        {
            this.textureInstances = {};
        }
        var oldInstance = this.textureInstances[propertryName];
        if (oldInstance !== textureInstance)
        {
            if (oldInstance && oldInstance.unsubscribeTextureChanged)
            {
                oldInstance.unsubscribeTextureChanged(this.onTextureChanged);
            }
            this.textureInstances[propertryName] = textureInstance;
            this.techniqueParameters[propertryName] = textureInstance.texture;
            textureInstance.subscribeTextureChanged(this.onTextureChanged);
            textureInstance.reference.add();
        }
    },

    //
    // destroy
    //
    destroy: function materialDestroyFn()
    {
        delete this.techniqueParameters;

        var textureInstance;
        var textureInstances = this.textureInstances;
        for (var p in textureInstances)
        {
            if (textureInstances.hasOwnProperty(p))
            {
                textureInstance = textureInstances[p];
                textureInstance.unsubscribeTextureChanged(this.onTextureChanged);
                textureInstance.reference.remove();
            }
        }
        delete this.textureInstances;
        delete this.textureNames;
    }
};

//
// Material Constructor
//
Material.create = function materialCreateFn(graphicsDevice)
{
    var newMaterial = new Material();
    newMaterial.reference = Reference.create(newMaterial);
    newMaterial.techniqueParameters = graphicsDevice.createTechniqueParameters();
    newMaterial.meta = {};

    newMaterial.onTextureChanged = function materialOnTextureChangedFn(textureInstance)
    {
        var textureInstanceTexture = textureInstance.texture;
        var material = newMaterial;
        var materialTechniqueParameters = material.techniqueParameters;
        var materialTextureInstances = material.textureInstances;

        for (var p in materialTextureInstances)
        {
            if (materialTextureInstances.hasOwnProperty(p))
            {
                if (materialTextureInstances[p] === textureInstance)
                {
                    materialTechniqueParameters[p] = textureInstanceTexture;
                }
            }
        }
    };

    return newMaterial;
};
