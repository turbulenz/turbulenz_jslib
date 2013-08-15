/* This file was generated from TypeScript source tslib/posteffects.ts */



//
// PostEffects
//
var PostEffects = (function () {
    function PostEffects() { }
    PostEffects.version = 1;
    PostEffects.prototype.updateShader = function (sm) {
        var shader = sm.get("shaders/posteffects.cgfx");
        if(shader !== this.shader) {
            this.shader = shader;
            this.bicolor.technique = shader.getTechnique("bicolor");
            this.copy.technique = shader.getTechnique("copy");
            this.fadein.technique = shader.getTechnique("fadein");
            this.modulate.technique = shader.getTechnique("modulate");
            this.blend.technique = shader.getTechnique("blend");
        }
    };
    PostEffects.prototype.getEffectSetupCB = function (name) {
        var effect = this[name];
        if(effect) {
            var technique = effect.technique;
            var techniqueParameters = effect.techniqueParameters;
            return function postFXSetupFn(gd, colorTexture) {
                gd.setTechnique(technique);
                techniqueParameters.colorTexture = colorTexture;
                gd.setTechniqueParameters(techniqueParameters);
            };
        } else {
            return undefined;
        }
    };
    PostEffects.prototype.destroy = function () {
        for(var p in this) {
            if(this.hasOwnProperty(p)) {
                delete this[p];
            }
        }
    };
    PostEffects.create = // Constructor function
    function create(gd, sm) {
        var pe = new PostEffects();
        sm.load("shaders/posteffects.cgfx");
        pe.bicolor = {
            technique: null,
            techniqueParameters: gd.createTechniqueParameters({
                color0: [
                    0, 
                    0, 
                    0
                ],
                color1: [
                    1, 
                    1, 
                    1
                ],
                colorTexture: null
            })
        };
        pe.copy = {
            technique: null,
            techniqueParameters: gd.createTechniqueParameters({
                colorTexture: null
            })
        };
        pe.fadein = {
            technique: null,
            techniqueParameters: gd.createTechniqueParameters({
                fadeColor: [
                    0, 
                    0, 
                    0, 
                    0
                ],
                colorTexture: null
            })
        };
        pe.modulate = {
            technique: null,
            techniqueParameters: gd.createTechniqueParameters({
                modulateColor: [
                    1, 
                    1, 
                    1, 
                    1
                ],
                colorTexture: null
            })
        };
        pe.blend = {
            technique: null,
            techniqueParameters: gd.createTechniqueParameters({
                alpha: 0.5,
                colorTexture: null
            })
        };
        return pe;
    };
    return PostEffects;
})();

