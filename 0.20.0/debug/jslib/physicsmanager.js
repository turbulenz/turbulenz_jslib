// Copyright (c) 2010-2011 Turbulenz Limited

//
// physicsmanager
//
function PhysicsManager() {}

PhysicsManager.prototype =
{
    version: 1,

    //
    // update
    //
    update: function physicsManagerUpdateFn(scene)
    {
        var mathsDevice = this.mathsDevice;

        // Dynamic nodes
        var physicsNodes = this.dynamicPhysicsNodes;
        var numPhysicsNodes = physicsNodes.length;
        var physicsNode, body, target, worldMatrix, origin, n;
        if (numPhysicsNodes > 0)
        {
            for (n = 0; n < numPhysicsNodes; n += 1)
            {
                physicsNode = physicsNodes[n];
                body = physicsNode.body;
                if (body.active)
                {
                    target = physicsNode.target;
                    if (target.disabled)
                    {
                        continue;
                    }

                    worldMatrix = body.transform;
                    origin = physicsNode.origin;
                    if (origin)
                    {
                        worldMatrix = mathsDevice.m43NegOffset(worldMatrix, origin);
                    }

                    if (target.parent)
                    {
                        Utilities.assert(false, "Rigid bodies with parent nodes are unsupported");
                        //Not really possible, since the child can become inactive (frozen) and therefore it will
                        /*var parentWorld = target.parent.getWorldTransform();
                        var inverseParent = mathsDevice.m43Inverse(parentWorld);
                        var newLocal = mathsDevice.m43Mul(worldMatrix, inverseParent);
                        target.setLocalTransform(newLocal);*/
                    }
                    else
                    {
                        target.setLocalTransform(worldMatrix);
                    }
                }
            }
        }

        // Kinematic nodes
        physicsNodes = this.kinematicPhysicsNodes;
        numPhysicsNodes = physicsNodes.length;
        for (n = 0; n < numPhysicsNodes; n += 1)
        {
            physicsNode = physicsNodes[n];
            target = physicsNode.target;
            if (target.disabled)
            {
                continue;
            }

            if (target.worldUpdate !== physicsNode.worldUpdate)
            {
                physicsNode.worldUpdate = target.worldUpdate;
                worldMatrix = target.getWorldTransform();
                origin = physicsNode.origin;
                if (origin)
                {
                    worldMatrix = mathsDevice.m43Offset(worldMatrix, origin);
                }
                physicsNode.body.transform = worldMatrix;
            }
        }
    },

    //
    // enableNode
    //
    enableNode : function physicsManagerEnableNodeFn(sceneNode, enabled)
    {
        var physicsNodes = sceneNode.physicsNodes;

        if (physicsNodes)
        {
            var physicsDevice = this.physicsDevice;
            var dynamicsWorld = this.dynamicsWorld;
            var numPhysicsNodes = physicsNodes.length;
            for (var p = 0; p < numPhysicsNodes; p += 1)
            {
                var physicsNode = physicsNodes[p];
                var body = physicsNode.body;
                if (body)
                {
                    if (physicsNode.kinematic)
                    {
                        if (enabled)
                        {
                            dynamicsWorld.addCollisionObject(body);
                        }
                        else
                        {
                            dynamicsWorld.removeCollisionObject(body);
                        }
                    }
                    else if (physicsNode.dynamic)
                    {
                        if (enabled)
                        {
                            dynamicsWorld.addRigidBody(body);
                        }
                        else
                        {
                            dynamicsWorld.removeRigidBody(body);
                        }
                    }
                    else
                    {
                        if (enabled)
                        {
                            dynamicsWorld.addCollisionObject(body);
                        }
                        else
                        {
                            dynamicsWorld.removeCollisionObject(body);
                        }
                    }
                }
            }
        }
    },

    //
    // enableHierarchy
    //
    enableHierarchy : function physicsManagerEnableHierarchyFn(sceneNode, enabled)
    {
        this.enableNode(sceneNode, enabled);

        var children = sceneNode.children;
        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                this.enableHierarchy(children[c], enabled);
            }
        }
    },

    //
    // deletePhysicsNode
    //
    deletePhysicsNode : function physicsManagerDeletePhysicsNodeFn(physicsNode)
    {
        var physicsNodes = this.physicsNodes;
        var numPhysicsNodes = physicsNodes.length;
        var n;
        for (n = 0; n < numPhysicsNodes; n += 1)
        {
            if (physicsNodes[n] === physicsNode)
            {
                physicsNodes.splice(n, 1);
                break;
            }
        }

        physicsNodes = this.dynamicPhysicsNodes;
        numPhysicsNodes = physicsNodes.length;
        for (n = 0; n < numPhysicsNodes; n += 1)
        {
            if (physicsNodes[n] === physicsNode)
            {
                physicsNodes.splice(n, 1);
                break;
            }
        }

        physicsNodes = this.kinematicPhysicsNodes;
        numPhysicsNodes = physicsNodes.length;
        for (n = 0; n < numPhysicsNodes; n += 1)
        {
            if (physicsNodes[n] === physicsNode)
            {
                physicsNodes.splice(n, 1);
                break;
            }
        }
    },

    //
    // deleteNode
    //
    deleteNode : function physicsManagerDeleteNodeFn(sceneNode)
    {
        var physicsNodes = sceneNode.physicsNodes;
        if (physicsNodes)
        {
            var physicsDevice = this.physicsDevice;
            var dynamicsWorld = this.dynamicsWorld;
            if (physicsDevice && dynamicsWorld)
            {
                var numPhysicsNodes = physicsNodes.length;
                for (var p = 0; p < numPhysicsNodes; p += 1)
                {
                    var physicsNode = physicsNodes[p];
                    var body = physicsNode.body;
                    if (body)
                    {
                        if (physicsNode.kinematic)
                        {
                            dynamicsWorld.removeCollisionObject(body);
                        }
                        else if (physicsNode.dynamic)
                        {
                            dynamicsWorld.removeRigidBody(body);
                        }
                        else
                        {
                            dynamicsWorld.removeCollisionObject(body);
                        }
                    }
                    this.deletePhysicsNode(physicsNode);
                }

                this.unsubscribeSceneNode(sceneNode);
                delete sceneNode.physicsNodes;
            }
        }
    },

    //
    // deleteHierarchy
    //
    deleteHierarchy : function physicsManagerDeleteHierarchyFn(sceneNode)
    {
        this.deleteNode(sceneNode);

        var children = sceneNode.children;
        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                this.deleteHierarchy(children[c]);
            }
        }
    },

    //
    // calculateHierarchyExtents
    //
    calculateHierarchyExtents: function physicsManagerCalculateHierarchyExtentsFn(sceneNode)
    {
        var min = Math.min;
        var max = Math.max;
        var maxValue = Number.MAX_VALUE;
        var totalExtents = [maxValue, maxValue, maxValue, -maxValue, -maxValue, -maxValue];

        function calculateNodeExtentsFn(sceneNode)
        {
            var physicsNodes = sceneNode.physicsNodes;
            if (physicsNodes)
            {
                var numPhysicsNodes = physicsNodes.length;
                var extents = [];
                extents.length = 6;
                for (var p = 0; p < numPhysicsNodes; p += 1)
                {
                    physicsNodes[p].body.calculateExtents(extents);
                    totalExtents[0] = min(totalExtents[0], extents[0]);
                    totalExtents[1] = min(totalExtents[1], extents[1]);
                    totalExtents[2] = min(totalExtents[2], extents[2]);
                    totalExtents[3] = max(totalExtents[3], extents[3]);
                    totalExtents[4] = max(totalExtents[4], extents[4]);
                    totalExtents[5] = max(totalExtents[5], extents[5]);
                }
            }

            var children = sceneNode.children;
            if (children)
            {
                var numChildren = children.length;
                for (var n = 0; n < numChildren; n += 1)
                {
                    calculateNodeExtentsFn(children[n]);
                }
            }
        }

        calculateNodeExtentsFn(sceneNode);

        if (totalExtents[0] >= totalExtents[3])
        {
            return undefined;
        }
        return totalExtents;
    },

    //
    // calculateExtents
    //
    calculateExtents: function physicsManagerCalculateExtentsFn(sceneNode)
    {
        var min = Math.min;
        var max = Math.max;
        var maxValue = Number.MAX_VALUE;
        var totalExtents = [maxValue, maxValue, maxValue, -maxValue, -maxValue, -maxValue];

        var physicsNodes = sceneNode.physicsNodes;
        if (physicsNodes)
        {
            var numPhysicsNodes = physicsNodes.length;
            var extents = [];
            extents.length = 6;
            for (var p = 0; p < numPhysicsNodes; p += 1)
            {
                physicsNodes[p].body.calculateExtents(extents);
                totalExtents[0] = min(totalExtents[0], extents[0]);
                totalExtents[1] = min(totalExtents[1], extents[1]);
                totalExtents[2] = min(totalExtents[2], extents[2]);
                totalExtents[3] = max(totalExtents[3], extents[3]);
                totalExtents[4] = max(totalExtents[4], extents[4]);
                totalExtents[5] = max(totalExtents[5], extents[5]);
            }
        }

        if (totalExtents[0] >= totalExtents[3])
        {
            return undefined;
        }
        return totalExtents;
    },

    //
    // clear
    //
    clear: function physicsManagerClearFn()
    {
        if (this.physicsNodes)
        {
            for (var index = 0; index < this.physicsNodes.length; index += 1)
            {
                this.unsubscribeSceneNode(this.physicsNodes[index].target);
            }
        }
        this.physicsNodes = [];
        this.dynamicPhysicsNodes = [];
        this.kinematicPhysicsNodes = [];
    },

    //
    // loadNodes
    //
    loadNodes: function physicsManagerLoadNodesFn(loadParams, scene)
    {
        var sceneData = loadParams.data;
        var collisionMargin = (loadParams.collisionMargin || 0.005);
        var nodesNamePrefix = loadParams.nodesNamePrefix;

        if (!loadParams.append)
        {
            this.clear();
        }

        if (!this.physicsDevice)
        {
            return;
        }
        var physicsDevice = this.physicsDevice;
        var dynamicsWorld = this.dynamicsWorld;
        var dynamicFilterFlag = physicsDevice.FILTER_DYNAMIC;
        var kinematicFilterFlag = physicsDevice.FILTER_KINEMATIC;
        var staticFilterFlag = physicsDevice.FILTER_STATIC;
        var characterFilterFlag = physicsDevice.FILTER_CHARACTER;
        var projectileFilterFlag = physicsDevice.FILTER_PROJECTILE;
        var allFilterFlag = physicsDevice.FILTER_ALL;

        var mathsDevice = this.mathsDevice;
        var physicsNodes = this.physicsNodes;
        var dynamicPhysicsNodes = this.dynamicPhysicsNodes;
        var kinematicPhysicsNodes = this.kinematicPhysicsNodes;
        var fileShapes = sceneData.geometries;
        var fileNodes = sceneData.physicsnodes;
        var fileModels = sceneData.physicsmodels;
        var fileMaterials = sceneData.physicsmaterials;
        var shape, origin, triangleArray;
        for (var fn in fileNodes)
        {
            if (fileNodes.hasOwnProperty(fn))
            {
                var fileNode = fileNodes[fn];
                var targetName = fileNode.target;
                if (nodesNamePrefix)
                {
                    targetName = SceneNode.makePath(nodesNamePrefix, targetName);
                }
                var target = scene.findNode(targetName);
                if (!target)
                {   //missing target.
                    continue;
                }
                var fileModel = fileModels[fileNode.body];
                if (!fileModel)
                {
                    continue;
                }
                var physicsMaterial;
                if (fileMaterials)
                {
                    physicsMaterial = fileMaterials[fileModel.material];
                }
                if (physicsMaterial && (physicsMaterial.nonsolid || physicsMaterial.far))
                {
                    continue;
                }
                var kinematic = (fileModel.kinematic || target.kinematic);
                var dynamic = (fileModel.dynamic || target.dynamic);
                var disabled = target.disabled;
                shape = null;
                origin = null;
                triangleArray = null;
                var shapeType = fileModel.shape;
                if (shapeType === "box")
                {
                    var halfExtents = fileModel.halfExtents || fileModel.halfextents;
                    shape = physicsDevice.createBoxShape({
                        halfExtents: halfExtents,
                        margin: collisionMargin
                    });
                }
                else if (shapeType === "sphere")
                {
                    shape = physicsDevice.createSphereShape({
                        radius: fileModel.radius,
                        margin: collisionMargin
                    });
                }
                else if (shapeType === "cone")
                {
                    shape = physicsDevice.createConeShape({
                        radius: fileModel.radius,
                        height: fileModel.height,
                        margin: collisionMargin
                    });
                }
                else if (shapeType === "capsule")
                {
                    shape = physicsDevice.createCapsuleShape({
                        radius: fileModel.radius,
                        height: fileModel.height,
                        margin: collisionMargin
                    });
                }
                else if (shapeType === "cylinder")
                {
                    shape = physicsDevice.createCylinderShape({
                        halfExtents: [fileModel.radius, fileModel.height, fileModel.radius],
                        margin: collisionMargin
                    });
                }
                else if (shapeType === "convexhull" ||
                         shapeType === "mesh")
                {
                    var geometry = fileShapes[fileModel.geometry];
                    if (geometry)
                    {
                        shape = geometry.physicsShape;
                        if (shape)
                        {
                            origin = geometry.origin;
                        }
                        else
                        {
                            var inputs = geometry.inputs;
                            var inputPosition = inputs.POSITION;
                            var positions = geometry.sources[inputPosition.source];
                            var positionsData = positions.data;
                            var posMin = positions.min;
                            var posMax = positions.max;
                            if (posMin && posMax)
                            {
                                var centerPos0 = ((posMax[0] + posMin[0]) * 0.5);
                                var centerPos1 = ((posMax[1] + posMin[1]) * 0.5);
                                var centerPos2 = ((posMax[2] + posMin[2]) * 0.5);
                                if (Math.abs(centerPos0) > 1.e-6 ||
                                    Math.abs(centerPos1) > 1.e-6 ||
                                    Math.abs(centerPos2) > 1.e-6)
                                {
                                    var halfPos0 = ((posMax[0] - posMin[0]) * 0.5);
                                    var halfPos1 = ((posMax[1] - posMin[1]) * 0.5);
                                    var halfPos2 = ((posMax[2] - posMin[2]) * 0.5);
                                    posMin = [-halfPos0, -halfPos1, -halfPos2];
                                    posMax = [ halfPos0,  halfPos1,  halfPos2];
                                    var numPositionsValues = positionsData.length;
                                    var newPositionsData = [];
                                    newPositionsData.length = numPositionsValues;
                                    for (var np = 0; np < numPositionsValues; np += 3)
                                    {
                                        newPositionsData[np + 0] = (positionsData[np + 0] - centerPos0);
                                        newPositionsData[np + 1] = (positionsData[np + 1] - centerPos1);
                                        newPositionsData[np + 2] = (positionsData[np + 2] - centerPos2);
                                    }
                                    positionsData = newPositionsData;
                                    origin = mathsDevice.v3Build(centerPos0, centerPos1, centerPos2);
                                    geometry.origin = origin;
                                }
                            }
                            else
                            {
                                //TODO: add a warning that with no extents we can't calculate and origin?
                                geometry.origin = [0, 0, 0];
                            }

                            if (shapeType === "convexhull")
                            {
                                shape = physicsDevice.createConvexHullShape({
                                    points: positionsData,
                                    margin: collisionMargin
                                });
                            }
                            else //if (shapeType === "mesh")
                            {
                                var maxOffset = 0;
                                for (var input in inputs)
                                {
                                    if (inputs.hasOwnProperty(input))
                                    {
                                        var fileInput = inputs[input];
                                        var offset = fileInput.offset;
                                        if (offset > maxOffset)
                                        {
                                            maxOffset = offset;
                                        }
                                    }
                                }

                                var indices = [];
                                var surfaces = geometry.surfaces;
                                if (!surfaces)
                                {
                                    surfaces = { s: { triangles: geometry.triangles } };
                                }
                                for (var surf in surfaces)
                                {
                                    if (surfaces.hasOwnProperty(surf))
                                    {
                                        var surface = surfaces[surf];

                                        if (maxOffset > 0)
                                        {
                                            var triangles = surface.triangles;
                                            if (triangles)
                                            {
                                                var indicesPerVertex = (maxOffset + 1);
                                                var numIndices = triangles.length;
                                                var positionsOffset = inputPosition.offset;
                                                for (var v = 0; v < numIndices; v += indicesPerVertex)
                                                {
                                                    indices.push(triangles[v + positionsOffset]);
                                                }
                                            }
                                        }
                                        else
                                        {
                                            var surfIndices = surface.triangles;
                                            if (surfIndices)
                                            {
                                                if (indices.length === 0)
                                                {
                                                    indices = surfIndices;
                                                }
                                                else
                                                {
                                                    var numSurfIndices = surfIndices.length;
                                                    for (var i = 0; i < numSurfIndices; i += 1)
                                                    {
                                                        indices.push(surfIndices[i]);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if (indices)
                                {
                                    var triangleArrayParams = {
                                        vertices: positionsData,
                                        indices: indices,
                                        minExtent: posMin,
                                        maxExtent: posMax
                                    };
                                    triangleArray = physicsDevice.createTriangleArray(triangleArrayParams);
                                    if (triangleArray)
                                    {
                                        shape = physicsDevice.createTriangleMeshShape({
                                            triangleArray: triangleArray,
                                            margin: collisionMargin
                                        });
                                    }
                                }
                            }
                            geometry.physicsShape = shape;
                        }
                    }
                }

                if (shape)
                {
                    var transform = target.getWorldTransform();
                    if (origin)
                    {
                        transform = mathsDevice.m43Offset(transform, origin);
                    }

                    var params = {
                        shape: shape,
                        transform: transform
                    };


                    if (physicsMaterial)
                    {
                        if (physicsMaterial.dynamic_friction)
                        {
                            params.friction = physicsMaterial.dynamic_friction;
                        }
                        if (physicsMaterial.restitution)
                        {
                            params.restitution = physicsMaterial.restitution;
                        }
                    }

                    // Check for filters to specify which groups will collide against these objects
                    var collisionFilters = allFilterFlag;
                    if (physicsMaterial)
                    {
                        var materialFilter = physicsMaterial.collisionFilter;
                        if (materialFilter)
                        {
                            collisionFilters = 0;
                            var numFilters = materialFilter.length;
                            for (var f = 0; f < numFilters; f += 1)
                            {
                                var filter = materialFilter[f];
                                if (filter === "ALL")
                                {
                                    collisionFilters += allFilterFlag;
                                }
                                else if (filter === "DYNAMIC")
                                {
                                    collisionFilters += dynamicFilterFlag;
                                }
                                else if (filter === "CHARACTER")
                                {
                                    collisionFilters += characterFilterFlag;
                                }
                                else if (filter === "PROJECTILE")
                                {
                                    collisionFilters += projectileFilterFlag;
                                }
                                else if (filter === "STATIC")
                                {
                                    collisionFilters += staticFilterFlag;
                                }
                                else if (filter === "KINEMATIC")
                                {
                                    collisionFilters += kinematicFilterFlag;
                                }
                            }
                        }
                    }

                    var physicsObject;
                    if (kinematic)
                    {
                        params.group = kinematicFilterFlag;
                        params.mask = collisionFilters;
                        params.kinematic = true;
                        physicsObject = physicsDevice.createCollisionObject(params);
                        if (physicsObject && !disabled)
                        {
                            dynamicsWorld.addCollisionObject(physicsObject);
                        }
                    }
                    else if (dynamic)
                    {
                        params.mass = (fileModel.mass || 1);
                        params.inertia = fileModel.inertia;
                        params.group = dynamicFilterFlag;
                        params.mask = collisionFilters;
                        params.frozen = false;
                        if (fileModel.velocity)
                        {
                            params.linearVelocity = fileModel.velocity;
                        }
                        if (fileModel.angularvelocity)
                        {
                            params.angularVelocity = fileModel.angularvelocity;
                        }
                        physicsObject = physicsDevice.createRigidBody(params);
                        if (physicsObject && !disabled)
                        {
                            dynamicsWorld.addRigidBody(physicsObject);
                        }
                    }
                    else
                    {
                        params.group = staticFilterFlag;
                        params.mask = collisionFilters;
                        physicsObject = physicsDevice.createCollisionObject(params);
                        if (physicsObject && !disabled)
                        {
                            dynamicsWorld.addCollisionObject(physicsObject);
                        }
                    }

                    if (physicsObject)
                    {
                        var physicsNode = {
                            body: physicsObject,
                            target: target
                        };

                        // Make the physics object point back at the target node so we can get to it
                        // from collision tests
                        physicsObject.userData = target;

                        if (origin)
                        {
                            physicsNode.origin = origin;
                        }

                        if (triangleArray)
                        {
                            physicsNode.triangleArray = triangleArray;
                        }

                        if (kinematic)
                        {
                            physicsNode.kinematic = true;
                            target.kinematic = true;
                            target.dynamic = true;
                            kinematicPhysicsNodes.push(physicsNode);
                        }
                        else if (dynamic)
                        {
                            physicsNode.dynamic = true;
                            target.dynamic = true;
                            dynamicPhysicsNodes.push(physicsNode);
                        }

                        physicsNodes.push(physicsNode);

                        var targetPhysicsNodes = target.physicsNodes;
                        if (targetPhysicsNodes)
                        {
                            targetPhysicsNodes.push(physicsNode);
                        }
                        else
                        {
                            target.physicsNodes = [physicsNode];
                            this.subscribeSceneNode(target);
                        }

                    }
                }
            }
        }
    },

    //
    // unsubscribeSceneNode
    //
    unsubscribeSceneNode : function physicsManagerUsubscribeSceneNode(sceneNode)
    {
        sceneNode.unsubscribeCloned(this.sceneNodeCloned);
        sceneNode.unsubscribeDestroyed(this.sceneNodeDestroyed);
    },

    //
    // subscribeSceneNode
    //
    subscribeSceneNode : function physicsManagerSubscribeSceneNodeFn(sceneNode)
    {
        sceneNode.subscribeCloned(this.sceneNodeCloned);
        sceneNode.subscribeDestroyed(this.sceneNodeDestroyed);
    },

    //
    // cloneSceneNode
    //
    cloneSceneNode : function physicsManagerCloneSceneNodeFn(oldSceneNode, newSceneNode)
    {
        var physicsManager = this;

        function physicsManagerCloneNodeFn(physicsNode, targetSceneNode)
        {
            var newPhysicsObject = physicsNode.body.clone();

            var newPhysicsNode = {
                body: newPhysicsObject,
                target: targetSceneNode
            };

            // Make the physics object point back at the target node so we can get to it
            // from collision tests
            newPhysicsObject.userData = targetSceneNode;

            if (physicsNode.origin)
            {
                newPhysicsNode.origin = physicsNode.origin; // TODO: clone?
            }

            if (physicsNode.triangleArray)
            {
                newPhysicsNode.triangleArray = physicsNode.triangleArray;
            }

            if (physicsNode.kinematic)
            {
                newPhysicsNode.kinematic = true;
                targetSceneNode.kinematic = true;
                targetSceneNode.dynamic = true;
                physicsManager.kinematicPhysicsNodes.push(newPhysicsNode);
                newPhysicsNode.body.transform = targetSceneNode.getWorldTransform();
            }
            else if (physicsNode.dynamic)
            {
                newPhysicsNode.dynamic = true;
                targetSceneNode.dynamic = true;
                physicsManager.dynamicPhysicsNodes.push(newPhysicsNode);
                newPhysicsNode.body.transform = targetSceneNode.getWorldTransform();
            }

            physicsManager.physicsNodes.push(newPhysicsNode);

            var targetPhysicsNodes = targetSceneNode.physicsNodes;
            if (targetPhysicsNodes)
            {
                targetPhysicsNodes.push(newPhysicsNode);
            }
            else
            {
                targetSceneNode.physicsNodes = [newPhysicsNode];
                this.subscribeSceneNode(targetSceneNode);
            }
        }

        var physicsNodes = oldSceneNode.physicsNodes;
        if (physicsNodes)
        {
            var numPhysicsNodes = physicsNodes.length;
            newSceneNode.physicsNodes = [];
            for (var p = 0; p < numPhysicsNodes; p += 1)
            {
                physicsManagerCloneNodeFn(physicsNodes[p], newSceneNode);
            }
        }
    }
};

//
// Constructor function
//
PhysicsManager.create = function physicsManagerCreateFn(mathsDevice, physicsDevice, dynamicsWorld)
{
    var physicsManager = new PhysicsManager();

    physicsManager.mathsDevice = mathsDevice;
    physicsManager.physicsDevice = physicsDevice;
    physicsManager.dynamicsWorld = dynamicsWorld;
    physicsManager.clear();

    physicsManager.sceneNodeCloned = function sceneNodeClonedFn(data)
    {
        physicsManager.cloneSceneNode(data.oldNode, data.newNode);
    };

    physicsManager.sceneNodeDestroyed = function sceneNodeDestroyedFn(data)
    {
        physicsManager.deleteNode(data.node);
    };

    return physicsManager;
};
