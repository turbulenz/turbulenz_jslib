// Copyright (c) 2010-2011 Turbulenz Limited

//
// renderingCommonGetTechniqueIndexFn
//
function renderingCommonGetTechniqueIndexFn(techniqueName)
{
    var dataStore = renderingCommonGetTechniqueIndexFn;
    var techniqueIndex = dataStore.techniquesIndexMap[techniqueName];
    if (techniqueIndex === undefined)
    {
        techniqueIndex = dataStore.numTechniques;
        dataStore.techniquesIndexMap[techniqueName] = techniqueIndex;
        dataStore.numTechniques += 1;
    }
    return techniqueIndex;
}

renderingCommonGetTechniqueIndexFn.techniquesIndexMap = {};
renderingCommonGetTechniqueIndexFn.numTechniques = 0;

//
// renderingCommonSortKeyFn
//
function renderingCommonSortKeyFn(techniqueIndex, materialIndex)
{
    return techniqueIndex * 0x10000 + materialIndex % 0x10000;
}

//
// renderingCommonCreateRendererInfoFn
//
function renderingCommonCreateRendererInfoFn(renderable)
{
    var rendererInfo = {};
    renderable.rendererInfo = rendererInfo;
    var effect = renderable.sharedMaterial.effect;

    if (effect.prepare)
    {
        effect.prepare(renderable);
    }

    return rendererInfo;
}

//
// renderingCommonAddDrawParameterFastestFn
//
function renderingCommonAddDrawParameterFastestFn(drawParameters)
{
    var array = this.array;
    array[array.length] = drawParameters;
}
