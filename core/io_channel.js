// | Browser <> Node.JS communication channels |__/
// |
// |  (C) Code.GL 2013
// \____________________________________________/

define(function (require, exports, module) {

    if (typeof process !== 'undefined') {

        const crypto = require('crypto');

        module.exports = function (url) {
            const channels = {};

            let pollRequest; // poll request
            let pollTimer; // poll timer
            const noCacheHeader /*no cache header*/ = {
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            };
            const dataToSend = []; // send data
            let websocket; // websocket
            let wsKeepAlive; // websocket keepalive
            let sendTimeout; // send timeout

            function wsClose() {
                if (websocket) {
                    websocket.destroy();
                    websocket = 0;
                }
                if (wsKeepAlive) {
                    clearInterval(wsKeepAlive);
                    wsKeepAlive = 0;
                }
            }

            function endPoll(statusCode, data) {
                // end poll http status code, data
                if (!pollRequest) return;

                pollRequest.writeHead(statusCode, noCacheHeader);
                pollRequest.end(data);
                pollRequest = null;
            }

            channels.handler = function (req, res) {
                if (req.url != url) return;

                if (req.method == 'GET') {
                    // Long poll
                    endPoll(304);
                    if (pollTimer) {
                        clearInterval(pollTimer);
                        pollTimer = 0;
                    }
                    pollTimer = setInterval(function () {
                        endPoll(304);
                    }, 30000);

                    pollRequest = res;
                    if (dataToSend.length) {
                        endPoll(200, `[${dataToSend.join(',')}]`);
                        dataToSend.length = 0;
                    } // we have pending data
                    return 1;
                }

                if (req.method == 'PUT') {
                    // RPC call
                    let data = '';
                    req.on('data', function (i) {
                        data += i.toString();
                    });
                    req.on('end', function () {
                        if (!channels.rpc) {
                            return res.end();
                        }
                        data = parse(data);
                        if (!data) {
                            return res.end();
                        }
                        channels.rpc(data, function (r) {
                            res.writeHead(200, noCacheHeader);
                            res.end(JSON.stringify(r));
                        });
                    });
                    return 1;
                }

                if (req.method == 'POST') {
                    // Message
                    let data = '';
                    req.on('data', function (i) {
                        data += i.toString();
                    });
                    req.on('end', function () {
                        res.writeHead(204, noCacheHeader);
                        res.end();
                        data = parse(data);
                        if (channels.data && data && data.length) {
                            for (let i = 0; i < data.length; i++) {
                                channels.data(data[i]);
                            }
                        }
                    });
                    return 1;
                }
            };

            channels.upgrade = function (req, sock) {
                if (req.headers['sec-websocket-version'] != 13) {
                    return sock.destroy();
                }
                wsClose();
                websocket = sock;

                // calc key
                const key = req.headers['sec-websocket-key'];
                const sha1 = crypto.createHash('sha1');
                sha1.update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`);
                const v = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${sha1.digest('base64')}\r\nSec-WebSocket-Protocol: ws\r\n\r\n`;
                websocket.write(v);

                const max = 100000000;
                const header = new Buffer(14); // header
                let outBuf = new Buffer(10000); // output
                let state = opcode; // state
                let expected = 1; // expected
                let written = 0; // written
                let read; // read
                let input; // input

                let maskOffset; // mask offset
                let maskCounter; // mask counter
                let payloadLen; // payload len

                function err(t) {
                    console.log(`websock ${t}`);
                    wsClose();
                }

                function head() {
                    const sockExpected = expected;
                    while (expected > 0 && read < input.length && written < header.length) {
                        header[written++] = input[read++];
                        expected--;
                    }
                    if (written > header.length) {
                        return err(`unexpected data in header${sockExpected}${state.toString()}`);
                    }
                    return expected != 0;
                }

                function data() {
                    while (expected > 0 && read < input.length) {
                        outBuf[written++] = input[read++] ^ header[maskOffset + (maskCounter++ & 3)];
                        expected--;
                    }
                    if (expected) return;

                    const parsedData = parse(outBuf.toString('utf8', 0, written));

                    if (channels.data && parsedData && parsedData.length) {
                        for (let j = 0; j < parsedData.length; j++) {
                            channels.data(parsedData[j]);
                        }
                    }
                    expected = 1;
                    written = 0;
                    return state = opcode;
                }

                function mask() {
                    if (head()) return;
                    if (!payloadLen) {
                        expected = 1;
                        written = 0;
                        return state = opcode;
                    }
                    maskOffset = written - 4;
                    written = maskCounter = 0;
                    expected = payloadLen;
                    if (payloadLen > max) {
                        return err(`buffer size request too large ${payloadLen} > ${max}`);
                    }
                    if (payloadLen > outBuf.length) {
                        outBuf = new Buffer(payloadLen);
                    }

                    return state = data;
                }

                function len8() {
                    if (head()) return;

                    payloadLen = header.readUInt32BE(written - 4);
                    expected = 4;
                    return state = mask;
                }

                function len2() {
                    if (head()) return;

                    payloadLen = header.readUInt16BE(written - 2);
                    expected = 4;
                    return state = mask;
                }

                function len1() {
                    if (head()) return;

                    if (!(header[written - 1] & 128)) {
                        return err('only masked data');
                    }

                    const type = header[written - 1] & 127;

                    if (type < 126) {
                        payloadLen = type;
                        expected = 4;
                        return state = mask;
                    }
                    if (type == 126) {
                        expected = 2;
                        return state = len2;
                    }
                    if (type == 127) {
                        expected = 8;
                        return state = len8;
                    }
                }

                function pong() {
                    if (head()) return;

                    if (header[written - 1] & 128) {
                        expected = 4;
                        payloadLen = 0;
                        return state = mask;
                    }
                    expected = 1;
                    written = 0;
                    return state = opcode;
                }

                function opcode() {
                    if (head()) return;

                    const final = header[0] & 128;
                    const type = header[0] & 15;
                    if (type == 1) {
                        if (!final) {
                            return err('only final frames supported');
                        }
                        expected = 1;
                        return state = len1;
                    }
                    if (type == 8) {
                        return wsClose();
                    }
                    if (type == 10) {
                        expected = 1;
                        return state = pong;
                    }
                    return err(`opcode not supported ${type}`);
                }

                websocket.on('data', function (data) {
                    input = data;
                    read = 0;
                    while (state()) {}
                });

                const currentWS = websocket;

                websocket.on('close', function () {
                    if (currentWS == websocket) {
                        wsClose();
                    }
                    outBuf = null;
                });

                // 10 second ping frames
                const pingBuf = new Buffer(2);
                pingBuf[0] = 9 | 128;
                pingBuf[1] = 0;
                wsKeepAlive = setInterval(function () {
                    websocket.write(pingBuf);
                }, 10000);
            };

            function wsWrite(d) {
                let head;
                const buf = new Buffer(d);
                if (buf.length < 126) {
                    head = new Buffer(2);
                    head[1] = buf.length;
                } else if (buf.length <= 65535) {
                    head = new Buffer(4);
                    head[1] = 126;
                    head.writeUInt16BE(buf.length, 2);
                } else {
                    head = new Buffer(10);
                    head[1] = 127;
                    head[2] = head[3] = head[4] = head[5] = 0;
                    head.writeUInt32BE(buf.length, 6);
                }
                head[0] = 128 | 1;
                websocket.write(head);
                websocket.write(buf);
            }

            channels.send = function (msg) {
                dataToSend.push(JSON.stringify(msg));
                if (!sendTimeout) {
                    sendTimeout = setTimeout(function () {
                        sendTimeout = 0;
                        if (websocket) {
                            wsWrite(`[${dataToSend.join(',')}]`);
                            dataToSend.length = 0;
                        } else if (pollRequest) {
                            endPoll(200, `[${dataToSend.join(',')}]`);
                            dataToSend.length = 0;
                        }
                    }, 0);
                }
            };

            return channels;
        };

        return;
    }
    // | Browser Path
    // \____________________________________________/

    module.exports =
    //CHANNEL
    function (url) {
        const channel = {};

        const sendData = []; // send data
        const backData = []; // back data
        let backInterval = 0; // back interval
        let websocketRef; // websocket
        let socketTimeout; // websocket sendtimeout
        let sendXhr; // send xhr

        function xsend() {
            const data = `[${sendData.join(',')}]`;
            sendData.length = 0;
            sendXhr = new XMLHttpRequest();
            sendXhr.onreadystatechange = function () {
                if (sendXhr.readyState != 4) return;

                sendXhr = 0;
                if (sendData.length > 0) {
                    xsend();
                }
            };
            sendXhr.open('POST', url);
            sendXhr.send(data);
        }

        function wsFlush() {
            if (websocketRef === 1) {
                if (!socketTimeout) {
                    socketTimeout = setTimeout(function () {
                        socketTimeout = 0;
                        wsFlush();
                    }, 50);
                }
                return;
            } else if (!websocketRef) {
                if (!websocketRef) console.log('Websocket flooded, trace data lost');
            }
            if (sendData.length) {
                const data = `[${sendData.join(',')}]`;
                sendData.length = 0;
                if (backData.length || websocketRef.bufferedAmount > 500000) {
                    backData.push(data);
                    if (!backInterval) {
                        backInterval = setInterval(function () {
                            if (websocketRef && websocketRef.bufferedAmount < 500000) {
                                websocketRef.send(backData.shift());
                            }
                            if (!websocketRef || !backData.length) {
                                clearInterval(backInterval);
                                backInterval = 0;
                            }
                            if (!websocketRef) console.log('Websocket flooded, trace data lost');
                        }, 10);
                    }
                } else {
                    websocketRef.send(data);
                }
            }
        }

        //| send json message via xhr or websocket
        channel.send = function (m) {
            sendData.push(JSON.stringify(m));
            if (websocketRef) {
                if (sendData.length > 10000) wsFlush();
                if (!socketTimeout) {
                    socketTimeout = setTimeout(function () {
                        socketTimeout = 0;
                        wsFlush();
                    }, 0);
                }
            } else {
                if (!sendXhr) return xsend();
            }
        };

        function poll() {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState != 4) return;
                if (xhr.status == 200 || xhr.status == 304) {
                    poll();
                } else {
                    setTimeout(poll, 500);
                }
                let data;
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {}
                if (data && channel.data && data.length) {
                    for (let i = 0; i < data.length; i++) {
                        channel.data(data[i]);
                    }
                }
            };
            xhr.open('GET', url);
            xhr.send();
        }

        channel.rpc = function (m, cb) {
            // rpc request
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState != 4) return;
                let d;
                if (xhr.status == 200) {
                    try {
                        d = JSON.parse(xhr.responseText);
                    } catch (e) {}
                }
                if (cb) cb(d);
            };
            xhr.open('PUT', url);
            xhr.send(JSON.stringify(m));
            return xhr;
        };

        function openWebSocket() {
            const _url = `ws://${window.location.hostname}:${window.location.port}${url}`;
            const socket = new WebSocket(_url, 'ws');
            websocketRef = 1;
            socket.onopen = function () {
                websocketRef = socket;
            };
            socket.onerror = socket.onclose = function (err) {
                if (websocketRef == socket) {
                    // we had a connection, retry
                    console.log('Websocket closed, retrying', err);
                    websocketRef = 0;
                    openWebSocket();
                } else {
                    console.log('Falling back to polling', err);
                    websocketRef = 0;
                    poll();
                }
            };
            socket.onmessage = function (msg) {
                const d = parse(msg.data);
                if (d && channel.data) {
                    for (let i = 0; i < d.length; i++) {
                        channel.data(d[i]);
                    }
                }
            };
        }

        if (typeof WebSocket === 'undefined') {
            poll();
        } else {
            openWebSocket();
        }
        //poll()
        return channel;
    };

    function parse(data) {
        // data
        try {
            return JSON.parse(data);
        } catch (err) {
            return '';
        }
    }

    //CHANNEL
});