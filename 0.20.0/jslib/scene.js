// Copyright (c) 2009-2012 Turbulenz Limited
/*global AABBTree*/
/*global Material*/
/*global SceneNode*/
/*global Geometry*/
/*global GeometryInstance*/
/*global Light*/
/*global LightInstance*/
/*global Utilities*/
/*global VertexBufferManager*/
/*global IndexBufferManager*/
/*global window*/
/*global alert*/
/*global Uint16Array*/
/*global Uint32Array*/
/*global Float32Array*/

//
// Scene
//
function Scene() {}
Scene.prototype =
{
    version: 1,

    //
    // findNode
    //
    findNode: function sceneFindNodeFn(nodePath)
    {
        //simple case of root node
        var result =  this.rootNodesMap[nodePath];
        if (result)
        {
            return result;
        }

        //else find node in turn
        var names = nodePath.split("/");
        var rootName = names[0];
        result =  this.rootNodesMap[rootName];

        for (var depth = 1; result && depth < names.length;  depth += 1)
        {
            result = result.findChild(names[depth]);
        }
        return result;
    },

    //
    // addRootNode
    //
    addRootNode: function addRootNodeFn(rootNode)
    {
        // Add the root to the top level nodes list and update the scene hierarchys
        Utilities.assert(rootNode.name, "Root nodes must be named");
        Utilities.assert(!rootNode.scene, "Root node already in a scene");
        Utilities.assert(!this.rootNodesMap[rootNode.name], "Root node with the same name exits in the scene");

        rootNode.scene = this;
        this.rootNodes.push(rootNode);
        if (!this.dirtyRoots)
        {
            this.dirtyRoots = {};
        }
        this.dirtyRoots[rootNode.name] = rootNode;
        this.rootNodesMap[rootNode.name] = rootNode;
    },

    //
    // removeRootNode
    //
    removeRootNode : function removeRootNodeFn(rootNode)
    {
        Utilities.assert(rootNode.scene === this, "Root node is not in the scene");
        rootNode.removedFromScene(this);
        var rootNodes = this.rootNodes;
        var numRootNodes = rootNodes.length;
        for (var n = 0; n < numRootNodes; n += 1)
        {
            if (rootNode === rootNodes[n])
            {
                rootNodes.splice(n, 1);
                break;
            }
        }
        if (this.dirtyRoots)
        {
            delete this.dirtyRoots[rootNode.name];
        }
        delete this.rootNodesMap[rootNode.name];
        delete rootNode.scene;
    },

    //
    // addLight
    //
    addLight: function sceneAddLightFn(light)
    {
        this.lights[light.name] = light;

        if (light.isGlobal())
        {
            this.globalLights.push(light);
        }
    },

    //
    // removeLight
    //
    removeLight: function sceneRemoveLightFn(light)
    {
        delete this.lights[light.name];

        if (light.isGlobal())
        {
            var globalLights = this.globalLights;
            var numGlobalLights = globalLights.length;
            for (var index = 0; index < numGlobalLights; index += 1)
            {
                if (light === globalLights[index])
                {
                    globalLights.splice(index, 1);
                    break;
                }
            }
        }
    },

    //
    // getLight
    //
    getLight: function sceneGetLightFn(name)
    {
        return this.lights[name];
    },

    //
    // getGlobalLights
    //
    getGlobalLights: function sceneGetGlobalLightsFn()
    {
        return this.globalLights;
    },

    //
    // calculateNumNodes
    //
    calculateNumNodes: function calculateNumNodesFn(nodes)
    {
        var numNodes = nodes.length;
        var numTotalNodes = numNodes;
        for (var n = 0; n < numNodes; n += 1)
        {
            var children = nodes[n].children;
            if (children)
            {
                numTotalNodes += calculateNumNodesFn(children);
            }
        }
        return numTotalNodes;
    },

    //
    // buildPortalPlanes
    //
    buildPortalPlanes: function buildPortalPlanesFn(points, planes, cX, cY, cZ, frustumPlanes)
    {
        var numPoints = points.length;
        var numFrustumPlanes = frustumPlanes.length;
        var numPlanes = 0;
        var n, np, nnp, p, plane, numVisiblePointsPlane;

        var culledByPlane = [];
        culledByPlane.length = numPoints;
        np = 0;
        do
        {
            culledByPlane[np] = [];
            np += 1;
        }
        while (np < numPoints);

        n = 0;
        do
        {
            plane = frustumPlanes[n];
            var pl0 = plane[0];
            var pl1 = plane[1];
            var pl2 = plane[2];
            var pl3 = plane[3];
            numVisiblePointsPlane = 0;

            np = 0;
            do
            {
                p = points[np];
                if ((pl0 * p[0] + pl1 * p[1] + pl2 * p[2]) >= pl3)
                {
                    numVisiblePointsPlane += 1;
                }
                else
                {
                    culledByPlane[np][n] = true;
                }
                np += 1;
            }
            while (np < numPoints);

            if (numVisiblePointsPlane === 0)
            {
                planes.length = 0;
                return false;
            }
            else if (numVisiblePointsPlane < numPoints)
            {
                planes[numPlanes] = plane;
                numPlanes += 1;
            }
            n += 1;
        }
        while (n < numFrustumPlanes);

        var allPointsVisible = (numPlanes === 0);

        var newPoints = [];
        newPoints.length = numPoints;
        np = 0;
        do
        {
            p = points[np];
            newPoints[np] = [(p[0] - cX), (p[1] - cY), (p[2] - cZ)];
            np += 1;
        }
        while (np < numPoints);

        var sqrt = Math.sqrt;
        np = 0;
        do
        {
            nnp = (np + 1);
            if (nnp >= numPoints)
            {
                nnp = 0;
            }

            // Skip plane if both points were culled by the same frustum plane
            var culled0 = culledByPlane[np];
            var culled1 = culledByPlane[nnp];
            var maxCulled = (culled0.length < culled1.length ? culled0.length : culled1.length);
            for (n = 0; n < maxCulled; n += 1)
            {
                if (culled0[n] && culled1[n])
                {
                    break;
                }
            }
            if (n < maxCulled)
            {
                np += 1;
                continue;
            }

            p = newPoints[np];
            var p0X = p[0];
            var p0Y = p[1];
            var p0Z = p[2];

            p = newPoints[nnp];
            var p1X = p[0];
            var p1Y = p[1];
            var p1Z = p[2];

            // n = cross(p0, p1)
            var nX = ((p0Y * p1Z) - (p0Z * p1Y));
            var nY = ((p0Z * p1X) - (p0X * p1Z));
            var nZ = ((p0X * p1Y) - (p0Y * p1X));

            // normalize(n)
            var lnsq = ((nX * nX) + (nY * nY) + (nZ * nZ));
            if (lnsq === 0)
            {
                planes.length = 0;
                return false;
            }
            var lnrcp = 1.0 / sqrt(lnsq);
            nX *= lnrcp;
            nY *= lnrcp;
            nZ *= lnrcp;

            // d = dot(n, c)
            var d = ((nX * cX) + (nY * cY) + (nZ * cZ));

            planes[numPlanes] = [nX, nY, nZ, d];
            numPlanes += 1;

            np += 1;
        }
        while (np < numPoints);

        return allPointsVisible;
    },

    //
    // findAreaIndex
    //
    findAreaIndex: function findAreaIndexFn(bspNodes, cX, cY, cZ)
    {
        var numNodes = bspNodes.length;
        var nodeIndex = 0;
        var node, plane;
        do
        {
            node = bspNodes[nodeIndex];
            plane = node.plane;
            nodeIndex = (((plane[0] * cX) + (plane[1] * cY) + (plane[2] * cZ)) < plane[3] ? node.neg : node.pos);
            if (nodeIndex <= 0)
            {
                return -(nodeIndex + 1);
            }
        }
        while (nodeIndex < numNodes);
        return -1;
    },

    //
    // findAreaIndicesAABB
    //
    findAreaIndicesAABB: function findAreaIndicesAABBFn(bspNodes, n0, n1, n2, p0, p1, p2)
    {
        var numNodes = bspNodes.length;
        var areaIndices = [];
        var visitedArea = [];
        var stack = [0];
        var numNodesStack = 1;
        var nodeIndex, node, plane, areaIndex;
        do
        {
            numNodesStack -= 1;
            nodeIndex = stack[numNodesStack];
            do
            {
                node = bspNodes[nodeIndex];
                plane = node.plane;
                var d0 = plane[0];
                var d1 = plane[1];
                var d2 = plane[2];
                var d3 = plane[3];
                if ((d0 * (d0 < 0 ? n0 : p0) + d1 * (d1 < 0 ? n1 : p1) + d2 * (d2 < 0 ? n2 : p2)) < d3)
                {
                    nodeIndex = node.neg;
                }
                else
                {
                    if ((d0 * (d0 > 0 ? n0 : p0) + d1 * (d1 > 0 ? n1 : p1) + d2 * (d2 > 0 ? n2 : p2)) <= d3)
                    {
                        nodeIndex = node.neg;
                        if (nodeIndex <= 0)
                        {
                            if (nodeIndex < 0)
                            {
                                areaIndex = -(nodeIndex + 1);
                                if (!visitedArea[areaIndex])
                                {
                                    visitedArea[areaIndex] = true;
                                    areaIndices.push(areaIndex);
                                }
                            }
                        }
                        else
                        {
                            stack[numNodesStack] = nodeIndex;
                            numNodesStack += 1;
                        }
                    }
                    nodeIndex = node.pos;
                }
                if (nodeIndex <= 0)
                {
                    if (nodeIndex < 0)
                    {
                        areaIndex = -(nodeIndex + 1);
                        if (!visitedArea[areaIndex])
                        {
                            visitedArea[areaIndex] = true;
                            areaIndices.push(areaIndex);
                        }
                    }
                    break;
                }
            }
            while (nodeIndex < numNodes);
        }
        while (0 < numNodesStack);
        return areaIndices;
    },

    //
    // findVisiblePortals
    //
    findVisiblePortals: function sceneFindVisiblePortalsFn(areaIndex, cX, cY, cZ)
    {
        var buildPortalPlanes = this.buildPortalPlanes;
        var visiblePortals = this.visiblePortals;
        var oldNumVisiblePortals = visiblePortals.length;
        var frustumPlanes = this.frustumPlanes;
        var numFrustumPlanes = frustumPlanes.length;
        var queryCounter = this.getQueryCounter();
        var areas = this.areas;
        var portals, numPortals, portal, plane, area, n, portalPlanes, portalItem;
        var numVisiblePortals = 0;

        // Cull portals behind camera
        // (do NOT use nearPlane directly because areaIndex is based on the camera position)
        var nearPlane  = this.nearPlane;
        var nearPlane0 = nearPlane[0];
        var nearPlane1 = nearPlane[1];
        var nearPlane2 = nearPlane[2];
        frustumPlanes[numFrustumPlanes] = [nearPlane0, nearPlane1, nearPlane2, ((nearPlane0 * cX) + (nearPlane1 * cY) + (nearPlane2 * cZ))];

        area = areas[areaIndex];
        portals = area.portals;
        numPortals = portals.length;
        for (n = 0; n < numPortals; n += 1)
        {
            portal = portals[n];
            if (portal.disabled)
            {
                continue;
            }
            portal.queryCounter = queryCounter;
            plane = portal.plane;
            if (((plane[0] * cX) + (plane[1] * cY) + (plane[2] * cZ)) < plane[3])
            {
                if (numVisiblePortals < oldNumVisiblePortals)
                {
                    portalItem = visiblePortals[numVisiblePortals];
                    portalPlanes = portalItem.planes;
                    portalPlanes.length = 0;
                }
                else
                {
                    portalPlanes = [];
                }
                buildPortalPlanes(portal.points, portalPlanes, cX, cY, cZ, frustumPlanes);
                if (0 < portalPlanes.length)
                {
                    if (numVisiblePortals < oldNumVisiblePortals)
                    {
                        portalItem.portal = portal;
                        portalItem.area   = portal.area;
                    }
                    else
                    {
                        visiblePortals[numVisiblePortals] = {
                                portal: portal,
                                planes: portalPlanes,
                                area: portal.area
                            };
                    }
                    numVisiblePortals += 1;
                }
            }
        }

        frustumPlanes.length = numFrustumPlanes; // remove camera plane, not needed to cull nodes

        if (0 < numVisiblePortals)
        {
            var numPortalPlanes, nextArea, plane0, plane1, plane2, plane3, planes, allPointsVisible;
            var currentPortalIndex = 0;
            do
            {
                portalItem = visiblePortals[currentPortalIndex];
                currentPortalIndex += 1;
                portalPlanes = portalItem.planes;
                numPortalPlanes = portalPlanes.length;
                portal = portalItem.portal;
                areaIndex = portalItem.area;

                portalPlanes[numPortalPlanes] = portal.plane; // Add current plane to cull portals behind

                area = areas[areaIndex];
                portals = area.portals;
                numPortals = portals.length;
                for (n = 0; n < numPortals; n += 1)
                {
                    portal = portals[n];
                    nextArea = portal.area;
                    if (nextArea !== areaIndex &&
                        portal.queryCounter !== queryCounter &&
                        !portal.disabled)
                    {
                        plane = portal.plane;
                        plane0 = plane[0];
                        plane1 = plane[1];
                        plane2 = plane[2];
                        plane3 = plane[3];
                        if (((plane0 * cX) + (plane1 * cY) + (plane2 * cZ)) < plane3)
                        {
                            if (numVisiblePortals < oldNumVisiblePortals)
                            {
                                portalItem = visiblePortals[numVisiblePortals];
                                planes = portalItem.planes;
                                planes.length = 0;
                            }
                            else
                            {
                                planes = [];
                            }
                            allPointsVisible = buildPortalPlanes(portal.points, planes, cX, cY, cZ, portalPlanes);
                            if (0 < planes.length)
                            {
                                if (allPointsVisible)
                                {
                                    portal.queryCounter = queryCounter;
                                }
                                if (numVisiblePortals < oldNumVisiblePortals)
                                {
                                    portalItem.portal = portal;
                                    portalItem.area   = nextArea;
                                }
                                else
                                {
                                    visiblePortals[numVisiblePortals] = {
                                            portal: portal,
                                            planes: planes,
                                            area: nextArea
                                        };
                                }
                                numVisiblePortals += 1;
                            }
                        }
                        else
                        {
                            portal.queryCounter = queryCounter;
                        }
                    }
                }

                portalPlanes.length = numPortalPlanes; // remove current plane, not needed to cull nodes
            }
            while (currentPortalIndex < numVisiblePortals);
        }

        if (numVisiblePortals < oldNumVisiblePortals)
        {
            visiblePortals.length = numVisiblePortals;
        }
    },

    //
    // findVisibleNodes
    //
    findVisibleNodes: function sceneFindVisibleNodesFn(camera, visibleNodes)
    {
        var frustumPlanes = this.frustumPlanes;
        var useAABBTrees = true;
        var areas = this.areas;
        if (areas)
        {
            var cameraMatrix = camera.matrix;
            var cX = cameraMatrix[9];
            var cY = cameraMatrix[10];
            var cZ = cameraMatrix[11];

            var areaIndex = this.findAreaIndex(this.bspNodes, cX, cY, cZ);
            this.cameraAreaIndex = areaIndex;

            if (areaIndex >= 0)
            {
                camera.getFrustumExtents(this.cameraExtents);
                var cameraMinExtent0 = this.cameraExtents[0];
                var cameraMinExtent1 = this.cameraExtents[1];
                var cameraMinExtent2 = this.cameraExtents[2];
                var cameraMaxExtent0 = this.cameraExtents[3];
                var cameraMaxExtent1 = this.cameraExtents[4];
                var cameraMaxExtent2 = this.cameraExtents[5];

                this.findVisiblePortals(areaIndex, cX, cY, cZ);

                var area, na, nodes, numNodes;
                var numAreas = areas.length;
                for (na = 0; na < numAreas; na += 1)
                {
                    area = areas[na];
                    nodes = area.nodes;
                    numNodes = area.numStaticNodes;
                    if (nodes.length > numNodes)
                    {
                        nodes.length = numNodes;
                    }
                    area.addedDynamicNodes = false;
                }

                var isInsidePlanesAABB = this.isInsidePlanesAABB;
                var dynamicSpatialMap = this.dynamicSpatialMap;
                var visiblePortals = this.visiblePortals;
                var numVisiblePortals = visiblePortals.length;
                var queryCounter = this.getQueryCounter();
                var numVisibleNodes = visibleNodes.length;
                var n, node, np, portalItem, portalPlanes;

                area = areas[areaIndex];
                nodes = area.nodes;
                area.addedDynamicNodes = true;

                var areaExtent = area.extents;
                var areaMinExtent0 = areaExtent[0];
                var areaMinExtent1 = areaExtent[1];
                var areaMinExtent2 = areaExtent[2];
                var areaMaxExtent0 = areaExtent[3];
                var areaMaxExtent1 = areaExtent[4];
                var areaMaxExtent2 = areaExtent[5];
                var combinedExtents = [(areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0),
                                       (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1),
                                       (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2),
                                       (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0),
                                       (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1),
                                       (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2)];
                dynamicSpatialMap.getOverlappingNodes(combinedExtents, nodes);

                numNodes = nodes.length;
                for (n = 0; n < numNodes; n += 1)
                {
                    node = nodes[n];
                    node.queryCounter = queryCounter;
                    if (isInsidePlanesAABB(node.worldExtents, frustumPlanes))
                    {
                        visibleNodes[numVisibleNodes] = node;
                        numVisibleNodes += 1;
                    }
                }

                for (np = 0; np < numVisiblePortals; np += 1)
                {
                    portalItem = visiblePortals[np];
                    portalPlanes = portalItem.planes;
                    area = areas[portalItem.area];
                    nodes = area.nodes;

                    if (!area.addedDynamicNodes)
                    {
                        area.addedDynamicNodes = true;
                        areaExtent = area.extents;
                        areaMinExtent0 = areaExtent[0];
                        areaMinExtent1 = areaExtent[1];
                        areaMinExtent2 = areaExtent[2];
                        areaMaxExtent0 = areaExtent[3];
                        areaMaxExtent1 = areaExtent[4];
                        areaMaxExtent2 = areaExtent[5];
                        combinedExtents[0] = (areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0);
                        combinedExtents[1] = (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1);
                        combinedExtents[2] = (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2);
                        combinedExtents[3] = (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0);
                        combinedExtents[4] = (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1);
                        combinedExtents[5] = (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2);
                        dynamicSpatialMap.getOverlappingNodes(combinedExtents, nodes);
                    }

                    numNodes = nodes.length;
                    for (n = 0; n < numNodes; n += 1)
                    {
                        node = nodes[n];
                        if (node.queryCounter !== queryCounter)
                        {
                            if (isInsidePlanesAABB(node.worldExtents, portalPlanes))
                            {
                                node.queryCounter = queryCounter;
                                visibleNodes[numVisibleNodes] = node;
                                numVisibleNodes += 1;
                            }
                        }
                    }
                }

                useAABBTrees = false;
            } /*
            else
            {
                Utilities.log("Camera outside areas!");
            }*/
        }

        if (useAABBTrees)
        {
            this.staticSpatialMap.getVisibleNodes(frustumPlanes, visibleNodes);

            this.dynamicSpatialMap.getVisibleNodes(frustumPlanes, visibleNodes);
        }
    },

    //
    // findVisibleNodesTree
    //
    findVisibleNodesTree: function sceneFindVisibleNodesTreeFn(tree, camera, visibleNodes)
    {
        var frustumPlanes = this.frustumPlanes;
        var useAABBTree = true;
        var areas = this.areas;
        if (areas)
        {
            // Assume scene.update has been called before this function
            var areaIndex = this.cameraAreaIndex; //this.findAreaIndex(this.bspNodes, cX, cY, cZ);
            if (areaIndex >= 0)
            {
                //this.findVisiblePortals(areaIndex, cX, cY, cZ);

                //camera.getFrustumExtents(this.cameraExtents);
                var cameraMinExtent0 = this.cameraExtents[0];
                var cameraMinExtent1 = this.cameraExtents[1];
                var cameraMinExtent2 = this.cameraExtents[2];
                var cameraMaxExtent0 = this.cameraExtents[3];
                var cameraMaxExtent1 = this.cameraExtents[4];
                var cameraMaxExtent2 = this.cameraExtents[5];

                var areaExtent;
                var areaMinExtent0, areaMinExtent1, areaMinExtent2;
                var areaMaxExtent0, areaMaxExtent1, areaMaxExtent2;
                var combinedExtents = [];

                var area, na, nodes, numNodes;
                var numAreas = areas.length;
                for (na = 0; na < numAreas; na += 1)
                {
                    areas[na].externalNodes = null;
                }

                var isInsidePlanesAABB = this.isInsidePlanesAABB;
                var findOverlappingAreas = this.findOverlappingAreas;
                var findAreaIndex = this.findAreaIndex;
                var visiblePortals = this.visiblePortals;
                var numVisiblePortals = visiblePortals.length;
                var queryCounter = this.getQueryCounter();
                var bspNodes = this.bspNodes;
                var numVisibleNodes = visibleNodes.length;
                var portalPlanes;
                var n, node, nodeExtents, np, portalItem;
                var cX, cY, cZ, nodeAreaIndex, overlappingAreas, numOverlappingAreas;

                area = areas[areaIndex];
                nodes = area.externalNodes;

                if (!nodes)
                {
                    nodes = [];
                    area.externalNodes = nodes;

                    areaExtent = area.extents;
                    areaMinExtent0 = areaExtent[0];
                    areaMinExtent1 = areaExtent[1];
                    areaMinExtent2 = areaExtent[2];
                    areaMaxExtent0 = areaExtent[3];
                    areaMaxExtent1 = areaExtent[4];
                    areaMaxExtent2 = areaExtent[5];
                    combinedExtents[0] = (areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0);
                    combinedExtents[1] = (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1);
                    combinedExtents[2] = (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2);
                    combinedExtents[3] = (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0);
                    combinedExtents[4] = (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1);
                    combinedExtents[5] = (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2);

                    tree.getOverlappingNodes(combinedExtents, nodes);

                    // Check which ones actually belong to the area
                    numNodes = nodes.length;
                    for (n = 0; n < numNodes; n += 1)
                    {
                        node = nodes[n];
                        nodeExtents = node.worldExtents;
                        cX = (nodeExtents[0] + nodeExtents[3]) * 0.5;
                        cY = (nodeExtents[1] + nodeExtents[4]) * 0.5;
                        cZ = (nodeExtents[2] + nodeExtents[5]) * 0.5;
                        nodeAreaIndex = findAreaIndex(bspNodes, cX, cY, cZ);
                        if (nodeAreaIndex >= 0 &&
                            areaIndex !== nodeAreaIndex)
                        {
                            overlappingAreas = findOverlappingAreas.call(this, nodeAreaIndex, nodeExtents);
                            numOverlappingAreas = overlappingAreas.length;
                            for (na = 0; na < numOverlappingAreas; na += 1)
                            {
                                if (overlappingAreas[na] === area)
                                {
                                    break;
                                }
                            }
                            if (na >= numOverlappingAreas)
                            {
                                numNodes -= 1;
                                if (n < numNodes)
                                {
                                    nodes[n] = nodes[numNodes];
                                    n -= 1; // compensate for the n += 1 on the for loop
                                }
                                else
                                {
                                    break;
                                }
                            }
                        }
                    }
                    nodes.length = numNodes;
                }

                numNodes = nodes.length;
                for (n = 0; n < numNodes; n += 1)
                {
                    node = nodes[n];
                    node.queryCounter = queryCounter;
                    if (isInsidePlanesAABB(node.worldExtents, frustumPlanes))
                    {
                        visibleNodes[numVisibleNodes] = node;
                        numVisibleNodes += 1;
                    }
                }

                for (np = 0; np < numVisiblePortals; np += 1)
                {
                    portalItem = visiblePortals[np];
                    portalPlanes = portalItem.planes;
                    areaIndex = portalItem.area;
                    area = areas[areaIndex];
                    nodes = area.externalNodes;

                    if (!nodes)
                    {
                        nodes = [];
                        area.externalNodes = nodes;

                        areaExtent = area.extents;
                        areaMinExtent0 = areaExtent[0];
                        areaMinExtent1 = areaExtent[1];
                        areaMinExtent2 = areaExtent[2];
                        areaMaxExtent0 = areaExtent[3];
                        areaMaxExtent1 = areaExtent[4];
                        areaMaxExtent2 = areaExtent[5];
                        combinedExtents[0] = (areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0);
                        combinedExtents[1] = (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1);
                        combinedExtents[2] = (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2);
                        combinedExtents[3] = (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0);
                        combinedExtents[4] = (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1);
                        combinedExtents[5] = (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2);

                        tree.getOverlappingNodes(combinedExtents, nodes);

                        // Check which ones actually belong to the area
                        numNodes = nodes.length;
                        for (n = 0; n < numNodes; n += 1)
                        {
                            node = nodes[n];
                            nodeExtents = node.worldExtents;
                            cX = (nodeExtents[0] + nodeExtents[3]) * 0.5;
                            cY = (nodeExtents[1] + nodeExtents[4]) * 0.5;
                            cZ = (nodeExtents[2] + nodeExtents[5]) * 0.5;
                            nodeAreaIndex = findAreaIndex(bspNodes, cX, cY, cZ);
                            if (nodeAreaIndex >= 0 &&
                                areaIndex !== nodeAreaIndex)
                            {
                                overlappingAreas = findOverlappingAreas.call(this, nodeAreaIndex, nodeExtents);
                                numOverlappingAreas = overlappingAreas.length;
                                for (na = 0; na < numOverlappingAreas; na += 1)
                                {
                                    if (overlappingAreas[na] === area)
                                    {
                                        break;
                                    }
                                }
                                if (na >= numOverlappingAreas)
                                {
                                    numNodes -= 1;
                                    if (n < numNodes)
                                    {
                                        nodes[n] = nodes[numNodes];
                                        n -= 1; // compensate for the n += 1 on the for loop
                                    }
                                    else
                                    {
                                        break;
                                    }
                                }
                            }
                        }
                        nodes.length = numNodes;
                    }

                    numNodes = nodes.length;
                    for (n = 0; n < numNodes; n += 1)
                    {
                        node = nodes[n];
                        if (node.queryCounter !== queryCounter)
                        {
                            if (isInsidePlanesAABB(node.worldExtents, portalPlanes))
                            {
                                node.queryCounter = queryCounter;
                                visibleNodes[numVisibleNodes] = node;
                                numVisibleNodes += 1;
                            }
                        }
                    }
                }

                useAABBTree = false;
            }
        }

        if (useAABBTree)
        {
            tree.getVisibleNodes(frustumPlanes, visibleNodes);
        }
    },

    //
    // buildPortalPlanesNoFrustum
    //
    buildPortalPlanesNoFrustum: function buildPortalPlanesNoFrustum(points, cX, cY, cZ)
    {
        var numPoints = points.length;
        var planes = [];
        var numPlanes = 0;
        var newPoints = [];
        var np, p;

        newPoints.length = numPoints;
        np = 0;
        do
        {
            p = points[np];
            newPoints[np] = [(p[0] - cX), (p[1] - cY), (p[2] - cZ)];
            np += 1;
        }
        while (np < numPoints);

        var sqrt = Math.sqrt;
        np = 0;
        do
        {
            p = newPoints[np];
            var p0X = p[0];
            var p0Y = p[1];
            var p0Z = p[2];

            p = newPoints[((np + 1) < numPoints ? (np + 1) : 0)];
            var p1X = p[0];
            var p1Y = p[1];
            var p1Z = p[2];

            // n = cross(p0, p1)
            var nX = ((p0Y * p1Z) - (p0Z * p1Y));
            var nY = ((p0Z * p1X) - (p0X * p1Z));
            var nZ = ((p0X * p1Y) - (p0Y * p1X));
            var lnsq = ((nX * nX) + (nY * nY) + (nZ * nZ));
            if (lnsq === 0)
            {
                return false;
            }
            var lnrcp = 1.0 / sqrt(lnsq);
            nX *= lnrcp;
            nY *= lnrcp;
            nZ *= lnrcp;

            // d = dot(n, c)
            var d = ((nX * cX) + (nY * cY) + (nZ * cZ));

            planes[numPlanes] = [nX, nY, nZ, d];
            numPlanes += 1;

            np += 1;
        }
        while (np < numPoints);

        return planes;
    },

    //
    // findOverlappingPortals
    //
    findOverlappingPortals: function sceneFindOverlappingPortalsFn(areaIndex, cX, cY, cZ, extents, overlappingPortals)
    {
        var portals, numPortals, n, portal, plane, d0, d1, d2, offset, area, portalExtents, planes;
        var buildPortalPlanesNoFrustum = this.buildPortalPlanesNoFrustum;
        var queryCounter = this.getQueryCounter();
        var areas = this.areas;
        var numOverlappingPortals = 0;

        var min0 = extents[0];
        var min1 = extents[1];
        var min2 = extents[2];
        var max0 = extents[3];
        var max1 = extents[4];
        var max2 = extents[5];

        area = areas[areaIndex];
        portals = area.portals;
        numPortals = portals.length;
        for (n = 0; n < numPortals; n += 1)
        {
            portal = portals[n];
            portal.queryCounter = queryCounter;

            portalExtents = portal.extents;
            if (portalExtents[0] < max0 &&
                portalExtents[1] < max1 &&
                portalExtents[2] < max2 &&
                portalExtents[3] > min0 &&
                portalExtents[4] > min1 &&
                portalExtents[5] > min2)
            {
                plane = portal.plane;
                d0 = plane[0];
                d1 = plane[1];
                d2 = plane[2];
                offset = plane[3];
                if (((d0 * cX) + (d1 * cY) + (d2 * cZ)) < offset &&
                    (d0 * (d0 < 0 ? min0 : max0) + d1 * (d1 < 0 ? min1 : max1) + d2 * (d2 < 0 ? min2 : max2)) >= offset)
                {
                    planes = buildPortalPlanesNoFrustum(portal.points, cX, cY, cZ);
                    if (planes)
                    {
                        overlappingPortals[numOverlappingPortals] = {
                                portal: portal,
                                planes: planes,
                                area: portal.area
                            };
                        numOverlappingPortals += 1;
                    }
                }
            }
        }

        if (0 < numOverlappingPortals)
        {
            var portalItem, parentPlanes, nextArea;
            var currentPortalIndex = 0;
            do
            {
                portalItem = overlappingPortals[currentPortalIndex];
                currentPortalIndex += 1;
                parentPlanes = portalItem.planes;
                areaIndex = portalItem.area;
                portal = portalItem.portal;

                area = areas[areaIndex];
                portals = area.portals;
                numPortals = portals.length;
                for (n = 0; n < numPortals; n += 1)
                {
                    portal = portals[n];
                    nextArea = portal.area;
                    if (nextArea !== areaIndex &&
                        portal.queryCounter !== queryCounter)
                    {
                        portalExtents = portal.extents;
                        if (portalExtents[0] < max0 &&
                            portalExtents[1] < max1 &&
                            portalExtents[2] < max2 &&
                            portalExtents[3] > min0 &&
                            portalExtents[4] > min1 &&
                            portalExtents[5] > min2)
                        {
                            plane = portal.plane;
                            d0 = plane[0];
                            d1 = plane[1];
                            d2 = plane[2];
                            offset = plane[3];
                            if (((d0 * cX) + (d1 * cY) + (d2 * cZ)) < offset &&
                                (d0 * (d0 < 0 ? min0 : max0) + d1 * (d1 < 0 ? min1 : max1) + d2 * (d2 < 0 ? min2 : max2)) >= offset)
                            {
                                planes = buildPortalPlanesNoFrustum(portal.points, cX, cY, cZ);
                                if (planes)
                                {
                                    portal.queryCounter = queryCounter;
                                    overlappingPortals[numOverlappingPortals] = {
                                            portal: portal,
                                            planes: parentPlanes.concat(planes),
                                            area: nextArea
                                        };
                                    numOverlappingPortals += 1;
                                }
                            }
                            else
                            {
                                portal.queryCounter = queryCounter;
                            }
                        }
                        else
                        {
                            portal.queryCounter = queryCounter;
                        }
                    }
                }
            }
            while (currentPortalIndex < numOverlappingPortals);
        }
    },

    //
    // findOverlappingNodes
    //
    findOverlappingNodes: function sceneFindOverlappingNodesFn(tree, origin, extents, overlappingNodes)
    {
        var useAABBTree = true;
        var areas = this.areas;
        if (areas)
        {
            // Assume scene.update has been called before this function
            var cX = origin[0];
            var cY = origin[1];
            var cZ = origin[2];
            var areaIndex = this.findAreaIndex(this.bspNodes, cX, cY, cZ);
            if (areaIndex >= 0)
            {
                var na, nodes, numNodes;
                var numAreas = areas.length;
                for (na = 0; na < numAreas; na += 1)
                {
                    areas[na].externalNodes = null;
                }

                var minExtent0 = extents[0];
                var minExtent1 = extents[1];
                var minExtent2 = extents[2];
                var maxExtent0 = extents[3];
                var maxExtent1 = extents[4];
                var maxExtent2 = extents[5];

                var area = areas[areaIndex];
                var testExtents = area.extents;
                var testMinExtent0 = testExtents[0];
                var testMinExtent1 = testExtents[1];
                var testMinExtent2 = testExtents[2];
                var testMaxExtent0 = testExtents[3];
                var testMaxExtent1 = testExtents[4];
                var testMaxExtent2 = testExtents[5];

                var overlappingPortals = [];
                this.findOverlappingPortals(areaIndex, cX, cY, cZ, extents, overlappingPortals);

                var isInsidePlanesAABB = this.isInsidePlanesAABB;
                var queryCounter = this.getQueryCounter();
                var numOverlappingPortals = overlappingPortals.length;
                var numOverlappingNodes = overlappingNodes.length;
                var portalPlanes;
                var n, node, np, portalItem;

                nodes = [];
                area.externalNodes = nodes;
                testExtents = [(testMinExtent0 > minExtent0 ? testMinExtent0 : minExtent0),
                               (testMinExtent1 > minExtent1 ? testMinExtent1 : minExtent1),
                               (testMinExtent2 > minExtent2 ? testMinExtent2 : minExtent2),
                               (testMaxExtent0 < maxExtent0 ? testMaxExtent0 : maxExtent0),
                               (testMaxExtent1 < maxExtent1 ? testMaxExtent1 : maxExtent1),
                               (testMaxExtent2 < maxExtent2 ? testMaxExtent2 : maxExtent2)];
                tree.getOverlappingNodes(testExtents, nodes);

                numNodes = nodes.length;
                for (n = 0; n < numNodes; n += 1)
                {
                    node = nodes[n];
                    node.queryCounter = queryCounter;
                    overlappingNodes[numOverlappingNodes] = node;
                    numOverlappingNodes += 1;
                }

                for (np = 0; np < numOverlappingPortals; np += 1)
                {
                    portalItem = overlappingPortals[np];
                    portalPlanes = portalItem.planes;
                    area = areas[portalItem.area];
                    nodes = area.externalNodes;

                    if (!nodes)
                    {
                        nodes = [];
                        area.externalNodes = nodes;
                        testExtents = area.extents;
                        testMinExtent0 = testExtents[0];
                        testMinExtent1 = testExtents[1];
                        testMinExtent2 = testExtents[2];
                        testMaxExtent0 = testExtents[3];
                        testMaxExtent1 = testExtents[4];
                        testMaxExtent2 = testExtents[5];

                        testExtents = [(testMinExtent0 > minExtent0 ? testMinExtent0 : minExtent0),
                                         (testMinExtent1 > minExtent1 ? testMinExtent1 : minExtent1),
                                         (testMinExtent2 > minExtent2 ? testMinExtent2 : minExtent2),
                                         (testMaxExtent0 < maxExtent0 ? testMaxExtent0 : maxExtent0),
                                         (testMaxExtent1 < maxExtent1 ? testMaxExtent1 : maxExtent1),
                                         (testMaxExtent2 < maxExtent2 ? testMaxExtent2 : maxExtent2)];
                        tree.getOverlappingNodes(testExtents, nodes);
                    }

                    numNodes = nodes.length;
                    for (n = 0; n < numNodes; n += 1)
                    {
                        node = nodes[n];
                        if (node.queryCounter !== queryCounter)
                        {
                            if (isInsidePlanesAABB(node.worldExtents, portalPlanes))
                            {
                                node.queryCounter = queryCounter;
                                overlappingNodes[numOverlappingNodes] = node;
                                numOverlappingNodes += 1;
                            }
                        }
                    }
                }

                useAABBTree = false;
            }
        }

        if (useAABBTree)
        {
            tree.getOverlappingNodes(extents, overlappingNodes);
        }
    },

    //
    // findStaticOverlappingNodes
    //
    findStaticOverlappingNodes: function sceneFindStaticOverlappingNodesFn(origin, extents, overlappingNodes)
    {
        this.findOverlappingNodes(this.staticSpatialMap, origin, extents, overlappingNodes);
    },

    //
    // findDynamicOverlappingNodes
    //
    findDynamicOverlappingNodes: function sceneFindDynamicOverlappingNodesFn(origin, extents, overlappingNodes)
    {
        this.findOverlappingNodes(this.dynamicSpatialMap, origin, extents, overlappingNodes);
    },

    //
    // findOverlappingRenderables
    //
    findOverlappingRenderables: function sceneFindOverlappingRenderablesFn(tree, origin, extents, overlappingRenderables)
    {
        var numOverlappingRenderables = overlappingRenderables.length;
        var minExtent0 = extents[0];
        var minExtent1 = extents[1];
        var minExtent2 = extents[2];
        var maxExtent0 = extents[3];
        var maxExtent1 = extents[4];
        var maxExtent2 = extents[5];

        var overlappingNodes = [];
        var useAABBTree = true;
        var areas = this.areas;

        var node;
        var numNodes;
        var nodeIndex;
        var renderable;
        var renderables;
        var numRenderables;
        var nodeExtents;
        var renderableIndex;
        var renderableExtents;

        if (areas)
        {
            // Assume scene.update has been called before this function
            var cX = origin[0];
            var cY = origin[1];
            var cZ = origin[2];
            var areaIndex = this.findAreaIndex(this.bspNodes, cX, cY, cZ);
            if (areaIndex >= 0)
            {
                var na, nodes;
                var numAreas = areas.length;
                for (na = 0; na < numAreas; na += 1)
                {
                    areas[na].externalNodes = null;
                }

                var area = areas[areaIndex];
                var testExtents = area.extents;
                var testMinExtent0 = testExtents[0];
                var testMinExtent1 = testExtents[1];
                var testMinExtent2 = testExtents[2];
                var testMaxExtent0 = testExtents[3];
                var testMaxExtent1 = testExtents[4];
                var testMaxExtent2 = testExtents[5];

                var overlappingPortals = [];
                this.findOverlappingPortals(areaIndex, cX, cY, cZ, extents, overlappingPortals);

                var isInsidePlanesAABB = this.isInsidePlanesAABB;
                var isFullyInsidePlanesAABB = this.isFullyInsidePlanesAABB;
                var queryCounter = this.getQueryCounter();
                var numOverlappingPortals = overlappingPortals.length;
                var portalPlanes;
                var n, np, portalItem;
                var allVisible;

                nodes = [];
                area.externalNodes = nodes;
                testExtents = [(testMinExtent0 > minExtent0 ? testMinExtent0 : minExtent0),
                               (testMinExtent1 > minExtent1 ? testMinExtent1 : minExtent1),
                               (testMinExtent2 > minExtent2 ? testMinExtent2 : minExtent2),
                               (testMaxExtent0 < maxExtent0 ? testMaxExtent0 : maxExtent0),
                               (testMaxExtent1 < maxExtent1 ? testMaxExtent1 : maxExtent1),
                               (testMaxExtent2 < maxExtent2 ? testMaxExtent2 : maxExtent2)];
                tree.getOverlappingNodes(testExtents, nodes);

                numNodes = nodes.length;
                for (nodeIndex = 0; nodeIndex < numNodes; nodeIndex += 1)
                {
                    node = nodes[nodeIndex];
                    node.queryCounter = queryCounter;
                    renderables = node.renderables;
                    if (renderables)
                    {
                        numRenderables = renderables.length;
                        if (numRenderables === 1)
                        {
                            overlappingRenderables[numOverlappingRenderables] = renderables[0];
                            numOverlappingRenderables += 1;
                        }
                        else
                        {
                            // Check if node is fully inside
                            nodeExtents = node.worldExtents;
                            if (nodeExtents[0] >= minExtent0 &&
                                nodeExtents[1] >= minExtent1 &&
                                nodeExtents[2] >= minExtent2 &&
                                nodeExtents[3] <= maxExtent0 &&
                                nodeExtents[4] <= maxExtent1 &&
                                nodeExtents[5] <= maxExtent2)
                            {
                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                {
                                    overlappingRenderables[numOverlappingRenderables] = renderables[renderableIndex];
                                    numOverlappingRenderables += 1;
                                }
                            }
                            else
                            {
                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                {
                                    renderable = renderables[renderableIndex];
                                    renderableExtents = renderable.getWorldExtents();
                                    if (renderableExtents[3] >= minExtent0 &&
                                        renderableExtents[4] >= minExtent1 &&
                                        renderableExtents[5] >= minExtent2 &&
                                        renderableExtents[0] <= maxExtent0 &&
                                        renderableExtents[1] <= maxExtent1 &&
                                        renderableExtents[2] <= maxExtent2)
                                    {
                                        overlappingRenderables[numOverlappingRenderables] = renderable;
                                        numOverlappingRenderables += 1;
                                    }
                                }
                            }
                        }
                    }
                }

                for (np = 0; np < numOverlappingPortals; np += 1)
                {
                    portalItem = overlappingPortals[np];
                    portalPlanes = portalItem.planes;
                    area = areas[portalItem.area];
                    nodes = area.externalNodes;

                    if (!nodes)
                    {
                        nodes = [];
                        area.externalNodes = nodes;
                        testExtents = area.extents;
                        testMinExtent0 = testExtents[0];
                        testMinExtent1 = testExtents[1];
                        testMinExtent2 = testExtents[2];
                        testMaxExtent0 = testExtents[3];
                        testMaxExtent1 = testExtents[4];
                        testMaxExtent2 = testExtents[5];

                        testExtents = [(testMinExtent0 > minExtent0 ? testMinExtent0 : minExtent0),
                                       (testMinExtent1 > minExtent1 ? testMinExtent1 : minExtent1),
                                       (testMinExtent2 > minExtent2 ? testMinExtent2 : minExtent2),
                                       (testMaxExtent0 < maxExtent0 ? testMaxExtent0 : maxExtent0),
                                       (testMaxExtent1 < maxExtent1 ? testMaxExtent1 : maxExtent1),
                                       (testMaxExtent2 < maxExtent2 ? testMaxExtent2 : maxExtent2)];
                        tree.getOverlappingNodes(testExtents, nodes);
                    }

                    numNodes = nodes.length;
                    for (n = 0; n < numNodes; n += 1)
                    {
                        node = nodes[n];
                        if (node.queryCounter !== queryCounter)
                        {
                            allVisible = true;

                            renderables = node.renderables;
                            if (renderables)
                            {
                                nodeExtents = node.worldExtents;
                                if (isInsidePlanesAABB(nodeExtents, portalPlanes))
                                {
                                    numRenderables = renderables.length;
                                    if (numRenderables === 1)
                                    {
                                        renderable = renderables[0];
                                        if (renderable.queryCounter !== queryCounter)
                                        {
                                            renderable.queryCounter = queryCounter;
                                            overlappingRenderables[numOverlappingRenderables] = renderable;
                                            numOverlappingRenderables += 1;
                                        }
                                    }
                                    else
                                    {
                                        // Check if node is fully inside
                                        if (nodeExtents[0] >= minExtent0 &&
                                            nodeExtents[1] >= minExtent1 &&
                                            nodeExtents[2] >= minExtent2 &&
                                            nodeExtents[3] <= maxExtent0 &&
                                            nodeExtents[4] <= maxExtent1 &&
                                            nodeExtents[5] <= maxExtent2)
                                        {
                                            if (isFullyInsidePlanesAABB(nodeExtents, portalPlanes))
                                            {
                                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                                {
                                                    renderable = renderables[renderableIndex];
                                                    if (renderable.queryCounter !== queryCounter)
                                                    {
                                                        renderable.queryCounter = queryCounter;
                                                        overlappingRenderables[numOverlappingRenderables] = renderable;
                                                        numOverlappingRenderables += 1;
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                                {
                                                    renderable = renderables[renderableIndex];
                                                    if (renderable.queryCounter !== queryCounter)
                                                    {
                                                        if (isInsidePlanesAABB(renderable.getWorldExtents(), portalPlanes))
                                                        {
                                                            renderable.queryCounter = queryCounter;
                                                            overlappingRenderables[numOverlappingRenderables] = renderable;
                                                            numOverlappingRenderables += 1;
                                                        }
                                                        else
                                                        {
                                                            allVisible = false;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        else
                                        {
                                            if (isFullyInsidePlanesAABB(nodeExtents, portalPlanes))
                                            {
                                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                                {
                                                    renderable = renderables[renderableIndex];
                                                    if (renderable.queryCounter !== queryCounter)
                                                    {
                                                        renderableExtents = renderable.getWorldExtents();
                                                        if (renderableExtents[3] >= minExtent0 &&
                                                            renderableExtents[4] >= minExtent1 &&
                                                            renderableExtents[5] >= minExtent2 &&
                                                            renderableExtents[0] <= maxExtent0 &&
                                                            renderableExtents[1] <= maxExtent1 &&
                                                            renderableExtents[2] <= maxExtent2)
                                                        {
                                                            renderable.queryCounter = queryCounter;
                                                            overlappingRenderables[numOverlappingRenderables] = renderable;
                                                            numOverlappingRenderables += 1;
                                                        }
                                                        else
                                                        {
                                                            allVisible = false;
                                                        }
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                                                {
                                                    renderable = renderables[renderableIndex];
                                                    if (renderable.queryCounter !== queryCounter)
                                                    {
                                                        renderableExtents = renderable.getWorldExtents();
                                                        if (renderableExtents[3] >= minExtent0 &&
                                                            renderableExtents[4] >= minExtent1 &&
                                                            renderableExtents[5] >= minExtent2 &&
                                                            renderableExtents[0] <= maxExtent0 &&
                                                            renderableExtents[1] <= maxExtent1 &&
                                                            renderableExtents[2] <= maxExtent2 &&
                                                            isInsidePlanesAABB(renderableExtents, portalPlanes))
                                                        {
                                                            renderable.queryCounter = queryCounter;
                                                            overlappingRenderables[numOverlappingRenderables] = renderable;
                                                            numOverlappingRenderables += 1;
                                                        }
                                                        else
                                                        {
                                                            allVisible = false;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    allVisible = false;
                                }
                            }

                            if (allVisible)
                            {
                                node.queryCounter = queryCounter;
                            }
                        }
                    }
                }
                useAABBTree = false;
            }
        }

        if (useAABBTree)
        {
            tree.getOverlappingNodes(extents, overlappingNodes);
            numNodes = overlappingNodes.length;
            for (nodeIndex = 0; nodeIndex < numNodes; nodeIndex += 1)
            {
                node = overlappingNodes[nodeIndex];
                renderables = node.renderables;
                if (renderables)
                {
                    numRenderables = renderables.length;
                    if (numRenderables === 1)
                    {
                        overlappingRenderables[numOverlappingRenderables] = renderables[0];
                        numOverlappingRenderables += 1;
                    }
                    else
                    {
                        // Check if node is fully inside
                        nodeExtents = node.worldExtents;
                        if (nodeExtents[0] >= minExtent0 &&
                            nodeExtents[1] >= minExtent1 &&
                            nodeExtents[2] >= minExtent2 &&
                            nodeExtents[3] <= maxExtent0 &&
                            nodeExtents[4] <= maxExtent1 &&
                            nodeExtents[5] <= maxExtent2)
                        {
                            for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                            {
                                overlappingRenderables[numOverlappingRenderables] = renderables[renderableIndex];
                                numOverlappingRenderables += 1;
                            }
                        }
                        else
                        {
                            for (renderableIndex = 0; renderableIndex < numRenderables; renderableIndex += 1)
                            {
                                renderable = renderables[renderableIndex];
                                renderableExtents = renderable.getWorldExtents();
                                if (renderableExtents[3] >= minExtent0 &&
                                    renderableExtents[4] >= minExtent1 &&
                                    renderableExtents[5] >= minExtent2 &&
                                    renderableExtents[0] <= maxExtent0 &&
                                    renderableExtents[1] <= maxExtent1 &&
                                    renderableExtents[2] <= maxExtent2)
                                {
                                    overlappingRenderables[numOverlappingRenderables] = renderable;
                                    numOverlappingRenderables += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    //
    // findStaticOverlappingRenderables
    //
    findStaticOverlappingRenderables: function sceneFindStaticOverlappingRenderablesFn(origin, extents, overlappingRenderables)
    {
        this.findOverlappingRenderables(this.staticSpatialMap, origin, extents, overlappingRenderables);
    },

    //
    // findDynamicOverlappingRenderables
    //
    findDynamicOverlappingRenderables: function sceneFindDynamicOverlappingRenderablesFn(origin, extents, overlappingRenderables)
    {
        this.findOverlappingRenderables(this.dynamicSpatialMap, origin, extents, overlappingRenderables);
    },

    //
    // cloneRootNode
    //
    cloneRootNode: function cloneRootNodeFn(rootNode, newInstanceName)
    {
        var newNode = rootNode.clone(newInstanceName);
        this.addRootNode(newNode);
        return newNode;
    },

    //
    // updateVisibleNodes
    //
    updateVisibleNodes: function sceneUpdateVisibleNodesFn(camera)
    {
        var visibleNodes = this.visibleNodes;
        visibleNodes.length = 0;
        var numVisibleNodes = 0;

        var visibleRenderables = this.visibleRenderables;
        this.visibleRenderables.length = 0;
        var numVisibleRenderables = 0;

        var visibleLights = this.visibleLights;
        this.visibleLights.length = 0;
        var numVisibleLights = 0;

        this.extractFrustumPlanes(camera);

        var frameIndex = this.frameIndex;
        var maxDistance = 0;
        var nearPlane = this.nearPlane;
        var d0 = nearPlane[0];
        var d1 = nearPlane[1];
        var d2 = nearPlane[2];
        var offset = nearPlane[3];
        var n = 0;
        var node;

        var queryCounter = this.getQueryCounter();
        var isInsidePlanesAABB = this.isInsidePlanesAABB;
        var isFullyInsidePlanesAABB = this.isFullyInsidePlanesAABB;

        //
        // sceneProcessVisibleNodeFn helper
        //
        function sceneProcessVisibleNodeFn(node, planes, cameraExtents)
        {
            var n0, n1, n2, p0, p1, p2, distance;
            var extents = node.worldExtents;
            var allVisible = true;

            if (node.frameVisible !== frameIndex)
            {
                node.frameVisible = frameIndex;

                n0 = extents[0];
                n1 = extents[1];
                n2 = extents[2];
                p0 = extents[3];
                p1 = extents[4];
                p2 = extents[5];

                // Frustum tests do return some false positives, check bounding boxes
                if (cameraExtents[3] > n0 &&
                    cameraExtents[4] > n1 &&
                    cameraExtents[5] > n2 &&
                    p0 > cameraExtents[0] &&
                    p1 > cameraExtents[1] &&
                    p2 > cameraExtents[2])
                {
                    distance = ((d0 * (d0 > 0 ? p0 : n0)) + (d1 * (d1 > 0 ? p1 : n1)) + (d2 * (d2 > 0 ? p2 : n2)) - offset);
                }
                else
                {
                    distance = -1;
                }

                node.distance = distance;
                if (0 < distance)
                {
                    //This signifies any part of the node is visible, but not necessarily all.
                    visibleNodes[numVisibleNodes] = node;
                    numVisibleNodes += 1;
                }
            }
            else
            {
                distance = node.distance;
            }

            if (0 < distance)
            {
                if (!node.disabled)
                {
                    var renderable, i, lightInstance, l;
                    var renderables = node.renderables;
                    var numRenderables = (renderables ? renderables.length : 0);

                    var lights = node.lightInstances;
                    var numLights = (lights ? lights.length : 0);

                    var fullyVisible = (1 < (numLights + numRenderables) ?
                                        isFullyInsidePlanesAABB(extents, planes) :
                                        false);

                    if (renderables)
                    {
                        if (numRenderables === 1 && !lights)
                        {
                            for (i = 0; i < numRenderables; i += 1)
                            {
                                renderable = renderables[i];
                                if (!renderable.disabled &&
                                    renderable.queryCounter !== queryCounter)
                                {
                                    if (maxDistance < distance)
                                    {
                                        maxDistance = distance;
                                    }
                                    renderable.distance = distance;
                                    renderable.frameVisible = frameIndex;
                                    renderable.queryCounter = queryCounter;
                                    visibleRenderables[numVisibleRenderables] = renderable;
                                    numVisibleRenderables += 1;
                                }
                            }
                        }
                        else
                        {
                            for (i = 0; i < numRenderables; i += 1)
                            {
                                renderable = renderables[i];
                                if (!renderable.disabled &&
                                    renderable.queryCounter !== queryCounter)
                                {
                                    extents = renderable.getWorldExtents();
                                    if (fullyVisible || isInsidePlanesAABB(extents, planes))
                                    {
                                        n0 = extents[0];
                                        n1 = extents[1];
                                        n2 = extents[2];
                                        p0 = extents[3];
                                        p1 = extents[4];
                                        p2 = extents[5];

                                        // Frustum tests do return some false positives, check bounding boxes
                                        if (fullyVisible ||
                                            (cameraExtents[3] > n0 &&
                                             cameraExtents[4] > n1 &&
                                             cameraExtents[5] > n2 &&
                                             p0 > cameraExtents[0] &&
                                             p1 > cameraExtents[1] &&
                                             p2 > cameraExtents[2]))
                                        {
                                            distance = ((d0 * (d0 > 0 ? p0 : n0)) + (d1 * (d1 > 0 ? p1 : n1)) + (d2 * (d2 > 0 ? p2 : n2)) - offset);
                                        }
                                        else
                                        {
                                            distance -= 1;
                                        }

                                        if (0 < distance)
                                        {
                                            if (maxDistance < distance)
                                            {
                                                maxDistance = distance;
                                            }
                                            renderable.distance = distance;
                                            renderable.frameVisible = frameIndex;
                                            renderable.queryCounter = queryCounter;
                                            visibleRenderables[numVisibleRenderables] = renderable;
                                            numVisibleRenderables += 1;
                                        }
                                        else
                                        {
                                            allVisible = false;
                                        }
                                    }
                                    else
                                    {
                                        allVisible = false;
                                    }
                                }
                            }
                        }
                    }

                    if (lights)
                    {
                        if (numLights === 1 && !renderables)
                        {
                            for (l = 0; l < numLights; l += 1)
                            {
                                lightInstance = lights[l];
                                if (!lightInstance.disabled &&
                                    lightInstance.queryCounter !== queryCounter &&
                                    !lightInstance.light.isGlobal())
                                {
                                    lightInstance.distance = distance;
                                    lightInstance.frameVisible = frameIndex;
                                    lightInstance.queryCounter = queryCounter;
                                    visibleLights[numVisibleLights] = lightInstance;
                                    numVisibleLights += 1;
                                }
                            }
                        }
                        else
                        {
                            for (l = 0; l < numLights; l += 1)
                            {
                                lightInstance = lights[l];
                                if (!lightInstance.disabled &&
                                    lightInstance.queryCounter !== queryCounter &&
                                    !lightInstance.light.isGlobal())
                                {
                                    extents = lightInstance.getWorldExtents();
                                    if (fullyVisible || isInsidePlanesAABB(extents, planes))
                                    {
                                        n0 = extents[0];
                                        n1 = extents[1];
                                        n2 = extents[2];
                                        p0 = extents[3];
                                        p1 = extents[4];
                                        p2 = extents[5];

                                        // Frustum tests do return some false positives, check bounding boxes
                                        if (fullyVisible ||
                                            (cameraExtents[3] > n0 &&
                                             cameraExtents[4] > n1 &&
                                             cameraExtents[5] > n2 &&
                                             p0 > cameraExtents[0] &&
                                             p1 > cameraExtents[1] &&
                                             p2 > cameraExtents[2]))
                                        {
                                            distance = ((d0 * (d0 > 0 ? p0 : n0)) + (d1 * (d1 > 0 ? p1 : n1)) + (d2 * (d2 > 0 ? p2 : n2)) - offset);
                                        }
                                        else
                                        {
                                            distance -= 1;
                                        }

                                        if (0 < distance)
                                        {
                                            lightInstance.distance = distance;
                                            lightInstance.frameVisible = frameIndex;
                                            lightInstance.queryCounter = queryCounter;
                                            visibleLights[numVisibleLights] = lightInstance;
                                            numVisibleLights += 1;
                                        }
                                        else
                                        {
                                            allVisible = false;
                                        }
                                    }
                                    else
                                    {
                                        allVisible = false;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (allVisible)
            {
                node.queryCounter = queryCounter;
            }
        }

        // findVisibleNodes
        var cameraExtents = this.cameraExtents;
        camera.getFrustumExtents(cameraExtents);

        var frustumPlanes = this.frustumPlanes;
        var useAABBTrees = true;
        var areas = this.areas;
        if (areas)
        {
            var cameraMatrix = camera.matrix;
            var cX = cameraMatrix[9];
            var cY = cameraMatrix[10];
            var cZ = cameraMatrix[11];

            var areaIndex = this.findAreaIndex(this.bspNodes, cX, cY, cZ);
            this.cameraAreaIndex = areaIndex;

            if (areaIndex >= 0)
            {
                var cameraMinExtent0 = cameraExtents[0];
                var cameraMinExtent1 = cameraExtents[1];
                var cameraMinExtent2 = cameraExtents[2];
                var cameraMaxExtent0 = cameraExtents[3];
                var cameraMaxExtent1 = cameraExtents[4];
                var cameraMaxExtent2 = cameraExtents[5];

                this.findVisiblePortals(areaIndex, cX, cY, cZ);

                var area, na, nodes, numNodes;
                var numAreas = areas.length;
                for (na = 0; na < numAreas; na += 1)
                {
                    area = areas[na];
                    nodes = area.nodes;
                    numNodes = area.numStaticNodes;
                    if (nodes.length > numNodes)
                    {
                        nodes.length = numNodes;
                    }
                    area.addedDynamicNodes = false;
                }

                var dynamicSpatialMap = this.dynamicSpatialMap;
                var visiblePortals = this.visiblePortals;
                var numVisiblePortals = visiblePortals.length;

                var np, portalItem, portalPlanes;

                area = areas[areaIndex];
                nodes = area.nodes;
                area.addedDynamicNodes = true;

                var areaExtent = area.extents;
                var areaMinExtent0 = areaExtent[0];
                var areaMinExtent1 = areaExtent[1];
                var areaMinExtent2 = areaExtent[2];
                var areaMaxExtent0 = areaExtent[3];
                var areaMaxExtent1 = areaExtent[4];
                var areaMaxExtent2 = areaExtent[5];
                var combinedExtents = [(areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0),
                                       (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1),
                                       (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2),
                                       (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0),
                                       (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1),
                                       (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2)];
                dynamicSpatialMap.getOverlappingNodes(combinedExtents, nodes);

                numNodes = nodes.length;
                for (n = 0; n < numNodes; n += 1)
                {
                    node = nodes[n];
                    node.queryCounter = queryCounter;
                    if (isInsidePlanesAABB(node.worldExtents, frustumPlanes))
                    {
                        sceneProcessVisibleNodeFn(node, frustumPlanes, cameraExtents);
                    }
                }

                for (np = 0; np < numVisiblePortals; np += 1)
                {
                    portalItem = visiblePortals[np];
                    portalPlanes = portalItem.planes;
                    area = areas[portalItem.area];
                    nodes = area.nodes;

                    // Frustum tests do return some false positives, check bounding boxes
                    areaExtent = area.extents;
                    areaMinExtent0 = areaExtent[0];
                    areaMinExtent1 = areaExtent[1];
                    areaMinExtent2 = areaExtent[2];
                    areaMaxExtent0 = areaExtent[3];
                    areaMaxExtent1 = areaExtent[4];
                    areaMaxExtent2 = areaExtent[5];
                    if (cameraMaxExtent0 > areaMinExtent0 &&
                        cameraMaxExtent1 > areaMinExtent1 &&
                        cameraMaxExtent2 > areaMinExtent2 &&
                        areaMaxExtent0 > cameraMinExtent0 &&
                        areaMaxExtent1 > cameraMinExtent1 &&
                        areaMaxExtent2 > cameraMinExtent2)
                    {
                        if (!area.addedDynamicNodes)
                        {
                            area.addedDynamicNodes = true;
                            combinedExtents[0] = (areaMinExtent0 < cameraMinExtent0 ? cameraMinExtent0 : areaMinExtent0);
                            combinedExtents[1] = (areaMinExtent1 < cameraMinExtent1 ? cameraMinExtent1 : areaMinExtent1);
                            combinedExtents[2] = (areaMinExtent2 < cameraMinExtent2 ? cameraMinExtent2 : areaMinExtent2);
                            combinedExtents[3] = (areaMaxExtent0 > cameraMaxExtent0 ? cameraMaxExtent0 : areaMaxExtent0);
                            combinedExtents[4] = (areaMaxExtent1 > cameraMaxExtent1 ? cameraMaxExtent1 : areaMaxExtent1);
                            combinedExtents[5] = (areaMaxExtent2 > cameraMaxExtent2 ? cameraMaxExtent2 : areaMaxExtent2);
                            dynamicSpatialMap.getOverlappingNodes(combinedExtents, nodes);
                        }

                        numNodes = nodes.length;
                        for (n = 0; n < numNodes; n += 1)
                        {
                            node = nodes[n];
                            if (node.queryCounter !== queryCounter)
                            {
                                if (isInsidePlanesAABB(node.worldExtents, portalPlanes))
                                {
                                    sceneProcessVisibleNodeFn(node, portalPlanes, cameraExtents);
                                }
                            }
                        }
                    }
                }

                useAABBTrees = false;
            }
        }

        if (useAABBTrees)
        {
            var queryVisibleNodes = [];
            this.staticSpatialMap.getVisibleNodes(frustumPlanes, queryVisibleNodes);
            this.dynamicSpatialMap.getVisibleNodes(frustumPlanes, queryVisibleNodes);
            var numQueryVisibleNodes = queryVisibleNodes.length;
            if (numQueryVisibleNodes)
            {
                n = 0;
                do
                {
                    sceneProcessVisibleNodeFn(queryVisibleNodes[n], frustumPlanes, cameraExtents);
                    n += 1;
                }
                while (n < numQueryVisibleNodes);
            }
        }

        this.maxDistance = (maxDistance + camera.nearPlane);
        this.frameIndex += 1;
    },

    //
    // getCurrentVisibleNodes
    //
    getCurrentVisibleNodes: function sceneGetCurrentVisibleNodesFn()
    {
        return this.visibleNodes;
    },

    //
    // getCurrentVisibleRenderables
    //
    getCurrentVisibleRenderables: function sceneGetCurrentVisibleRenderablesFn()
    {
        return this.visibleRenderables;
    },

    //
    // getCurrentVisibleLights
    //
    getCurrentVisibleLights: function sceneGetCurrentVisibleLightsFn()
    {
        return this.visibleLights;
    },

    //
    // updateNodes
    //
    updateNodes: function sceneUpdateNodesFn()
    {
        var dirtyRoots = this.dirtyRoots;
        if (dirtyRoots)
        {
            var nodesToUpdate = [];
            var numNodesToUpdate = 0;
            for (var root in dirtyRoots)
            {
                if (dirtyRoots.hasOwnProperty(root))
                {
                    nodesToUpdate[numNodesToUpdate] = dirtyRoots[root];
                    numNodesToUpdate += 1;
                }
            }
            delete this.dirtyRoots;
            dirtyRoots = null;
            if (0 < numNodesToUpdate)
            {
                SceneNode.prototype.updateHelper(this.md, this, nodesToUpdate);
            }
        }
    },

    //
    // update
    //
    update: function sceneUpdateFn()
    {
        this.updateNodes();
        this.staticSpatialMap.finalize();
        this.dynamicSpatialMap.finalize();
        this.updateExtents();

        if (this.areas &&
            this.staticNodesChangeCounter !== this.areaInitalizeStaticNodesChangeCounter)
        {
            //Note this leaves extents of areas as large as they ever got.
            this.initializeAreas();
        }
    },

    //
    // updateExtents
    //
    updateExtents: function sceneUpdateExtentsFn()
    {
        var rootStaticNode = this.staticSpatialMap.getRootNode();
        var rootDynamicNode = this.dynamicSpatialMap.getRootNode();

        var extents;
        if (rootStaticNode)
        {
            extents = rootStaticNode.extents;

            if (rootDynamicNode)
            {
                var minStaticX, minStaticY, minStaticZ, maxStaticX, maxStaticY, maxStaticZ;
                var minDynamicX, minDynamicY, minDynamicZ, maxDynamicX, maxDynamicY, maxDynamicZ;

                minStaticX = extents[0];
                minStaticY = extents[1];
                minStaticZ = extents[2];
                maxStaticX = extents[3];
                maxStaticY = extents[4];
                maxStaticZ = extents[5];

                extents = rootDynamicNode.extents;
                minDynamicX = extents[0];
                minDynamicY = extents[1];
                minDynamicZ = extents[2];
                maxDynamicX = extents[3];
                maxDynamicY = extents[4];
                maxDynamicZ = extents[5];

                this.extents = [(minStaticX < minDynamicX ? minStaticX : minDynamicX),
                                  (minStaticY < minDynamicY ? minStaticY : minDynamicY),
                                  (minStaticZ < minDynamicZ ? minStaticZ : minDynamicZ),
                                  (maxStaticX > maxDynamicX ? maxStaticX : maxDynamicX),
                                  (maxStaticY > maxDynamicY ? maxStaticY : maxDynamicY),
                                  (maxStaticZ > maxDynamicZ ? maxStaticZ : maxDynamicZ)];
            }
            else
            {
                this.extents = extents.slice();
            }
        }
        else
        {
            if (rootDynamicNode)
            {
                this.extents = rootDynamicNode.extents.slice();
            }
            else
            {
                this.extents = [0, 0, 0, 0, 0, 0];
            }
        }
    },

    //
    //  getExtents
    //
    getExtents: function sceneGetExtentsFn()
    {
        if (this.dirtyRoots)
        {
            this.updateNodes();
            this.staticSpatialMap.finalize();
            this.dynamicSpatialMap.finalize();
            this.updateExtents();
        }
        return this.extents;
    },

    //
    //  loadMaterial
    //
    loadMaterial: function loadMaterialFn(graphicsDevice, textureManager, effectManager, materialName, material)
    {
        var materials = this.materials;

        // Check materials if the materialName has already been added
        if (!materials[materialName])
        {
            var effectName = material.effect || "default";
            var newMaterial = this.createMaterial(materialName, material, effectName, null, null, graphicsDevice);
            if (newMaterial)
            {
                delete newMaterial.effectName;
                var effect = effectManager.get(effectName);
                if (effect)
                {
                    effect.prepareMaterial(newMaterial);
                }
                newMaterial.loadTextures(textureManager);
                return true;
            }
        }
        return false;
    },

    //
    // hasMaterial
    //
    hasMaterial: function sceneHasMaterialFn(materialName)
    {
        var material = this.materials[materialName];
        if (material)
        {
            return true;
        }
        return false;
    },

    //
    // getMaterial
    //
    getMaterial: function sceneGetMaterialFn(materialName)
    {
        return this.materials[materialName];
    },

    //
    // Draw nodes with same technique, mostly for debugging
    //
    drawNodesArray: function sceneDrawNodesArrayFn(nodes, gd, globalMaterial, technique, renderUpdate)
    {
        var numNodes = nodes.length;
        if (numNodes > 0)
        {
            var setTechnique = gd.setTechnique;
            var setTechniqueParameters = gd.setTechniqueParameters;
            var setStream = gd.setStream;
            var setIndexBuffer = gd.setIndexBuffer;
            var drawIndexed = gd.drawIndexed;
            var draw = gd.draw;
            var currentSharedTechniqueParameters = null;
            var currentVertexBuffer = null;
            var currentSemantics = null;
            var node, shape, sharedTechniqueParameters, techniqueParameters, vertexBuffer, semantics, surface, indexBuffer;
            var renderables, renderable, numRenderables, i;
            var n = 0;
            setTechnique.call(gd, technique);
            setTechniqueParameters.call(gd, globalMaterial);
            do
            {
                node = nodes[n];
                renderables = node.renderables;
                if (renderables)
                {
                    numRenderables = renderables.length;
                    for (i = 0; i < numRenderables; i += 1)
                    {
                        renderable = renderables[i];

                        renderUpdate.call(renderable);

                        shape = renderable.geometry;
                        vertexBuffer = shape.vertexBuffer;
                        semantics = shape.semantics;
                        surface = renderable.surface;
                        sharedTechniqueParameters = renderable.sharedMaterial.techniqueParameters;
                        techniqueParameters = renderable.techniqueParameters;

                        if (currentSharedTechniqueParameters !== sharedTechniqueParameters)
                        {
                            currentSharedTechniqueParameters = sharedTechniqueParameters;
                            setTechniqueParameters.call(gd, sharedTechniqueParameters, techniqueParameters);
                        }
                        else
                        {
                            setTechniqueParameters.call(gd, techniqueParameters);
                        }

                        if (currentVertexBuffer !== vertexBuffer ||
                            currentSemantics !== semantics)
                        {
                            currentVertexBuffer = vertexBuffer;
                            currentSemantics = semantics;
                            setStream.call(gd, vertexBuffer, semantics);
                        }

                        indexBuffer = surface.indexBuffer;
                        if (indexBuffer)
                        {
                            setIndexBuffer.call(gd, indexBuffer);

                            drawIndexed.call(gd, surface.primitive, surface.numIndices, surface.first);
                        }
                        else
                        {
                            //Utilities.log("" + surface.primitive + " ," + surface.numVertices + " ," + surface.first);
                            draw.call(gd, surface.primitive, surface.numVertices, surface.first);
                        }
                    }
                }

                n += 1;
            }
            while (n < numNodes);
        }
    },

    drawVisibleNodes: function sceneDrawVisibleNodesFn(gd, globalTechniqueParameters, technique, renderUpdate)
    {
        this.drawNodesArray(this.visibleNodes, gd, globalTechniqueParameters, technique, renderUpdate);
    },

    //
    // clearMaterials
    //
    clearMaterials: function sceneClearMaterialsFn()
    {
        var onMaterialDestroyed = this.onMaterialDestroyed;
        var materials = this.materials;
        if (materials)
        {
            for (var p in materials)
            {
                if (materials.hasOwnProperty(p))
                {
                    materials[p].reference.unsubscribeDestroyed(onMaterialDestroyed);
                }
            }
        }
        this.materials = {};
    },

    //
    // clearShapes
    //
    clearShapes: function sceneClearShapesFn()
    {
        var onGeometryDestroyed = this.onGeometryDestroyed;
        var shapes = this.shapes;
        if (shapes)
        {
            for (var p in shapes)
            {
                if (shapes.hasOwnProperty(p))
                {
                    shapes[p].reference.unsubscribeDestroyed(onGeometryDestroyed);
                }
            }
        }
        this.shapes = {};
    },

    //
    // clearShapesVertexData
    //
    clearShapesVertexData: function sceneClearShapesVertexDataFn()
    {
        var shapes = this.shapes;
        var shape;
        if (shapes)
        {
            for (var p in shapes)
            {
                if (shapes.hasOwnProperty(p))
                {
                    shape = shapes[p];
                    delete shape.vertexData;
                    delete shape.indexData;
                    var surfaces = shape.surfaces;
                    if (surfaces)
                    {
                        for (var s in surfaces)
                        {
                            if (surfaces.hasOwnProperty(s))
                            {
                                var surface = surfaces[s];
                                delete surface.vertexData;
                                delete surface.indexData;
                            }
                        }
                    }
                }
            }
        }
    },

    //
    // clearRootNodes
    //
    clearRootNodes: function sceneRootNodesFn()
    {
        var rootNodes = this.rootNodes;
        if (rootNodes)
        {
            var rootLength = rootNodes.length;
            for (var rootIndex = 0; rootIndex < rootLength; rootIndex += 1)
            {
                rootNodes[rootIndex].destroy();
            }
        }
        this.rootNodes = [];
        delete this.dirtyRoots;
        this.rootNodesMap = {};
    },

    //
    // clear
    //
    clear: function sceneClearFn()
    {
        this.effects = [];
        this.effectsMap = {};
        this.semantics = {};
        this.lights = {};
        this.globalLights = [];
        this.clearRootNodes();
        this.clearMaterials();
        this.clearShapes();
        this.staticSpatialMap = AABBTree.create(true);
        this.dynamicSpatialMap = AABBTree.create();
        this.frustumPlanes = [];
        this.animations = {};
        this.skeletons = {};
        this.visibleNodes = [];
        this.visibleRenderables = [];
        this.visibleLights = [];
        this.cameraAreaIndex = -1;
        this.cameraExtents = [];
        this.visiblePortals = [];
        this.frameIndex = 0;
        this.queryCounter = 0;
        this.staticNodesChangeCounter = 0;
    },

    //
    // endLoading
    //
    endLoading: function sceneEndLoadingFn(onload)
    {
        this.initializeNodes();
        this.initializeAreas();
        if (onload)
        {
            onload(this);
        }
    },

    //
    // initializeNodes
    //
    initializeNodes: function sceneInitializeNodesFn()
    {
        this.updateNodes();
        this.staticSpatialMap.finalize();
        this.updateExtents();
    },

    //
    // addAreaStaticNodes
    //
    addAreaStaticNodes: function addAreaStaticNodesFn()
    {
        var findAreaIndicesAABB = this.findAreaIndicesAABB;
        var findAreaIndex = this.findAreaIndex;
        var scene = this;

        function addAreasNodeFn(bspNodes, areas)
        {
            if (this.dynamic)
            {
                return;
            }

            if (this.hasRenderables() || (this.hasLightInstances() && this.worldExtents))
            {
                var extents = this.worldExtents;
                var min0 = extents[0];
                var min1 = extents[1];
                var min2 = extents[2];
                var max0 = extents[3];
                var max1 = extents[4];
                var max2 = extents[5];
                var area, areaExtents, na;
                var cX = (min0 + max0) * 0.5;
                var cY = (min1 + max1) * 0.5;
                var cZ = (min2 + max2) * 0.5;
                var areaIndex = findAreaIndex(bspNodes, cX, cY, cZ);
                if (areaIndex >= 0)
                {
                    area = areas[areaIndex];
                    area.nodes.push(this);

                    var overlappingAreas = scene.findOverlappingAreas(areaIndex, extents);
                    var numOverlappingAreas = overlappingAreas.length;
                    for (na = 0; na < numOverlappingAreas; na += 1)
                    {
                        overlappingAreas[na].nodes.push(this);
                    }
                }
                else
                {
                    var areaFound = false;
                    for (;;)
                    {
                        var areaIndices = findAreaIndicesAABB(bspNodes, min0, min1, min2, max0, max1, max2);
                        var numAreaIndices = areaIndices.length;
                        if (0 < numAreaIndices)
                        {
                            // 1st try: only attach to overlapping areas
                            na = 0;
                            do
                            {
                                area = areas[areaIndices[na]];
                                areaExtents = area.extents;
                                if (areaExtents[0] <= max0 &&
                                    areaExtents[1] <= max1 &&
                                    areaExtents[2] <= max2 &&
                                    areaExtents[3] >= min0 &&
                                    areaExtents[4] >= min1 &&
                                    areaExtents[5] >= min2)
                                {
                                    area.nodes.push(this);
                                    areaFound = true;
                                }
                                na += 1;
                            }
                            while (na < numAreaIndices);
                            if (!areaFound)
                            {
                                // 2nd try: attach to any areas from bsp query
                                na = 0;
                                do
                                {
                                    areas[areaIndices[na]].nodes.push(this);
                                    na += 1;
                                }
                                while (na < numAreaIndices);
                            }
                            break;
                        }
                        else
                        {
                            // 3nd try: increase bounding box
                            var delta = Math.max((max0 - min0), (max1 - min1), (max2 - min2)) / 20;
                            min0 -= delta;
                            min1 -= delta;
                            min2 -= delta;
                            max0 += delta;
                            max1 += delta;
                            max2 += delta;
                        }
                    }
                }
            }
            var children = this.children;
            if (children)
            {
                var numChildren = children.length;
                for (var nc = 0; nc < numChildren; nc += 1)
                {
                    addAreasNodeFn.call(children[nc], bspNodes, areas);
                }
            }
        }

        var rootNodes = this.rootNodes;
        var numRootNodes = rootNodes.length;
        var bspNodes = this.bspNodes;
        var areas = this.areas;
        for (var n = 0; n < numRootNodes; n += 1)
        {
            addAreasNodeFn.call(rootNodes[n], bspNodes, areas);
        }
    },

    //
    // findOverlappingAreas
    //
    findOverlappingAreas: function sceneFindOverlappingAreasFn(startAreaIndex, extents)
    {
        var area, portals, numPortals, n, portal, plane, d0, d1, d2, portalExtents, areaIndex, nextArea;
        var queryCounter = this.getQueryCounter();
        var areas = this.areas;
        var portalsStack = [];
        var numPortalsStack = 0;
        var overlappingAreas = [];
        var numOverlappingAreas = 0;

        var min0 = extents[0];
        var min1 = extents[1];
        var min2 = extents[2];
        var max0 = extents[3];
        var max1 = extents[4];
        var max2 = extents[5];

        area = areas[startAreaIndex];
        area.queryCounter = queryCounter;

        portals = area.portals;
        numPortals = portals.length;
        for (n = 0; n < numPortals; n += 1)
        {
            portal = portals[n];
            portal.queryCounter = queryCounter;

            portalExtents = portal.extents;
            if (portalExtents[0] < max0 &&
                portalExtents[1] < max1 &&
                portalExtents[2] < max2 &&
                portalExtents[3] > min0 &&
                portalExtents[4] > min1 &&
                portalExtents[5] > min2)
            {
                plane = portal.plane;
                d0 = plane[0];
                d1 = plane[1];
                d2 = plane[2];
                if ((d0 * (d0 < 0 ? min0 : max0) + d1 * (d1 < 0 ? min1 : max1) + d2 * (d2 < 0 ? min2 : max2)) >= plane[3])
                {
                    portalsStack[numPortalsStack] = portal;
                    numPortalsStack += 1;
                }
            }
        }

        while (0 < numPortalsStack)
        {
            numPortalsStack -= 1;
            portal = portalsStack[numPortalsStack];

            areaIndex = portal.area;
            area = areas[areaIndex];
            if (area.queryCounter !== queryCounter)
            {
                area.queryCounter = queryCounter;
                overlappingAreas[numOverlappingAreas] = area;
                numOverlappingAreas += 1;
            }

            portals = area.portals;
            numPortals = portals.length;
            for (n = 0; n < numPortals; n += 1)
            {
                portal = portals[n];
                nextArea = portal.area;
                if (nextArea !== areaIndex &&
                    nextArea !== startAreaIndex &&
                    portal.queryCounter !== queryCounter)
                {
                    portal.queryCounter = queryCounter;

                    portalExtents = portal.extents;
                    if (portalExtents[0] < max0 &&
                        portalExtents[1] < max1 &&
                        portalExtents[2] < max2 &&
                        portalExtents[3] > min0 &&
                        portalExtents[4] > min1 &&
                        portalExtents[5] > min2)
                    {
                        plane = portal.plane;
                        d0 = plane[0];
                        d1 = plane[1];
                        d2 = plane[2];
                        if ((d0 * (d0 < 0 ? min0 : max0) + d1 * (d1 < 0 ? min1 : max1) + d2 * (d2 < 0 ? min2 : max2)) >= plane[3])
                        {
                            portalsStack[numPortalsStack] = portal;
                            numPortalsStack += 1;
                        }
                    }
                }
            }
        }

        return overlappingAreas;
    },

    //
    // checkAreaDynamicNodes
    //
    checkAreaDynamicNodes: function checkAreaDynamicNodesFn()
    {
        var findAreaIndicesAABB = this.findAreaIndicesAABB;
        var dynamicSpatialMap = this.dynamicSpatialMap;
        var bspNodes = this.bspNodes;
        var areas = this.areas;

        function checkAreaNodeFn()
        {
            if (this.dynamic &&
                (this.hasRenderables() || (this.hasLightInstances() && this.worldExtents)))
            {
                var extents = this.worldExtents;
                var min0 = extents[0];
                var min1 = extents[1];
                var min2 = extents[2];
                var max0 = extents[3];
                var max1 = extents[4];
                var max2 = extents[5];
                var pad = false;
                var areaFound = false;
                var na;
                for (;;)
                {
                    var areaIndices = findAreaIndicesAABB(bspNodes, min0, min1, min2, max0, max1, max2);
                    var numAreaIndices = areaIndices.length;
                    if (0 < numAreaIndices)
                    {
                        na = 0;
                        do
                        {
                            var area = areas[areaIndices[na]];
                            var areaExtent = area.extents;
                            if (areaExtent[0] <= max0 &&
                                areaExtent[1] <= max1 &&
                                areaExtent[2] <= max2 &&
                                areaExtent[3] >= min0 &&
                                areaExtent[4] >= min1 &&
                                areaExtent[5] >= min2)
                            {
                                areaFound = true;
                                break;
                            }
                            na += 1;
                        }
                        while (na < numAreaIndices);
                    }
                    if (areaFound)
                    {
                        break;
                    }
                    var delta = Math.max((max0 - min0), (max1 - min1), (max2 - min2)) / 20;
                    min0 -= delta;
                    min1 -= delta;
                    min2 -= delta;
                    max0 += delta;
                    max1 += delta;
                    max2 += delta;
                    pad = true;
                }
                if (pad)
                {   //TODO: This alters extents but the developer would expect them to remain constant if they are responsible for them.
                    extents[0] = min0;
                    extents[1] = min1;
                    extents[2] = min2;
                    extents[3] = max0;
                    extents[4] = max1;
                    extents[5] = max2;
                    dynamicSpatialMap.update(this, extents);
                }
            }
            var children = this.children;
            if (children)
            {
                var numChildren = children.length;
                for (var nc = 0; nc < numChildren; nc += 1)
                {
                    checkAreaNodeFn.call(children[nc]);
                }
            }
        }

        var rootNodes = this.rootNodes;
        var numRootNodes = rootNodes.length;
        for (var n = 0; n < numRootNodes; n += 1)
        {
            checkAreaNodeFn.call(rootNodes[n]);
        }
    },

    //
    // initializeAreas
    //
    initializeAreas: function sceneInitializeAreasFn()
    {
        var areas = this.areas;
        if (areas)
        {
            var numAreas = areas.length;
            var n, area, target, extents, areaExtents;
            for (n = 0; n < numAreas; n += 1)
            {
                area = areas[n];
                target = area.target;
                area.nodes = [];
                extents = target.calculateHierarchyWorldExtents();
                if (extents)
                {
                    areaExtents = area.extents;
                    area.extents = [
                            (extents[0] < areaExtents[0] ? extents[0] : areaExtents[0]),
                            (extents[1] < areaExtents[1] ? extents[1] : areaExtents[1]),
                            (extents[2] < areaExtents[2] ? extents[2] : areaExtents[2]),
                            (extents[3] > areaExtents[3] ? extents[3] : areaExtents[3]),
                            (extents[4] > areaExtents[4] ? extents[4] : areaExtents[4]),
                            (extents[5] > areaExtents[5] ? extents[5] : areaExtents[5])
                        ];
                }
            }

            this.addAreaStaticNodes();

            this.checkAreaDynamicNodes();

            for (n = 0; n < numAreas; n += 1)
            {
                area = areas[n];
                area.numStaticNodes = area.nodes.length;
            }
        }
        this.areaInitalizeStaticNodesChangeCounter = this.staticNodesChangeCounter;
    },

    //
    // createMaterial
    //
    createMaterial: function createMaterialFn(materialName, fileMaterial, effectName, fileEffects, fileImages, graphicsDevice)
    {
        var materials = this.materials;

        var material = Material.create(graphicsDevice);
        var param, filename, effectType, p;

        // Effect associated, load from file
        if (fileEffects)
        {
            var fileEffect = fileEffects[effectName];
            if (fileEffect)
            {
                var effectParameters = fileEffect.parameters;
                for (p in effectParameters)
                {
                    if (effectParameters.hasOwnProperty(p))
                    {
                        param = effectParameters[p];
                        if (typeof param === 'string')
                        {
                            if (fileImages)
                            {
                                filename = fileImages[param] || param;
                            }
                            else
                            {
                                filename = param;
                            }

                            if (!material.texturesNames)
                            {
                                material.texturesNames = {};
                            }
                            material.texturesNames[p] = filename;
                            material.techniqueParameters[p] = null;
                        }
                        else
                        {
                            material.techniqueParameters[p] = param;
                        }
                    }
                }
                effectType = fileEffect.type;
            }
            else
            {
                effectType = effectName;
            }
        }
        else
        {
            effectType = effectName;
        }

        var materialParameters = fileMaterial.parameters;
        for (p in materialParameters)
        {
            if (materialParameters.hasOwnProperty(p))
            {
                param = materialParameters[p];
                if (typeof param === 'string')
                {
                    if (fileImages)
                    {
                        filename = fileImages[param] || param;
                    }
                    else
                    {
                        filename = param;
                    }

                    if (!material.texturesNames)
                    {
                        material.texturesNames = {};
                    }
                    material.texturesNames[p] = filename;

                    material.techniqueParameters[p] = null;
                }
                else
                {
                    material.techniqueParameters[p] = param;
                }
            }
        }

        material.effectName = effectType;

        if (fileMaterial.meta)
        {
            material.meta = fileMaterial.meta;
        }

        materials[materialName] = material;
        material.name = materialName;
        material.reference.subscribeDestroyed(this.onMaterialDestroyed);

        return material;
    },

    //
    // loadMaterials
    //
    loadMaterials: function sceneLoadMaterialsFn(loadParams)
    {
        var sceneData = loadParams.data;
        var gd = loadParams.graphicsDevice;
        var textureManager = loadParams.textureManager;
        var createMaterial = this.createMaterial;

        if (!loadParams.append)
        {
            this.effects = [];
            this.effectsMap = {};
            this.clearMaterials();
        }

        // Import materials
        var fileMaterials = sceneData.materials;
        if (fileMaterials)
        {
            var fileImages = sceneData.images;
            var fileEffects = sceneData.effects;
            var materials = this.materials;
            for (var m in fileMaterials)
            {
                if (fileMaterials.hasOwnProperty(m) &&
                    !materials[m])
                {
                    var fileMaterial = fileMaterials[m];
                    var effectName = (fileMaterial.effect || "default");
                    createMaterial.call(this, m, fileMaterial, effectName, fileEffects, fileImages, gd, textureManager);
                }
            }
        }
    },

    //
    // loadSkeletons
    //
    loadSkeletons: function sceneLoadSkeletonsFn(loadParams)
    {
        var sceneData = loadParams.data;
        var fileSkeletons = sceneData.skeletons;

        var md = this.md;
        var m43Build = md.m43Build;

        var invLTM, bindPose;

        for (var s in fileSkeletons)
        {
            if (fileSkeletons.hasOwnProperty(s))
            {
                var skeleton = fileSkeletons[s];

                var numJoints = skeleton.numNodes;
                var invLTMs = skeleton.invBoneLTMs;
                var bindPoses = skeleton.bindPoses;

                // copy the inv bone ltms and bind poses to make them native
                for (var b = 0; b < numJoints; b += 1)
                {
                    invLTM = invLTMs[b];
                    bindPose = bindPoses[b];

                    invLTMs[b] = m43Build.apply(md, invLTM);
                    bindPoses[b] = m43Build.apply(md, bindPose);
                }
                this.skeletons[s] = skeleton;
            }
        }
    },

    //
    // loadShape
    //
    loadShape: function sceneLoadShapeFn(shapeName, fileShapeName, loadParams)
    {
        var shape = this.shapes[shapeName];

        if (!shape)
        {
            var cachedSemantics = this.semantics;

            var sceneData = loadParams.data;
            var gd = loadParams.graphicsDevice;
            var keepVertexData = loadParams.keepVertexData;
            var fileShapes = sceneData.geometries;
            var fileShape = fileShapes[fileShapeName];
            var sources = fileShape.sources;
            var inputs = fileShape.inputs;
            var skeletonName = fileShape.skeleton;

            shape = Geometry.create();

            if (skeletonName)
            {
                var skeleton = this.skeletons[skeletonName];
                if (skeleton)
                {
                    shape.skeleton = skeleton;
                    shape.type = "skinned";
                }
                else
                {
                    // Failed to load skeleton so just draw bind pose
                    shape.type = "rigid";
                }
            }
            else
            {
                shape.type = "rigid";
            }

            if (gd)
            {
                // First calculate data about the vertex streams
                var offset, stride;
                var destStride;
                var destFormat;
                var maxOffset = 0;
                var vertexSources = [];

                var isUByte4Range = function isUByte4RangeFn(minVal, maxVal)
                {
                    return (minVal >= 0) && (maxVal <= 255) && (maxVal > 1);
                };

                var areInRange = function areInRangeFn(minVals, maxVals, isRangeFn)
                {
                    var numVals = minVals.length;
                    if (maxVals.length !== numVals)
                    {
                        return false;
                    }
                    for (var valIdx = 0 ; valIdx < numVals ; valIdx += 1)
                    {
                        if (!isRangeFn(minVals[valIdx], maxVals[valIdx]))
                        {
                            return false;
                        }
                    }
                    return true;
                };

                var formatMap = loadParams.vertexFormatMap || {};

                for (var input in inputs)
                {
                    if (inputs.hasOwnProperty(input))
                    {
                        var fileInput = inputs[input];
                        offset = fileInput.offset;
                        if (offset > maxOffset)
                        {
                            maxOffset = offset;
                        }
                        var fileSource = sources[fileInput.source];
                        var fileSourceStride = fileSource.stride;

                        // If the caller gave a preferred format, try
                        // to use it.

                        destFormat = formatMap[input];
                        destStride = fileSourceStride;

                        // If we got a caller preference, check for a
                        // new stride

                        if (destFormat)
                        {
                            if (destFormat.indexOf("4"))
                            {
                                destStride = 4;
                            }
                            else if (destFormat.indexOf("3")) {
                                destStride = 3;
                            }
                            else if (destFormat.indexOf("2"))
                            {
                                destStride = 2;
                            }
                            else if (destFormat.indexOf("1"))
                            {
                                destStride = 1;
                            }
                            else
                            { /* ERROR */
                                destFormat = null;
                            }
                        }

                        // No preferred format, make our own choice

                        if (!destFormat)
                        {
                            // Check for appropriate formats.  Make
                            // assumptions based on semantic names.

                            if (input === "BLENDINDICES" || input === "BLENDINDICES0")
                            {
                                if (fileSourceStride === 4 &&
                                    areInRange(fileSource.min, fileSource.max, isUByte4Range))
                                {
                                    destFormat = "UBYTE4";
                                }
                            }

                            // if (input == "NORMAL" || input == "NORMAL0")
                            // {
                            //     if (fileSourceStride == 3)
                            //     {
                            //         Check range is within [-1,1]

                            //         destFormat = "BYTE";
                            //         destFormatNormalized = true;
                            //         destStride = 4;
                            //     }
                            // }
                        }

                        // If we still don't have a format, revert to FLOATn

                        if (!destFormat)
                        {
                            destFormat = "FLOAT" + fileSourceStride;
                        }

                        vertexSources.push({
                            semantic: input,
                            offset: offset,
                            data: fileSource.data,
                            stride: fileSourceStride,
                            destFormat: destFormat,
                            destStride: destStride
                        });
                    }
                }
                var indicesPerVertex = (maxOffset + 1);

                if (0 < maxOffset)
                {
                    var vertexSourcesCompare = function (vertexSourceA, vertexSourceB)
                    {
                        if (vertexSourceA.offset === vertexSourceB.offset)
                        {
                            var semanticA = vertexSourceA.semantic;
                            if (typeof semanticA === 'string')
                            {
                                semanticA = gd['SEMANTIC_' + semanticA];
                            }
                            var semanticB = vertexSourceB.semantic;
                            if (typeof semanticB === 'string')
                            {
                                semanticB = gd['SEMANTIC_' + semanticB];
                            }
                            return (semanticA - semanticB);
                        }
                        else
                        {
                            return (vertexSourceA.offset - vertexSourceB.offset);
                        }
                    };
                    vertexSources.sort(vertexSourcesCompare);
                }

                var numVertexSources = vertexSources.length;
                var semanticsNames = [];
                var attributes = [];
                var useFloatArray = (this.float32ArrayConstructor ? true : false);
                var numValuesPerVertex = 0;
                var vs, vertexSource;
                for (vs = 0; vs < numVertexSources; vs += 1)
                {
                    vertexSource = vertexSources[vs];
                    semanticsNames[vs] = vertexSource.semantic;
                    destFormat = vertexSource.destFormat;
                    if (useFloatArray)
                    {
                        if (typeof destFormat === "string")
                        {
                            if (destFormat[0] !== "F")
                            {
                                useFloatArray = false;
                            }
                        }
                        else
                        {
                            if (destFormat !== gd.VERTEXFORMAT_FLOAT1 &&
                                destFormat !== gd.VERTEXFORMAT_FLOAT2 &&
                                destFormat !== gd.VERTEXFORMAT_FLOAT3 &&
                                destFormat !== gd.VERTEXFORMAT_FLOAT4)
                            {
                                useFloatArray = false;
                            }
                        }
                    }
                    attributes[vs] = destFormat;
                    numValuesPerVertex += vertexSource.stride;
                }

                // Now parse the surfaces to work out primitive types and the total vertex count
                var numVertices, totalNumVertices = 0;
                var noSurfaces = false;
                var surfaces = fileShape.surfaces;
                if (!surfaces)
                {
                    noSurfaces = true;
                    surfaces = {
                        singleSurface: {
                            triangles: fileShape.triangles,
                            lines: fileShape.lines,
                            numPrimitives: fileShape.numPrimitives
                        }
                    };
                }

                var surface;
                var destSurface;
                var faces;
                var s;

                for (s in surfaces)
                {
                    if (surfaces.hasOwnProperty(s))
                    {
                        surface = surfaces[s];
                        destSurface = {};
                        shape.surfaces[s] = destSurface;

                        faces = surface.triangles;
                        var primitive, vertexPerPrimitive;
                        if (faces)
                        {
                            primitive = gd.PRIMITIVE_TRIANGLES;
                            vertexPerPrimitive = 3;
                        }
                        else
                        {
                            faces = surface.lines;
                            if (faces)
                            {
                                primitive = gd.PRIMITIVE_LINES;
                                vertexPerPrimitive = 2;
                            }
                        }
                        destSurface.primitive = primitive;
                        destSurface.faces = faces;

                        if (faces)
                        {
                            if (1 < indicesPerVertex)
                            {
                                numVertices = (surface.numPrimitives * vertexPerPrimitive);
                                destSurface.numVertices = numVertices;
                            }
                            else
                            {

                                numVertices = (vertexSources[0].data.length / vertexSources[0].stride);
                                if (numVertices > faces.length)
                                {
                                    numVertices = faces.length;
                                }
                                destSurface.numVertices = numVertices;
                            }
                        }
                    }
                }

                // For cases where > 1-index per vertex we process it to create 1-index per vertex from data

                var updateSingleIndexTables =
                    function updateSingleIndexTablesFn(surface, indicesPerVertex,
                                                       verticesAsIndexLists,
                                                       verticesAsIndexListTable)
                {
                    var faces = surface.faces;
                    var numVerts = faces.length / indicesPerVertex;

                    var singleIndices = [];
                    singleIndices[numVerts - 1] = 0;

                    var hashIndexList = function hashIndexListFn(indexList)
                    {
                        return indexList.join(",");
                    };

                    var vertIdx = 0;
                    var srcIdx = 0;
                    var nextSrcIdx = indicesPerVertex;

                    while (srcIdx < faces.length)
                    {
                        var thisVert = faces.slice(srcIdx, nextSrcIdx);
                        var thisVertHash = hashIndexList(thisVert);

                        var thisVertIndex = verticesAsIndexListTable[thisVertHash];
                        if (!thisVertIndex)
                        {
                            // New index - add to tables

                            thisVertIndex = verticesAsIndexLists.length;
                            verticesAsIndexLists[thisVertIndex] = thisVert;
                            verticesAsIndexListTable[thisVertHash] = thisVertIndex;
                        }

                        singleIndices[vertIdx] = thisVertIndex;

                        srcIdx = nextSrcIdx;
                        nextSrcIdx += indicesPerVertex;
                        vertIdx += 1;
                    }

                    surface.faces = singleIndices;
                };

                if (indicesPerVertex > 1)
                {
                    // [ [a,b,c], [d,e,f], ... ]
                    var verticesAsIndexLists = [];
                    var verticesAsIndexListTable = {};

                    var shapeSurfaces = shape.surfaces;
                    for (s in shapeSurfaces)
                    {
                        if (shapeSurfaces.hasOwnProperty(s))
                        {
                            var shapeSurface = shapeSurfaces[s];
                            updateSingleIndexTables(shapeSurface,
                                                    indicesPerVertex,
                                                    verticesAsIndexLists,
                                                    verticesAsIndexListTable);
                        }
                    }

                    // recalc totalNumVertices

                    totalNumVertices = verticesAsIndexLists.length;

                    // Recreate vertex buffer data on the vertexSources

                    for (var vertSource in vertexSources)
                    {
                        if (vertexSources.hasOwnProperty(vertSource))
                        {
                            vertexSource = vertexSources[vertSource];
                            var thisSourceOffset = vertexSource.offset;
                            var thisSourceStride = vertexSource.stride;
                            var thisSourceData = vertexSource.data;

                            var newData = new Array(thisSourceStride * totalNumVertices);

                            // For each entry in index list

                            var vertIdx = 0;
                            while (vertIdx < totalNumVertices)
                            {
                                var newVBIdx = thisSourceStride * vertIdx;
                                var oldVBIdx = thisSourceStride * verticesAsIndexLists[vertIdx][thisSourceOffset];

                                // Copy the vertex data out of the vertex buffer

                                for (var attrIdx = 0 ;
                                     attrIdx < thisSourceStride ;
                                     attrIdx += 1)
                                {
                                    newData[newVBIdx + attrIdx] =
                                        thisSourceData[oldVBIdx + attrIdx];
                                }

                                vertIdx += 1;
                            }

                            vertexSource.data = newData;
                            vertexSource.offset = 0;
                        }
                    }

                    indicesPerVertex = 1;
                }

                Utilities.assert(indicesPerVertex === 1);

                totalNumVertices = vertexSources[0].data.length / vertexSources[0].stride;

                var vertexBufferManager = (loadParams.vertexBufferManager || this.vertexBufferManager);
                if (!vertexBufferManager)
                {
                    vertexBufferManager = VertexBufferManager.create(gd);
                    this.vertexBufferManager = vertexBufferManager;
                }

                var indexBufferManager = (loadParams.indexBufferManager || this.indexBufferManager);
                if (!indexBufferManager)
                {
                    indexBufferManager = IndexBufferManager.create(gd);
                    this.indexBufferManager = indexBufferManager;
                }

                var baseIndex;
                var vertexBuffer = null;
                var vertexBufferAllocation = vertexBufferManager.allocate(totalNumVertices, attributes);
                vertexBuffer = vertexBufferAllocation.vertexBuffer;
                if (!vertexBuffer)
                {
                    return undefined;
                }

                shape.vertexBuffer = vertexBuffer;
                shape.vertexBufferManager = vertexBufferManager;
                shape.vertexBufferAllocation = vertexBufferAllocation;

                baseIndex = vertexBufferAllocation.baseIndex;

                var indexBufferAllocation;
                var t, index, nextIndex;
                //
                // We no have the simple case of each index maps to one vertex so create one vertex buffer and fill in.
                //
                var vertexData = (useFloatArray ?
                                  new this.float32ArrayConstructor(totalNumVertices * numValuesPerVertex) :
                                  new Array(totalNumVertices * numValuesPerVertex));
                var vertexDataCount = 0;
                for (t = 0; t < totalNumVertices; t += 1)
                {
                    vs = 0;
                    do
                    {
                        vertexSource = vertexSources[vs];
                        var sourceData = vertexSource.data;
                        stride = vertexSource.stride;
                        index = t * stride;
                        nextIndex = (index + stride);
                        destStride = vertexSource.destStride;
                        do
                        {
                            vertexData[vertexDataCount] = sourceData[index];
                            vertexDataCount += 1;
                            index += 1;
                        }
                        while (index < nextIndex);

                        while (stride < destStride)
                        {
                            vertexData[vertexDataCount] = 0;
                            vertexDataCount += 1;
                            destStride -= 1;
                        }

                        vs += 1;
                    }
                    while (vs < numVertexSources);
                }
                vertexBuffer.setData(vertexData, baseIndex, totalNumVertices);

                // Count total num indices
                var isSequentialIndices = function isSequentialIndicesFn(indices, numIndices)
                {
                    var baseIndex = indices[0];
                    var n;
                    for (n = 1; n < numIndices; n += 1)
                    {
                        if (indices[n] !== (baseIndex + n))
                        {
                            return false;
                        }
                    }
                    return true;
                };

                var totalNumIndices = 0;
                var numIndices;

                for (s in surfaces)
                {
                    if (surfaces.hasOwnProperty(s))
                    {
                        destSurface = shape.surfaces[s];
                        faces = destSurface.faces;
                        if (faces)
                        {
                            numIndices = faces.length;
                            if (!isSequentialIndices(faces, numIndices))
                            {
                                totalNumIndices += numIndices;
                            }
                        }
                    }
                }

                var indexBuffer, indexBufferData, indexBufferBaseIndex, indexBufferOffset, maxIndex;
                if (0 < totalNumIndices)
                {
                    maxIndex = (baseIndex + totalNumVertices - 1);

                    indexBufferAllocation = indexBufferManager.allocate(totalNumIndices,
                                                                        (maxIndex < 65536 ? 'USHORT' : 'UINT'));
                    indexBuffer = indexBufferAllocation.indexBuffer;
                    if (!indexBuffer)
                    {
                        return undefined;
                    }

                    shape.indexBufferManager = indexBufferManager;
                    shape.indexBufferAllocation = indexBufferAllocation;

                    if (maxIndex < 65536 &&
                        this.uint16ArrayConstructor)
                    {
                        indexBufferData = new this.uint16ArrayConstructor(totalNumIndices);
                    }
                    else if (this.uint32ArrayConstructor)
                    {
                        indexBufferData = new this.uint32ArrayConstructor(totalNumIndices);
                    }
                    else
                    {
                        indexBufferData = new Array(totalNumIndices);
                    }

                    indexBufferBaseIndex = indexBufferAllocation.baseIndex;
                    indexBufferOffset = 0;
                }

                // Fill index buffers
                for (s in surfaces)
                {
                    if (surfaces.hasOwnProperty(s))
                    {
                        destSurface = shape.surfaces[s];

                        faces = destSurface.faces;
                        delete destSurface.faces;

                        if (faces)
                        {
                            // Vertices already de-indexed (1 index per vert)
                            numIndices = faces.length;

                            //See if they are all sequential, in which case we don't need an index buffer
                            if (!isSequentialIndices(faces, numIndices))
                            {
                                destSurface.indexBuffer = indexBuffer;
                                destSurface.numIndices = numIndices;
                                destSurface.first = (indexBufferBaseIndex + indexBufferOffset);

                                if (baseIndex)
                                {
                                    for (t = 0; t < numIndices; t += 1)
                                    {
                                        indexBufferData[indexBufferOffset] = (baseIndex + faces[t]);
                                        indexBufferOffset += 1;
                                    }
                                }
                                else
                                {
                                    for (t = 0; t < numIndices; t += 1)
                                    {
                                        indexBufferData[indexBufferOffset] = faces[t];
                                        indexBufferOffset += 1;
                                    }
                                }

                                if (keepVertexData)
                                {
                                    if (maxIndex < 65536 &&
                                        this.uint16ArrayConstructor)
                                    {
                                        destSurface.indexData = new this.uint16ArrayConstructor(faces);
                                    }
                                    else if (this.uint32ArrayConstructor)
                                    {
                                        destSurface.indexData = new this.uint32ArrayConstructor(faces);
                                    }
                                    else
                                    {
                                        destSurface.indexData = faces;
                                    }
                                }
                            }
                            else
                            {
                                destSurface.first = (baseIndex + faces[0]);
                            }

                            faces = null;

                            if (keepVertexData)
                            {
                                destSurface.vertexData = vertexData;
                            }
                        }
                        else
                        {
                            delete shape.surfaces[s];
                        }
                    }
                }

                if (indexBuffer)
                {
                    indexBuffer.setData(indexBufferData, indexBufferBaseIndex, totalNumIndices);
                    indexBufferData = null;
                }

                //Utilities.log("Buffers creation time: " + (TurbulenzEngine.time - startTime));

                var semanticsHash = semanticsNames.join();
                var semantics = cachedSemantics[semanticsHash];
                if (!semantics)
                {
                    semantics = gd.createSemantics(semanticsNames);
                    cachedSemantics[semanticsHash] = semantics;
                }
                shape.semantics = semantics;

                if (noSurfaces)
                {
                    // TODO: could remove this and always have surfaces
                    surface = shape.surfaces.singleSurface;

                    if (surface)
                    {
                        shape.primitive = surface.primitive;
                        if (keepVertexData)
                        {
                            shape.vertexData = surface.vertexData;
                        }

                        shape.first = surface.first;

                        if (surface.indexBuffer)
                        {
                            shape.indexBuffer = surface.indexBuffer;
                            shape.numIndices = surface.numIndices;
                            if (keepVertexData)
                            {
                                shape.indexData = surface.indexData;
                            }
                        }
                        else
                        {
                            shape.numVertices = surface.numVertices;
                        }
                    }

                    delete shape.surfaces;
                }
            }

            if (inputs.POSITION)
            {
                var positions = sources[inputs.POSITION.source];
                var minPos = positions.min;
                var maxPos = positions.max;
                if (minPos && maxPos)
                {
                    var min0 = minPos[0];
                    var min1 = minPos[1];
                    var min2 = minPos[2];
                    var max0 = maxPos[0];
                    var max1 = maxPos[1];
                    var max2 = maxPos[2];
                    if (min0 !== -max0 || min1 !== -max1 || min2 !== -max2)
                    {
                        var c0 = (min0 + max0) * 0.5;
                        var c1 = (min1 + max1) * 0.5;
                        var c2 = (min2 + max2) * 0.5;
                        shape.center      = [c0, c1, c2];
                        shape.halfExtents = [(max0 - c0), (max1 - c1), (max2 - c2)];
                    }
                    else
                    {
                        shape.halfExtents = [(max0 - min0) * 0.5, (max1 - min1) * 0.5, (max2 - min2) * 0.5];
                    }
                }
                //else
                //{
                    //TODO: add warning that we have no extents information
                //}
            }

            this.shapes[shapeName] = shape;
            shape.name = shapeName;
            shape.reference.subscribeDestroyed(this.onGeometryDestroyed);
        }
        return shape;
    },

    streamShapes: function sceneStreamShapesFn(loadParams, postLoadFn)
    {
        // Firstly build an array listing all the shapes we need to load
        var yieldFn = loadParams.yieldFn;
        var scene = this;
        var shapesNamePrefix = loadParams.shapesNamePrefix;
        var sceneData = loadParams.data;
        var fileShapes = sceneData.geometries;
        var loadCustomShapeFn = loadParams.loadCustomShapeFn;

        var shapesToLoad = [];
        var customShapesToLoad = [];

        for (var fileShapeName in fileShapes)
        {
            if (fileShapes.hasOwnProperty(fileShapeName))
            {
                var fileShape = fileShapes[fileShapeName];
                if (fileShape.meta && fileShape.meta.graphics)
                {
                    if (fileShape.meta.custom)
                    {
                        customShapesToLoad.push(fileShapeName);
                    }
                    else
                    {
                        shapesToLoad.push(fileShapeName);
                    }
                }
            }
        }

        function sceneLoadNextShapeFn()
        {
            var nextShape = shapesToLoad.pop();

            var shapeName = (shapesNamePrefix ? (shapesNamePrefix + "-" + nextShape) : nextShape);
            scene.loadShape(shapeName, nextShape, loadParams);

            if (shapesToLoad.length)
            {
                yieldFn(sceneLoadNextShapeFn);
            }
            else
            {
                yieldFn(postLoadFn);
            }
        }

        function sceneLoadNextCustomShapeFn()
        {
            var nextShape = customShapesToLoad.pop();

            var shapeName = (shapesNamePrefix ? (shapesNamePrefix + "-" + nextShape) : nextShape);
            loadCustomShapeFn.call(scene, shapeName, nextShape, loadParams);

            if (customShapesToLoad.length)
            {
                yieldFn(sceneLoadNextCustomShapeFn);
            }
            else if (shapesToLoad.length)
            {
                yieldFn(sceneLoadNextShapeFn);
            }
            else
            {
                yieldFn(postLoadFn);
            }
        }

        if (customShapesToLoad.length)
        {
            yieldFn(sceneLoadNextCustomShapeFn);
        }
        else if (shapesToLoad.length)
        {
            yieldFn(sceneLoadNextShapeFn);
        }
        else
        {
            yieldFn(postLoadFn);
        }
    },

    //
    // Load lights
    //
    loadLights: function sceneLoadLightsFn(loadParams)
    {
        var sceneData = loadParams.data;
        var textureManager = loadParams.textureManager;

        if (!loadParams.append)
        {
            this.lights = {};
            this.globalLights = [];
        }

        var fileLights = sceneData.lights;
        var lights = this.lights;
        var globalLights = this.globalLights;
        var materials = this.materials;
        var beget = Utilities.beget;

        var md = loadParams.mathDevice;
        var v3Build = md.v3Build;

        for (var l in fileLights)
        {
            if (fileLights.hasOwnProperty(l) &&
                !lights[l])
            {
                var fileLight = fileLights[l];

                // convert to create parameters
                var lightParams = beget(fileLight);

                var type = fileLight.type;
                if (type === 'directional')
                {
                    lightParams.directional = true;
                }
                else if (type === 'spot')
                {
                    lightParams.spot = true;
                }
                else if (type === 'ambient')
                {
                    lightParams.ambient = true;
                }
                else //if (type === 'point')
                {
                    lightParams.point = true;
                }

                // Convert to MathDevice objects
                lightParams.color = fileLight.color && v3Build.apply(md, fileLight.color);

                /*jslint white: false*/
                lightParams.origin = fileLight.origin && v3Build.apply(md, fileLight.origin);
                lightParams.center = fileLight.center && v3Build.apply(md, fileLight.center);
                lightParams.target = fileLight.target && v3Build.apply(md, fileLight.target);
                lightParams.right =  fileLight.right  && v3Build.apply(md, fileLight.right);
                lightParams.up =     fileLight.up     && v3Build.apply(md, fileLight.up);
                lightParams.start =  fileLight.start  && v3Build.apply(md, fileLight.start);
                lightParams.end =    fileLight.end    && v3Build.apply(md, fileLight.end);
                lightParams.direction = fileLight.direction && v3Build.apply(md, fileLight.direction);
                /*jslint white: true*/

                lightParams.halfExtents = fileLight.halfextents && v3Build.apply(md, fileLight.halfextents);

                var materialName = fileLight.material;
                if (materialName)
                {
                    var material = materials[materialName];
                    if (material)
                    {
                        lightParams.material = material;

                        if (material.effectName)
                        {
                            delete material.effectName;
                            material.loadTextures(textureManager);
                        }
                    }
                }

                var light = Light.create(lightParams);
                lights[l] = light;
                if (light.isGlobal())
                {
                    globalLights.push(light);
                }
            }
        }
    },

    //
    // loadNodes
    //
    loadNodes: function sceneLoadNodesFn(loadParams)
    {
        var sceneData = loadParams.data;
        var gd = loadParams.graphicsDevice;
        var textureManager = loadParams.textureManager;
        var effectManager = loadParams.effectManager;
        var baseScene = loadParams.baseScene;
        var keepCameras = loadParams.keepCameras;
        var keepLights = loadParams.keepLights;
        var disableNodes = loadParams.disabled;

        if (!loadParams.append)
        {
            this.clearRootNodes();
            this.staticSpatialMap = AABBTree.create(true);
            this.dynamicSpatialMap = AABBTree.create();
        }

        var loadCustomGeometryInstanceFn = loadParams.loadCustomGeometryInstanceFn;

        var md = this.md;
        var m43Build = md.m43Build;
        var materials = this.materials;
        var lights = this.lights;
        var currentScene = this;

        var baseMaterials;
        if (baseScene)
        {
            baseMaterials = baseScene.materials;
        }
        var baseMatrix = loadParams.baseMatrix;
        var nodesNamePrefix = loadParams.nodesNamePrefix;
        var shapesNamePrefix = loadParams.shapesNamePrefix;

        function copyNodeFn(nodeName, parentNodePath, baseNode, materialSkin)
        {
            var nodePath = parentNodePath ? (parentNodePath + "/" + nodeName) : nodeName;

            var node = SceneNode.create({name: nodeName,
                                         local: this.matrix && m43Build.apply(md, this.matrix),
                                         dynamic: this.dynamic || baseNode.dynamic || loadParams.dynamic});

            var effect;

            var customgeometryinstance = this.customgeometryinstances;
            if (customgeometryinstance && loadCustomGeometryInstanceFn)
            {
                for (var ci in customgeometryinstance)
                {
                    if (customgeometryinstance.hasOwnProperty(ci))
                    {
                        var fileCustomGeometryInstance = customgeometryinstance[ci];
                        var customGeometryInstance = loadCustomGeometryInstanceFn.call(currentScene, fileCustomGeometryInstance, loadParams);

                        if (customGeometryInstance)
                        {
                            node.addRenderable(customGeometryInstance);
                        }
                    }
                }
            }

            var geometryinstances = this.geometryinstances;
            if (geometryinstances)
            {
                for (var gi in geometryinstances)
                {
                    if (geometryinstances.hasOwnProperty(gi))
                    {
                        var fileGeometryInstance = geometryinstances[gi];
                        var fileShapeName = fileGeometryInstance.geometry;
                        var shapeName = (shapesNamePrefix ? (shapesNamePrefix + "-" + fileShapeName) : fileShapeName);
                        var nodeShape = currentScene.loadShape(shapeName, fileShapeName, loadParams);

                        if (gd)
                        {
                            var sharedMaterialName = fileGeometryInstance.material;
                            if (materialSkin && sceneData.skins)
                            {
                                var skin = sceneData.skins[materialSkin];
                                if (skin)
                                {
                                    var newMaterialName = skin[sharedMaterialName];
                                    if (newMaterialName)
                                    {
                                        sharedMaterialName = newMaterialName;
                                    }
                                }
                            }
                            var sharedMaterial = materials[sharedMaterialName];
                            if (!sharedMaterial)
                            {
                                if (baseScene)
                                {
                                    sharedMaterial = baseMaterials[sharedMaterialName];
                                }

                                if (!sharedMaterial)
                                {
                                    //Utilities.log("Unknown material '" + sharedMaterialName + "'");
                                    return undefined;
                                }
                                materials[sharedMaterialName] = sharedMaterial;
                                sharedMaterial.name = sharedMaterialName;
                                sharedMaterial.reference.subscribeDestroyed(currentScene.onMaterialDestroyed);
                            }
                            effect = sharedMaterial.effect;
                            if (!effect)
                            {
                                // Load the textures since if the effect is undefined then scene.loadMaterial
                                // has not yet been called for this material
                                sharedMaterial.loadTextures(textureManager);
                                var effectName = sharedMaterial.effectName;
                                delete sharedMaterial.effectName;
                                effect = effectManager.get(effectName);
                                if (effect)
                                {
                                    effect.prepareMaterial(sharedMaterial);
                                }
                            }

                            var surfaces = nodeShape.surfaces;
                            var surface = (surfaces ? surfaces[fileGeometryInstance.surface] : nodeShape);

                            var geometryInstance = GeometryInstance.create(nodeShape,
                                                                           surface,
                                                                           sharedMaterial);
                            node.addRenderable(geometryInstance);

                            if (fileGeometryInstance.disabled)
                            {
                                geometryInstance.disabled = true;
                            }

                        }
                        else
                        {
                            node.addRenderable(GeometryInstance.create(nodeShape));
                        }
                    }
                }
            }

            // Check for a camera on the node
            if (this.camera)
            {
                if (keepCameras)
                {
                    node.camera = this.camera;
                }
            }

            // Check for any instances of lights attached to the node
            var fileLightInstances = this.lightinstances;
            if (fileLightInstances && keepLights)
            {
                for (var li in fileLightInstances)
                {
                    if (fileLightInstances.hasOwnProperty(li))
                    {
                        var fileLightInstance = fileLightInstances[li];
                        var light = lights[fileLightInstance.light];
                        if (light && !light.global)
                        {
                            var lightInstance = LightInstance.create(light);
                            node.addLightInstance(lightInstance);
                            if (fileLightInstance.disabled)
                            {
                                lightInstance.disabled = true;
                            }
                        }
                    }
                }
            }

            if (this.reference)
            {
                alert("Found unresolved node reference during scene loading");
            }

            if (this.kinematic || baseNode.kinematic)
            {
                node.kinematic = true;
            }

            if ((this.disabled || baseNode.disabled) && (disableNodes !== false))
            {
                node.disabled = true;
            }

            var fileChildren = this.nodes;

            if (fileChildren)
            {
                for (var c in fileChildren)
                {
                    if (fileChildren.hasOwnProperty(c))
                    {
                        if (!node.findChild(c))
                        {
                            var child = copyNodeFn.call(fileChildren[c], c, nodePath, node, this.skin || materialSkin);
                            if (child)
                            {
                                node.addChild(child);
                            }
                        }
                    }
                }
            }

            return node;
        }

        var fileNodes = sceneData.nodes;
        var parentNode = loadParams.parentNode;

        var emptyNode = {};
        for (var fn in fileNodes)
        {
            if (fileNodes.hasOwnProperty(fn))
            {
                var fileNode = fileNodes[fn];
                var nodeName = fn;
                var nodePath = (nodesNamePrefix ? (nodesNamePrefix + "/" + fn) : fn);
                var overloadedNode = currentScene.findNode(nodePath); //If a node with the same name exist already we update that.

                var node = copyNodeFn.call(fileNode,
                                           nodeName,
                                           nodesNamePrefix,
                                           (overloadedNode || parentNode || emptyNode),
                                           fileNode.skin || loadParams.materialSkin);
                if (node)
                {
                    if (parentNode && !overloadedNode)
                    {
                        parentNode.addChild(node);
                    }

                    if (baseMatrix)
                    {
                        if (node.local)
                        {
                            node.setLocalTransform(md.m43Mul(node.getLocalTransform(), baseMatrix));
                        }
                        else
                        {
                            node.setLocalTransform(baseMatrix);
                        }
                    }
                    else
                    {
                        if (!node.local)
                        {
                            node.setLocalTransform(md.m43BuildIdentity());
                        }
                    }

                    if (disableNodes)
                    {
                        node.enableHierarchy(false);
                    }

                    if (overloadedNode)
                    {
                        //Utilities.log("Overloaded node '" + nodePath + "'");

                        var overloadedMatrix = overloadedNode.local;
                        if (overloadedMatrix && node.local)
                        {
                            node.local = md.m43Mul(node.local, overloadedMatrix);
                            overloadedNode.setLocalTransform(node.local);
                            delete node.local;
                        }

                        var overloadedChildren = overloadedNode.children;
                        if (overloadedChildren && node.children)
                        {
                            //Utilities.log("Concat children of node '" + nodePath + "'");
                            while (node.children.length)
                            {
                                var child = node.children[0];
                                if (!overloadedNode.findChild(child.name))
                                {
                                    overloadedNode.addChild(child);
                                }
                                node.removeChild(child);
                            }
                        }

                        for (var on in node)
                        {   //TODO: This really doesn't work other than simple objects....
                            if (node.hasOwnProperty(on))
                            {
                                overloadedNode[on] = node[on];
                            }
                        }
                        node = null;
                    }
                    else if (!parentNode)
                    {
                        this.addRootNode(node);
                    }
                }
            }
        }
    },

    //
    // loadAreas
    //
    loadAreas: function sceneLoadAreasNodesFn(loadParams)
    {
        var sceneData = loadParams.data;

        var fileAreas = sceneData.areas;
        if (!fileAreas)
        {
            return;
        }

        var numFileAreas = fileAreas.length;
        if (numFileAreas <= 0)
        {
            return;
        }

        if (!loadParams.append)
        {
            delete this.areas;
        }

        var areas = this.areas;
        if (!areas)
        {
            areas = [];
            this.areas = areas;
        }

        var nodesNamePrefix = loadParams.nodesNamePrefix;
        var md = this.md;
        var planeNormalize = this.planeNormalize;
        var baseIndex = areas.length;

        var maxValue = Number.MAX_VALUE;

        for (var fa = 0; fa < numFileAreas; fa += 1)
        {
            var fileArea = fileAreas[fa];

            var targetName = fileArea.target;
            if (nodesNamePrefix)
            {
                targetName = (nodesNamePrefix + "/" + targetName);
            }
            var target = this.findNode(targetName);
            if (!target)
            {
                //Utilities.log("Missing target: " + targetName);
                baseIndex -= 1;
                continue;
            }

            var matrix = target.getWorldTransform();
            var m0 = matrix[0];
            var m1 = matrix[1];
            var m2 = matrix[2];
            var m3 = matrix[3];
            var m4 = matrix[4];
            var m5 = matrix[5];
            var m6 = matrix[6];
            var m7 = matrix[7];
            var m8 = matrix[8];
            var m9 = matrix[9];
            var m10 = matrix[10];
            var m11 = matrix[11];

            var minAreaX = maxValue;
            var minAreaY = maxValue;
            var minAreaZ = maxValue;
            var maxAreaX = -maxValue;
            var maxAreaY = -maxValue;
            var maxAreaZ = -maxValue;

            var filePortals = fileArea.portals;
            var numFilePortals = filePortals.length;
            var portals = [];
            var filePortal, filePoints, points, numPoints, np, filePoint;
            for (var fp = 0; fp < numFilePortals; fp += 1)
            {
                var minX = maxValue;
                var minY = maxValue;
                var minZ = maxValue;
                var maxX = -maxValue;
                var maxY = -maxValue;
                var maxZ = -maxValue;
                var c0 = 0;
                var c1 = 0;
                var c2 = 0;
                filePortal = filePortals[fp];
                filePoints = filePortal.points;
                numPoints = filePoints.length;
                points = [];
                for (np = 0; np < numPoints; np += 1)
                {
                    filePoint = filePoints[np];
                    var fp0 = filePoint[0];
                    var fp1 = filePoint[1];
                    var fp2 = filePoint[2];
                    var p0 = (m0 * fp0 + m3 * fp1 + m6 * fp2 + m9);
                    var p1 = (m1 * fp0 + m4 * fp1 + m7 * fp2 + m10);
                    var p2 = (m2 * fp0 + m5 * fp1 + m8 * fp2 + m11);
                    /*jslint white: false */
                    if (p0 < minX) { minX = p0; }
                    if (p1 < minY) { minY = p1; }
                    if (p2 < minZ) { minZ = p2; }
                    if (p0 > maxX) { maxX = p0; }
                    if (p1 > maxY) { maxY = p1; }
                    if (p2 > maxZ) { maxZ = p2; }
                    /*jslint white: true */
                    c0 += p0;
                    c1 += p1;
                    c2 += p2;
                    points.push(md.v3Build(p0, p1, p2));
                }
                /*jslint white: false */
                if (minX < minAreaX) { minAreaX = minX; }
                if (minY < minAreaY) { minAreaY = minY; }
                if (minZ < minAreaZ) { minAreaZ = minZ; }
                if (maxX > maxAreaX) { maxAreaX = maxX; }
                if (maxY > maxAreaY) { maxAreaY = maxY; }
                if (maxZ > maxAreaZ) { maxAreaZ = maxZ; }
                /*jslint white: true */
                var normal = md.v3Cross(md.v3Sub(points[1], points[0]), md.v3Sub(points[2], points[0]));
                var portal = {
                    area: (baseIndex + filePortal.area),
                    points: points,
                    origin: [(c0 / numPoints), (c1 / numPoints), (c2 / numPoints)],
                    extents: [minX, minY, minZ, maxX, maxY, maxZ],
                    plane: planeNormalize([normal[0], normal[1], normal[2], md.v3Dot(normal, points[0])])
                };
                portals.push(portal);
            }

            var area = {
                target: target,
                portals: portals,
                extents: [minAreaX, minAreaY, minAreaZ, maxAreaX, maxAreaY, maxAreaZ]
            };
            areas.push(area);
        }

        // Keep bsp tree
        var fileBspNodes = sceneData.bspnodes;
        var numBspNodes = fileBspNodes.length;
        var bspNodes = [];
        bspNodes.length = numBspNodes;
        this.bspNodes = bspNodes;
        for (var bn = 0; bn < numBspNodes; bn += 1)
        {
            var fileBspNode = fileBspNodes[bn];
            var plane = fileBspNode.plane;
            bspNodes[bn] = {
                    plane: [plane[0], plane[1], plane[2], -plane[3]],
                    pos: fileBspNode.pos,
                    neg: fileBspNode.neg
                };
        }
    },

    //
    // load
    //
    load: function sceneLoadFn(loadParams)
    {
        var scene = this;

        if (!loadParams.append)
        {
            this.clearShapes();
            this.semantics = {};
        }

        var sceneCompleteLoadStage = function sceneCompleteLoadStageFn()
        {
            if (loadParams.keepLights)
            {
                scene.loadLights(loadParams);
            }

            scene.loadNodes(loadParams);

            if (loadParams.physicsManager)
            {
                loadParams.physicsManager.loadNodes(loadParams, scene);
            }

            scene.loadAreas(loadParams);

            scene.endLoading(loadParams.onload);
        };

        if (loadParams.graphicsDevice)
        {
            this.loadMaterials(loadParams);
        }

        // Needs to be called before the geometry is loaded by loadNodes or streamShapes
        scene.loadSkeletons(loadParams);

        var yieldFn = loadParams.yieldFn;
        if (yieldFn)
        {
            var streamNodesStage = function sceneStreamNodesStage()
            {
                scene.streamShapes(loadParams, sceneCompleteLoadStage);
            };
            yieldFn(streamNodesStage);
        }
        else
        {
            sceneCompleteLoadStage();
        }
    },

    planeNormalize : function scenePlaneNormalizeFn(plane)
    {
        var a = plane[0];
        var b = plane[1];
        var c = plane[2];
        var lsq = ((a * a) + (b * b) + (c * c));
        if (lsq > 0.0)
        {
            var lr = 1.0 / Math.sqrt(lsq);
            return [(a * lr), (b * lr), (c * lr), (plane[3] * lr)];
        }
        else
        {
            return [0, 0, 0, 0];
        }
    },

    isInsidePlanesAABB : function sceneIsInsidePlanesAABBFn(extents, planes)
    {
        var n0 = extents[0];
        var n1 = extents[1];
        var n2 = extents[2];
        var p0 = extents[3];
        var p1 = extents[4];
        var p2 = extents[5];
        var numPlanes = planes.length;
        var n = 0;
        do
        {
            var plane = planes[n];
            var d0 = plane[0];
            var d1 = plane[1];
            var d2 = plane[2];
            if ((d0 * (d0 < 0 ? n0 : p0) + d1 * (d1 < 0 ? n1 : p1) + d2 * (d2 < 0 ? n2 : p2)) < plane[3])
            {
                return false;
            }
            n += 1;
        }
        while (n < numPlanes);
        return true;
    },

    isFullyInsidePlanesAABB : function sceneIsFullyInsidePlanesAABBFn(extents, planes)
    {
        var n0 = extents[0];
        var n1 = extents[1];
        var n2 = extents[2];
        var p0 = extents[3];
        var p1 = extents[4];
        var p2 = extents[5];
        var numPlanes = planes.length;
        var n = 0;
        do
        {
            var plane = planes[n];
            var d0 = plane[0];
            var d1 = plane[1];
            var d2 = plane[2];
            if ((d0 * (d0 > 0 ? n0 : p0) + d1 * (d1 > 0 ? n1 : p1) + d2 * (d2 > 0 ? n2 : p2)) < plane[3])
            {
                return false;
            }
            n += 1;
        }
        while (n < numPlanes);
        return true;
    },

    extractFrustumPlanes: function sceneExtractFrustumPlanesFn(camera)
    {
        var planeNormalize = this.planeNormalize;
        var m = camera.viewProjectionMatrix;
        var m0 = m[0];
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m4 = m[4];
        var m5 = m[5];
        var m6 = m[6];
        var m7 = m[7];
        var m8 = m[8];
        var m9 = m[9];
        var m10 = m[10];
        var m11 = m[11];
        var m12 = m[12];
        var m13 = m[13];
        var m14 = m[14];
        var m15 = m[15];
        var planes = this.frustumPlanes;

        // Negate 'd' here to avoid doing it on the isVisible functions
        planes[0] = planeNormalize([(m3 + m0), (m7 + m4), (m11 + m8), -(m15 + m12)]); // left
        planes[1] = planeNormalize([(m3 - m0), (m7 - m4), (m11 - m8), -(m15 - m12)]); // right
        planes[2] = planeNormalize([(m3 - m1), (m7 - m5), (m11 - m9), -(m15 - m13)]); // top
        planes[3] = planeNormalize([(m3 + m1), (m7 + m5), (m11 + m9), -(m15 + m13)]); // bottom

        if (this.areas)
        {
            if (planes.length > 4)
            {
                planes.length = 4;
            }
        }
        else
        {
            planes[4] = planeNormalize([(m3 - m2), (m7 - m6), (m11 - m10), -(m15 - m14)]); // far
        }

        this.nearPlane = planeNormalize([(m3 + m2), (m7 + m6), (m11 + m10), -(m15 + m14)]);  // near

        return planes;
    },

    //
    // calculateHullScreenExtents
    //
    calculateHullScreenExtents : function sceneCalculateHullScreenExtents(polygons)
    {
        // Sutherland-Hodgman polygon clipping algorithm
        function clipLine(va, vb, axis, positive, out)
        {
            var a = va[axis];
            var b = vb[axis];
            var aw = va[3];
            var bw = vb[3];
            var t = 0.0;
            var bInside = true;
            if (positive)
            {
                if (a > aw)
                {
                    if (b <= bw)
                    {
                        if (b < bw)
                        {
                            t = ((aw - a) / ((b - a) - (bw - aw)));
                        }
                    }
                    else
                    {
                        // both out
                        return;
                    }
                }
                else if (b > bw)
                {
                    if (a < aw)
                    {
                        t = ((aw - a) / ((b - a) - (bw - aw)));
                    }
                    bInside = false;
                }
            }
            else
            {
                if (a < -aw)
                {
                    if (b >= -bw)
                    {
                        if (b > -bw)
                        {
                            t = ((- aw - a) / ((b - a) + (bw - aw)));
                        }
                    }
                    else
                    {
                        // both out
                        return;
                    }
                }
                else if (b < -bw)
                {
                    if (a > -aw)
                    {
                        t = ((- aw - a) / ((b - a) + (bw - aw)));
                    }
                    bInside = false;
                }
            }

            if (t > 0.0)
            {
                var ax = va[0];
                var ay = va[1];
                var az = va[2];
                var bx = vb[0];
                var by = vb[1];
                var bz = vb[2];
                out.push([ (ax + (t * (bx - ax))),
                           (ay + (t * (by - ay))),
                           (az + (t * (bz - az))),
                           (aw + (t * (bw - aw))) ]);
            }

            if (bInside)
            {
                out.push(vb);
            }
        }

        var minX =  1.0;
        var maxX = -1.0;
        var minY =  1.0;
        var maxY = -1.0;

        var numPolygons = polygons.length;
        for (var n = 0; n < numPolygons; n += 1)
        {
            var points = polygons[n];
            var numPoints, p, a, b, out;
            for (var positive = 0; positive < 2; positive += 1)
            {
                for (var axis = 0; axis < 3; axis += 1)
                {
                    numPoints = points.length;
                    if (!numPoints)
                    {
                        break;
                    }
                    out = [];
                    for (p = 0; p < numPoints; p += 1)
                    {
                        if (p < 1)
                        {
                            a = points[numPoints - 1];
                        }
                        else
                        {
                            a = points[p - 1];
                        }
                        b = points[p];
                        clipLine(a, b, axis, positive, out);
                    }
                    points = out;
                }
            }

            numPoints = points.length;
            for (p = 0; p < numPoints; p += 1)
            {
                a = points[p];
                var ax = a[0];
                var ay = a[1];
                var aw = a[3];
                if (aw === 0)
                {
                    ax = (ax >= 0 ? 1 : -1);
                    ay = (ay >= 0 ? 1 : -1);
                }
                else
                {
                    var rcpa = 1.0 / aw;
                    ax *= rcpa;
                    ay *= rcpa;
                }
                if (minX > ax)
                {
                    minX = ax;
                }
                if (maxX < ax)
                {
                    maxX = ax;
                }
                if (minY > ay)
                {
                    minY = ay;
                }
                if (maxY < ay)
                {
                    maxY = ay;
                }
            }
        }

        if (minX >= maxX || minY >= maxY)
        {
            return undefined;
        }

        if (minX < -1.0)
        {
            minX = -1.0;
        }
        if (maxX > 1.0)
        {
            maxX = 1.0;
        }
        if (minY < -1.0)
        {
            minY = -1.0;
        }
        if (maxY > 1.0)
        {
            maxY = 1.0;
        }
        return [minX, minY, maxX, maxY];
    },

    //
    // calculateLightsScreenExtents
    //
    calculateLightsScreenExtents : function sceneCalculateLightsScreenExtentsFn(camera)
    {
        var visibleLights = this.visibleLights;
        var numVisibleLights = visibleLights.length;
        if (numVisibleLights > 0)
        {
            var matrix, halfExtents, center, hx, hy, hz, p0, p1, p2, p3, p4, p5, p6, p7, st, polygons;
            var lightInstance, light, worldViewProjectionMatrix;
            var viewProjectionMatrix = camera.viewProjectionMatrix;
            var calculateHullScreenExtents = this.calculateHullScreenExtents;
            var md = this.md;
            var m44Transform = md.m44Transform;
            var m43MulM44 = md.m43MulM44;
            var v4Build = md.v4Build;
            var spotA = v4Build.call(md, -1, -1, 1, 1);
            var spotB = v4Build.call(md,  1, -1, 1, 1);
            var spotC = v4Build.call(md, -1,  1, 1, 1);
            var spotD = v4Build.call(md,  1,  1, 1, 1);
            var n = 0;
            do
            {
                lightInstance = visibleLights[n];
                light = lightInstance.light;
                if (light)
                {
                    if (light.global)
                    {
                        continue;
                    }

                    matrix = lightInstance.node.world;

                    if (light.spot)
                    {
                        var transform = md.m33MulM43(light.frustum, matrix);

                        worldViewProjectionMatrix = m43MulM44.call(md, transform, viewProjectionMatrix, worldViewProjectionMatrix);

                        p0 = m44Transform.call(md, worldViewProjectionMatrix, spotA, p0);
                        p1 = m44Transform.call(md, worldViewProjectionMatrix, spotB, p1);
                        p2 = m44Transform.call(md, worldViewProjectionMatrix, spotC, p2);
                        p3 = m44Transform.call(md, worldViewProjectionMatrix, spotD, p3);

                        st = md.m43Pos(matrix);
                        st = v4Build.call(md, st[0], st[1], st[2], 1);
                        st = m44Transform.call(md, viewProjectionMatrix, st, st);

                        polygons = [ [st, p0, p1],
                                     [st, p1, p3],
                                     [st, p2, p0],
                                     [st, p3, p2],
                                     [p2, p3, p1, p0]];
                    }
                    else
                    {
                        halfExtents = light.halfExtents;
                        if (!light.fog)
                        {
                            center = light.center;
                            if (center)
                            {
                                matrix = md.m43Offset(matrix, center);
                            }
                        }

                        hx = halfExtents[0];
                        hy = halfExtents[1];
                        hz = halfExtents[2];

                        worldViewProjectionMatrix = m43MulM44.call(md, matrix, viewProjectionMatrix, worldViewProjectionMatrix);

                        p0 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, - hx, - hy, - hz, 1, p0), p0);
                        p1 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, + hx, - hy, - hz, 1, p1), p1);
                        p2 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, + hx, - hy, + hz, 1, p2), p2);
                        p3 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, - hx, - hy, + hz, 1, p3), p3);
                        p4 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, - hx, + hy, - hz, 1, p4), p4);
                        p5 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, + hx, + hy, - hz, 1, p5), p5);
                        p6 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, + hx, + hy, + hz, 1, p6), p6);
                        p7 = m44Transform.call(md, worldViewProjectionMatrix, v4Build.call(md, - hx, + hy, + hz, 1, p7), p7);

                        polygons = [ [p3, p2, p1, p0],
                                     [p4, p5, p6, p7],
                                     [p0, p1, p5, p4],
                                     [p7, p6, p2, p3],
                                     [p4, p7, p3, p0],
                                     [p1, p2, p6, p5] ];
                    }

                    lightInstance.screenExtents = calculateHullScreenExtents(polygons);
                }

                n += 1;
            }
            while (n < numVisibleLights);
        }
    },

    //
    // destroy
    //
    destroy: function sceneDestroyFn()
    {
        this.clear();
        if (this.vertexBufferManager)
        {
            this.vertexBufferManager.destroy();
            delete this.vertexBufferManager;
        }
        if (this.indexBufferManager)
        {
            this.indexBufferManager.destroy();
            delete this.indexBufferManager;
        }
    },

    getQueryCounter: function sceneGetQueryCounter()
    {
        var queryCounter = this.queryCounter;
        this.queryCounter = (queryCounter + 1);
        return queryCounter;
    }
};

// Constructor function
Scene.create = function sceneCreateFn(mathDevice)
{
    var newScene = new Scene();
    newScene.md = mathDevice;
    newScene.clear();

    newScene.onGeometryDestroyed = function sceneOnGeometryDestroyedFn(geometry)
    {
        var scene = newScene;
        geometry.reference.unsubscribeDestroyed(scene.onGeometryDestroyed);
        delete scene.shapes[geometry.name];
    };

    newScene.onMaterialDestroyed = function sceneOnMaterialDestroyedFn(material)
    {
        var scene = newScene;
        material.reference.unsubscribeDestroyed(scene.onMaterialDestroyed);
        delete scene.materials[material.name];
    };

    return newScene;
};

// Detect correct typed arrays
(function () {
    var testArray, textDescriptor;
    if (typeof Uint16Array !== "undefined")
    {
        testArray = new Uint16Array(4);
        textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Uint16Array]')
        {
            Scene.prototype.uint16ArrayConstructor = Uint16Array;
        }
    }
    if (typeof Uint32Array !== "undefined")
    {
        testArray = new Uint32Array(4);
        textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Uint32Array]')
        {
            Scene.prototype.uint32ArrayConstructor = Uint32Array;
        }
    }
    if (typeof Float32Array !== "undefined")
    {
        testArray = new Float32Array(4);
        textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Float32Array]')
        {
            Scene.prototype.float32ArrayConstructor = Float32Array;
        }
    }
}());
