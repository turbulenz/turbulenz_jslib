// Copyright (c) 2009-2011 Turbulenz Limited

//
// MouseForces
//
function MouseForces() {}
MouseForces.prototype =
{
    version : 1,

    generatePickRay : function generatePickRayFn(cameraTransform,
                                                 viewWindowX, viewWindowY,
                                                 aspectRatio,
                                                 farPlane)
    {
        var md = this.md;
        var cam_right = md.m43Right(cameraTransform);
        var cam_up    = md.m43Up(cameraTransform);
        var cam_at    = md.v3Build(-cameraTransform[6], -cameraTransform[7], -cameraTransform[8]);
        var cam_pos   = md.m43Pos(cameraTransform);

        this.X = this.mouseX;
        this.Y = this.mouseY;

        var x = (2.0 * this.X - 1.0) * viewWindowX;
        var y = (2.0 * this.Y - 1.0) * viewWindowY / aspectRatio;

        this.pickRayFrom = cam_pos;

        var direction = md.v3Normalize(md.v3Sub(md.v3Add(cam_at, md.v3ScalarMul(cam_right, x)), md.v3ScalarMul(cam_up, y)));
        this.pickRayTo = md.v3Add(cam_pos, md.v3ScalarMul(direction, farPlane));
    },

    update : function updateFn(dynamicsWorld,
                               camera,
                               force)
    {
        var md = this.md;
        if (this.grabBody)
        {
            this.generatePickRay(camera.matrix,
                                 1.0 / camera.recipViewWindowX,
                                 1.0 / camera.recipViewWindowY,
                                 camera.aspectRatio,
                                 camera.farPlane);

            if (this.pickedBody)
            {
                //keep it at the same picking distance
                var dir = md.v3Normalize(md.v3Sub(this.pickRayTo, this.pickRayFrom));
                var newPos = md.v3Add(this.pickRayFrom, md.v3ScalarMul(dir, this.oldPickingDist));
                if (this.dragExtentsMin)
                {
                    // If the user has supplied a bound for the dragging apply it
                    newPos = md.v3Max(newPos, this.dragExtentsMin);
                    newPos = md.v3Min(newPos, this.dragExtentsMax);
                }
                this.pickConstraint.pivotB = newPos;
                this.pickedBody.active = true;
            }
            else
            {
                //add a point to point constraint for picking
                var rayHit = dynamicsWorld.rayTest({
                        from : this.pickRayFrom,
                        to   : this.pickRayTo,
                        mask : this.pickFilter
                    });
                if (rayHit)
                {
                    var body = rayHit.body;
                    var pickPos = rayHit.hitPoint;

                    body.active = true;

                    this.pickedBody = body;

                    var localPivot = md.m43TransformPoint(md.m43InverseOrthonormal(body.transform), pickPos);

                    this.pickConstraint = this.pd.createPoint2PointConstraint({
                            bodyA   : body,
                            pivotA  : localPivot,
                            force   : force,
                            damping : 0.5,
                            impulseClamp : this.clamp
                        });

                    dynamicsWorld.addConstraint(this.pickConstraint);

                    this.oldPickingDist = md.v3Length(md.v3Sub(pickPos, this.pickRayFrom));
                }
            }
        }
        else
        {
            if (this.pickedBody)
            {
                dynamicsWorld.removeConstraint(this.pickConstraint);
                this.pickConstraint = null;

                this.pickedBody = null;
            }
        }
    }
};

// Constructor function
MouseForces.create = function mouseForcesCreateFn(gd, id, md, pd, dragExtentsMin, dragExtentsMax)
{
    var c = new MouseForces();

    c.md = md;
    c.pd = pd;

    c.pickFilter = pd.FILTER_DYNAMIC;

    c.pickRayFrom = [0, 0, 0];
    c.pickRayTo = [0, 0, 0];

    c.clamp = 0;

    c.pickConstraint = null;
    c.pickedBody = null;

    c.oldPickingDist = 0;

    if (dragExtentsMin && dragExtentsMax)
    {
        c.dragExtentsMin = dragExtentsMin;
        c.dragExtentsMax = dragExtentsMax;
    }

    c.mouseX = 0.5;
    c.mouseY = 0.5;
    c.mouseZ = 0.0;
    c.X = 0.5;
    c.Y = 0.5;
    c.Z = 0.0;

    c.grabBody = false;

    // Mouse handling
    var oldmousemove = id.onmousemove;
    var oldmouseup = id.onmouseup;
    var oldmousewheel = id.onmousewheel;

    c.onmousewheel = function onmousewheelFn(delta)
    {
        c.mouseZ += delta;

        if (oldmousewheel)
        {
            oldmousewheel(delta);
        }

        return false;
    };
    id.onmousewheel = c.onmousewheel;

    c.onmousemove = function onmousemoveFn(deltaX, deltaY)
    {
        c.mouseX += (deltaX / gd.width);
        c.mouseY += (deltaY / gd.height);

        if (oldmousemove)
        {
            oldmousemove(deltaX, deltaY);
        }

        return false;
    };
    id.onmousemove = c.onmousemove;

    c.onmousedown = function onmousedownFn(button, x, y)
    {
        c.mouseX = 0.5;
        c.mouseY = 0.5;
        c.mouseZ = 0.0;
        c.grabBody = true;
        return false;
    };

    c.onmouseup = function onmouseupFn(button, x, y)
    {
        c.mouseX = 0.5;
        c.mouseY = 0.5;
        c.mouseZ = 0.0;

        if (oldmouseup)
        {
            oldmouseup(button, x, y);
        }

        c.grabBody = false;
        return false;
    };

    return c;
};