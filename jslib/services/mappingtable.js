// Copyright (c) 2011 Turbulenz Limited

/*global TurbulenzServices: false*/

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

MappingTable.create = function MappingTableCreateFn(params)
{
    var mappingTable = new MappingTable();

    mappingTable.mappingTableURL = params.mappingTableURL;
    mappingTable.mappingTablePrefix = params.mappingTablePrefix;
    mappingTable.assetPrefix = params.assetPrefix;

    mappingTable.errorCallbackFn = params.errorCallback || TurbulenzServices.defaultErrorCallback;
    if (!mappingTable.mappingTableURL)
    {
        mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable no mapping table file given");
    }

    function createMappingTableCallbackFn(urlMappingData)
    {
        var urlMapping = urlMappingData.urnmapping || urlMappingData.urnremapping || {};
        mappingTable.urlMapping = urlMapping;

        // Prepend all the mapped physical paths with the asset server
        var mappingTablePrefix = mappingTable.mappingTablePrefix;
        if (mappingTablePrefix)
        {
            for (var source in urlMapping)
            {
                if (urlMapping.hasOwnProperty(source))
                {
                    urlMapping[source] = mappingTablePrefix + urlMapping[source];
                }
            }
        }

        params.onload(mappingTable);
    }

    params.requestHandler.request({
            src: mappingTable.mappingTableURL,
            onload: function jsonifyResponse(jsonResponse, status) {
                var obj = JSON.parse(jsonResponse);
                if (status === 200)
                {
                    createMappingTableCallbackFn(obj);
                }
                else
                {
                    mappingTable.errorCallbackFn("TurbulenzServices.createMappingTable error with HTTP status " + status + ": " + jsonResponse.msg, status);
                }
            }
        });

    return mappingTable;
};
