// | Browser and NodeJS module (re)loader |_____/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

function define(id, factory) {

    //PACKSTART
    // return path of file
    function basePath(_path) { //
        if (!_path) return ''
        _path = _path.replace(/\.\//g, '')
        const b = _path.match(/([\s\S]*)\/[^\/]*$/);
        return b ? b[1] : ''
    }

    // normalizes relative path r against base b
    function normalize(relativePath, basePath) {
        basePath = basePath.split(/\//)
        relativePath = relativePath.replace(/\.\.\//g, function () {
            basePath.pop();
            return ''
        }).replace(/\.\//g, '')
        let result = basePath.join('/') + '/' + relativePath;
        if (result.charAt(0) != '/') {
            result = '/' + result
        }
        return result
    }

    //PACKEND

    if (typeof process !== "undefined") {
        // | Node.JS Path
        // \____________________________________________/

        if (global.define) return

        const fs = require("fs");
        const Module = require("module");
        const path = require("path");

        const modules = [];
        const _compile = module.constructor.prototype._compile;

        // hook compile to keep track of module objects
        module.constructor.prototype._compile = function (content, filename) {
            modules.push(this);
            try {
                return _compile.call(this, content, filename)
            } catch (e) {
                console.error(content, filename, e)
            } finally {
                modules.pop()
            }
        };

        const outer = define;
        module.exports = global.define = function (id, factory) {
            if (factory instanceof Array) {
                throw new Error("injects-style not supported")
            }
            if (!factory) {
                factory = id
            }
            const _module = modules[modules.length - 1] || require.main;

            // store module and factory just like in the other envs
            const moduleId = path.posix.format(path.parse(_module.filename));
            global.define.module[moduleId] = _module
            global.define.factory[moduleId] = factory

            const req = function (m, id) {
                if (id instanceof Array || arguments.length != 2 || id.indexOf('!') != -1) {
                    throw new Error("unsupported require style")
                }

                let f = Module._resolveFilename(id, m);
                if (f instanceof Array) f = f[0]
                // lets output a filename on stderr for watching
                if (global.define.log && f.indexOf('/') != -1) process.stderr.write('<[<[' + f + ']>]>')

                return require(f)
            }.bind(this, _module);
            if (typeof factory !== "function") return _module.exports = factory

            req.factory = function () {
                throw new Error('factory not supported in unpackaged')
            }

            const ret = factory.call(_module.exports, req, _module.exports, _module);
            if (ret) _module.exports = ret
        }
        global.define.require = require
        global.define.outer = outer
        global.define.path = path
        global.define.norm = normalize
        global.define.module = {}
        global.define.factory = {}

        return
    }
    // | Browser Path
    // \____________________________________________/

    //PACKSTART


    innerDefine.module = {}
    innerDefine.factory = {}
    innerDefine.urls = {}
    innerDefine.tags = {}


    innerDefine.mkreq = function (base) {
        function localRequire(i) {
            return innerDefine.req(i, basePath(base))
        }

        localRequire.reload = function (i, cb) {
            const id = normalize(i, base);
            script(id, 'reload', function () {
                delete innerDefine.module[id] // cause reexecution of module
                cb(request(i, base))
            })
        }

        localRequire.absolute = function (i) {
            return normalize(i, basePath(base))
        }

        return localRequire
    }
    innerDefine.req = request
    innerDefine.outer = define
    if (typeof require !== 'undefined') {
        innerDefine.require = require
    }
    innerDefine.path = basePath
    innerDefine.norm = normalize

    define = innerDefine
    innerDefine(id, factory)

    //PACKEND

    // the separate file script loader
    innerDefine.loadingCount = 0
    innerDefine.reloadId = 0
    const base = basePath(window.location.href);

    function innerDefine(id, fac) {
        if (!fac) {
            fac = id
            id = null
        }
        innerDefine.factory[id || '_'] = fac
    }

    innerDefine.main = document.body.getAttribute("define-main") ||
      window.location.pathname.replace(/^(.*\/)(.*?)/, "$2").replace(".html", "")

    if (!innerDefine.main || innerDefine.main.match(/\/(?:index)?$/)) {
        innerDefine.main = "./main"
    } else if (innerDefine.main.indexOf('./') != 0) {
        innerDefine.main = "./" + innerDefine.main
    }

    script(innerDefine.main, 'root')

    function request(id, base) {
        if (!base) {
            base = ''
        }
        if (typeof require !== "undefined" && id.charAt(0) != '.') {
            return require(id)
        }

        id = normalize(id, base)

        let _module = innerDefine.module[id];
        if (_module) {
            return _module.exports
        }

        const factory = innerDefine.factory[id];
        if (!factory) {
            throw new Error('module not available ' + id + ' in base' + base)
        }
        _module = { exports: {} };

        const localreq = innerDefine.mkreq(id);

        const _return = factory(localreq, _module.exports, _module);
        if (_return) {
            _module.exports = _return
        }
        innerDefine.module[id] = _module

        return _module.exports
    }

    function script(file, parent, cb) {
        const scriptElem = document.createElement('script');
        const bpath = basePath(file);
        file = file.replace(/\.\//g, '/')
        scriptElem.type = 'text/javascript'
        const reloadQuery = cb ? '?' + innerDefine.reloadId++ : '';
        scriptElem.src = base + file + (file.indexOf(".js") != -1 ? "" : ".js" ) + reloadQuery
        innerDefine.tags[file] = scriptElem
        innerDefine.loadingCount++

        function load() {
            const _factory = innerDefine.factory._;
            innerDefine.factory[file] = _factory
            innerDefine.urls[file] = scriptElem.src
            _factory.toString()
              .replace(/require\s*\(\s*["']([^"']+)["']\s*\)/g, function (x, input) {
                  if (input.charAt(0) != '.') {
                      return
                  }
                  input = normalize(input, bpath)
                  if (!innerDefine.tags[input] && !innerDefine.factory[input]) {
                      script(input, file)
                  }
              })

            if (cb) {
                cb()
            } else if (!--innerDefine.loadingCount) {
                request(innerDefine.main, '')
            }
        }

        scriptElem.onerror = function () {
            console.error("Error loading " + scriptElem.src + " from " + parent)
        }
        scriptElem.onload = load
        scriptElem.onreadystatechange = function () {
            if (scriptElem.readyState == 'loaded' || scriptElem.readyState == 'complete') {
                load()
            }
        }
        document.getElementsByTagName('head')[0].appendChild(scriptElem)
    }
}

define()

