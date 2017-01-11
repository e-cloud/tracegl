// | Basic Node.JS server with io channel |_________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require) {

    const http = require('http');
    const https = require('https');
    const url = require('url');
    const path = require('path');
    const fs = require('fs');
    const ioChannel = require('./io_channel');

    function ioServer(ssl) {

        const httpServer = ssl ? https.createServer(ssl, handler) : http.createServer(handler);

        const channelMap = httpServer.ch = {};

        httpServer.root = path.resolve(__dirname, '..'); //process.cwd()
        httpServer.pass = 'X';

        httpServer.send = function (m) {
            for (const k in channelMap) {
                channelMap[k].send(m);
            }
        };

        function watcher() {
            let delta; // delta
            const watching = {};
            // watch a file
            watching.watch = function (file) {
                if (watching[file]) return;

                watching[file] = fs.watch(file, function () {
                    if (Date.now() - delta < 2000) return;

                    delta = Date.now();
                    if (httpServer.fileChange) {
                        httpServer.fileChange(file);
                    }
                    console.log(`---- ${file} changed, sending reload to frontend ----`);
                    httpServer.send({ reload: file });
                });
            };
            return watching;
        }

        httpServer.watcher = watcher();

        // process io channel
        function channel(req) {
            if (req.url.indexOf('/io_') != 0) return;

            const match = req.url.split('_');

            if (match[2] != httpServer.pass) return console.log('invalid password in connection', match[2], httpServer.pass);

            let _channel = channelMap[match[1]];
            if (_channel) return _channel;

            _channel = channelMap[match[1]] = ioChannel(req.url);

            // do not use event pattern overhead
            _channel.data = function (d) {
                httpServer.data(d, _channel);
            };

            _channel.rpc = function (d, r) {
                if (httpServer.rpc) httpServer.rpc(d, r, _channel);
            };
            return _channel;
        }

        httpServer.on('upgrade', function (req, sock, head) {
            const c = channel(req);
            if (c) {
                c.upgrade(req, sock, head);
            } else {
                sock.destroy();
            }
        });

        const mime = {
            'htm': 'text/html',
            'html': 'text/html',
            'js': 'application/javascript',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'txt': 'text/plain',
            'css': 'text/css',
            'ico': 'image/x-icon',
            'png': 'image/png',
            'gif': 'image/gif'
        };
        const mimeRx = new RegExp(`\\.(${Object.keys(mime).join('|')})$`);

        // alright check if we have proxy mode
        function staticServe(req, res) {

            let name = url.parse(req.url).pathname;

            if (name == '/') {
                // send out packaged UI
                if (httpServer.packaged == 1) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<html><head><meta http-equiv='Content-Type' CONTENT='text/html; charset=utf-8'><title></title></head><body style='background-color:black' define-main='${httpServer.main}'><script src='/core/define.js'></script></body></html>`);
                    return;
                } else if (httpServer.packaged) {
                    let pkg = '';
                    const files = {};

                    function findRequires(n, base) {
                        if (files[n]) return;
                        files[n] = 1;
                        const f = define.factory[n];
                        if (!f) {
                            console.log('cannot find', n);
                        } else {
                            const s = f.toString();
                            s.replace(/require\(['"](.*?)['"]\)/g, function (x, m) {
                                if (m.charAt(0) != '.') return m;
                                const n = define.norm(m, base);
                                findRequires(n, define.path(n));
                            });
                            pkg += `define("${n}",${s})\n`;
                        }
                    }

                    findRequires(httpServer.packaged, define.path(httpServer.packaged));
                    // add the define function
                    pkg += `function define(id,fac){\n${define.outer.toString().match(/\/\/PACKSTART([\s\S]*?)\/\/PACKEND/g).join('\n').replace(/\/\/RELOADER[\s\S]*?\/\/RELOADER/, '')}\n}\n`;
                    pkg += `define.settings=${JSON.stringify(define.settings)};`;
                    pkg += `define.factory["${httpServer.packaged}"](define.mkreq("${httpServer.packaged}"))`;
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<html><head><meta http-equiv='Content-Type' CONTENT='text/html; charset=utf-8'><title></title></head><body style='background-color:black'><script>${pkg}</script></body></html>`);
                    return;
                }
                name = 'index.html';
            }

            if (name == '/favicon.ico') {
                if (!httpServer.favicon) {
                    res.writeHead(404);
                    res.end('file not found');
                    return;
                }
                if (httpServer.favicon.indexOf('base64:') == 0) {
                    name = httpServer.favicon.slice(7);
                } else {
                    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
                    res.end(new Buffer(httpServer.favicon, 'base64'));
                    return;
                }
            }

            const file = path.join(httpServer.root, name);

            fs.exists(file, function (x) {
                if (!x) {
                    res.writeHead(404);
                    res.end('file not found');
                    //console.log('cannot find '+file)
                    return;
                }
                fs.readFile(file, function (err, data) {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`${err}\n`);
                        return;
                    }
                    const ext = file.match(mimeRx);
                    const type = ext && mime[ext[1]] || 'text/plain';
                    if (httpServer.process) data = httpServer.process(file, data, type);
                    res.writeHead(200, { 'Content-Type': type });
                    res.write(data);
                    res.end();
                });
                if (httpServer.watcher) httpServer.watcher.watch(file);
            });
        }

        function proxyServe(req, res) {
            // lets do the request at the other server, and return the response
            const reqOption = {
                hostname: httpServer.proxy.hostname,
                port: httpServer.proxy.port,
                method: req.method,
                path: req.url,
                headers: req.headers
            };
            const u = url.parse(req.url);
            let isJs = 0;
            // rip out caching if we are trying to access
            //if(u.pathname.match(/\.js$/i)) isJs = u.pathname
            // turn off gzip
            delete reqOption.headers['accept-encoding'];
            //if(isJs){
            delete reqOption.headers['cache-control'];
            delete reqOption.headers['if-none-match'];
            delete reqOption.headers['if-modified-since'];
            delete reqOption.headers['content-security-policy'];

            reqOption.headers.host = httpServer.proxy.hostname;

            req.on('data', function (data) {
                reqObj.write(data);
            });

            req.on('end', function () {
                reqObj.end();
            });

            const protocol = httpServer.proxy.protocol == 'https:' ? https : http;

            const reqObj = protocol.request(reqOption, function (response) {
                if (!isJs && response.headers['content-type'] && response.headers['content-type'].includes('javascript')) {
                    if (u.pathname.match(/\.js$/i)) {
                        isJs = u.pathname;
                    } else {
                        isJs = '/unknown.js';
                    }
                }

                if (response.statusCode == 200 && isJs) {
                    let total = '';
                    let output;
                    if (response.headers['content-encoding'] === 'gzip' || response.headers['content-encoding'] === 'deflate') {
                        const zlib = require('zlib');
                        const gzip = zlib.createGunzip();
                        response.pipe(gzip);
                        output = gzip;
                    } else {
                        output = response;
                    }
                    output.on('data', function (d) {
                        total += d.toString();
                    });
                    output.on('end', function () {
                        const data = httpServer.process(isJs, total, 'application/javascript');
                        const headers = response.headers;
                        delete headers['cache-control'];
                        delete headers['last-modified'];
                        delete headers['etag'];
                        delete headers['content-length'];
                        delete headers['content-security-policy'];
                        delete headers['content-encoding'];
                        //h['content-length'] = data.length
                        res.writeHead(response.statusCode, response.headers);
                        res.write(data, function () {
                            res.end();
                        });
                    });
                } else {
                    res.writeHead(response.statusCode, response.headers);
                    response.on('data', function (d) {
                        res.write(d);
                    });
                    response.on('end', function () {
                        res.end();
                    });
                }
            });
        }

        function handler(req, res) {
            const c = channel(req);
            if (c && c.handler(req, res)) return;

            if (httpServer.proxy) return proxyServe(req, res);
            return staticServe(req, res);
        }

        return httpServer;
    }

    return ioServer;
});