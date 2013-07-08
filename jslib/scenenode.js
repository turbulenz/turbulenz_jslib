// Copyright (c) 2010-2012 Turbulenz Limited
/*global TurbulenzEngine: false*/
/*global Utilities: false*/
/*global Observer: false*/

//
// SceneNode
//
function SceneNode() {}

//
//SceneNode.makePath
//
SceneNode.makePath = function sceneNodeMakePathFn(parentPath, childName)
{
    return parentPath + "/" + childName;
};

//
//SceneNode.invalidSetLocalTransform
//
SceneNode.invalidSetLocalTransform = function sceneNodeInvlaidSetLocalTransformFn()
{
    Utilities.assert(false, "setLocalTransform can not be called on static nodes.");
};

SceneNode.prototype =
{
    version: 1,

    //
    //getName
    //
    getName: function sceneNodeGetNameFn()
    {
        return this.name;
    },

    //
    //getPath
    //
    getPath: function sceneNodeGetPathFn()
    {
        if (this.parent)
        {
            return SceneNode.makePath(this.parent.getPath(), this.name);
        }
        return this.name;
    },

    //
    //getParent
    //
    getParent: function sceneNodeGetParentFn()
    {
        return this.parent;
    },

    //
    //setParentHelper
    //
    setParentHelper: function sceneNodeHelperSetParentFn(parent)
    {
        //***Only valid to call from addChild()/removeChild() ***
        this.parent = parent;
        this.notifiedParent = false;
        this.dirtyWorld = false;
        this.setDirtyWorldTransform();
    },

    //
    //addChild
    //
    addChild: function sceneNodeAddChildFn(child)
    {
        if (child.parent)
        {
            child.parent.removeChild(child);
        }
        else
        {
            //Child was a root node
            if (child.scene)
            {
                child.scene.removeRootNode(child);
            }
        }

        if (!this.children)
        {
            this.children = [];
            this.childNeedsUpdateCount = 0;
        }
        this.children.push(child);
        child.setParentHelper(this);

        if (this.dynamic && !child.dynamic)
        {
            child.setDynamic();
        }
    },

    //
    //removeChild
    //
    removeChild: function sceneNodeRemoveChildFn(child)
    {
        var children = this.children;
        if (children)
        {
            if (child.notifiedParent)
            {
                this.childUpdated();
            }
            var numChildren = children.length;
            for (var n = 0; n < numChildren; n += 1)
            {
                if (children[n] === child)
                {
                    var root = this.getRoot();
                    if (root.scene)
                    {
                        child.removedFromScene(root.scene);   //Maybe decouple with an event.
                    }
                    children.splice(n, 1);
                    child.setParentHelper(null);
                    return;
                }
            }
        }
        Utilities.assert(false, "Invalid child");
    },

    //
    //findChild
    //
    findChild: function sceneNodeFindChildFn(name)
    {
        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var childIndex = 0; childIndex < numChildren; childIndex += 1)
            {
                if (children[childIndex].name === name)
                {
                    return children[childIndex];
                }
            }
        }
        return undefined;
    },

    //
    // clone
    //
    clone: function sceneNodeCloneFn(newNodeName)
    {
        var newNode = SceneNode.create({name: newNodeName || this.name,
                                              local: this.local,
                                              dynamic: this.dynamic,
                                              disabled: this.disabled});

        // Clone renderables
        var renderables = this.renderables;
        if (renderables)
        {
            var numRenderables = renderables.length;

            for (var i = 0; i < numRenderables; i += 1)
            {
                var renderable = renderables[i];
                newNode.addRenderable(renderable.clone());
            }
        }

        // Clone lights
        var lights = this.lights;
        if (lights)
        {
            var numLights = lights.length;
            for (var l = 0; l < numLights; l += 1)
            {
                var light = lights[l];
                newNode.addLightInstance(light.clone());
            }
        }

        if (this.clonedObserver)
        {
            this.clonedObserver.notify({oldNode: this,
                                        newNode: newNode});
        }

        var childNodes = this.children;
        if (childNodes)
        {
            var numChildren = childNodes.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                newNode.addChild(childNodes[c].clone());
            }
        }

        return newNode;
    },

    //
    //getRoot
    //
    getRoot: function sceneNodeGetRootFn()
    {
        var result = this;
        while (result.parent)
        {
            result = result.parent;
        }
        return result;
    },

    //
    // isInScene
    //
    isInScene: function sceneNodeIsInSceneFn()
    {
        if (this.getRoot().scene)
        {
            return true;
        }
        return false;
    },

    //
    //removedFromScene
    //
    removedFromScene: function sceneNodeRemovedFromSceneFn(scene)
    {
        //private function

        if (this.aabbTreeIndex !== undefined)
        {
            if (this.dynamic)
            {
                scene.dynamicSpatialMap.remove(this);
            }
            else
            {
                scene.staticSpatialMap.remove(this);
                scene.staticNodesChangeCounter += 1;
            }
        }

        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var childIndex = 0; childIndex < numChildren; childIndex += 1)
            {
                children[childIndex].removedFromScene(scene);
            }
        }
    },

    //
    //setLocalTransform
    //
    setLocalTransform: function sceneNodeSetLocalTransformFn(matrix)
    {
        if (matrix !== this.local)
        {
            this.local = this.mathDevice.m43Copy(matrix, this.local);
        }

        //inlined non-recursive setDirtyWorldTransform()
        function setDirtyWorldTransformHelperFn(nodes)
        {
            var numRemainingNodes = nodes.length;
            var node, index, child;
            do
            {
                numRemainingNodes -= 1;
                node = nodes[numRemainingNodes];

                node.dirtyWorld = true;

                if (!node.customWorldExtents && node.localExtents)
                {
                    node.dirtyWorldExtents = true;
                }

                var children = node.children;
                if (children)
                {
                    var numChildren = children.length;

                    if (!node.childNeedsUpdateCount)
                    {
                        // Common case of propagating down to clean children
                        node.childNeedsUpdateCount = numChildren;
                        for (index = 0; index < numChildren; index += 1)
                        {
                            child = children[index];
                            child.notifiedParent = true;

                            nodes[numRemainingNodes] = child;
                            numRemainingNodes += 1;
                        }
                    }
                    else
                    {
                        // One or more children dirty
                        for (index = 0; index < numChildren; index += 1)
                        {
                            child = children[index];
                            if (!child.dirtyWorld)
                            {
                                if (!child.notifiedParent)
                                {
                                    child.notifiedParent = true;
                                    node.childNeedsUpdateCount += 1;
                                }

                                nodes[numRemainingNodes] = child;
                                numRemainingNodes += 1;
                            }
                        }
                    }
                }
            }
            while (0 < numRemainingNodes);
        }

        if (!this.dirtyWorld)
        {
            //inlined updateRequired()
            var parent = this.parent;
            if (parent)
            {
                if (!this.notifiedParent)
                {
                    this.notifiedParent = true;
                    parent.childNeedsUpdate();
                }
            }
            else
            {
                //Root nodes
                var scene = this.scene;
                if (scene)
                {
                    var dirtyRoots = scene.dirtyRoots;
                    if (!dirtyRoots)
                    {
                        dirtyRoots = {};
                        scene.dirtyRoots = dirtyRoots;
                    }
                    dirtyRoots[this.name] = this;
                }
            }

            setDirtyWorldTransformHelperFn([this]);
        }
    },

    //
    //getLocalTransform
    //
    getLocalTransform: function sceneNodeSetLocalTransformFn()
    {
        return this.local;
    },

    //
    //setDirtyWorldTransform
    //
    setDirtyWorldTransform: function sceneNodeSetDirtyWorldTransformFn()
    {
        //private function
        if (this.dirtyWorld)
        {
            return;
        }

        function setDirtyWorldTransformHelperFn()
        {
            this.dirtyWorld = true;

            if (!this.customWorldExtents && this.localExtents)
            {
                this.dirtyWorldExtents = true;
            }

            var children = this.children;
            if (children)
            {
                var numChildren = children.length;
                var index;
                var child;

                if (!this.childNeedsUpdateCount)
                {
                    // Common case of propagating down to clean children
                    this.childNeedsUpdateCount = numChildren;
                    for (index = 0; index < numChildren; index += 1)
                    {
                        child = children[index];
                        child.notifiedParent = true;
                        setDirtyWorldTransformHelperFn.call(child);
                    }
                }
                else
                {
                    // One or more children dirty
                    for (index = 0; index < numChildren; index += 1)
                    {
                        child = children[index];
                        if (!child.dirtyWorld)
                        {
                            if (!child.notifiedParent)
                            {
                                child.notifiedParent = true;
                                this.childNeedsUpdateCount += 1;
                            }
                            setDirtyWorldTransformHelperFn.call(child);
                        }
                    }
                }
            }
        }

        //inlined updateRequired()
        if (this.parent)
        {
            if (!this.notifiedParent)
            {
                this.parent.childNeedsUpdate();
                this.notifiedParent = true;
            }
        }
        else
        {
            //Root nodes
            var scene = this.scene;
            if (scene)
            {
                if (!scene.dirtyRoots)
                {
                    scene.dirtyRoots = {};
                }
                scene.dirtyRoots[this.name] = this;
            }
        }

        setDirtyWorldTransformHelperFn.call(this);
    },

    //
    //getWorldTransform
    //
    getWorldTransform: function sceneNodeGetWorldTransformFn()
    {
        if (this.dirtyWorld)
        {
            this.dirtyWorld = false;
            this.worldUpdate += 1;
            this.checkUpdateRequired();

            var parent = this.parent;
            var local = this.local;
            if (parent)
            {
                var parentWorld = parent.getWorldTransform();
                if (local)
                {
                    this.world = this.mathDevice.m43Mul(local, parentWorld, this.world);
                }
                else
                {
                    this.world = this.mathDevice.m43Copy(parentWorld, this.world);
                }
            }
            else
            {
                this.world =  this.mathDevice.m43Copy(local, this.world);
            }
        }
        return this.world;
    },

    //
    //setDynamic
    //
    setDynamic: function sceneNodeSetDynamicFn()
    {
        if (!this.dynamic)
        {
            if (this.aabbTreeIndex !== undefined)
            {
                var scene = this.getRoot().scene;
                scene.staticSpatialMap.remove(this);
                scene.staticNodesChangeCounter += 1;
                delete this.aabbTreeIndex;
            }
            delete this.setLocalTransform; //Allowed to move again.

            var worldExtents = this.getWorldExtents();  //If there is any dirty state then its possible that even if it still has an aabbTreeIndex it may no longer.
            if (worldExtents)
            {
                this.getRoot().scene.dynamicSpatialMap.update(this, worldExtents);
            }
            this.dynamic = true;
        }

        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var n = 0; n < numChildren; n += 1)
            {
                children[n].setDynamic();
            }
        }
    },

    //
    //setStatic
    //
    setStatic: function sceneNodeSetStaticFn()
    {
        if (this.dynamic)
        {
            if (this.aabbTreeIndex !== undefined)
            {
                this.getRoot().scene.dynamicSpatialMap.remove(this);
                delete this.aabbTreeIndex;
            }

            this.setLocalTransform = SceneNode.invalidSetLocalTransform;

            var worldExtents = this.getWorldExtents();  //If there is any dirty state then its possible that even if it still has an aabbTreeIndex it may no longer.
            if (worldExtents)
            {
                var scene = this.getRoot().scene;
                if (scene)
                {
                    scene.staticSpatialMap.update(this, worldExtents);
                    scene.staticNodesChangeCounter += 1;
                }
            }

            delete this.dirtyWorldExtents;
            delete this.worldExtentsUpdate;
            delete this.dirtyWorld;
            delete this.worldExtentsUpdate;
            delete this.notifiedParent;
            delete this.dynamic;
        }

        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var n = 0; n < numChildren; n += 1)
            {
                children[n].setStatic();
            }
        }
    },

    //
    //setDisabled
    //
    setDisabled: function sceneNodeSetDisabled(disabled)
    {
        if (disabled)
        {
            this.disabled = true;
        }
        else
        {
            delete this.disabled;
        }
    },

    //
    //getDisabled
    //
    getDisabled: function sceneNodeGetDisabled()
    {
        return this.disabled ? true : false;
    },

    //
    //enableHierarchy
    //
    enableHierarchy: function sceneNodeDisableHierarchyFn(enabled)
    {
        this.setDisabled(!enabled);

        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var c = 0; c < numChildren; c += 1)
            {
                children[c].enableHierarchy(enabled);
            }
        }
    },

    //
    //childUpdated
    //
    childUpdated: function sceneNodeChildUpdatedFn()
    {
        //Private function
        //Utilities.assert(this.childNeedsUpdateCount >= 0, "Child update logic incorrect");
        this.childNeedsUpdateCount -= 1;
        if (this.childNeedsUpdateCount === 0 && this.dirtyWorld === false && this.dirtyWorldExtents === false)
        {   //no longer dirty
            if (this.parent)
            {
                this.parent.childUpdated();
                this.notifiedParent = false;
            }
        }
    },

    //
    //childNeedsUpdate
    //
    childNeedsUpdate: function sceneNodeChildNeedsUpdateFn()
    {
        //Private function
        this.updateRequired();        //propagate to the root node.
        this.childNeedsUpdateCount += 1;
    },

    //
    //updateRequired
    //
    updateRequired: function sceneNodeUpdateRequiredFn()
    {
        //Private function
        var parent = this.parent;
        if (parent)
        {
            if (!this.notifiedParent)
            {
                this.notifiedParent = true;
                parent.childNeedsUpdate();
            }
        }
        else
        {
            //Root nodes
            var scene = this.scene;
            if (scene)
            {
                var dirtyRoots = scene.dirtyRoots;
                if (!dirtyRoots)
                {
                    dirtyRoots = {};
                    scene.dirtyRoots = dirtyRoots;
                }
                dirtyRoots[this.name] = this;
            }
        }
    },

    //
    //checkUpdateRequired
    //
    checkUpdateRequired: function sceneNodeCheckUpdateRequiredFn()
    {
        //private function
        if (this.notifiedParent)
        {
            if (!this.dirtyWorldExtents &&
               !this.dirtyWorld &&
               !this.childNeedsUpdateCount)
            {
                this.parent.childUpdated();
                this.notifiedParent = false;
            }
        }
    },

    //
    //update
    //
    update: function sceneNodeUpdateFn(scene)
    {
        this.updateHelper(this.mathDevice, (scene || this.scene), [this]);
    },

    // PRIVATE
    updateHelper: function sceneNodeUpdateHelperFn(mathDevice, scene, nodes)
    {
        var node, parent, index, worldExtents;
        var numNodes = nodes.length;
        var m43Copy = mathDevice.m43Copy;
        var m43Mul = mathDevice.m43Mul;
        do
        {
            numNodes -= 1;
            node = nodes[numNodes];

            if (node.dirtyWorld)
            {
                node.dirtyWorld = false;
                node.worldUpdate += 1;

                parent = node.parent;
                if (parent)
                {
                    var local = node.local;
                    if (local)
                    {
                        node.world = m43Mul.call(mathDevice, local, parent.world, node.world);
                    }
                    else
                    {
                        node.world = m43Copy.call(mathDevice, parent.world, node.world);
                    }
                }
                else
                {
                    node.world = m43Copy.call(mathDevice, node.local, node.world);
                }
            }

            if (node.dirtyWorldExtents)
            {
                if (node.customWorldExtents)
                {
                    node.worldExtents = node.customWorldExtents;
                }
                else
                {
                    if (node.dirtyLocalExtents)
                    {
                        node.updateLocalExtents();
                    }

                    if (node.numCustomRenderableWorldExtents)
                    {
                        var renderable, extents, minX, minY, minZ, maxX, maxY, maxZ;
                        var renderables = node.renderables;
                        var numRenderables = renderables.length;
                        var empty = true;

                        for (index = 0; index < numRenderables; index += 1)
                        {
                            renderable = renderables[index];
                            if (renderable.hasCustomWorldExtents())
                            {
                                extents = renderable.getCustomWorldExtents();
                                minX = extents[0];
                                minY = extents[1];
                                minZ = extents[2];
                                maxX = extents[3];
                                maxY = extents[4];
                                maxZ = extents[5];
                                index += 1;
                                empty = false;
                                break;
                            }
                        }

                        for (; index < numRenderables; index += 1)
                        {
                            renderable = renderables[index];
                            if (renderable.hasCustomWorldExtents())
                            {
                                extents = renderable.getCustomWorldExtents();

                                if (minX > extents[0])
                                {
                                    minX = extents[0];
                                }
                                if (minY > extents[1])
                                {
                                    minY = extents[1];
                                }
                                if (minZ > extents[2])
                                {
                                    minZ = extents[2];
                                }

                                if (maxX < extents[3])
                                {
                                    maxX = extents[3];
                                }
                                if (maxY < extents[4])
                                {
                                    maxY = extents[4];
                                }
                                if (maxZ < extents[5])
                                {
                                    maxZ = extents[5];
                                }
                            }
                        }

                        if (empty)
                        {
                            // This should not happen...
                            delete node.worldExtents;
                        }
                        else
                        {
                            worldExtents = node.worldExtents;
                            if (!worldExtents)
                            {
                                worldExtents = [];
                                node.worldExtents = worldExtents;
                            }
                            worldExtents[0] = minX;
                            worldExtents[1] = minY;
                            worldExtents[2] = minZ;
                            worldExtents[3] = maxX;
                            worldExtents[4] = maxY;
                            worldExtents[5] = maxZ;
                        }
                    }
                    else if (node.localExtents)
                    {
                        //get center and half extents
                        var localExtentsCenter = node.localExtentsCenter;
                        var localHalfExtents = node.localHalfExtents;
                        var c0 = localExtentsCenter[0];
                        var c1 = localExtentsCenter[1];
                        var c2 = localExtentsCenter[2];
                        var h0 = localHalfExtents[0];
                        var h1 = localHalfExtents[1];
                        var h2 = localHalfExtents[2];

                        var world = node.world;
                        var m0 = world[0];
                        var m1 = world[1];
                        var m2 = world[2];
                        var m3 = world[3];
                        var m4 = world[4];
                        var m5 = world[5];
                        var m6 = world[6];
                        var m7 = world[7];
                        var m8 = world[8];

                        var ct0 = world[9];
                        var ct1 = world[10];
                        var ct2 = world[11];
                        if (c0 !== 0 ||
                            c1 !== 0 ||
                            c2 !== 0)
                        {
                            ct0 += (m0 * c0 + m3 * c1 + m6 * c2);
                            ct1 += (m1 * c0 + m4 * c1 + m7 * c2);
                            ct2 += (m2 * c0 + m5 * c1 + m8 * c2);
                        }

                        var ht0 = ((m0 < 0 ? -m0 : m0) * h0 + (m3 < 0 ? -m3 : m3) * h1 + (m6 < 0 ? -m6 : m6) * h2);
                        var ht1 = ((m1 < 0 ? -m1 : m1) * h0 + (m4 < 0 ? -m4 : m4) * h1 + (m7 < 0 ? -m7 : m7) * h2);
                        var ht2 = ((m2 < 0 ? -m2 : m2) * h0 + (m5 < 0 ? -m5 : m5) * h1 + (m8 < 0 ? -m8 : m8) * h2);

                        worldExtents = node.worldExtents;
                        if (!worldExtents)
                        {
                            worldExtents = [];
                            node.worldExtents = worldExtents;
                        }
                        worldExtents[0] = (ct0 - ht0);
                        worldExtents[1] = (ct1 - ht1);
                        worldExtents[2] = (ct2 - ht2);
                        worldExtents[3] = (ct0 + ht0);
                        worldExtents[4] = (ct1 + ht1);
                        worldExtents[5] = (ct2 + ht2);
                    }
                    else
                    {
                        //no object with size so no extents.
                        delete node.worldExtents;
                    }
                }

                node.dirtyWorldExtents = false;
                node.worldExtentsUpdate = true;
            }

            if (node.worldExtentsUpdate)
            {
                node.worldExtentsUpdate = false;

                worldExtents = node.worldExtents;
                if (worldExtents)
                {
                    if (node.dynamic)
                    {
                        scene.dynamicSpatialMap.update(node, worldExtents);
                    }
                    else
                    {
                        scene.staticSpatialMap.update(node, worldExtents);
                        scene.staticNodesChangeCounter += 1;
                        //Remove things that are no longer relevant.
                        node.setLocalTransform = SceneNode.invalidSetLocalTransform;  //no longer allowed to move it.
                        delete node.dirtyWorldExtents;
                        delete node.worldExtentsUpdate;
                        delete node.dirtyWorld;
                        delete node.notifiedParent;
                    }
                }
                else if (node.aabbTreeIndex !== undefined)
                {
                    if (node.dynamic)
                    {
                        scene.dynamicSpatialMap.remove(node);
                    }
                    else
                    {
                        scene.staticSpatialMap.remove(node);
                        scene.staticNodesChangeCounter += 1;
                    }
                }
            }

            if (node.childNeedsUpdateCount)
            {
                node.childNeedsUpdateCount = 0;

                var children = node.children;
                if (children)
                {
                    var numChildren = children.length;
                    for (index = 0; index < numChildren; index += 1)
                    {
                        var child = children[index];
                        if (child.notifiedParent)
                        {
                            nodes[numNodes] = child;
                            numNodes += 1;
                        }
                    }
                }
            }

            if (node.notifiedParent)
            {
                node.notifiedParent = false;
            }
        }
        while (0 < numNodes);
    },

    //
    //updateLocalExtents
    //
    updateLocalExtents: function sceneNodeUpdateLocalExtentsFn()
    {
        var localExtents;
        var hasExtents = false;
        if (this.customLocalExtents)
        {
            this.localExtents = this.customLocalExtents;
            hasExtents = true;
        }
        else
        {
            var renderables = this.renderables;
            var lights = this.lightInstances;
            if (renderables || lights)
            {
                var maxValue = Number.MAX_VALUE;
                var minValue = -maxValue;
                var min = Math.min;
                var max = Math.max;
                var center, halfExtents;

                localExtents = [maxValue, maxValue, maxValue, minValue, minValue, minValue];
                this.localExtents = localExtents;
                hasExtents = true;

                if (renderables)
                {
                    var numRenderables = renderables.length;
                    for (var index = 0; index < numRenderables; index += 1)
                    {
                        var renderable = renderables[index];
                        halfExtents = renderable.halfExtents;
                        if (halfExtents && !renderable.hasCustomWorldExtents())
                        {
                            center = renderable.center;
                            if (center)
                            {
                                localExtents[0] = min(localExtents[0], (center[0] - halfExtents[0]));
                                localExtents[1] = min(localExtents[1], (center[1] - halfExtents[1]));
                                localExtents[2] = min(localExtents[2], (center[2] - halfExtents[2]));

                                localExtents[3] = max(localExtents[3], (center[0] + halfExtents[0]));
                                localExtents[4] = max(localExtents[4], (center[1] + halfExtents[1]));
                                localExtents[5] = max(localExtents[5], (center[2] + halfExtents[2]));
                            }
                            else
                            {
                                localExtents[0] = min(localExtents[0], - halfExtents[0]);
                                localExtents[1] = min(localExtents[1], - halfExtents[1]);
                                localExtents[2] = min(localExtents[2], - halfExtents[2]);

                                localExtents[3] = max(localExtents[3], + halfExtents[0]);
                                localExtents[4] = max(localExtents[4], + halfExtents[1]);
                                localExtents[5] = max(localExtents[5], + halfExtents[2]);
                            }
                        }
                    }
                }

                if (lights)
                {
                    var numLights = lights.length;
                    for (var lindex = 0; lindex < numLights; lindex += 1)
                    {
                        var light = lights[lindex].light;
                        halfExtents = light.halfExtents;
                        if (halfExtents)
                        {
                            center = light.center;
                            if (center)
                            {
                                localExtents[0] = min(localExtents[0], (center[0] - halfExtents[0]));
                                localExtents[1] = min(localExtents[1], (center[1] - halfExtents[1]));
                                localExtents[2] = min(localExtents[2], (center[2] - halfExtents[2]));

                                localExtents[3] = max(localExtents[3], (center[0] + halfExtents[0]));
                                localExtents[4] = max(localExtents[4], (center[1] + halfExtents[1]));
                                localExtents[5] = max(localExtents[5], (center[2] + halfExtents[2]));
                            }
                            else
                            {
                                localExtents[0] = min(localExtents[0], - halfExtents[0]);
                                localExtents[1] = min(localExtents[1], - halfExtents[1]);
                                localExtents[2] = min(localExtents[2], - halfExtents[2]);

                                localExtents[3] = max(localExtents[3], + halfExtents[0]);
                                localExtents[4] = max(localExtents[4], + halfExtents[1]);
                                localExtents[5] = max(localExtents[5], + halfExtents[2]);
                            }
                        }
                    }
                }
            }
        }
        if (hasExtents)
        {
            localExtents = this.localExtents;
            var cX = (localExtents[3] + localExtents[0]) * 0.5;
            var cY = (localExtents[4] + localExtents[1]) * 0.5;
            var cZ = (localExtents[5] + localExtents[2]) * 0.5;
            this.localExtentsCenter = [cX, cY, cZ];
            this.localHalfExtents = [(localExtents[3] - cX), (localExtents[4] - cY), (localExtents[5] - cZ)];
        }
        else
        {
            delete this.localExtents;
            delete this.localExtentsCenter;
            delete this.localHalfExtents;
        }

        this.dirtyLocalExtents = false;
    },

    //
    //getLocalExtents
    //
    getLocalExtents: function sceneNodeGetLocalExtentsFn()
    {
        if (this.dirtyLocalExtents)
        {
            this.updateLocalExtents();
        }
        return this.localExtents; //Can be undefined if no local extents. These are not transformed by the local transform matrix.
    },

    //
    //updateWorldExtents
    //
    updateWorldExtents: function sceneNodeUpdateWorldExtentsFn()
    {
        if (this.dirtyWorldExtents)
        {
            if (this.customWorldExtents)
            {
                this.worldExtents = this.customWorldExtents;
            }
            else
            {
                if (this.dirtyLocalExtents)
                {
                    this.updateLocalExtents();
                }

                var worldExtents;

                if (this.numCustomRenderableWorldExtents)
                {
                    var index, renderable, extents, minX, minY, minZ, maxX, maxY, maxZ;
                    var renderables = this.renderables;
                    var numRenderables = renderables.length;
                    var empty = true;

                    for (index = 0; index < numRenderables; index += 1)
                    {
                        renderable = renderables[index];
                        if (renderable.hasCustomWorldExtents())
                        {
                            extents = renderable.getCustomWorldExtents();
                            minX = extents[0];
                            minY = extents[1];
                            minZ = extents[2];
                            maxX = extents[3];
                            maxY = extents[4];
                            maxZ = extents[5];
                            index += 1;
                            empty = false;
                            break;
                        }
                    }

                    for (; index < numRenderables; index += 1)
                    {
                        renderable = renderables[index];
                        if (renderable.hasCustomWorldExtents())
                        {
                            extents = renderable.getCustomWorldExtents();

                            if (minX > extents[0])
                            {
                                minX = extents[0];
                            }
                            if (minY > extents[1])
                            {
                                minY = extents[1];
                            }
                            if (minZ > extents[2])
                            {
                                minZ = extents[2];
                            }

                            if (maxX < extents[3])
                            {
                                maxX = extents[3];
                            }
                            if (maxY < extents[4])
                            {
                                maxY = extents[4];
                            }
                            if (maxZ < extents[5])
                            {
                                maxZ = extents[5];
                            }
                        }
                    }

                    if (empty)
                    {
                        // This should not happen...
                        delete this.worldExtents;
                    }
                    else
                    {
                        worldExtents = this.worldExtents;
                        if (!worldExtents)
                        {
                            worldExtents = [];
                            this.worldExtents = worldExtents;
                        }
                        worldExtents[0] = minX;
                        worldExtents[1] = minY;
                        worldExtents[2] = minZ;
                        worldExtents[3] = maxX;
                        worldExtents[4] = maxY;
                        worldExtents[5] = maxZ;
                    }
                }
                else if (this.localExtents)
                {
                    //get center and half extents
                    var localExtentsCenter = this.localExtentsCenter;
                    var localHalfExtents = this.localHalfExtents;
                    var c0 = localExtentsCenter[0];
                    var c1 = localExtentsCenter[1];
                    var c2 = localExtentsCenter[2];
                    var h0 = localHalfExtents[0];
                    var h1 = localHalfExtents[1];
                    var h2 = localHalfExtents[2];

                    var world = this.world;
                    var m0 = world[0];
                    var m1 = world[1];
                    var m2 = world[2];
                    var m3 = world[3];
                    var m4 = world[4];
                    var m5 = world[5];
                    var m6 = world[6];
                    var m7 = world[7];
                    var m8 = world[8];

                    var ct0 = world[9];
                    var ct1 = world[10];
                    var ct2 = world[11];
                    if (c0 !== 0 ||
                        c1 !== 0 ||
                        c2 !== 0)
                    {
                        ct0 += (m0 * c0 + m3 * c1 + m6 * c2);
                        ct1 += (m1 * c0 + m4 * c1 + m7 * c2);
                        ct2 += (m2 * c0 + m5 * c1 + m8 * c2);
                    }

                    var ht0 = ((m0 < 0 ? -m0 : m0) * h0 + (m3 < 0 ? -m3 : m3) * h1 + (m6 < 0 ? -m6 : m6) * h2);
                    var ht1 = ((m1 < 0 ? -m1 : m1) * h0 + (m4 < 0 ? -m4 : m4) * h1 + (m7 < 0 ? -m7 : m7) * h2);
                    var ht2 = ((m2 < 0 ? -m2 : m2) * h0 + (m5 < 0 ? -m5 : m5) * h1 + (m8 < 0 ? -m8 : m8) * h2);

                    worldExtents = this.worldExtents;
                    if (!worldExtents)
                    {
                        worldExtents = [];
                        this.worldExtents = worldExtents;
                    }
                    worldExtents[0] = (ct0 - ht0);
                    worldExtents[1] = (ct1 - ht1);
                    worldExtents[2] = (ct2 - ht2);
                    worldExtents[3] = (ct0 + ht0);
                    worldExtents[4] = (ct1 + ht1);
                    worldExtents[5] = (ct2 + ht2);
                }
                else
                {
                    //no object with size so no extents.
                    delete this.worldExtents;
                }
            }

            this.dirtyWorldExtents = false;
            this.worldExtentsUpdate = true;

            this.checkUpdateRequired();
        }
    },

    //
    //getWorldExtents
    //
    getWorldExtents: function sceneNodeGetWorldExtentsFn()
    {   //This is its own extents, not it and all its children.
        if (this.dirtyWorldExtents)
        {
            this.updateWorldExtents();
        }
        return this.worldExtents;
    },

    //
    //addCustomLocalExtents
    //
    addCustomLocalExtents: function sceneNodeAddCustomLocalExtentsFn(localExtents)
    {
        var customWorldExtents = this.customWorldExtents;
        if (!customWorldExtents)
        {
            this.customWorldExtents = localExtents.slice();
        }
        else
        {
            customWorldExtents[0] = localExtents[0];
            customWorldExtents[1] = localExtents[1];
            customWorldExtents[2] = localExtents[2];
            customWorldExtents[3] = localExtents[3];
            customWorldExtents[4] = localExtents[4];
            customWorldExtents[5] = localExtents[5];
        }
        this.dirtyWorldExtents = true;
        this.dirtyLocalExtents = true;
        this.updateRequired();
    },

    //
    //removeCustomLocalExtents
    //
    removeCustomLocalExtents: function sceneNodeRemoveCustomLocalExtentsFn()
    {
        delete this.customLocalExtents;
        this.dirtyWorldExtents = true;
        this.dirtyLocalExtents = true;
        this.updateRequired();
    },

    //
    //getCustomLocalExtents
    //
    getCustomLocalExtents: function sceneNodeGetCustomLocalExtentsFn()
    {
        return this.customLocalExtents;
    },

    //
    //addCustomWorldExtents
    //
    addCustomWorldExtents: function sceneNodeAddCustomWorldExtentsFn(worldExtents)
    {
        var customWorldExtents = this.customWorldExtents;
        if (!customWorldExtents)
        {
            this.customWorldExtents = worldExtents.slice();
        }
        else
        {
            customWorldExtents[0] = worldExtents[0];
            customWorldExtents[1] = worldExtents[1];
            customWorldExtents[2] = worldExtents[2];
            customWorldExtents[3] = worldExtents[3];
            customWorldExtents[4] = worldExtents[4];
            customWorldExtents[5] = worldExtents[5];
        }
        this.dirtyWorldExtents = true;
        this.updateRequired();
    },

    //
    //removeCustomWorldExtents
    //
    removeCustomWorldExtents: function sceneNodeRemoveCustomWorldExtentsFn()
    {
        delete this.customWorldExtents;
        this.dirtyWorldExtents = true;
        this.updateRequired();
    },

    //
    //getCustomWorldExtents
    //
    getCustomWorldExtents: function sceneNodeGetCustomWorldExtentsFn()
    {
        return this.customWorldExtents;
    },

    //
    //renderableWorldExtentsUpdated
    //
    renderableWorldExtentsUpdated: function sceneRenderableWorldExtentsUpdatedFn(wasAlreadyCustom)
    {
        if (!this.customWorldExtents)
        {
            this.dirtyWorldExtents = true;
            this.updateRequired();
        }

        if (!wasAlreadyCustom)
        {
            this.dirtyLocalExtents = true;
            this.numCustomRenderableWorldExtents = this.numCustomRenderableWorldExtents ? this.numCustomRenderableWorldExtents + 1 : 1;
        }
    },

    //
    //renderableWorldExtentsRemoved
    //
    renderableWorldExtentsRemoved: function sceneRenderableWorldExtentsRemovedFn()
    {
        if (!this.customWorldExtents)
        {
            this.dirtyWorldExtents = true;
            this.updateRequired();
        }
        this.dirtyLocalExtents = true;
        this.numCustomRenderableWorldExtents -= 1;
    },

    //
    //calculateHierarchyWorldExtents
    //
    calculateHierarchyWorldExtents: function sceneNodeCalculateHierarchyWorldExtentsFn()
    {
        var min = Math.min;
        var max = Math.max;
        var maxValue = Number.MAX_VALUE;
        var totalExtents = [];
        totalExtents[0] = maxValue;
        totalExtents[1] = maxValue;
        totalExtents[2] = maxValue;
        totalExtents[3] = -maxValue;
        totalExtents[4] = -maxValue;
        totalExtents[5] = -maxValue;

        function calculateNodeExtentsFn(sceneNode)
        {
            var worldExtents = sceneNode.getWorldExtents();
            if (worldExtents)
            {
                totalExtents[0] = min(totalExtents[0], worldExtents[0]);
                totalExtents[1] = min(totalExtents[1], worldExtents[1]);
                totalExtents[2] = min(totalExtents[2], worldExtents[2]);
                totalExtents[3] = max(totalExtents[3], worldExtents[3]);
                totalExtents[4] = max(totalExtents[4], worldExtents[4]);
                totalExtents[5] = max(totalExtents[5], worldExtents[5]);
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
        calculateNodeExtentsFn(this);

        if (totalExtents[0] === maxValue)
        {
            return undefined;
        }
        return totalExtents;
    },

    //
    //addRenderable
    //
    addRenderable: function sceneNodeAddRenderableFn(renderable)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        if (!this.renderables)
        {
            this.renderables = [];
        }
        this.renderables.push(renderable);
        renderable.setNode(this);
        this.dirtyLocalExtents = true;
    },

    //
    //addRenderableArray
    //
    addRenderableArray: function sceneNodeAddRenderableArrayFn(additionalRenderables)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        if (!this.renderables)
        {
            this.renderables = [];
        }
        var renderables = this.renderables;
        var length = additionalRenderables.length;
        for (var index = 0; index < length; index += 1)
        {
            renderables.push(additionalRenderables[index]);
            additionalRenderables[index].setNode(this);
        }
        this.dirtyLocalExtents = true;
    },

    //
    //removeRenderable
    //
    removeRenderable: function sceneNodeRemoveRenderableFn(renderable)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        var renderables = this.renderables;
        var numRenderables = renderables.length;
        for (var index = 0; index < numRenderables; index += 1)
        {
            if (renderables[index] === renderable)
            {
                renderables[index].setNode(null);
                renderables.splice(index, 1);
                this.dirtyLocalExtents = true;
                return;
            }
        }
        Utilities.assert(false, "Invalid renderable");
    },

    //
    //hasRenderables
    //
    hasRenderables: function sceneNodeHasRenderables()
    {
        return this.renderables && this.renderables.length;
    },

    //
    //addLightInstance
    //
    addLightInstance: function sceneNodeAddLightInstance(lightInstance)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        if (!this.lightInstances)
        {
            this.lightInstances = [];
        }
        this.lightInstances.push(lightInstance);
        lightInstance.setNode(this);
        this.dirtyLocalExtents = true;
    },

    //
    //addLightInstanceArray
    //
    addLightInstanceArray: function sceneNodeAddLightInstanceArray(additionalLightInstances)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        if (!this.lightInstances)
        {
            this.lightInstances = [];
        }

        var lightInstances = this.lightInstances;
        var length = additionalLightInstances.length;
        for (var index = 0; index < length; index += 1)
        {
            additionalLightInstances[index].setNode(this);
            lightInstances.push(additionalLightInstances[index]);
        }

        this.dirtyLocalExtents = true;
    },

    //
    //removeLightInstance
    //
    removeLightInstance: function sceneNodeRemoveLightInstance(lightInstance)
    {
        this.dirtyWorldExtents = true;
        this.updateRequired();
        var lightInstances = this.lightInstances;
        var numLights = lightInstances.length;
        for (var index = 0; index < numLights; index += 1)
        {
            if (lightInstances[index] === lightInstance)
            {
                lightInstance.setNode(null);
                lightInstances.splice(index, 1);
                this.dirtyLocalExtents = true;
                return;
            }
        }
        Utilities.assert(false, "Invalid light");
    },

    //
    //hasLightInstances
    //
    hasLightInstances: function sceneNodeHasLightInstances()
    {
        return this.lightInstances && this.lightInstances.length;
    },

    //
    //destroy
    //
    destroy: function sceneNodeDestroy()
    {
        //Should only be called when parent is null
        Utilities.assert(!this.parent, "SceneNode should be remove from parent before destroy is called");

        if (this.destroyedObserver)
        {
            this.destroyedObserver.notify({node: this});
        }

        var children = this.children;
        if (children)
        {
            var numChildren = children.length;
            for (var childIndex = numChildren - 1;  childIndex >= 0; childIndex -= 1)
            {
                var child = children[childIndex];
                this.removeChild(child);
                child.destroy();
            }
        }

        var renderables = this.renderables;
        if (renderables)
        {
            var numRenderables = renderables.length;
            for (var renderableIndex = numRenderables - 1; renderableIndex >= 0; renderableIndex -= 1)
            {
                var renderable = renderables[renderableIndex];
                if (renderable.destroy)
                {
                    renderable.destroy();
                }
            }
            this.renderables = [];
        }

        if (this.lightInstances)
        {
            this.lightInstances = [];
        }

        delete this.scene;
    },

    //
    //subscribeCloned
    //
    subscribeCloned: function sceneNodeSubscribeClonedFn(observerFunction)
    {
        if (!this.clonedObserver)
        {
            this.clonedObserver = Observer.create();
        }
        this.clonedObserver.subscribe(observerFunction);
    },

    //
    //unsubscribeCloned
    //
    unsubscribeCloned: function sceneNodeUnsubscribeClonedFn(observerFunction)
    {
        this.clonedObserver.unsubscribe(observerFunction);
    },

    //
    //subscribeDestroyed
    //
    subscribeDestroyed: function sceneNodeSubscribeDestroyedFn(observerFunction)
    {
        if (!this.destroyedObserver)
        {
            this.destroyedObserver = Observer.create();
        }
        this.destroyedObserver.subscribe(observerFunction);
    },

    //
    //unsubscribeDestroyed
    //
    unsubscribeDestroyed: function sceneNodeDestroyedFn(observerFunction)
    {
        this.destroyedObserver.unsubscribe(observerFunction);
    }
};

//
//SceneNode.create
//
SceneNode.create = function sceneNodeCreateFn(params)
{
    var sceneNode = new SceneNode();
    sceneNode.name = params.name;

    var md = TurbulenzEngine.getMathDevice();
    sceneNode.mathDevice = md;

    if (params.dynamic)
    {
        sceneNode.dynamic = params.dynamic;
    }
    if (params.disabled)
    {
        sceneNode.disabled = params.disabled;
    }

    sceneNode.dirtyWorldExtents = true;
    sceneNode.dirtyLocalExtents = true;
    sceneNode.worldUpdate = 0; //Counter of number of times modified.

    var local = params.local;
    if (local)
    {
        sceneNode.local = md.m43Copy(local);
    }
    else
    {
        sceneNode.local = md.m43BuildIdentity();
    }
    local = sceneNode.local;
    sceneNode.world = md.m43Copy(local);

    return sceneNode;
};
