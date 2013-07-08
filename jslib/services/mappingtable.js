// Copyright (c) 2011 Turbulenz Limited

//
// API
//
function MappingTable() {}
MappingTable.prototype =
{
    version : 1,

    getURL: function mappingTableGetURL(assetPath, missingCallbackFn)
    {
        var url = this.urlMapping[assetPath];
        if (url)
        {
            return url;
        }
        else
        {
            if (missingCallbackFn)
            {
                missingCallbackFn(assetPath);
            }
            return (this.assetPrefix + assetPath);
        }
    },

    map: function mappingTableMap(logicalPath, physicalPath)
    {
        this.urlMapping[logicalPath] = physicalPath;
    },

    alias: function mappingTableAlias(alias, logicalPath)
    {
        var urlMapping = this.urlMapping;
        urlMapping[alias] = urlMapping[logicalPath];
    }
};
