/* This file was generated from TypeScript source tslib/webgl/touch.ts */


// TODO: params should be Touch, but
// that requires decls for W3Touch
function Touch() {
    return this;
}
Touch.create = function touchCreateFn(params) {
    var touch = new Touch();
    touch.force = params.force;
    touch.identifier = params.identifier;
    touch.isGameTouch = params.isGameTouch;
    touch.positionX = params.positionX;
    touch.positionY = params.positionY;
    touch.radiusX = params.radiusX;
    touch.radiusY = params.radiusY;
    touch.rotationAngle = params.rotationAngle;
    return touch;
};
