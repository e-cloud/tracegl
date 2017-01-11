// | UI Drawing |____________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports, module) {
    module.exports = function (ui) {

        // |  group
        // \____________________________________________/
        function group(g) {
            const n = new ui.Node();
            n._t = group;
            n.$$ = function () {};
            n.l = 1;
            if (g) n.set(g);
            return n;
        }

        ui.group = group;

        // |  rectangle
        // \____________________________________________/

        function rect(g) {
            const n = new ui.Node();
            n._t = rect;
            n.$$ = function () {
                const sh = ui.gl.getShader(rect.sd, n);
                // alloc buffers
                ui.alloc(n, sh);
                // set our default values on c
                rect.set(n._v.c, n._s, 0, 1);
                n._v.up = 1; // todo, partial updates properly

                // update all the rest of the variables
                ui.update(n);
            };
            if (g) n.set(g);
            return n;
        }

        rect.sd = ui.shader({
            a: { c: 'vec2' },
            v: 'vec4(((n._x+c.x*n._w+l.x)/s.x)*2.-1.,1.-((n._y+c.y*n._h+l.y)/s.y)*2.,0,1.)',
            f: 'green',
            m: ui.gl.TRIANGLES,
            l: 6
        });

        rect.set = function (v, i, z, d) {
            // vb, index, zero, digit
            const s = v.s; // stride
            let o = i * s * v.l; // offset
            const a = v.a;
            a[o] = z, a[o + 1] = z, o += s;
            a[o] = d, a[o + 1] = z, o += s;
            a[o] = z, a[o + 1] = d, o += s;
            a[o] = d, a[o + 1] = z, o += s;
            a[o] = d, a[o + 1] = d, o += s;
            a[o] = z, a[o + 1] = d, o += s;
        };

        rect.clear = function (n) {
            // clear node
            rect.set(n._v.c, n._s, 0, 0);
            n._v.up = 1;
        };

        rect.drawer = function (n) {
            n.l = 1;
            const sd = ui.gl.getShader(rect.sd, n);
            // allocate buffer of 1 rect
            const b = sd.alloc(1);
            rect.set(b.c, 0, 0, 1);
            b.hi = 1;
            sd.rect = function (x, y, w, h) {
                sd.use();
                sd.N_x(x);
                sd.N_y(y);
                sd.N_w(w);
                sd.N_h(h);
                sd.set(ui.uniforms);
                sd.draw(b);
            };
            return sd;
        };
        ui.rect = rect;

        // |  text
        // \____________________________________________/
        function text(g) {

            const n = new ui.Node();
            n._t = text;
            n.$$ = function () {
                const ol = n._n; // text length

                const t = n.t; // text

                const m = t && t.length || 0;
                let l = 0;
                for (var i = 0; i < m; i++) {
                    var c = t.charCodeAt(i);
                    if (c > 32) l++;
                }
                n._n = l;
                // compile shaders
                n.w = 0;
                n.h = 0;

                const sh = ui.gl.getShader(text.sd, n);

                ui.alloc(n, sh);

                if (!n._v) return;

                const v = n._v.e; // element array
                const a = v.a;
                const s = v.s; // stride
                let o = n._s * s * v.l; // offset

                const b = n.b; // bitmap font
                if (!b) throw new Error('missing font on textnode');

                const floor = Math.floor;
                let x = 0;
                let y = 0;
                let w = 0;
                for (var i = 0; i < m; i++) {
                    var c = t.charCodeAt(i);
                    if (c > 32) {
                        const d = c - b.s;
                        const wn = b.m[d] + 2 * b.xp;
                        const x2 = x + wn / ui.gl.ratio;
                        const y2 = y + b.g / ui.gl.ratio;

                        const tx1 = (d % b.b * b.g - b.xp) / b.w;
                        const ty1 = floor(d / b.b) * b.g / b.h;
                        const tx2 = tx1 + wn / b.w;
                        const ty2 = ty1 + b.g / b.h;

                        a[o] = x, a[o + 1] = y, a[o + 2] = tx1, a[o + 3] = ty1, o += s;
                        a[o] = x2, a[o + 1] = y, a[o + 2] = tx2, a[o + 3] = ty1, o += s;
                        a[o] = x, a[o + 1] = y2, a[o + 2] = tx1, a[o + 3] = ty2, o += s;
                        a[o] = x2, a[o + 1] = y, a[o + 2] = tx2, a[o + 3] = ty1, o += s;
                        a[o] = x2, a[o + 1] = y2, a[o + 2] = tx2, a[o + 3] = ty2, o += s;
                        a[o] = x, a[o + 1] = y2, a[o + 2] = tx1, a[o + 3] = ty2, o += s;

                        x += b.c[d] / ui.gl.ratio;
                    } else if (c == 10) {
                        y += b.g / ui.gl.ratio, x = 0;
                    } else if (c == 32) {
                        x += b.m[0] / ui.gl.ratio;
                    } else if (c == 9) x += 3 * b.m[0] / ui.gl.ratio;
                    if (x > w) w = x;
                }
                // store width and height
                n.w = ui.text.pos(n, m).x, n.h = y + b.p / ui.gl.ratio;
                n._v.up = 1;

                if (n._v.c) text.set(n._v.c, n._s, l, 0, 1);

                ui.update(n);
            };

            if (g) n.set(g);

            return n;
        }

        text.clear = function (n) {
            text.set(n._v.e, n._s, n._i, 0, 0);
            n._v.up = 1;
        };

        text.set = function (v, i, l, z, d) {
            const a = v.a;
            const s = v.s; // stride
            let o = i * s * v.l; // offset
            for (let j = 0; j < l; j++) {
                a[o] = z, a[o + 1] = z, o += s;
                a[o] = d, a[o + 1] = z, o += s;
                a[o] = z, a[o + 1] = d, o += s;
                a[o] = d, a[o + 1] = z, o += s;
                a[o] = d, a[o + 1] = d, o += s;
                a[o] = z, a[o + 1] = d, o += s;
            }
        };

        text.sd = ui.shader({
            a: { c: 'vec2', e: 'vec4' },
            v: 'vec4(((n._x+e.x+l.x)/s.x)*2.-1.,1.-((n._y+e.y+l.y)/s.y)*2.,0,1.)',
            f: 'font',
            l: 6,
            m: ui.gl.TRIANGLES
        });

        text.pos = function (n, l, cb) {
            // node, pos, callback
            if (!n.t) return { x: 0, y: 0 };
            if (l == -1) l = n.t.length;
            const b = n.b; // bitmap font
            let x = 0;
            let y = 0;
            let w = 0;
            const t = n.t;
            const ratio = ui.gl.ratio;
            for (let i = 0; i < l; i++) {
                if (cb && cb(i, x / ratio, y / ratio)) break;
                const c = t.charCodeAt(i);
                if (c > 32) {
                    const d = c - b.s;
                    w = b.m[d] + 2 * b.xp;
                    x += b.c[d];
                } else if (c == 10) {
                    y += b.p, x = 0;
                } else if (c == 32) {
                    x += b.m[0];
                } else if (c == 9) x += 3 * b.m[0];
            }
            return { x: x / ratio, y: y / ratio };
        };
        ui.text = text;

        // |  edge
        // \____________________________________________/
        function edge(g) {
            const n = new ui.Node();
            n._t = edge;

            n.x_ = 'n.x + n.mx';
            n.y_ = 'n.y + n.my';
            n.w_ = 'n.w - 2*n.mx';
            n.h_ = 'n.h - 2*n.my';

            n.$$ = function () {

                const sh = ui.gl.getShader(edge.sd, n);

                ui.alloc(n, sh);

                if (!n._v) return;
                // 0     1
                //   4 5
                //   7 6
                // 3     2
                var v = n._v.e;
                var a = v.a; // array
                var s = v.s; // stride
                var o = n._s * v.l * s; // offset
                a[o] = 0, a[o + 1] = 0, a[o + 2] = 0, a[o + 3] = 0, o += s;
                a[o] = 1, a[o + 1] = 0, a[o + 2] = 0, a[o + 3] = 0, o += s;
                a[o] = 1, a[o + 1] = 1, a[o + 2] = 0, a[o + 3] = 0, o += s;
                a[o] = 0, a[o + 1] = 1, a[o + 2] = 0, a[o + 3] = 0, o += s;

                a[o] = 0, a[o + 1] = 0, a[o + 2] = 1, a[o + 3] = 1, o += s;
                a[o] = 1, a[o + 1] = 0, a[o + 2] = -1, a[o + 3] = 1, o += s;
                a[o] = 1, a[o + 1] = 1, a[o + 2] = -1, a[o + 3] = -1, o += s;
                a[o] = 0, a[o + 1] = 1, a[o + 2] = 1, a[o + 3] = -1, o += s;

                // indices
                var v = n._v.i;
                var a = v.a;
                var o = n._s * v.i;
                const i = n._s * v.l;
                a[o++] = i + 0, a[o++] = i + 4, a[o++] = i + 1;
                a[o++] = i + 1, a[o++] = i + 4, a[o++] = i + 5;
                a[o++] = i + 5, a[o++] = i + 6, a[o++] = i + 1;
                a[o++] = i + 1, a[o++] = i + 6, a[o++] = i + 2;
                a[o++] = i + 7, a[o++] = i + 3, a[o++] = i + 6;
                a[o++] = i + 6, a[o++] = i + 3, a[o++] = i + 2;
                a[o++] = i + 0, a[o++] = i + 3, a[o++] = i + 4;
                a[o++] = i + 4, a[o++] = i + 3, a[o++] = i + 7;

                var v = n._v.c; // view
                if (v) {
                    var a = v.a;
                    var s = v.s; // stride
                    var o = n._s * v.l * s; // offset
                    a[o] = 0, a[o + 1] = 0, o += s;
                    a[o] = 1, a[o + 1] = 0, o += s;
                    a[o] = 0, a[o + 1] = 0, o += s;
                    a[o] = 1, a[o + 1] = 0, o += s;

                    a[o] = 0, a[o + 1] = 1, o += s;
                    a[o] = 1, a[o + 1] = 1, o += s;
                    a[o] = 0, a[o + 1] = 1, o += s;
                    a[o] = 1, a[o + 1] = 1, o += s;
                }
                n._v.clean = false;

                ui.update(n);
            };

            if (g) n.set(g);

            return n;
        }

        edge.sd = ui.shader({
            a: { c: 'vec2', e: 'vec4' },
            v: 'vec4(((n._x+e.x*n._w+e.z*n.mx+l.x)/s.x)*2.-1.,1.-((n._y+e.y*n._h+e.w*n.my+l.y)/s.y)*2.,0,1.)',
            f: 'vec4(0,1.,0,1.)',
            l: 8,
            i: 24,
            m: ui.gl.TRIANGLES
        });

        ui.edge = edge;
    };
});