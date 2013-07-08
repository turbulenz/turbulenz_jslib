/* This file was generated from TypeScript source tslib/services/osdlib.ts */


var OSD = (function () {
    function OSD() { }
    OSD.version = 1;
    OSD.prototype.startLoading = function () {
        try  {
            var doc = this.topLevelDocument;
            if(doc && doc.osdStartLoading) {
                doc.osdStartLoading();
            }
        } catch (exception) {
        }
    };
    OSD.prototype.startSaving = function () {
        try  {
            var doc = this.topLevelDocument;
            if(doc && doc.osdStartSaving) {
                doc.osdStartSaving();
            }
        } catch (exception) {
        }
    };
    OSD.prototype.stopLoading = function () {
        try  {
            var doc = this.topLevelDocument;
            if(doc && doc.osdStopLoading) {
                doc.osdStopLoading();
            }
        } catch (exception) {
        }
    };
    OSD.prototype.stopSaving = function () {
        try  {
            var doc = this.topLevelDocument;
            if(doc && doc.osdStopSaving) {
                doc.osdStopSaving();
            }
        } catch (exception) {
        }
    };
    OSD.create = // Constructor function
    function create() {
        /* args */ var osdObject = new OSD();
        var topLevelWindow = window;
        var counter = 15;
        while(topLevelWindow.parent !== topLevelWindow && counter > 0) {
            topLevelWindow = topLevelWindow.parent;
            counter -= 1;
        }
        osdObject.topLevelDocument = (topLevelWindow.document);
        return osdObject;
    };
    return OSD;
})();

