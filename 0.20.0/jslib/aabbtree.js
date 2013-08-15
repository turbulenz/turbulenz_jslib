// Copyright (c) 2009-2011 Turbulenz Limited

//
// AABBTree
//
function AABBTree() {}
AABBTree.prototype =
{
    version : 1,
    numNodesLeaf : 4,

    add : function addFn(externalNode, extents)
    {
        var endNode = this.endNode;
        externalNode.aabbTreeIndex = endNode;
        this.nodes[endNode] = {
            leaf : true,
            escapeNodeOffset : 1,
            externalNode : externalNode,
            extents : extents.slice()
        };
        this.endNode = (endNode + 1);
        this.needsRebuild = 1;
        this.numAdds += 1;
        this.numExternalNodes += 1;
    },

    remove : function removeFn(externalNode)
    {
        var index = externalNode.aabbTreeIndex;
        if (index !== undefined)
        {
            if (this.numExternalNodes > 1)
            {
                var nodes = this.nodes;
                var maxNumber = Number.MAX_VALUE;
                nodes[index] = {
                    escapeNodeOffset : 1,
                    extents : [ maxNumber,  maxNumber,  maxNumber,
                               -maxNumber, -maxNumber, -maxNumber]
                };
                var endNode = this.endNode;
                if ((index + 1) >= endNode)
                {
                    while (!nodes[endNode - 1].leaf)
                    {
                        endNode -= 1;
                    }
                    this.endNode = endNode;
                }
                else
                {
                    this.needsRebuild = 1;
                }
                this.numExternalNodes -= 1;
            }
            else
            {
                this.clear();
            }

            delete externalNode.aabbTreeIndex;
        }
    },

    findParent : function findParentFn(nodeIndex)
    {
        var nodes = this.nodes;
        var parentIndex = nodeIndex;
        var nodeDist = 0;
        var parent;
        do
        {
            parentIndex -= 1;
            nodeDist += 1;
            parent = nodes[parentIndex];
        }
        while (parent.escapeNodeOffset <= nodeDist);
        return parent;
    },

    update : function aabbTreeUpdateFn(externalNode, extents)
    {
        var index = externalNode.aabbTreeIndex;
        if (index !== undefined)
        {
            var min0 = extents[0];
            var min1 = extents[1];
            var min2 = extents[2];
            var max0 = extents[3];
            var max1 = extents[4];
            var max2 = extents[5];

            var needsRebuild = this.needsRebuild;
            var needsRebound = this.needsRebound;
            var nodes = this.nodes;
            var node = nodes[index];
            var nodeExtents = node.extents;

            if (needsRebuild ||
                needsRebound ||
                nodeExtents[0] > min0 ||
                nodeExtents[1] > min1 ||
                nodeExtents[2] > min2 ||
                nodeExtents[3] < max0 ||
                nodeExtents[4] < max1 ||
                nodeExtents[5] < max2)
            {
                nodeExtents[0] = min0;
                nodeExtents[1] = min1;
                nodeExtents[2] = min2;
                nodeExtents[3] = max0;
                nodeExtents[4] = max1;
                nodeExtents[5] = max2;

                if (!needsRebuild && 1 < nodes.length)
                {
                    this.numUpdates += 1;
                    if (this.startUpdate > index)
                    {
                        this.startUpdate = index;
                    }
                    if (this.endUpdate < index)
                    {
                        this.endUpdate = index;
                    }
                    if (!needsRebound)
                    {
                        // force a rebound when things change too much
                        if ((2 * this.numUpdates) > this.numExternalNodes)
                        {
                            this.needsRebound = 1;
                        }
                        else
                        {
                            var parent = this.findParent(index);
                            var parentExtents = parent.extents;
                            if (parentExtents[0] > min0 ||
                                parentExtents[1] > min1 ||
                                parentExtents[2] > min2 ||
                                parentExtents[3] < max0 ||
                                parentExtents[4] < max1 ||
                                parentExtents[5] < max2)
                            {
                                this.needsRebound = 1;
                            }
                        }
                    }
                    else
                    {
                        // force a rebuild when things change too much
                        if (this.numUpdates > (3 * this.numExternalNodes))
                        {
                            this.needsRebuild = 1;
                            this.numAdds = this.numUpdates;
                        }
                    }
                }
            }
        }
        else
        {
            this.add(externalNode, extents);
        }
    },

    needsFinalize : function needsFinalizeFn()
    {
        return (this.needsRebuild || this.needsRebound);
    },

    finalize : function finalizeFn()
    {
        if (this.needsRebuild)
        {
            this.rebuild();
        }
        else if (this.needsRebound)
        {
            this.rebound();
        }
    },

    rebound : function reboundFn()
    {
        var nodes = this.nodes;
        if (nodes.length > 1)
        {
            var startUpdateNodeIndex = this.startUpdate;
            var endUpdateNodeIndex   = this.endUpdate;

            var nodesStack = [];
            var numNodesStack = 0;
            var topNodeIndex = 0;
            for (;;)
            {
                var topNode = nodes[topNodeIndex];
                var currentNodeIndex = topNodeIndex;
                var currentEscapeNodeIndex = (topNodeIndex + topNode.escapeNodeOffset);
                var nodeIndex = (topNodeIndex + 1); // First child
                var node;
                do
                {
                    node = nodes[nodeIndex];
                    var escapeNodeIndex = (nodeIndex + node.escapeNodeOffset);
                    if (nodeIndex < endUpdateNodeIndex)
                    {
                        if (!node.leaf)
                        {
                            if (escapeNodeIndex > startUpdateNodeIndex)
                            {
                                nodesStack[numNodesStack] = topNodeIndex;
                                numNodesStack += 1;
                                topNodeIndex = nodeIndex;
                            }
                        }
                    }
                    else
                    {
                        break;
                    }
                    nodeIndex = escapeNodeIndex;
                }
                while (nodeIndex < currentEscapeNodeIndex);

                if (topNodeIndex === currentNodeIndex)
                {
                    nodeIndex = (topNodeIndex + 1); // First child
                    node = nodes[nodeIndex];

                    var extents = node.extents;
                    var minX = extents[0];
                    var minY = extents[1];
                    var minZ = extents[2];
                    var maxX = extents[3];
                    var maxY = extents[4];
                    var maxZ = extents[5];

                    nodeIndex = (nodeIndex + node.escapeNodeOffset);
                    while (nodeIndex < currentEscapeNodeIndex)
                    {
                        node = nodes[nodeIndex];
                        extents = node.extents;
                        /*jslint white: false*/
                        if (minX > extents[0]) { minX = extents[0]; }
                        if (minY > extents[1]) { minY = extents[1]; }
                        if (minZ > extents[2]) { minZ = extents[2]; }
                        if (maxX < extents[3]) { maxX = extents[3]; }
                        if (maxY < extents[4]) { maxY = extents[4]; }
                        if (maxZ < extents[5]) { maxZ = extents[5]; }
                        /*jslint white: true*/
                        nodeIndex = (nodeIndex + node.escapeNodeOffset);
                    }

                    extents = topNode.extents;
                    extents[0] = minX;
                    extents[1] = minY;
                    extents[2] = minZ;
                    extents[3] = maxX;
                    extents[4] = maxY;
                    extents[5] = maxZ;

                    endUpdateNodeIndex = topNodeIndex;

                    if (0 < numNodesStack)
                    {
                        numNodesStack -= 1;
                        topNodeIndex = nodesStack[numNodesStack];
                    }
                    else
                    {
                        break;
                    }
                }
            }
        }

        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        //this.numUpdates = 0;
        this.startUpdate = Number.MAX_VALUE;
        this.endUpdate = -Number.MAX_VALUE;
    },

    rebuild : function rebuildFn()
    {
        if (this.numExternalNodes > 0)
        {
            var nodes = this.nodes;

            var buildNodes, numBuildNodes;

            if (this.numExternalNodes === nodes.length)
            {
                buildNodes = nodes;
                numBuildNodes = nodes.length;
                nodes = [];
                this.nodes = nodes;
            }
            else
            {
                buildNodes = [];
                buildNodes.length = this.numExternalNodes;
                numBuildNodes = 0;
                var endNodeIndex = this.endNode;
                for (var n = 0; n < endNodeIndex; n += 1)
                {
                    var currentNode = nodes[n];
                    if (currentNode.leaf)
                    {
                        buildNodes[numBuildNodes] = currentNode;
                        numBuildNodes += 1;
                    }
                }
                if (buildNodes.length > numBuildNodes)
                {
                    buildNodes.length = numBuildNodes;
                }
                nodes.length = 0;
            }

            var rootNode;
            if (numBuildNodes > 1)
            {
                if (numBuildNodes > this.numNodesLeaf &&
                    this.numAdds > 0)
                {
                    if (this.highQuality)
                    {
                        this.sortNodesHighQuality(buildNodes);
                    }
                    else if (this.ignoreY)
                    {
                        this.sortNodesNoY(buildNodes);
                    }
                    else
                    {
                        this.sortNodes(buildNodes);
                    }
                }

                this.recursiveBuild(buildNodes, 0, numBuildNodes, 0);
                this.endNode = nodes.length;

                // Check if we should take into account the Y coordinate
                rootNode = nodes[0];
                var extents = rootNode.extents;
                var deltaX = (extents[3] - extents[0]);
                var deltaY = (extents[4] - extents[1]);
                var deltaZ = (extents[5] - extents[2]);
                this.ignoreY = ((4 * deltaY) < (deltaX <= deltaZ ? deltaX : deltaZ));
            }
            else
            {
                rootNode = buildNodes[0];
                rootNode.externalNode.aabbTreeIndex = 0;
                nodes[0] = rootNode;
                this.endNode = 1;
            }
            buildNodes = null;
        }

        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.startUpdate = Number.MAX_VALUE;
        this.endUpdate = -Number.MAX_VALUE;
    },

    sortNodes : function sortNodesFn(nodes)
    {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;
        var endNodeIndex = numNodes;

        function getkeyXfn(node)
        {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyYfn(node)
        {
            var extents = node.extents;
            return (extents[1] + extents[4]);
        }

        function getkeyZfn(node)
        {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getreversekeyXfn(node)
        {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyYfn(node)
        {
            var extents = node.extents;
            return -(extents[1] + extents[4]);
        }

        function getreversekeyZfn(node)
        {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        var nthElement = this.nthElement;
        var axis = 0;
        do
        {
            var nodeIndex = 0;
            var reverse = false;
            do
            {
                var endSplitNodeIndex = ((nodeIndex + numNodes) < endNodeIndex ? (nodeIndex + numNodes) : endNodeIndex);
                var splitNodeIndex    = parseInt(((nodeIndex + endSplitNodeIndex) / 2), 10);

                if (axis === 0)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyXfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXfn);
                    }
                }
                else if (axis === 2)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyZfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZfn);
                    }
                }
                else //if (axis === 1)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyYfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyYfn);
                    }
                }
                nodeIndex = endSplitNodeIndex;
                reverse = !reverse;
            }
            while ((nodeIndex + numNodesLeaf) < endNodeIndex);

            if (axis === 0)
            {
                axis = 2;
            }
            else if (axis === 2)
            {
                axis = 1;
            }
            else //if (axis === 1)
            {
                axis = 0;
            }

            numNodes = parseInt((numNodes / 2), 10);
        }
        while (numNodes > numNodesLeaf);
    },

    sortNodesNoY : function sortNodesNoYFn(nodes)
    {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;
        var endNodeIndex = numNodes;

        function getkeyXfn(node)
        {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyZfn(node)
        {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getreversekeyXfn(node)
        {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyZfn(node)
        {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        var nthElement = this.nthElement;
        var axis = 0;
        do
        {
            var nodeIndex = 0;
            var reverse = false;
            do
            {
                var endSplitNodeIndex = ((nodeIndex + numNodes) < endNodeIndex ? (nodeIndex + numNodes) : endNodeIndex);
                var splitNodeIndex    = parseInt(((nodeIndex + endSplitNodeIndex) / 2), 10);

                if (axis === 0)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyXfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXfn);
                    }
                }
                else //if (axis === 2)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyZfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZfn);
                    }
                }
                nodeIndex = endSplitNodeIndex;
                reverse = !reverse;
            }
            while ((nodeIndex + numNodesLeaf) < endNodeIndex);

            if (axis === 0)
            {
                axis = 2;
            }
            else //if (axis === 2)
            {
                axis = 0;
            }

            numNodes = parseInt((numNodes / 2), 10);
        }
        while (numNodes > numNodesLeaf);
    },

    sortNodesHighQuality : function sortNodesHighQualityFn(nodes)
    {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;
        var endNodeIndex = numNodes;

        function getkeyXfn(node)
        {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyYfn(node)
        {
            var extents = node.extents;
            return (extents[1] + extents[4]);
        }

        function getkeyZfn(node)
        {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getkeyXZfn(node)
        {
            var extents = node.extents;
            return (extents[0] + extents[2] + extents[3] + extents[5]);
        }

        function getkeyZXfn(node)
        {
            var extents = node.extents;
            return (extents[0] - extents[2] + extents[3] - extents[5]);
        }

        function getreversekeyXfn(node)
        {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyYfn(node)
        {
            var extents = node.extents;
            return -(extents[1] + extents[4]);
        }

        function getreversekeyZfn(node)
        {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        function getreversekeyXZfn(node)
        {
            var extents = node.extents;
            return -(extents[0] + extents[2] + extents[3] + extents[5]);
        }

        function getreversekeyZXfn(node)
        {
            var extents = node.extents;
            return -(extents[0] - extents[2] + extents[3] - extents[5]);
        }

        var nthElement = this.nthElement;
        var calculateSAH = this.calculateSAH;
        do
        {
            var nodeIndex = 0;
            var reverse = false;
            do
            {
                var endSplitNodeIndex = ((nodeIndex + numNodes) < endNodeIndex ? (nodeIndex + numNodes) : endNodeIndex);
                var splitNodeIndex    = parseInt(((nodeIndex + endSplitNodeIndex) / 2), 10);

                nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXfn);
                var sahX = (calculateSAH(nodes, nodeIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endSplitNodeIndex));

                nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyYfn);
                var sahY = (calculateSAH(nodes, nodeIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endSplitNodeIndex));

                nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZfn);
                var sahZ = (calculateSAH(nodes, nodeIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endSplitNodeIndex));

                nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXZfn);
                var sahXZ = (calculateSAH(nodes, nodeIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endSplitNodeIndex));

                nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZXfn);
                var sahZX = (calculateSAH(nodes, nodeIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endSplitNodeIndex));

                if (sahX <= sahY &&
                    sahX <= sahZ &&
                    sahX <= sahXZ &&
                    sahX <= sahZX)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyXfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXfn);
                    }
                }
                else if (sahZ <= sahY &&
                         sahZ <= sahXZ &&
                         sahZ <= sahZX)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyZfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZfn);
                    }
                }
                else if (sahY <= sahXZ &&
                         sahY <= sahZX)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyYfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyYfn);
                    }
                }
                else if (sahXZ <= sahZX)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyXZfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyXZfn);
                    }
                }
                else //if (sahZX <= sahXZ)
                {
                    if (reverse)
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getreversekeyZXfn);
                    }
                    else
                    {
                        nthElement(nodes, nodeIndex, splitNodeIndex, endSplitNodeIndex, getkeyZXfn);
                    }
                }

                nodeIndex = endSplitNodeIndex;
                reverse = !reverse;
            }
            while ((nodeIndex + numNodesLeaf) < endNodeIndex);

            numNodes = parseInt((numNodes / 2), 10);
        }
        while (numNodes > numNodesLeaf);
    },

    calculateSAH : function calculateSAHFn(buildNodes, startIndex, endIndex)
    {
        var buildNode, extents, minX, minY, minZ, maxX, maxY, maxZ;

        buildNode = buildNodes[startIndex];
        extents = buildNode.extents;
        minX = extents[0];
        minY = extents[1];
        minZ = extents[2];
        maxX = extents[3];
        maxY = extents[4];
        maxZ = extents[5];

        for (var n = (startIndex + 1); n < endIndex; n += 1)
        {
            buildNode = buildNodes[n];
            extents = buildNode.extents;
            /*jslint white: false*/
            if (minX > extents[0]) { minX = extents[0]; }
            if (minY > extents[1]) { minY = extents[1]; }
            if (minZ > extents[2]) { minZ = extents[2]; }
            if (maxX < extents[3]) { maxX = extents[3]; }
            if (maxY < extents[4]) { maxY = extents[4]; }
            if (maxZ < extents[5]) { maxZ = extents[5]; }
            /*jslint white: true*/
        }

        return ((maxX - minX) + (maxY - minY) + (maxZ - minZ));
    },

    nthElement : function nthElementFn(nodes, first, nth, last, getkey)
    {
        function medianFn(a, b, c)
        {
            if (a < b)
            {
                if (b < c)
                {
                    return b;
                }
                else if (a < c)
                {
                    return c;
                }
                else
                {
                    return a;
                }
            }
            else if (a < c)
            {
                return a;
            }
            else if (b < c)
            {
                return c;
            }
            return b;
        }

        function insertionSortFn(nodes, first, last, getkey)
        {
            var sorted = (first + 1);
            while (sorted !== last)
            {
                var tempNode = nodes[sorted];
                var tempKey = getkey(tempNode);

                var next = sorted;
                var current = (sorted - 1);

                while (next !== first && tempKey < getkey(nodes[current]))
                {
                    nodes[next] = nodes[current];
                    next -= 1;
                    current -= 1;
                }

                if (next !== sorted)
                {
                    nodes[next] = tempNode;
                }

                sorted += 1;
            }
        }

        while ((last - first) > 8)
        {
            var midValue = medianFn(getkey(nodes[first]),
                                    getkey(nodes[first + parseInt(((last - first) / 2), 10)]),
                                    getkey(nodes[last - 1]));

            var firstPos = first;
            var lastPos  = last;
            var midPos;
            for (; ; firstPos += 1)
            {
                while (getkey(nodes[firstPos]) < midValue)
                {
                    firstPos += 1;
                }

                do
                {
                    lastPos -= 1;
                }
                while (midValue < getkey(nodes[lastPos]));

                if (firstPos >= lastPos)
                {
                    midPos = firstPos;
                    break;
                }
                else
                {
                    var temp = nodes[firstPos];
                    nodes[firstPos] = nodes[lastPos];
                    nodes[lastPos]  = temp;
                }
            }

            if (midPos <= nth)
            {
                first = midPos;
            }
            else
            {
                last = midPos;
            }
        }

        insertionSortFn(nodes, first, last, getkey);
    },

    recursiveBuild : function recursiveBuildFn(buildNodes, startIndex, endIndex, lastNodeIndex)
    {
        var nodes = this.nodes;
        var nodeIndex = lastNodeIndex;
        lastNodeIndex += 1;

        var minX, minY, minZ, maxX, maxY, maxZ, extents;
        var buildNode, lastNode;

        if ((startIndex + this.numNodesLeaf) >= endIndex)
        {
            buildNode = buildNodes[startIndex];
            extents = buildNode.extents;
            minX = extents[0];
            minY = extents[1];
            minZ = extents[2];
            maxX = extents[3];
            maxY = extents[4];
            maxZ = extents[5];

            buildNode.externalNode.aabbTreeIndex = lastNodeIndex;
            nodes[lastNodeIndex] = buildNode;

            for (var n = (startIndex + 1); n < endIndex; n += 1)
            {
                buildNode = buildNodes[n];
                extents = buildNode.extents;
                /*jslint white: false*/
                if (minX > extents[0]) { minX = extents[0]; }
                if (minY > extents[1]) { minY = extents[1]; }
                if (minZ > extents[2]) { minZ = extents[2]; }
                if (maxX < extents[3]) { maxX = extents[3]; }
                if (maxY < extents[4]) { maxY = extents[4]; }
                if (maxZ < extents[5]) { maxZ = extents[5]; }
                /*jslint white: true*/
                lastNodeIndex += 1;
                buildNode.externalNode.aabbTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            }

            lastNode = nodes[lastNodeIndex];
        }
        else
        {
            var splitPosIndex = parseInt(((startIndex + endIndex) / 2), 10);

            if ((startIndex + 1) >= splitPosIndex)
            {
                buildNode = buildNodes[startIndex];
                buildNode.externalNode.aabbTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            }
            else
            {
                this.recursiveBuild(buildNodes, startIndex, splitPosIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;
            minX = extents[0];
            minY = extents[1];
            minZ = extents[2];
            maxX = extents[3];
            maxY = extents[4];
            maxZ = extents[5];

            lastNodeIndex = (lastNodeIndex + lastNode.escapeNodeOffset);

            if ((splitPosIndex + 1) >= endIndex)
            {
                buildNode = buildNodes[splitPosIndex];
                buildNode.externalNode.aabbTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            }
            else
            {
                this.recursiveBuild(buildNodes, splitPosIndex, endIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;
            /*jslint white: false*/
            if (minX > extents[0]) { minX = extents[0]; }
            if (minY > extents[1]) { minY = extents[1]; }
            if (minZ > extents[2]) { minZ = extents[2]; }
            if (maxX < extents[3]) { maxX = extents[3]; }
            if (maxY < extents[4]) { maxY = extents[4]; }
            if (maxZ < extents[5]) { maxZ = extents[5]; }
            /*jslint white: true*/
        }

        nodes[nodeIndex] = {
                escapeNodeOffset : (lastNodeIndex - nodeIndex + lastNode.escapeNodeOffset),
                extents : [minX, minY, minZ,
                           maxX, maxY, maxZ]
            };
    },

    getVisibleNodes : function getVisibleNodesFn(planes, visibleNodes)
    {
        if (this.numExternalNodes > 0)
        {
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var numPlanes = planes.length;
            var numVisibleNodes = visibleNodes.length;
            var node, extents, endChildren;
            var n0, n1, n2, p0, p1, p2;
            var isInside, n, plane, d0, d1, d2;
            var nodeIndex = 0;

            for (;;)
            {
                node = nodes[nodeIndex];
                extents = node.extents;
                n0 = extents[0];
                n1 = extents[1];
                n2 = extents[2];
                p0 = extents[3];
                p1 = extents[4];
                p2 = extents[5];
                //isInsidePlanesAABB
                isInside = true;
                n = 0;
                do
                {
                    plane = planes[n];
                    d0 = plane[0];
                    d1 = plane[1];
                    d2 = plane[2];
                    if ((d0 * (d0 < 0 ? n0 : p0) + d1 * (d1 < 0 ? n1 : p1) + d2 * (d2 < 0 ? n2 : p2)) < plane[3])
                    {
                        isInside = false;
                        break;
                    }
                    n += 1;
                }
                while (n < numPlanes);
                if (isInside)
                {
                    if (node.leaf)
                    {
                        visibleNodes[numVisibleNodes] = node.externalNode;
                        numVisibleNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex)
                        {
                            break;
                        }
                    }
                    else
                    {
                        //isFullyInsidePlanesAABB
                        isInside = true;
                        n = 0;
                        do
                        {
                            plane = planes[n];
                            d0 = plane[0];
                            d1 = plane[1];
                            d2 = plane[2];
                            if ((d0 * (d0 > 0 ? n0 : p0) + d1 * (d1 > 0 ? n1 : p1) + d2 * (d2 > 0 ? n2 : p2)) < plane[3])
                            {
                                isInside = false;
                                break;
                            }
                            n += 1;
                        }
                        while (n < numPlanes);
                        if (isInside)
                        {
                            endChildren = (nodeIndex + node.escapeNodeOffset);
                            nodeIndex += 1;
                            do
                            {
                                node = nodes[nodeIndex];
                                if (node.leaf)
                                {
                                    visibleNodes[numVisibleNodes] = node.externalNode;
                                    numVisibleNodes += 1;
                                }
                                nodeIndex += 1;
                            }
                            while (nodeIndex < endChildren);
                            if (nodeIndex >= endNodeIndex)
                            {
                                break;
                            }
                        }
                        else
                        {
                            nodeIndex += 1;
                        }
                    }
                }
                else
                {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex)
                    {
                        break;
                    }
                }
            }
        }
    },

    getOverlappingNodes : function getOverlappingNodesFn(queryExtents, overlappingNodes)
    {
        if (this.numExternalNodes > 0)
        {
            var queryMinX = queryExtents[0];
            var queryMinY = queryExtents[1];
            var queryMinZ = queryExtents[2];
            var queryMaxX = queryExtents[3];
            var queryMaxY = queryExtents[4];
            var queryMaxZ = queryExtents[5];
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var node, extents, endChildren;
            var numOverlappingNodes = overlappingNodes.length;
            var nodeIndex = 0;
            for (;;)
            {
                node = nodes[nodeIndex];
                extents = node.extents;
                var minX = extents[0];
                var minY = extents[1];
                var minZ = extents[2];
                var maxX = extents[3];
                var maxY = extents[4];
                var maxZ = extents[5];
                if (queryMinX <= maxX &&
                    queryMinY <= maxY &&
                    queryMinZ <= maxZ &&
                    queryMaxX >= minX &&
                    queryMaxY >= minY &&
                    queryMaxZ >= minZ)
                {
                    if (node.leaf)
                    {
                        overlappingNodes[numOverlappingNodes] = node.externalNode;
                        numOverlappingNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex)
                        {
                            break;
                        }
                    }
                    else
                    {
                        if (queryMaxX >= maxX &&
                            queryMaxY >= maxY &&
                            queryMaxZ >= maxZ &&
                            queryMinX <= minX &&
                            queryMinY <= minY &&
                            queryMinZ <= minZ)
                        {
                            endChildren = (nodeIndex + node.escapeNodeOffset);
                            nodeIndex += 1;
                            do
                            {
                                node = nodes[nodeIndex];
                                if (node.leaf)
                                {
                                    overlappingNodes[numOverlappingNodes] = node.externalNode;
                                    numOverlappingNodes += 1;
                                }
                                nodeIndex += 1;
                            }
                            while (nodeIndex < endChildren);
                            if (nodeIndex >= endNodeIndex)
                            {
                                break;
                            }
                        }
                        else
                        {
                            nodeIndex += 1;
                        }
                    }
                }
                else
                {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex)
                    {
                        break;
                    }
                }
            }
        }
    },

    getSphereOverlappingNodes : function getSphereOverlappingNodesFn(center, radius, overlappingNodes)
    {
        if (this.numExternalNodes > 0)
        {
            var radiusSquared = (radius * radius);
            var centerX = center[0];
            var centerY = center[1];
            var centerZ = center[2];
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var node, extents;
            var numOverlappingNodes = overlappingNodes.length;
            var nodeIndex = 0;
            for (;;)
            {
                node = nodes[nodeIndex];
                extents = node.extents;
                var minX = extents[0];
                var minY = extents[1];
                var minZ = extents[2];
                var maxX = extents[3];
                var maxY = extents[4];
                var maxZ = extents[5];
                var totalDistance = 0, sideDistance;
                if (centerX < minX)
                {
                    sideDistance = (minX - centerX);
                    totalDistance += (sideDistance * sideDistance);
                }
                else if (centerX > maxX)
                {
                    sideDistance = (centerX - maxX);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (centerY < minY)
                {
                    sideDistance = (minY - centerY);
                    totalDistance += (sideDistance * sideDistance);
                }
                else if (centerY > maxY)
                {
                    sideDistance = (centerY - maxY);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (centerZ < minZ)
                {
                    sideDistance = (minZ - centerZ);
                    totalDistance += (sideDistance * sideDistance);
                }
                else if (centerZ > maxZ)
                {
                    sideDistance = (centerZ - maxZ);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (totalDistance <= radiusSquared)
                {
                    nodeIndex += 1;
                    if (node.leaf)
                    {
                        overlappingNodes[numOverlappingNodes] = node.externalNode;
                        numOverlappingNodes += 1;
                        if (nodeIndex >= endNodeIndex)
                        {
                            break;
                        }
                    }
                }
                else
                {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex)
                    {
                        break;
                    }
                }
            }
        }
    },

    getOverlappingPairs : function getOverlappingPairsFn(overlappingPairs)
    {
        if (this.numExternalNodes > 0)
        {
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var currentNode, currentExternalNode, node, extents;
            var numOverlappingPairs = overlappingPairs.length;
            var currentNodeIndex = 0, nodeIndex;
            for (;;)
            {
                currentNode = nodes[currentNodeIndex];
                while (!currentNode.leaf)
                {
                    currentNodeIndex += 1;
                    currentNode = nodes[currentNodeIndex];
                }

                currentNodeIndex += 1;
                if (currentNodeIndex < endNodeIndex)
                {
                    currentExternalNode = currentNode.externalNode;
                    extents = currentNode.extents;
                    var minX = extents[0];
                    var minY = extents[1];
                    var minZ = extents[2];
                    var maxX = extents[3];
                    var maxY = extents[4];
                    var maxZ = extents[5];

                    nodeIndex = currentNodeIndex;
                    for (;;)
                    {
                        node = nodes[nodeIndex];
                        extents = node.extents;
                        if (minX <= extents[3] &&
                            minY <= extents[4] &&
                            minZ <= extents[5] &&
                            maxX >= extents[0] &&
                            maxY >= extents[1] &&
                            maxZ >= extents[2])
                        {
                            nodeIndex += 1;
                            if (node.leaf)
                            {
                                overlappingPairs[numOverlappingPairs] = [currentExternalNode, node.externalNode];
                                numOverlappingPairs += 1;
                                if (nodeIndex >= endNodeIndex)
                                {
                                    break;
                                }
                            }
                        }
                        else
                        {
                            nodeIndex += node.escapeNodeOffset;
                            if (nodeIndex >= endNodeIndex)
                            {
                                break;
                            }
                        }
                    }
                }
                else
                {
                    break;
                }
            }
        }
    },

    getRootNode : function getRootNodeFn()
    {
        return this.nodes[0];
    },

    getNodes : function getNodesFn()
    {
        return this.nodes;
    },

    getEndNodeIndex : function getEndNodeIndexFn()
    {
        return this.endNode;
    },

    clear : function clearFn()
    {
        this.nodes = [];
        this.endNode = 0;
        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.numExternalNodes = 0;
        this.startUpdate = Number.MAX_VALUE;
        this.endUpdate = -Number.MAX_VALUE;
    }
};

// Constructor function
AABBTree.create = function aabbtreeCreateFn(highQuality)
{
    var t = new AABBTree();
    t.clear();
    if (highQuality)
    {
        t.highQuality = true;
    }
    return t;
};
