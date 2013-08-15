// Copyright (c) 2011 Turbulenz Limited

/*global TurbulenzEngine: false*/
/*global TurbulenzServices: false*/
/*global Utilities: false*/

//
// API
//
function MultiPlayerSession() {}
MultiPlayerSession.prototype =
{
    version : 1,

    // Public API
    sendTo: function multiPlayerSendToFn(destinationID, messageType, messageData)
    {
        var packet = (destinationID + ':' + messageType + ':');
        if (messageData)
        {
            packet += messageData;
        }

        var socket = this.socket;
        if (socket)
        {
            socket.send(packet);
        }
        else
        {
            this.queue.push(packet);
        }
    },

    sendToGroup: function multiPlayerSendToGroup(destinationIDs, messageType, messageData)
    {
        var packet = (destinationIDs.join(',') + ':' + messageType + ':');
        if (messageData)
        {
            packet += messageData;
        }

        var socket = this.socket;
        if (socket)
        {
            socket.send(packet);
        }
        else
        {
            this.queue.push(packet);
        }
    },

    sendToAll: function multiPlayerSendToAll(messageType, messageData)
    {
        var packet = (':' + messageType + ':');
        if (messageData)
        {
            packet += messageData;
        }

        var socket = this.socket;
        if (socket)
        {
            socket.send(packet);
        }
        else
        {
            this.queue.push(packet);
        }
    },

    makePublic: function multiPlayerMakePublicFn(callbackFn)
    {
        this.service.request({
            url: '/api/v1/multiplayer/session/make-public',
            method: 'POST',
            data: {'session': this.sessionId},
            callback: callbackFn,
            requestHandler: this.requestHandler
        });
    },

    destroy: function multiPlayerDestroyFn(callbackFn)
    {
        var sessionId = this.sessionId;
        if (sessionId)
        {
            this.sessionId = null;

            var playerId = this.playerId;
            this.playerId = null;

            var socket = this.socket;
            if (socket)
            {
                this.socket = null;

                socket.onmessage = null;
                socket.onclose = null;
                socket.onerror = null;
                socket = null;
            }

            this.queue = null;

            this.onmessage = null;
            this.onclose = null;

            Utilities.ajax({
                url: '/api/v1/multiplayer/session/leave',
                method: 'POST',
                data: {'session': sessionId, 'player': playerId},
                callback: callbackFn,
                requestHandler: this.requestHandler
            });
        }
        else
        {
            if (callbackFn)
            {
                TurbulenzEngine.setTimeout(callbackFn, 0);
            }
        }
    },

    connected : function multiPlayerConnectedFn()
    {
        return (!!this.socket);
    },

    // Private API
    flushQueue: function multiPlayerFlushQueueFn()
    {
        var socket = this.socket;
        var queue = this.queue;
        var numPackets = queue.length;
        for (var n = 0; n < numPackets; n += 1)
        {
            socket.send(queue[n]);
        }
    }
};

//
// Constructor
//
MultiPlayerSession.create = function multiPlayerCreate(sessionData, createdCB, errorCB)
{
    var ms = new MultiPlayerSession();
    ms.sessionId = sessionData.sessionid;
    ms.playerId = sessionData.playerid;
    ms.socket = null;
    ms.queue = [];
    ms.onmessage = null;
    ms.onclose = null;
    ms.requestHandler = sessionData.requestHandler;
    ms.service = TurbulenzServices.getService('multiplayer');

    var numplayers = sessionData.numplayers;

    var serverURL = sessionData.server;

    var socket;

    sessionData = null;

    function multiPlayerOnMessage(packet)
    {
        var onmessage = ms.onmessage;
        if (onmessage)
        {
            var message = packet.data;
            var firstSplitIndex = message.indexOf(':');
            var secondSplitIndex = message.indexOf(':', (firstSplitIndex + 1));
            var senderID = message.slice(0, firstSplitIndex);
            /*jslint bitwise:false*/
            var messageType = (message.slice((firstSplitIndex + 1), secondSplitIndex) | 0);
            /*jslint bitwise:true*/
            var messageData = message.slice(secondSplitIndex + 1);

            onmessage(senderID, messageType, messageData);
        }
    }

    function multiPlayerConnect()
    {
        function multiPlayerConnectionError()
        {
            if (!socket)
            {
                socket = ms.socket;
            }

            ms.socket = null;

            if (socket)
            {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onclose = null;
                socket.onerror = null;
                socket = null;
            }

            // current server URL does not respond, ask for a new one
            var requestCallback = function requestCallbackFn(jsonResponse, status)
            {
                if (status === 200)
                {
                    var reconnectData = jsonResponse.data;
                    numplayers = reconnectData.numplayers;
                    serverURL = reconnectData.server;
                    ms.sessionId = reconnectData.sessionid;
                    ms.playerId = reconnectData.playerid;

                    TurbulenzEngine.setTimeout(multiPlayerConnect, 0);
                }
                else
                {
                    if (errorCB)
                    {
                        errorCB("MultiPlayerSession failed: Server not available", 0);
                        errorCB = null;
                        createdCB = null;
                    }
                    else
                    {
                        var onclose = ms.onclose;
                        if (onclose)
                        {
                            ms.onclose = null;
                            onclose();
                        }
                    }
                }
            };

            ms.service.request({
                url: '/api/v1/multiplayer/session/join',
                method: 'POST',
                data: {'session': ms.sessionId, 'player': ms.playerId},
                callback: requestCallback,
                requestHandler: ms.requestHandler
            });
        }

        try
        {
            var nd = TurbulenzEngine.getNetworkDevice();
            if (!nd)
            {
                nd = TurbulenzEngine.createNetworkDevice({});
            }

            socket = nd.createWebSocket(serverURL);

            socket.onopen = function multiPlayerOnOpen()
            {
                ms.socket = socket;

                socket.onopen = null;

                socket.onmessage = multiPlayerOnMessage;

                socket = null;

                ms.flushQueue();

                if (createdCB)
                {
                    createdCB(ms, numplayers);
                    createdCB = null;
                    errorCB = null;
                }
            };

            socket.onclose = socket.onerror = multiPlayerConnectionError;
        }
        catch (exc)
        {
            multiPlayerConnectionError();
        }
    }

    multiPlayerConnect();

    return ms;
};
