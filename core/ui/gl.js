// | GL Shader compilers |______________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports, module) {
    const fn = require('./../fn');
    const gl = require('./gl_browser');
    const acorn_tools = require('./../acorn_tools');

    if (!gl) {
        module.exports = null;
        return;
    }
    module.exports = gl;

    //|  shader object
    //\____________________________________________/

    function Shader() {}

    (function () {
        let la = 0; // last attribute
        this.use = function (f) {
            const ss = this.$ss = this.$sf[f || '_']; // selected shader
            this.$ul = ss.ul; // uniform lookup
            gl.useProgram(ss.sp);
            let ha = 0; // highest attribute
            for (var i in ss.al) {
                const a = ss.al[i];
                gl.enableVertexAttribArray(a);
                if (a > ha) ha = a;
            }
            while (la > ha) {
                gl.disableVertexAttribArray(la--);
            }
            la = ha;
            this.$tc = 0; // texture counter
            const tl = this.$tl;
            // lets set all texture lookups
            for (var i in tl) {
                const tc = this.$tc++;
                gl.activeTexture(gl.TEXTURE0 + tc);
                gl.bindTexture(gl.TEXTURE_2D, tl[i]);
                gl.uniform1i(this.$ul[i], tc);
            }
            const u = this.$un;
            if (u) {
                for (const k in u) {
                    this[k](u[k]);
                }
            }
        };

        this.n = function (n) {
            const nu = this.$nu;
            // set all uniforms from n
            for (const i in nu) {
                const v = nu[i];
                let p = n;
                let d = v.d;
                const k = v.k;
                while (d > 0) {
                    p = p._parent || p._b, d--;
                }
                const t = typeof p[k];
                if (t == 'string') {
                    this[i](p.eval(k));
                } else {
                    this[i](p[k] || 0);
                }
            }
        };

        //|  draw buffer
        this.draw = function (b) {
            const sd = this.$sd;
            const ss = this.$ss;
            b = b || this.$b;
            gl.bindBuffer(gl.ARRAY_BUFFER, b.$vb);
            if (b.up) gl.bufferData(gl.ARRAY_BUFFER, b.$va, gl.STATIC_DRAW);
            const vt = b.$vt; // vertex types
            for (const i in vt) {
                const t = vt[i];
                gl.vertexAttribPointer(ss.al[i], t.c, t.t, !t.n, b.$vs, b[i].o);
            }
            if (sd.i) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.$ib);
                if (b.up) gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.$ia, gl.STATIC_DRAW);
                gl.drawElements(sd.m, (b.hi - b.lo) * b.$ic, gl.UNSIGNED_SHORT, b.lo * b.$ic);
            } else {
                gl.drawArrays(sd.m, b.lo * b.$sl, (b.hi - b.lo) * b.$sl);
            }
            //if(gl.getError()) throw new Error("webGL error on draw")
            b.up = false;
        };

        this.set = function (u) {
            for (const k in u) {
                this[k](u[k]);
            }
        };

        const _delvb = [];
        const _delib = [];
        //|  allocate buffer
        this.alloc = function (sc, ob) {
            const sd = this.$sd; // shader def
            const ad = this.$ad; // attribute dep
            const an = this.$an; // attribute node lookup
            let b = {}; // buffer

            let vs = 0; // vertex stride
            for (const k in ad) {
                vs += gt.types[ad[k]].s;
            }

            const vl = sc * vs * sd.l;
            const va = new ArrayBuffer(vl);

            if (sd.i) {
                var il = sc * 2 * sd.i;
                var ia = new ArrayBuffer(il);
            }

            if (ob) {
                var x = new Int32Array(ob.$va);
                var y = new Int32Array(va);
                for (var j = 0, l = ob.$vl >> 2; j < l; j++) {
                    y[j] = x[j];
                } // because adding memcpy to a memblock API doesnt make sense...
                b = ob;
                if (sd.i) {
                    // copy index buffer
                    var x = new Int32Array(ob.$ia);
                    var y = new Int32Array(ia);
                    for (var j = 0, l = ob.$il >> 1; j < l; j++) {
                        y[j] = x[j];
                    }
                }
            } else {
                b.$vb = _delvb.pop() || gl.createBuffer();
                if (sd.i) b.$ib = _delib.pop() || gl.createBuffer(); // indexbuffer
                b.lo = 0; // low used
                b.hi = 0; // high used
                b.$us = 0; // status counter
            }

            if (sd.i) {
                b.$ia = ia; // index array
                b.i = {
                    a: new Uint16Array(ia), // indices
                    i: sd.i,
                    l: sd.l
                };
                b.$il = il; // index length
                b.$ic = sd.i;
            }
            b.up = true;
            b.$sc = sc; // slots
            b.$va = va; // vertex array
            b.$vl = vl; // vertex buffer length in bytes
            b.$vs = vs; // vertex stride in bytes
            b.$sl = sd.l; // slot length
            b.$vt = {}; // vertex types
            b.$sh = this; // shader

            let o = 0; // offset
            const vt = b.$vt;
            for (const i in ad) {
                // create arrayviews
                const t = gt.types[ad[i]]; // look up type
                vt[i] = t;
                b[i] = {
                    a: new t.a(va, o),
                    t: t, // type
                    s: vs / t.f, // stride
                    o: o, // offset
                    n: an[i], // lookup on n
                    l: sd.l // vertex count
                };
                o += t.s;
            }
            return b;
        };

        this.free = function (b) {
            _delvb.push(b.$vb);
            b.$vb = 0;
            if (b.$ib) {
                _delib.push(b.$ib);
                b.$ib = 0;
            }
        };
    }).apply(Shader.prototype);

    // uniform setter functions for shader
    const shader_us = {
        0: function (i) {
            return function (t) {
                const tc = this.$tc++;
                gl.activeTexture(gl.TEXTURE0 + tc);
                gl.bindTexture(gl.TEXTURE_2D, t);
                gl.uniform1i(this.$ul[i], tc);
            };
        },
        1: function (i, u) {
            return function (x) {
                gl[u](this.$ul[i], x);
            };
        },
        2: function (i, u) {
            return function (x, y) {
                if (typeof x == 'object') {
                    gl[u](this.$ul[i], x.x, x.y);
                } else {
                    gl[u](this.$ul[i], x, y);
                }
            };
        },
        3: function (i, u) {
            return function (x, y, z) {
                if (typeof x == 'object') {
                    gl[u](this.$ul[i], x.x, x.y, x.z);
                } else {
                    gl[u](this.$ul[i], x, y, z);
                }
            };
        },
        4: function (i, u) {
            return function (x, y, z, w) {
                if (typeof x == 'object') {
                    gl[u](this.$ul[i], x.x, x.y, x.z, x.w);
                } else {
                    gl[u](this.$ul[i], x, y, z, w);
                }
            };
        }
    };

    const illegal_attr = { hi: 1, lo: 1, i: 1, up: 1 };

    // |  shader function id-ifyer for fast caching
    // \____________________________________________/
    let fnid_c = 1; // the function id counter
    const fnid_o = {}; // id to function string lookup
    const fnid_tc = {}; // tracecache, used for fast shader hashing
    const fnid_rc = {}; // reverse function lookup
    const fnid_ev = {}; // js function evaluation cache

    // fingerprint this function against a domtree node n
    function fnid(f, n) {
        if (!n || n.q) return f;
        let c = f._child;
        if (!c) f._child = c = f.toString().replace(/[;\s\r\n]*/g, '');
        const i = fnid_o[c];
        const tc = fnid_tc[i];
        if (!tc) return '@'; // not compiled yet
        let s = String(i);
        for (const k in tc) {
            // walk the tracecache
            let v = tc[k];
            let p = n;
            while (v > 0) {
                p = n._parent || n._b, v--, s += '^';
            }
            const j = p[k];
            const t = typeof j;
            if (p.hasOwnProperty(k)) {
                // clean up unregistered properties to getter/setters
                delete p[k];
                p[k] = j;
            }
            if (t == 'number') {
                s += `${k}#`;
            } else if (t == 'object') {
                s += `${k}*`;
            } else if (t == 'undefined') {
                s += `${k}?`;
            } else {
                s += k + fnid(j, p);
            }
        }
        return s;
    }

    gl.totalCompiletime = 0;

    // wrap createTexture to set a unique id on each texture
    gl.createTexture2 = gl.createTexture;
    let textureID = 0;
    // make sure textures have unique ID's
    gl.createTexture = function () {
        const t = gl.createTexture2();
        t.id = textureID++;
        return t;
    };

    function tryFixFunc(src) {
        return src.replace(/function\s*\((.*?)\)\s*\{/, 'function f($1) {');
    }

    //|  compile or cache shader from definition
    //\____________________________________________/
    gl.getShader = function (sd, dn) {
        // shader def, domnode

        // shader definition
        // m : mode, gl.TRIANGLES
        // l : length, vertices per slot
        // i : indices, indices per slot
        // v : vertex shader
        // f : fragment shader
        // p : point size shader
        // d : defines
        // e : extension library
        // s : switchable fragments

        sd.l = sd.l || 1;
        sd.d = sd.d || {};
        sd.e = sd.e || {};
        sd.x = sd.x || {};
        sd.y = sd.y || {};
        sd.u = sd.u || {};
        if (!sd.cache) sd.cache = {};

        const vi = dn && dn.v || sd.v;
        const fi = dn && dn.f || sd.f;

        let sid = `${fnid(vi, dn)}|${fnid(fi, dn)}`;
        let sh = sd.cache[sid];

        if (sh) return sh;

        // create new shader object
        sh = new Shader();
        sh.$sd = sd;
        const ad = sh.$ad = {}; // attribute deps
        const an = sh.$an = {}; // attribute node lookup
        const nu = sh.$nu = {}; // node uniforms
        const ud = sh.$ud = {}; // uniform deps
        const tl = sh.$tl = {}; // texture list
        const nd = sh.$nd = {}; // n dependencies
        let tn; // texture on n

        const dt = Date.now();

        let fw; // function wraps
        const fd = {}; // function definitions
        let in_f;
        let rd; // already defined

        const fa = {}; // frag attributes
        const ts = {}; // texture slots

        let ti = 0; // texture id
        let wi = 0; // function wrap id

        // compiler output
        let oh; // output head
        let od; // output definitions
        let oe; // output expression
        let ob; // output body

        // parse and generate fragment shader
        oh = ob = od = '', pd = {}, fw = '', in_f = true;
        if (sd.m == gl.POINTS) pd.c = 1;

        let cs = fi;
        if (typeof cs == 'function') {
            sd.e._f = cs;
            cs = '_f()';
        }
        const ns = { n: dn || { l: 1 }, np: 'N', dp: 0 };
        oe = expr(cs, 0, 0, ns);

        // compile switchable fragment shaders
        const ssf = sd.s || { _: 0 };
        const sf = {};

        for (var i in ssf) {
            sf[i] = expr(ssf[i], [oe], 0, ns);
        }

        // deal with c in POINT fragment shader
        if (sd.m == gl.POINTS) {
            //delete fa.c
            oh += 'vec2 c;\n';
            ob += gl.flip_y ? ' c = vec2(gl_PointCoord.x,gl_PointCoord.y);\n' : ' c = vec2(gl_PointCoord.x,1.-gl_PointCoord.y);\n';
        }

        let yf = '';
        let yd = '';
        let yb = '';
        let yv = '';

        // pack varyings
        let vu = 0; // used
        var vs = 0;
        const vn = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };
        for (var i in fa) {
            yd += `${fa[i]} ${i};\n`;
            if (fa[i] == 'float') {
                //pack
                yb += ` ${i} = v_${vs}.${vn[vu]};\n`;
                yv += ` v_${vs}.${vn[vu]} = ${i};\n`;
                vu++;
                if (vu >= 4) {
                    yf += `varying vec4 v_${vs};\n`;
                    vs++, vu = 0;
                }
            } else {
                if (fa[i] == 'ucol') {
                    yf += `varying vec4 ${i}v;\n`;
                    yf += `varying float ${i}v_x;\n`;
                    yf += `varying float ${i}v_y;\n`;
                    yf += `varying float ${i}v_z;\n`;
                    yf += `varying float ${i}v_w;\n`;
                    yb += ` ${i} = vec4(${i}v_x,${i}v_y,${i}v_z,${i}v_w);\n`;
                    yv += ` ${i}v_x = ${i}.x;\n`;
                    yv += ` ${i}v_y = ${i}.y;\n`;
                    yv += ` ${i}v_z = ${i}.z;\n`;
                    yv += ` ${i}v_w = ${i}.w;\n`;
                } else {
                    yf += `varying ${fa[i]} ${i}v_;\n`;
                    yb += ` ${i} = ${i}v_;\n`;
                    yv += ` ${i}v_ = ${i};\n`;
                }
            }
        }
        if (vu > 0) yf += `varying vec${vu > 1 ? vu : 2} v_${vs};\n`;

        const fs = `precision mediump float;\n#define ucol vec4\n${oh}${od}${yf}${yd}${fw}void main(void){\n${yb}${ob} gl_FragColor = `;

        // generate multiple fragments
        for (var i in sf) {
            sf[i] = `${fs + sf[i]};\n}\n`;
        }

        cs = vi;
        if (typeof cs == 'function') {
            sd.e._v = cs;
            cs = '_v()';
        }

        // parse and generate vertexshader
        oh = ob = od = '', pd = {}, fw = '', in_f = false;
        oe = expr(cs, 0, 0, ns);
        // glpoint unit expression
        if (sd.p) ob += ` gl_PointSize = ${expr(sd.p, 0, 0, ns)};\n`;

        for (var i in ad) {
            if (i in illegal_attr) throw new Error(`Cannot name an attribute hi,lo or i.${i}`);
            od += `attribute ${ad[i]} ${i};\n`;
        }

        var vs = `precision mediump float;\n#define ucol vec4\n${oh}${od}${yf}${fw}\nvoid main(void){\n${yv}${ob} gl_Position = ${oe};\n}\n`;

        if (sd.dbg || dn && dn.dbg) {
            let o = '';
            for (var i in sf) {
                o += `---- fragment shader ${i} ----\n${sf[i]}`;
            }
            fn(`---- vertex shader ----\n${vs}${o}`);
            /*
             fn('---- trace cache ----\n')
             for(k in fnid_tc){
             var o = ''
             for(l in fnid_tc[k])o += l+':'+fnid_tc[k][l]+' '
             fn(k+' -> '+o + ' ' + fnid_rc[k]._child)
             }*/
        }

        const gv = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(gv, vs);
        gl.compileShader(gv);
        if (!gl.getShaderParameter(gv, gl.COMPILE_STATUS)) throw new Error(`${gl.getShaderInfoLog(gv)}\n${vs}`);

        sh.$sf = {};
        for (var i in sf) {
            sh.$sf[i] = frag(gv, sf[i]);
        }

        // define uniform setters on shader object
        for (var i in sd.u) {
            if (!(i in ud)) {
                sh[i] = function () {};
            }
        }

        for (i in ud) {
            const t = ud[i]; // type
            const y = gt.types[t]; // uniform function name
            if (i in sh) throw new Error(`Cannot use uniform with name ${i}`);
            sh[i] = shader_us[y.c](i, y.u);
        }

        gl.totalCompiletime += Date.now() - dt;

        sid = `${fnid(vi, dn)}|${fnid(fi, dn)}`;

        sh.$id = sid;
        sd.cache[sid] = sh;

        return sh;

        // compile fragment
        function frag(gv, fs) {
            const s = {};

            s.al = {};
            s.ul = {};

            const gf = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(gf, fs);
            gl.compileShader(gf);

            if (!gl.getShaderParameter(gf, gl.COMPILE_STATUS)) throw new Error(`${gl.getShaderInfoLog(gf)}\n${fs}`);

            const sp = s.sp = gl.createProgram();
            gl.attachShader(sp, gv);
            gl.attachShader(sp, gf);
            gl.linkProgram(sp);

            if (!gl.getProgramParameter(sp, gl.LINK_STATUS)) {
                console.log(vs, fs);
                throw new Error(`Could not link, max varying:${gl.getParameter(gl.MAX_VARYING_VECTORS)}\n${gl.getShaderInfoLog(gf)}${fs}`);
            }

            gl.useProgram(sp);

            for (var i in ad) {
                s.al[i] = gl.getAttribLocation(sp, i);
            }
            for (i in ud) {
                s.ul[i] = gl.getUniformLocation(sp, i);
            }

            return s;
        }

        // GLSL expresion compiler
        function expr(f, a, lv, ns) {
            // function, args, local variables, nodestruct
            if (!f) return a[0];

            var c = f._child || (f._child = f.toString().replace(/[;\s\r\n]*/g, ''));

            // lets id-ify the function
            let id = f._i;
            if (!id) f._i = id = fnid_o[c] || (fnid_o[c] = fnid_c++);

            const tc = fnid_tc[id] || (fnid_tc[id] = {}); // trace cache
            fnid_rc[id] = f;

            let p = acorn_tools.parse(tryFixFunc(c), { noclose: 1, compact: 1 }).tokens._child;

            const ma = {}; // macro args

            if (p.t.match(/^function/)) {
                if (a) {
                    // we have args, build up macro args
                    var c = 0; // arg count
                    while (!p.parenL) {
                        p = p._nextSibling;
                    } // scan till we have ()
                    for (var i = p._child; i; i = i._nextSibling) {
                        if (i.name) c++;
                    } // count args
                    c = a.length - c - 1; // smear (1,2)->(a,b,c) to (a=1,b=1,c=2)
                    for (var i = p._child; i; i = i._nextSibling) {
                        if (i.name) ma[i.t] = a[++c < 0 ? 0 : c];
                    }
                }

                while (p && !p.braceL) {
                    p = p._nextSibling;
                } // skip to the function body
            } else {
                p = p._parent; // skip back up
            }

            function subexpr(i, f, lv, ns) {
                // iter parse, function, local variables,  nodestruct
                const c = f._child || (f._child = f.toString().replace(/[;\s\r\n]*/g, ''));
                let e = f._lastChild;
                if (!e) {
                    f._lastChild = e = c.includes('_fw_') ? 3 : c.includes('return_') ? 2 : c.includes('return') ? 4 : 1;
                }

                let ar; // args
                if (i._nextSibling && i._nextSibling.parenL) {
                    ar = expand(i._nextSibling._child, 0, lv, ns), i._nextSibling.t = i._nextSibling._type = '';
                }

                if (e == 1) {
                    // macro
                    if (ar) {
                        for (var j = 0; j < ar.length; j++) {
                            ar[j] = `(${ar[j]})`;
                        }
                    }
                    i.t = `(${expr(f, ar, lv, ns)})`;
                } else if (e == 2) {
                    // its a function
                    var o = i.t.indexOf('.');
                    if (o != -1) i.t = `${i.t.slice(0, o)}_${i.t.slice(o + 1)}`;
                    if (!fd[i.t]) {
                        // not defined yet
                        fd[i.t] = 1;
                        var v = subfn(f, i.t, ns);
                        fw += v;
                    }
                    i.t = `${i.t}(${ar.join(',')})`;
                } else if (e == 3) {
                    // its a function wrapper
                    // lets parse out return type
                    const m = c.match(/([a-zA-Z0-9_]*)\_fw\_([a-zA-Z0-9_]*)/);
                    var v = m[1] || 'vec4';
                    var o = 'vec2 c';
                    if (m[2]) o = m[2].replace(/_/g, ' ');
                    fw += `${v} _fw${wi}(${o}){\n return ${ar[ar.length - 1]};\n}\n`;
                    ar[ar.length - 1] = `_fw${wi++}`;
                    i.t = expr(f, ar, lv, ns);
                } else if (e == 4) {
                    // its a string generator
                    const b = [];
                    if (ar) {
                        for (var j = 0; j < ar.length; j++) {
                            b[j] = `(${ar[j]})`;
                        }
                    }
                    var v = f(...b);
                    var o = v.indexOf('#');
                    if (o == -1) {
                        i.t = v;
                    } else {
                        v = `${v.slice(0, o)}_fw${wi}${v.slice(o + 1)}`;
                        fw += v;
                        i.t = `_fw${wi}(${ar.join(',')})`;
                        wi++;
                    }
                }
            }

            // parse GLSL subfunction
            function subfn(f, t, ns) {
                let ce = f._ce;
                if (!ce) f._ce = ce = f.toString();
                let p = acorn_tools.parse(tryFixFunc(ce), { noclose: 1, compact: 1, tokens: 1 }).tokens._child;
                //var p = ep(ce)._child // parse code and fetch first child

                let i; // iterator
                const lv = {}; // local variables
                let rt; // return type
                // lets parse the args and write the function header
                //fn(ce,p)
                while (!p.parenL) {
                    p = p._nextSibling;
                } // scan till we have ()
                let os = '('; // output string
                for (i = p._child; i; i = i._nextSibling) {
                    if (i.name) {
                        var j = i.t.indexOf('_');
                        var k = i.t.slice(j + 1);
                        var y = i.t.slice(0, j);
                        os += `${(os != '(' ? ',' : '') + y} ${k}`;
                        lv[k] = y;
                    }
                }
                os = `${t + os})`;

                while (p && !p.braceL) {
                    p = p._nextSibling;
                } // skip to the function body
                i = p;

                while (i) {
                    while (i.braceL) {
                        os += '{\n';
                        if (!i._child) {
                            s += '}\n';
                            break;
                        }
                        i = i._child;
                    }
                    if (i.name && i._nextSibling && i._nextSibling.semi) {
                        // empty define
                        var o = i.t.indexOf('_');

                        let y;
                        var k = i.t.slice(o + 1);
                        if (o != 0 && gt.types[y = i.t.slice(0, o)]) {
                            lv[k] = y; // define it
                        } else {
                            y = i.t, k = '';
                        }
                        os += `${y} ${k};`;
                        i = i._nextSibling;
                    } else if (i.name && i._nextSibling && i._nextSibling.isAssign) {
                        // assign define
                        var o = i.t.indexOf('_');

                        var y;
                        var k = i.t.slice(o + 1);
                        if (o != 0 && gt.types[y = i.t.slice(0, o)]) {
                            lv[k] = y; // define it
                        } else {
                            y = i.t, k = '';
                        }
                        // output stuff and following expression
                        // find end ;
                        var j = i;
                        while (j && !j.semi) {
                            j = j._nextSibling;
                        }
                        if (!j) throw new Error('assignment without terminating ; found');
                        os += `${y} ${k} ${i._nextSibling.t} ${expand(i._nextSibling._nextSibling, j, lv, ns)};`;
                        i = j;
                    } else if (i.name && i._nextSibling && i._nextSibling.parenL) {
                        var o = i.t.indexOf('_');
                        var y;
                        if (o != 0 && gt.types[y = i.t.slice(0, o)]) {
                            var k = i.t.slice(o + 1);
                            lv[k] = y, k += ` = ${y}`;
                            os += `${y} ${k}(${expand(i._nextSibling._child, 0, lv, ns).join(',')});\n`;
                            i = i._nextSibling;
                        } else if (y == 'return') {
                            var k = i.t.slice(o + 1);
                            if (rt && k != rt) throw new Error(`please use one return type in ${t}`);
                            rt = k;
                            os += `return ${k}(${expand(i._nextSibling._child, 0, lv, ns).join(',')});\n`;
                            i = i._nextSibling;
                        } else {
                            os += expand(i, i._nextSibling._nextSibling, lv, ns)[0];
                            i = i._nextSibling;
                        }
                    } else if (i.if && i._nextSibling.parenL) {
                        os += `;\n${i.t}(${expand(i._nextSibling._child, 0, lv, ns).join(',')})`;
                        i = i._nextSibling;
                    } else if (i.for && i._nextSibling.parenL) {
                        // for loop
                        const p1 = i._nextSibling._child;

                        let p2;
                        let p3;
                        let p4;
                        p2 = p1;
                        while (p2 && !p2.semi) {
                            p2 = p2._nextSibling;
                        }
                        p3 = p2._nextSibling;
                        while (p3 && !p3.semi) {
                            p3 = p3._nextSibling;
                        }
                        // init decl from p1
                        var o = p1.t.indexOf('_');
                        if (!p1 || !p2 || !p3 || o == -1) throw new Error('for loop without init declaration');
                        var k = p1.t.slice(o + 1);
                        var y = p1.t.slice(0, o);
                        lv[k] = y;
                        p1.t = k;
                        os += `for(${y} ${expand(p1, p2, lv, ns)};${expand(p2._nextSibling, p3, lv, ns)};${expand(p3._nextSibling, 0, lv, ns)})`;
                        i = i._nextSibling._nextSibling;
                    } else {
                        os += `${i.t} `;
                    }
                    while (i && !i._nextSibling && i != p) {
                        i = i._parent || i._b, os += ';\n}\n';
                    }
                    if (i) i = i._nextSibling;
                }
                if (!rt) throw new Error(`no returntype for ${t}`);
                os = `${rt} ${os}`;

                return os;
            }

            function expand(i, x, lv, ns) {
                // recursive expression expander
                const ea = []; // expression args
                let os = ''; // output string
                while (i && i != x) {
                    // integer bypass
                    if (i.t == '+' && i._nextSibling && i._nextSibling.num && (!i._prevSibling || i._prevSibling.t == '=')) {
                        i.t = '', i._nextSibling._type = {};
                    } else // auto float
                        if (i.num && !i.t.includes('.')) {
                            i.t += '.';
                        } else if (i.name) {
                            var o;
                            var t = (o = i.t.indexOf('.')) != -1 ? i.t.slice(0, o) : i.t;

                            if (t in ma) {
                                i.t = ma[t];
                            } // expand macro arg
                            else if (o == 0) {} // property
                                else if (lv && t in lv) {} // local variable
                                    else if (t in pd) {} // previously defined
                                        else if (t in sd.d) // define
                                                {
                                                    pd[t] = oh += `#define ${t} ${sd.d[t]}\n`;
                                                } else if (t in gt.cv4) // color
                                                {
                                                    pd[t] = oh += `#define ${t} ${gt.cv4[t]}\n`;
                                                } else if (t == 't' && o != -1) {
                                                // theme palette access
                                                var k = i.t.slice(o + 1);
                                                if (!sd.t) throw new Error(`theme object not supplied to compiler for ${i.t}`);
                                                if (!(k in sd.t)) throw new Error(`color not defined in theme: ${i.t}`);
                                                if (!('T' in ud)) {
                                                    // set up T uniform
                                                    pd.T = ud.T = 'sampler2D';
                                                    tl.T = sd.t;
                                                    oh += 'uniform sampler2D T;\n';
                                                }
                                                i.t = `texture2D(T,vec2(${sd.t[k]},0))`;
                                            } else if (t in sd.u) // uniform
                                                {
                                                    pd[t] = ud[t] = sd.u[t], oh += `uniform ${ud[t]} ${t};\n`;
                                                } else if (t in sd.a) {
                                                // attribute
                                                in_f ? fa[t] = ad[t] = sd.a[t] : ad[t] = sd.a[t];
                                            } else if (t == 'n' || t == 'p') {
                                                let n2 = ns;
                                                var k = i.t.slice(o + 1);
                                                if (t == 'p') {
                                                    n2 = {
                                                        np: `P${ns.np}`, // node parent
                                                        dp: ns.dp + 1, // depth
                                                        n: ns.n._parent || ns.n._b // n
                                                    };
                                                    tc[k] = 1;
                                                } else {
                                                    tc[k] = 0;
                                                }
                                                const j = n2.n[k];
                                                const to = typeof j;
                                                gl.regvar(k); // hook to allow ui node prototype to update
                                                const is_tex = j instanceof WebGLTexture;
                                                if (to == 'function' || to == 'string') {
                                                    subexpr(i, j, lv, n2);
                                                } else if (to == 'object' && !is_tex) {// its an animating property

                                                } else {
                                                    if (n2.n.l || is_tex) {
                                                        // make it a node uniform
                                                        var lu = { d: n2.dp || 0, k: k };
                                                        k = n2.np + k;
                                                        if (is_tex) {
                                                            if (!tn) tn = sh.$tn = {}; // texture n ref
                                                            tn[k] = lu;
                                                        }
                                                        if (!pd[k]) {
                                                            nu[k] = lu;
                                                            pd[k] = ud[k] = is_tex ? 'sampler2D' : sd.y[k] || 'float';
                                                            oh += `uniform ${ud[k]} ${k};\n`;
                                                        }
                                                        i.t = k;
                                                    } else {
                                                        // attribute dep
                                                        var lu = { d: n2.dp, k: k };
                                                        k = n2.np + k;
                                                        an[k] = lu;
                                                        i.t = k;
                                                        in_f ? fa[k] = ad[k] = sd.y[k] || 'float' : ad[k] = sd.y[k] || 'float';
                                                    }
                                                }
                                            } else if (t in sd.x) {
                                                // use expression value
                                                var o = sd.x[t];
                                                oh += `${o.t} ${t};\n`;
                                                ob += `${t} = ${expr(o.c, 0, lv, ns)};\n`;
                                                pd[t] = 1;
                                            } else if (ns.n.e && t in ns.n.e) // node ext lib
                                                {
                                                    subexpr(i, ns.n.e[t], lv, ns);
                                                } else if (t in sd.e) {
                                                subexpr(i, sd.e[t], lv, ns);
                                            } // glsl expression
                                            else if (!(t in gt.types || t in gt.builtin)) {
                                                    // undefined
                                                    //fn(cq.dump(ri))
                                                    throw new Error(`undefined variable used:${t} in ${f}`);
                                                }
                        } else if (i.string) {
                            if (!in_f) throw new Error('texture not supported in vertex shader');
                            if (!(i.t in ts)) {
                                var o = ts[i.t] = `_${ti++}`;
                                ud[o] = 'sampler2D';
                                var t = i.t.slice(1, -1);
                                tl[o] = gl.loadImage(t); // use
                                oh += `uniform sampler2D ${o};\n`;
                            }
                            i.t = ts[i.t];
                        }
                    if (i.comma) {
                        ea.push(os), os = '';
                    } else if (i.parenL) {
                        os += `(${expand(i._child, null, lv, ns).join(',')})`;
                    } else {
                        os += i.t;
                    }

                    i = i._nextSibling;
                }
                ea.push(os);
                return ea;
            }

            return expand(p._child, 0, lv, ns)[0];
        }
    };

    // |  evaluate a float shader expression in js
    // \____________________________________________/


    // JS version of the expression compiler
    function js_expr(f, a, un, el, rd) {
        // function, args
        if (!f) return a[0];

        var c = f._child;
        let id = f._i;
        if (!c) f._child = c = f.toString();
        if (!id) f._i = id = fnid_o[c] || (fnid_o[c] = fnid_c++);

        let p = acorn_tools.parse(tryFixFunc(c), { noclose: 1, compact: 1, tokens: 1 }).tokens._child;
        let i; // iterator
        let m = {}; // macro args

        if (p.t.match(/^function/)) {
            if (a) {
                // we have args, build up macro args
                var c = 0; // arg count
                while (!p.parenL) {
                    p = p._nextSibling;
                } // scan till we have ()
                for (i = p._child; i; i = i._nextSibling) {
                    if (i.name) c++;
                } // count args
                c = a.length - c - 1; // smear (1,2)->(a,b,c) to (a=1,b=1,c=2)
                for (i = p._child; i; i = i._nextSibling) {
                    if (i.name) m[i.t] = a[++c < 0 ? 0 : c];
                }
            }

            while (p && !p.braceL) {
                p = p._nextSibling;
            } // skip to the function body
        } else {
            p = p._parent;
        }

        function subexpr(i, f) {
            // iter node, function
            let c = f._child;
            if (!c) f._child = c = f.toString().replace(/[;\s\r\n]*/g, '');

            let e = f._lastChild;
            if (!e) {
                f._lastChild = e = c.includes('_fw_') ? 3 : c.includes('return_') ? 2 : c.includes('return') ? 4 : 1;
            }
            let a; // args
            if (i._nextSibling && i._nextSibling.parenL) {
                a = expand(i._nextSibling._child), i._nextSibling.t = i._nextSibling._type = '';
                for (let j = 0; j < a.length; j++) {
                    a[j] = `(${a[j]})`;
                }
            }

            if (e == 1) {
                i.t = `(${js_expr(f, a, un, el, rd)})`;
            } // its a macro
            else if (e == 2) {
                    throw new Error('cant use function wrappers in JS expressions');
                } else if (e == 3) {
                    throw new Error('cant use sub functions in JS expressions');
                } else if (e == 4) i.t = f(...a);
        }

        function expand(i) {
            // recursive expander
            const a = []; // args we collect for macros
            let s = ''; // string concatenator
            while (i) {
                if (i.num && !i.t.includes('.')) {
                    i.t += '.';
                } else if (i.name) {
                    let o;
                    const t = (o = i.t.indexOf('.')) != -1 ? i.t.slice(0, o) : i.t;

                    if (t in m) {
                        i.t = m[t];
                    } // expand macro arg
                    else if (t in un) {
                            // uniform
                            i.t = `__u.${i.t}`;
                        } else if (t == 'n' || t == 'p') {
                            // node reference
                            const k = i.t.slice(o + 1);
                            i.t = `${t}_${k}`;
                            if (!rd[`${t}_${k}`]) {
                                rd.b += `var ${t}_${k} = __x(${t},${t}.${k}, __u, __e);\n`;
                                rd[`${t}_${k}`] = 1;
                            }
                        } else if (t in el) {
                            subexpr(i, el[t]); // glsl expression
                        } else if (t in gt.builtin) {
                            // builtin
                            i.t = `__b.${i.t}`;
                        } else {
                            fn(un);
                            throw new Error(`undefined variable used in JS expression:(${t})`);
                        }
                } else if (i.string) throw new Error('texture not supported in JS expressions');
                if (i.comma) {
                    a.push(s), s = '';
                } else if (i.parenL) {
                    s += `(${expand(i._child).join(',')})`;
                } else {
                    s += i.t;
                }
                i = i._nextSibling;
            }
            a.push(s);
            return a;
        }

        return expand(p._child)[0];
    }

    gl.eval = function (n, f, un, el) {
        if (typeof f == 'number') return f;
        let j = fnid_ev[f];
        if (!j) {
            const rd = { b: '' }; // already defined
            const e = js_expr(f, 0, un, el, rd); // compile it
            rd.b += `return ${e}\n`;
            fnid_ev[f] = j = Function('n', 'p', '__u', '__e', '__b', '__x', rd.b);
        }
        // actual evaluation
        return j(n, n._parent || n._b, un, el, gt.builtin, gl.eval);
    };

    //|  render to texture
    //\____________________________________________/
    gl.renderTexture = function (w, h, f) {
        const b = gl.createFramebuffer();
        b.width = w;
        b.height = h;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, b);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);

        gl.viewport(0, 0, w, h);

        f();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteFramebuffer(b);
        gl.viewport(0, 0, gl.width, gl.height);
        t.id = gl.textureID++;
        return t;
    };

    //|  detect POINT ORIGIN
    //\____________________________________________/
    function detect_y() {
        // build shaders
        const v = 'attribute vec2 c;void main(void){gl_PointSize = 2.;gl_Position = vec4(c.x,c.y,0,1.);}';
        const f = 'precision mediump float;void main(void){gl_FragColor = vec4(gl_PointCoord.y>0.5?1.0:0.0,gl_PointCoord.x,0,1.);}';
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, f), gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, v), gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));

        sp = gl.createProgram();
        gl.attachShader(sp, vs), gl.attachShader(sp, fs), gl.linkProgram(sp);

        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        const x = new Float32Array(2);
        x[0] = -1, x[1] = 1;
        gl.bufferData(gl.ARRAY_BUFFER, x, gl.STATIC_DRAW);

        const cl = gl.getAttribLocation(sp, 'c');
        gl.useProgram(sp);
        gl.enableVertexAttribArray(cl);
        gl.vertexAttribPointer(cl, 2, gl.FLOAT, false, 8, 0);
        gl.drawArrays(gl.POINTS, 0, 1);
        const pv = new Uint8Array(4);
        gl.readPixels(0, gl.height - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pv);
        gl.deleteBuffer(b);
        return pv[0] != 0;
    }

    //|  gl table with lookups
    function gt() {
        // u:uniformfn  s:stride  a:arraytype  f:floatsize  c:components  w:writefn  r:readfn  t:type
        const y = {};
        y.int = { u: 'uniform1i', c: 1 };
        y.ivec2 = { u: 'uniform2i', c: 2 };
        y.ivec3 = { u: 'uniform3i', c: 3 };
        y.ivec4 = { u: 'uniform4i', c: 4 };
        y.uint = { u: 'uniform1i', c: 1 };
        y.uvec2 = { u: 'uniform2i', c: 2 };
        y.uvec3 = { u: 'uniform3i', c: 3 };
        y.uvec4 = { u: 'uniform4i', c: 4 };
        y.double = { u: 'uniform1f', s: 8, a: Float64Array, f: 8, c: 1, w: fl, r: _fl, t: gl.FLOAT };
        y.dvec2 = { u: 'uniform2f', s: 16, a: Float64Array, f: 8, c: 2, w: v2, r: _v2, t: gl.FLOAT };
        y.dvec3 = { u: 'uniform3f', s: 24, a: Float64Array, f: 8, c: 3, w: v3, r: _v3, t: gl.FLOAT };
        y.dvec4 = { u: 'uniform4f', s: 32, a: Float64Array, f: 8, c: 4, w: v4, r: _v4, t: gl.FLOAT };
        y.float = { u: 'uniform1f', s: 4, a: Float32Array, f: 4, c: 1, w: fl, r: _fl, t: gl.FLOAT };
        y.vec2 = { u: 'uniform2f', s: 8, a: Float32Array, f: 4, c: 2, w: v2, r: _v2, t: gl.FLOAT };
        y.vec3 = { u: 'uniform3f', s: 12, a: Float32Array, f: 4, c: 3, w: v3, r: _v3, t: gl.FLOAT };
        y.vec4 = { u: 'uniform4f', s: 16, a: Float32Array, f: 4, c: 4, w: v4, r: _v4, t: gl.FLOAT };
        y.ucol = {
            u: 'uniform1ic',
            s: 4,
            a: Uint32Array,
            f: 4,
            c: 4,
            w: co,
            r: _co,
            t: gl.UNSIGNED_BYTE,
            n: false,
            x: 'vec4'
        }, y.sampler2D = { c: 0 };
        y.bool = { c: 0 };
        gt.types = y;

        // native vertex shader variables
        gt.vertex = {
            gl_Position: 1,
            gl_PointSize: 1,
            gl_DepthRange: 1
        };
        // native fragment shader variables
        gt.fragment = {
            gl_DepthRange: 1,
            gl_FragCoord: 1,
            gl_PointCoord: 1,
            gl_FrontFacing: 1,
            gl_FragColor: 1,
            gl_FragData: 1
        };
        // native globals
        gt.globals = {
            gl_MaxVertexAttribs: 1,
            gl_MaxVertexUniformVectors: 1,
            gl_MaxVaryingVectors: 1,
            gl_MaxVertexTextureImageUnits: 1,
            gl_MaxCombinedTextureImageUnits: 1,
            gl_MaxTextureImageUnits: 1,
            gl_MaxFragmentUniformVectors: 1,
            gl_MaxDrawBuffers: 1
        };

        gt.builtin = {
            // trig
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            asin: Math.asin,
            acos: Math.acos,
            atan: Math.atan,
            sinh: function (a) {
                return (Math.exp(a) - Math.exp(-a)) / 2;
            },
            cosh: function (a) {
                return (Math.exp(a) + Math.exp(-a)) / 2;
            },
            tanh: function (a) {
                return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
            },
            asinh: function (a) {
                return Math.log(a + Math.sqrt(a * a + 1));
            },
            acosh: function (a) {
                return Math.log(a + Math.sqrt(a * a - 1));
            },
            atanh: function (a) {
                return 0.5 * Math.log((1 + a) / (1 - a));
            },
            degrees: function (a) {
                return a * 180 / Math.PI;
            },
            radians: function (a) {
                return a * Math.PI / 180;
            },
            // clamping
            abs: Math.abs,
            ceil: Math.ceil,
            floor: Math.floor,
            trunc: Math.floor,
            round: Math.round,
            min: Math.min,
            max: Math.max,
            // logic
            all: function (a) {
                return a != 0;
            },
            any: function (a) {
                return a != 0;
            },
            not: function (a) {
                return a == 0;
            },
            clamp: function (a, mi, ma) {
                return a < mi ? mi : a > ma ? ma : a;
            },
            roundEven: function (a) {
                return Math.round(a / 2) * 2;
            },
            equal: function (a, b) {
                return a == b;
            },
            greaterThan: function (a, b) {
                return a > b;
            },
            greaterThanEqual: function (a, b) {
                return a >= b;
            },
            lessThan: function (a, b) {
                return a < b;
            },
            lessThanEqual: function (a, b) {
                return a <= b;
            },
            notEqual: function (a, b) {
                return a != b;
            },
            isinf: function (a) {
                return a === Number.POSITIVE_INFINITY || a === Number.NEGATIVE_INFINITY;
            },
            isnan: function (a) {
                return a === NaN;
            },
            sign: function (a) {
                return a >= 0 ? 1 : -1;
            },
            // mod pow exp
            mod: Math.mod,
            pow: Math.pow,
            sqrt: Math.sqrt,
            exp: Math.exp,
            log: Math.log,
            fract: function (a) {
                return a - Math.floor(a);
            },
            exp2: function (a) {
                return a * a;
            },
            log2: function (a) {
                return Math.log(a, 2);
            },
            step: function (e, a) {
                return a < e ? 0 : 1;
            },
            inverse: function (a) {
                return 1 / a;
            },
            inversesqrt: function (a) {
                return 1 / Math.sqrt(a);
            },
            mix: function (a, b, f) {
                return (1 - f) * a + f * b;
            },
            smoothstep: function (e1, e2, x) {
                if (x < e1) return 0;
                if (x > e1) return 1;
                x = (x - e1) / (e2 - e1);
                return x * x * (3 - 2 * x);
            },
            length: function (a) {
                return a;
            },
            modf: 1,

            noise: 1, cross: 1, distance: 1, dot: 1, outerProduct: 1, normalize: 1,
            // matrix
            determinant: 1, matrixCompMult: 1, transpose: 1,
            // derivatives
            dFdx: 1, dFdy: 1, fwidth: 1,
            // operations with 3 types
            faceforward: 1, fma: 1, reflect: 1, refract: 1,
            // texture
            texture2D: 1,
            texelFetch: 1, texelFetchOffset: 1, texture: 1, textureGrad: 1, textureGradOffset: 1,
            textureLod: 1, textureLodOffset: 1, textureOffset: 1, textureProj: 1, textureProjGrad: 1,
            textureProjGradOffset: 1, textureProjLod: 1, textureProjLodOffset: 1, textureSize: 1,
            gl_FragCoord: 1
        };

        gt.col = {};
        gt.cv4 = {};
        // float JS value type to vertexbuffer parser
        function fl(i, a, o, m, s) {
            a[o] = parseFloat(i);
            if (m <= 1) return;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                a[o2] = x, m--, o2 += s;
            }
        }

        // stringify stored float(s)
        function _fl(a, o, m, s) {
            let v = `fl |${a[o]}|`;
            if (m <= 1) return v;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                v += ` ${a[o2]}|`, m--, o2 += s;
            }
            return v;
        }

        // vec2 JS value type to vertexbuffer parser
        function v2(i, a, o, m, s) {
            const t = typeof i;
            if (t == 'object') {
                a[o] = i.x, a[o + 1] = i.y;
            } else if (t == 'array') {
                a[o] = i[0], a[o + 1] = i[1];
            } else {
                a[o] = a[o + 1] = parseFloat(i[0]);
            }
            if (m <= 1) return;
            const x = a[o];
            const y = a[o + 1];
            let o2 = o + s;
            while (m > 1) {
                a[o2] = x, a[o2 + 1] = y, m--, o2 += s;
            }
        }

        // stringify stored vec2)
        function _v2(a, o, m, s) {
            let v = `|${a[o]} ${a[o + 1]}`;
            if (m <= 1) return v;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                v += `|${a[o2]} ${a[o2 + 1]}`, m--, o2 += s;
            }
            return `${v}|`;
        }

        // vec3 JS value type to vertexbuffer parser
        function v3(i, a, o, m, s) {
            const t = typeof i;
            if (t == 'object') {
                a[o] = i.x, a[o + 1] = i.y, a[o + 2] = i.z;
            } else if (t == 'array') {
                a[o] = i[0], a[o + 1] = i[1], a[o + 2] = i[2];
            } else {
                a[o] = a[o + 1] = a[o + 2] = parseFloat(v[0]);
            }
            if (m <= 1) return;
            const x = a[o];
            const y = a[o + 1];
            const z = a[o + 2];
            let o2 = o + s;

            while (m > 1) {
                a[o2] = x, a[o2 + 1] = y, a[o2 + 2] = z, n--, o2 += s;
            }
        }

        // stringify stored vec3
        function _v3(a, o, m, s) {
            let v = `|${a[o]} ${a[o + 1]} ${a[o + 2]}`;
            if (m <= 1) return v;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                v += `|${a[o2]} ${a[o2 + 1]} ${a[o2 + 2]}`, m--, o2 += s;
            }
            return v;
        }

        // vec4 JS value type to vertexbuffer parser
        function v4(i, a, o, m, s) {
            const t = typeof i;
            if (t == 'object') {
                if ('r' in i) {
                    a[o] = i.r, a[o + 1] = i.g, a[o + 2] = i.b, a[o + 3] = i.a;
                } else if ('h' in i) {
                    a[o] = i.x, a[o + 1] = i.y, a[o + 2] = i.x + i.w, a[o + 3] = i.y + i.h;
                } else {
                    a[o] = i.x, a[o + 1] = i.y, a[o + 2] = i.z, a[o + 3] = i.w;
                }
            } else if (t == 'array') {
                a[o] = v[0], a[o + 1] = v[1], a[o + 2] = v[2], a[o + 3] = v[3];
            } else {
                if (parseFloat(i) == i) {
                    a[o] = a[o + 1] = a[o + 2] = a[o + 3] = parseFloat(i);
                } else {
                    i = parseColor(i);
                    a[o] = i.r, a[o + 1] = i.g, a[o + 2] = i.b, a[o + 3] = i.a;
                }
            }
            if (m <= 1) return;

            const x = a[o];
            const y = a[o + 1];
            const z = a[o + 2];
            const w = a[o + 3];
            let o2 = o + s;

            while (m > 1) {
                a[o2] = x, a[o2 + 1] = y, a[o2 + 2] = z, a[o2 + 3] = w, m--, o2 += s;
            }
        }

        // stringify stored vec4)
        function _v4(a, o, m, s) {
            let v = `|${a[o]} ${a[o + 1]} ${a[o + 2]} ${a[o + 3]}`;
            if (m <= 1) return v;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                v += `|${a[o2]} ${a[o2 + 1]} ${a[o2 + 2]} ${a[o2 + 3]}`, m--, o2 += s;
            }
            return v;
        }

        // color JS value type to vertexbuffer parser
        function co(i, a, o, m, s) {
            const t = typeof i;
            if (t == 'number') {
                a[o] = i;
            } else if (t == 'object' || t == 'function') {
                if ('r' in i) {
                    a[o] = (i.r * 255 & 0xff) << 24 | (i.g * 255 & 0xff) << 16 | (i.b * 255 & 0xff) << 8 | i.a * 255 & 0xff;
                } else {
                    a[o] = (i.x * 255 & 0xff) << 24 | (i.y * 255 & 0xff) << 16 | (i.z * 255 & 0xff) << 8 | i.w * 255 & 0xff;
                }
            } else if (t == 'array') {
                a[o] = (i[0] * 255 & 0xff) << 24 | (i[1] * 255 & 0xff) << 16 | (i[2] * 255 & 0xff) << 8 | i[3] * 255 & 0xff;
            } else {
                var i = parseColor(i);
                a[o] = (i.r * 255 & 0xff) << 24 | (i.g * 255 & 0xff) << 16 | (i.b * 255 & 0xff) << 8 | i.a * 255 & 0xff;
            }
            if (m <= 1) return;

            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                a[o2] = x, m--, o2 += s;
            }
        }

        // stringify stored color)
        function _co(a, o, m, s) {
            let v = `|${a[o]}`;
            if (m <= 1) return v;
            const x = a[o];
            let o2 = o + s;
            while (m > 1) {
                v += `|${a[o2]}`, m--, o2 += s;
            }
            return v;
        }
    }

    gt();

    gl.flip_y = detect_y();

    // |  parse string colors
    // \____________________________________________/
    function parseColor(s) {
        let c;
        if (!s.indexOf('vec4')) {
            c = s.slice(5, -1).split(',');
            return { r: parseFloat(c[0]), g: parseFloat(c[1]), b: parseFloat(c[2]), a: parseFloat(c[3]) };
        }
        if (!s.indexOf('rgba')) {
            c = s.slice(5, -1).split(',');
            return {
                r: parseFloat(c[0]) / 255,
                g: parseFloat(c[1]) / 255,
                b: parseFloat(c[2]) / 255,
                a: parseFloat(c[3])
            };
        }
        if (!s.indexOf('rgb')) {
            c = s.slice(4, -1).split(',');
            return { r: parseFloat(c[0]) / 255, g: parseFloat(c[1]) / 255, b: parseFloat(c[2]) / 255, a: 1.0 };
        }
        if (c = gt.col[s]) {
            return c;
        }
    }

    function packColor(c) {
        return c.a * 255 << 24 & 0xff000000 | c.b * 255 << 16 & 0xff0000 | c.g * 255 << 8 & 0xff00 | c.r * 255 & 0xff;
    }

    gl.parseColor = parseColor;
    gl.packColor = packColor;
    // ABGR
    gl.uniform1ic = function (i, u) {
        gl.uniform4f(i, (u & 0xff) / 255, (u >> 8 & 0xff) / 255, (u >> 16 & 0xff) / 255, (u >> 24 & 0xff) / 255);
    };

    //|  a fullscreen shader with buffer
    //\____________________________________________/
    gl.getScreenShader = function (sd) {
        const d = {
            m: gl.TRIANGLES,
            l: 6,
            a: { c: 'vec2' },
            v: 'vec4(c.x * 2. -1, 1. - c.y * 2., 0, 1.)'
        };
        for (const k in sd) {
            d[k] = sd[k];
        }

        const sh = gl.getShader(d);

        const b = sh.$b = sh.alloc(1); // write 2 triangles
        const a = b.c.a;
        a[0] = a[1] = a[3] = a[7] = a[10] = a[4] = 0;
        a[2] = a[5] = a[6] = a[8] = a[9] = a[11] = 1;
        b.hi = 1;
        return sh;
    };

    //|  debug wrap whole GL api
    //\____________________________________________/
    function debug(stack) {
        if ('__createTexture' in gl) return;

        const glrev = {};
        for (const k in gl) {
            if (k == 'debug' || k == 'undebug' || k == 'eval' || k == 'regvar' || k == 'parseColor') {
                continue;
            }
            if (typeof gl[k] == 'function') {
                gl[`__${k}`] = gl[k];
                function gldump(k) {
                    const v = `__${k}`;
                    gl[k] = function(...args) {
                        const s = [];
                        let t;

                        for (const a of args) {
                            if (a && (t = glrev[a])) {
                                s.push(`${a} = gl.${t}`);
                            } else {
                                s.push(a);
                            }
                        }

                        if (stack) fn.log(new Error().stack);
                        const rv = gl[v](...args);
                        console.log(`gl.${k}(${s.join(', ')})${rv !== undefined ? ' -> ' + rv : ''}`);
                        return rv;
                    };
                }

                gldump(k);
            } else {
                glrev[gl[k]] = k;
            }
        }
    }

    gl.debug = debug;

    function undebug() {
        if (!('__createTexture' in gl)) return;
        for (const k in gl) {
            if (k.indexOf('__') == 0) {
                const k2 = k.slice(2);
                gl[k2] = gl[k];
                delete gl[k];
            }
        }
    }

    gl.undebug = undebug;
});
