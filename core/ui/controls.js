// | Controls |_________________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports) {

    const ui = require('./ui');
    const fn = require('./../fn');
    const cm = require('./controls_mix');

    exports.f1s = ui.gl.sfont('12px Arial');
    exports.f1p = ui.gl.pfont('12px Arial');

    // shared style functions
    const bump = 'mix(vec4(0,0,0,0), n.hc, (0.5 + 0.5 * dot(vec3(1,0,0),normal(0.001, 0.001, n.hm))))';

    // |  bumpmapped button
    // \____________________________________________/
    exports.button = function (g) {
        // parts
        const btn = ui.rect();
        const txt = ui.text();
        txt._parent = btn;

        // behaviorw
        cm.button(btn);

        // style
        const bu = '0.3*pow(sin(c.x*P*0.999),(1+4*n.i1)/n.w)*pow(sin(c.y*P*0.98),2/n.h)';
        const bd = '0.3*((1-n.i0)+1.5*(n.i0)*len(c-0.5)*pow(tsin(len(c-0.5)*5-n.i0),1))*pow(sin(c.x*P*0.999),(1+40*n.i1)/n.w)*pow(sin(c.y*P*0.98),2/n.h)';
        btn.f = bump;
        txt.f = 'sfont(t.deftbg, t.dlgtxt)';
        btn.hm = bu;
        //t.hc = 'mix(t.defbg2, t.defbg2, n.i1)'
        btn.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';

        txt.b = exports.f1s;

        // states
        btn.f_ = btn.s_ = btn.i = function () {
            txt.a1 = btn.a1 = -0.01;
        };
        btn.u_ = btn.d_ = btn.o = function () {
            txt.a1 = btn.a1 = 0.1;
        };
        btn.n_ = function () {
            btn.a0 = -0.1, btn.e0 = { hm: bu };
        };
        btn.c_ = function () {
            btn.a0 = 0.01, btn.e0 = 0, btn.hm = bd;
        };

        // layout
        btn.h = 24;
        btn.y_ = 'n._y + 5';
        txt.x = 'floor(0.5*p.w - 0.5*n.w)';

        // properties
        btn.alias('t', txt);
        btn.calc('w', function () {
            return ui.text.pos(txt, -1).x + 20;
        });
        btn.set(g);

        return btn;
    };

    // |  hiding vertical scrollbar
    // \____________________________________________/
    exports.vScrollHider = function (g) {
        'no tracegl';
        // parts

        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;
        b.e = k.e = exports.el;

        // behavior
        cm.scroll(b, k, 1);

        // style
        b.f = 'vec4(0,0,0,0)';

        b.shape = k.shape = function (vec2_v) {
            return_float(len(vec2(pow(abs(v.x), n.w / 15), pow(abs(v.y), n.h / 5))));
        };

        b.f = 'mix(vec4(0,0,0,0),vec4(.4,.4,.4,0.1-n.i1),1-smoothstep(0.6,1.0,n.shape(2*(c-.5))) )';
        k.f = 'mix(vec4(0,0,0,0),vec4(.4,.4,.4,1-n.i1),1-smoothstep(0.8,1.0,n.shape(2*(c-.5))) )';

        let hider;
        let inout;
        // states
        b.i = k.i = function () {
            b.a1 = k.a1 = -0.01;
            inout = 1;
            if (hider) clearTimeout(hider), hider = 0;
        };
        b.o = k.o = function () {
            if (hider) clearTimeout(hider);
            hider = setTimeout(function () {
                hider = 0;
                b.a1 = k.a1 = 0.5;
                ui.redraw(b);
            }, 1000);
            inout = 0;
            //b.a1 = k.a1 = 0.1;inout = 0
        };
        k.n_ = function () {
            k.a0 = -0.3;
        };
        k.c_ = function () {
            k.a0 = 0.05, k.e0 = 0;
        };

        // when scrolling we should show and fade out
        b.move = function () {
            if (inout) return;
            if (hider) {
                clearTimeout(hider);
            } else {
                b.a1 = k.a1 = -0.1;
            }
            hider = setTimeout(function () {
                hider = 0;
                b.a1 = k.a1 = 0.5;
                ui.redraw(b);
            }, 1000);
        };

        // layout
        k.x = '0';
        k.dh = '(p.h_ - 2 - n.cs) * clamp(n.pg / n.ts, 0, 1)';
        k.y = 'floor(1 + (n.mv / n.ts) * (p.h - 2 - max(0,30 - n.dh)))';
        k.w = 'p.w_';
        k.h = 'max(n.dh, 30)';
        b.x = 'p.w_ - 10';
        b.w = '10';
        b._x = 'p._x + n.x'; // disconnect scrollbar from padding
        b._y = 'p._y + n.y'; // disconnect scrollbar from padding

        // properties
        b.set(g);

        return b;
    };

    // |  horizontal scrollbar
    // \____________________________________________/
    exports.hScrollHider = function (g) {
        'no tracegl';
        // parts

        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;

        // behavior
        cm.scroll(b, k);

        // style
        // style
        b.f = 'vec4(0,0,0,0)';
        b.shape = k.shape = function (vec2_v) {
            return_float(len(vec2(pow(abs(v.x), n.w / 5), pow(abs(v.y), n.h / 20))));
        };
        b.f = 'mix(vec4(0,0,0,0),vec4(.5,.5,.5,0.1-n.i1),1-smoothstep(0.8,1.0,n.shape(2*(c-.5))) )';
        k.f = 'mix(vec4(0,0,0,0),vec4(.5,.5,.5,1-n.i1),1-smoothstep(0.8,1.0,n.shape(2*(c-.5))) )';

        let hider;
        let inout;
        // states
        b.i = k.i = function () {
            b.a1 = k.a1 = -0.01;
            inout = 1;
            if (hider) clearTimeout(hider), hider = 0;
        };
        b.o = k.o = function () {
            if (hider) clearTimeout(hider);
            hider = setTimeout(function () {
                hider = 0;
                b.a1 = k.a1 = 0.5;
                ui.redraw(b);
            }, 1000);
            inout = 0;
            //b.a1 = k.a1 = 0.1;inout = 0
        };
        k.n_ = function () {
            k.a0 = -0.3;
        };
        k.c_ = function () {
            k.a0 = 0.05, k.e0 = 0;
        };

        // when scrolling we should show and fade out
        b.move = function () {
            if (inout) return;
            if (hider) {
                clearTimeout(hider);
            } else {
                b.a1 = k.a1 = -0.1;
            }
            hider = setTimeout(function () {
                hider = 0;
                b.a1 = k.a1 = 0.5;
                ui.redraw(b);
            }, 1000);
        };

        // layout
        k.y = '0';
        k.x = '1 + (n.mv / n.ts) * (p.w - 2)';
        k.h = 'p.h_';
        k.w = '(p.w_ - 2) * clamp(n.pg / n.ts, 0, 1)';
        b.y = 'p.h_ - 10';
        b.h = '10';
        b._x = 'p._x + n.x'; // disconnect scrollbar from padding
        b._y = 'p._y + n.y'; // disconnect scrollbar from padding
        // properties
        b.set(g);

        return b;
    };
    // |  vertical scrollbar
    // \____________________________________________/
    exports.vScroll = function (g) {
        // parts
        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;
        b.e = k.e = exports.el;

        // behavior
        cm.scroll(b, k, 1);

        // style
        b.f = 'mix(t.defbg2,t.dlgbg,0.3+0.03*snoise2(vec2(c.x*n.w*0.5,c.y*n.h*0.5)))';
        k.f = bump;
        const bu = 'pow(sin(c.x*P*0.999),1/n.w) * pow(sin(c.y*P*0.999),1/n.h)';
        const bd = 'pow(sin(c.x*P*0.999),1/n.w) * pow(sin(c.y*P*0.999),1/n.h) + sin((c.y-0.5)*P*(n.i0))';
        b.hm = bd;
        k.hm = bu;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        k.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';

        // states
        k.i = function () {
            k.a1 = -0.1;
        };
        k.o = function () {
            k.a1 = 0.5;
        };
        k.n_ = function () {
            k.a0 = -0.3, k.e0 = { hm: bu };
        };
        k.c_ = function () {
            k.a0 = 0.05, k.e0 = 0, k.set({ hm: bd });
        };

        // layout
        k.x = '1';
        k.dh = '(p.h_ - 2 - n.cs) * clamp(n.pg / n.ts, 0, 1)';
        k.y = 'floor(1 + (n.mv / n.ts) * (p.h - 2 - max(0,30 - n.dh)))';
        k.w = 'p.w_ - 2';
        k.h = 'max(n.dh, 30)';
        b.x = 'p.w_ - 10';
        b.w = '10';
        b._x = 'p._x + n.x'; // disconnect scrollbar from padding
        b._y = 'p._y + n.y'; // disconnect scrollbar from padding

        // properties
        b.set(g);

        return b;
    };

    // |  horizontal scrollbar
    // \____________________________________________/
    exports.hScroll = function (g) {
        // parts
        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;

        // behavior
        cm.scroll(b, k);

        // style
        b.f = 'mix(t.defbg2,t.dlgbg,0.3+0.03*snoise2(vec2(c.x*n.w*0.5,c.y*n.h*0.5)))';
        k.f = bump;
        const bu = 'pow(sin(c.x*P*0.999),3/n.w) * pow(sin(c.y*P*0.999),1/n.h)*0.15';
        const bd = 'pow(sin(c.x*P*0.999),3/n.w) * pow(sin(c.y*P*0.999),1/n.h)*0.15 + sin((c.y-0.5)*P*(n.i0))';
        b.hm = bd;
        k.hm = bu;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        k.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';

        // states
        k.i = function () {
            k.a1 = -0.1;
        };
        k.o = function () {
            k.a1 = 0.5;
        };
        k.n_ = function () {
            k.a0 = -0.3, k.e0 = { hm: bu };
        };
        k.c_ = function () {
            k.a0 = 0.05, k.e0 = 0, k.set({ hm: bd });
        };

        // layout
        k.y = '1';
        k.x = '1 + (n.mv / n.ts) * (p.w - 2)';
        k.h = 'p.h_ - 2';
        k.w = '(p.w_ - 2) * clamp(n.pg / n.ts, 0, 1)';
        b.y = 'p.h_ - 10';
        b.h = '10';
        b._x = 'p._x + n.x'; // disconnect scrollbar from padding
        b._y = 'p._y + n.y'; // disconnect scrollbar from padding
        // properties
        b.set(g);

        return b;
    };

    // |  hv scrollbar filler
    // \____________________________________________/
    exports.hvFill = function (g) {
        const b = ui.rect();

        b.f = 'mix(t.defbg2,t.dlgbg,0.3+0.03*snoise2(vec2(c.x*n.w*0.5,c.y*n.h*0.5)))';
        b._x = 'p._x + n.x'; // disconnect scrollbar from padding
        b._y = 'p._y + n.y'; // disconnect scrollbar from padding
        b.set(g);
        return b;
    };

    // | hv scroll mixin
    // \____________________________________________/
    exports.hvScroll = function (b) {
        //vertical scrollbar
        const v = b._v_ || (b._v_ = exports.vScroll());
        v._b = b; // use front list
        v.l = 1;
        v._z = Infinity;
        // horiz scrollbar
        const h = b._h_ || (b._h_ = exports.hScroll());
        h._b = b; // use front list
        h.l = 1;
        h._z = Infinity;

        const sw = 10; // scrollbar width

        // scroll corner
        const c = exports.hvFill({ x: `p.w_ - ${sw}`, y: `p.h_ - ${sw}`, w: sw, h: sw });
        c._b = b;
        c.l = 1;

        function cv() {
            // compute view
            const y = b.eval('h');
            const x = b.eval('w');
            v.pg = y;
            v.ts = b.vSize + sw;
            h.pg = x;
            h.ts = b.hSize + sw;
            var m = fn.clamp(v.mv, 0, fn.max(b.vSize - y, 0));
            if (v.mv != m) v.ds(m - v.mv);
            var m = fn.clamp(h.mv, 0, fn.max(b.hSize - x, 0));
            if (h.mv != m) h.ds(m - h.mv);
        }

        b.v_ = cv;

        b.mark = 1;
        b.s = function () {
            v.ds(ui.mv);
            h.ds(ui.mh);
        };
        v.c = function () {
            b.vScroll = Math.round(-v.mv);
            ui.redraw(b);
        };
        v.h = `p.h_ - ${sw}`;
        h.w = `p.w_ - ${sw}`;
        h.c = function () {
            b.hScroll = Math.round(-h.mv);
            ui.redraw(b);
        };
        b.hScroll = 0;
        b.vScroll = 0;
        b.hSize = 0;
        b.vSize = 0;
        b.x_ = 'n._x + n.hScroll'; // scroll padded
        b.y_ = 'n._y + n.vScroll'; // scroll padded
    };

    // |  vertical slider
    // \____________________________________________/
    exports.vSlider = function (g) {
        // parts
        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;

        // behavior
        cm.slider(b, k, true);

        // style
        k.f = bump;
        b.f = 'mix( vec4(0,0,0,0),black, (pow(sin(c.x*P),n.w*4)) )';
        const bu = '0.75*pow(sin(c.x*P*0.999),(10 + 50*n.i1)/n.w) * pow(sin(c.y*P*0.999),10/n.h)';
        const bd = '0.75*((1-n.i0)+0.5*(n.i0)*len(c-0.5)*pow(tsin(len(c-0.5)*5-n.i0),1))*pow(sin(c.x*P*0.999),(10 + 50*n.i1)/n.w)*pow(sin(c.y*P*0.999),10/n.h)';
        k.hm = bu;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        k.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';

        // states
        k.f_ = k.i = function () {
            k.a1 = -0.01;
        };
        k.u_ = k.o = function () {
            k.a1 = 0.1;
        };
        k.n_ = function () {
            k.a0 = -0.1, k.e0 = { hm: bu };
        };
        k.c_ = function () {
            k.a0 = 0.01, k.e0 = 0, k.set({ hm: bd });
        };

        // layout
        k.x = '0';
        k.y = '(n.mv) * (p.h - n.h)';
        k.w = 'p.w';
        k.h = 'p.w*0.5';
        b.w = 20;
        b._x = 'p.x_ + n.x + 5';
        b.mv = 0;
        // properties
        b.set(g);

        return b;
    };

    // |  horizontal slider
    // \____________________________________________/
    exports.hSlider = function (g) {
        // parts
        const b = ui.rect();
        const k = ui.rect();
        k._parent = b;

        // behavior
        cm.slider(b, k, false);

        // style
        k.f = bump;
        b.f = 'mix( vec4(0,0,0,0),black, (pow(sin(c.y*P),n.h*4)) )';
        const bu = '0.75*pow(sin(c.x*P*0.999),(10 + 10*n.i1)/n.w) * pow(sin(c.y*P*0.999),10/n.h)';
        const bd = '0.75*((1-n.i0)+0.5*(n.i0)*len(c-0.5)*pow(tsin(len(c-0.5)*5-n.i0),1))*pow(sin(c.x*P*0.999),(10 + 10*n.i1)/n.w)*pow(sin(c.y*P*0.999),10/n.h)';
        k.hm = bu;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        k.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';

        // states
        k.f_ = k.i = function () {
            k.a1 = -0.01;
        };
        k.u_ = k.o = function () {
            k.a1 = 0.1;
        };
        k.n_ = function () {
            k.a0 = -0.1, k.e0 = { hm: bu };
        };
        k.c_ = function () {
            k.a0 = 0.01, k.e0 = 0, k.set({ hm: bd });
        };

        // layout
        k.y = 0;
        k.x = '(n.mv) * (p.w - n.w)';
        k.w = 'p.h*0.5';
        k.h = 'p.h';
        b.h = 20;
        b._x = 'p.x_ + n.x + 5';
        b.mv = 0;
        // properties
        b.set(g);

        return b;
    };

    // |  item
    // \____________________________________________/
    exports.item = function (t) {
        const g = fn.named(arguments);
        // parts
        const b = ui.rect();
        var t = ui.text();
        t._parent = b;

        // style
        const sb = 'mix(t.deftxt,t.selbg,n.i0)'; // selected base
        const nb = 't.defbg'; // normal base
        const st = 'sfont( mix(t.deftxt,t.selbg,n.i0), t.seltxt)'; // selected text
        const nt = 'sfont(t.defbg, t.deftxt)'; // normal text
        b.f = nb;
        t.f = nt;
        t.b = exports.f1s;

        // states
        b.p = function () {};
        b.s_ = function () {
            b.set({ f: sb }), t.set({ f: st });
        };
        b.d_ = function () {
            b.set({ f: nb }), t.set({ f: nt });
        };
        b.f_ = function () {
            b.a0 = t.a0 = 0.1;
        };
        b.u_ = function () {
            b.a0 = t.a0 = -0.1;
        };

        // layout
        b.h = t.b.p + 6;
        b.x_ = 'n._x + 3';
        b.y_ = 'n._y + 2';

        // properties
        b.alias('t', t);
        b.set(g);

        return b;
    };

    // |  label
    // \____________________________________________/
    exports.label = function (g) {
        const t = ui.text();
        t.f = 'sfont(t.defbg, t.deftxt)'; // text frag shader
        t.b = exports.f1s; // text bitmap
        t.set(g);
        return t;
    };

    // |  label centered
    // \____________________________________________/
    exports.labelc = function (g) {
        const t = ui.text();
        t.f = 'sfont(t.defbg, t.deftxt)'; // text frag shader
        t.b = exports.f1s; // text bitmap
        t.x = 'ceil(0.5*p.w - 0.5*n.w)'; // center
        t.set(g);
        return t;
    };

    // |  list
    // \____________________________________________/
    exports.list = function (g) {
        // parts
        const b = ui.rect();
        const v = b._v_ = exports.vscroll();
        v._b = b; // use front list
        b.l = v.l = 1; // both are layers

        // behavior
        cm.list(b);
        cm.select(b);

        // styling
        b.f = 't.defbg';

        // states / scrolling
        b.ys = 0;
        v.mv = 0;
        v.c = function () {
            b.ys = Math.round(-v.mv);
        };

        // layout
        b.y_ = 'n._y + n.ys'; // scroll padded
        v._y = 'p._y + n.y'; // disconnect scrollbar from padding

        b.set(g);

        return b;
    };

    // |  edit
    // \____________________________________________/
    exports.edit = function (g) {
        // parts
        const b = ui.rect(); // base
        const t = ui.text(); // text
        const c = ui.rect(); // cursor
        const s = ui.rect(); // selection
        const m = ui.text(); // marked text
        let e; // empty text
        t._parent = c._parent = s._parent = b;
        m._parent = s;
        b.l = 1;
        c.l = 1;
        c._z = 10;

        c.w = '1';
        c.h = '15';
        c.f = 'mix(vec4(1,1,1,1),vec4(1,1,1,0),n.i0)';
        s.f = 'mix(vec4(1,1,1,1),vec4(0.5,0.5,0.5,1),n.i0)';
        s.w = 0;
        s.h = 15;

        b.f = bump;
        b.h = 24;

        const bw = '1-0.5*pow(sin(c.x*P*0.9),1/n.w)*pow(sin(c.y*P*0.9),1/n.h)';
        b.hm = bw;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i0)';

        let bl;
        let foc;
        b.f_ = function () {
            foc = 1;
            m.a0 = -0.05;
            s.a0 = -0.05;
            c.a0 = -0.05;
            b.a0 = -0.1;
            if (e) {
                e.hide();
            }
        };
        b.u_ = function () {
            // hide cursor
            foc = 0;
            m.a0 = 0.05;
            s.a0 = 0.05;
            c.a0 = 0.05;
            b.a0 = 0.1;
            if (e) {
                if (b.t.length) {
                    e.hide();
                } else {
                    e.show();
                }
            }
        };
        b.xs = 0;
        b.ys = 0;
        b.y_ = 'n._y + 6 + n.ys';
        b.x_ = 'n._x + 5 + n.xs';

        m.b = exports.f1s;
        t.b = exports.f1s;
        t.f = 'sfont( t.defbg, t.deftxt)';
        m.f = 'sfont2( mix(vec4(1,1,1,1),vec4(0.5,0.5,0.5,1),n.i0), vec4(0,0,0,1), 1.0)';

        cm.edit(b, t, c, s, m);
        // add a cursor over the text
        b.alias('t', t, function () {
            if (e) {
                if (b.t.length) {
                    e.hide();
                } else if (!foc) e.show();
            }
        });
        b.set(g);

        // empty text
        if (b.empty) {
            e = ui.text();
            e._parent = b;
            e.l = 1;
            e.x = 2;
            e.b = exports.f1s;
            e.f = 'sfont( t.defbg, t.deftxt*0.75)';
            e.t = b.empty;
        }

        return b;
    };

    // |  combobox
    // \____________________________________________/
    exports.comboBox = function (g) {
        const e = exports.edit();
    };

    // |  dropshadow
    // \____________________________________________/
    exports.dropShadow = function (g) {
        // add dropshadow
        const e = ui.edge();
        e.set(g);
        const r = e.radius || 10;
        e._x = `p._x - (${r})`;
        e._y = `p._y - (${r})`;
        e._w = `p._w + (${2 * r})`;
        e._h = `p._h + (${2 * r})`;
        e.l = 1;
        e.mx = r;
        e.my = r;
        e.stepa = e.stepa || 0;
        e.stepb = e.stepb || 1;
        e.inner = e.inner || 'vec4(0,0,0,0.5)';
        e.outer = e.outer || 'vec4(0,0,0,0)';
        e.f = `mix(${e.inner},${e.outer},smoothstep(${e.stepa},${e.stepb},len(vec2(pow(abs(2*((f.x-n._x)/n._w-.5)),n._w/30),pow(abs(2*((f.y-n._y)/n._h-.5)),n._h/30)))))`;

        return e;
    };

    // |  dropshadow
    // \____________________________________________/
    exports.innerShadow = function (g) {
        // add dropshadow
        const e = ui.edge();
        e.set(g);
        const r = e.radius || 10;
        e.l = 1;
        e.mx = r;
        e.my = r;
        e.stepa = e.stepa || 0;
        e.stepb = e.stepb || 1;
        e.inner = e.inner || 'vec4(0,0,0,0.5)';
        e.outer = e.outer || 'vec4(0,0,0,0)';
        e.f = `mix(${e.inner},${e.outer},smoothstep(${e.stepa},${e.stepb},len(vec2(pow(abs(2*((f.x-n._x)/n._w-.5)),n._w/30),pow(abs(2*((f.y-n._y)/n._h-.5)),n._h/30)))))`;

        return e;
    };

    // |  window
    // \____________________________________________/
    exports.window = function (g) {
        // parts
        const b = ui.rect();
        const c = ui.rect();
        const t = ui.text();
        const d = exports.dropShadow();
        c._parent = b;
        d._parent = b;
        t._parent = c;

        b.l = 1;

        b.minw = 200;
        b.minh = 100;

        // behavior
        cm.drag(b, c);
        cm.resize(b);

        // style
        b.f = bump;
        c.f = bump;
        const bw = 'pow(sin(c.x*P*0.999),2/n.w)*pow(sin(c.y*P*0.99),2/n.h)';
        const bc = 'pow(sin(c.x*P*0.999),2/n.w)*pow(sin(c.y*P*0.98),2/n.h)+(n.i0)*0.01*(sin((c.y-0.5)*n.h*n.i0*1))';
        const bu = 'pow(sin(c.x*P*0.999),2/n.w)*pow(sin(c.y*P*0.98),2/n.h)';
        c.hm = bu;
        c.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        b.hm = bw;
        b.hc = 'mix(t.dlghi, t.dlgbg, n.i1)';
        t.f = 'sfont(t.defbg, t.deftxt)';
        t.b = exports.f1s;

        // interaction
        c.i = function () {
            c.a1 = -0.1;
        };
        c.o = function () {
            c.a1 = 0.3;
        };
        c.n_ = function () {
            c.a0 = -0.3, c.e0 = { hm: bu };
        };
        c.c_ = function () {
            c.a0 = 0.05, c.e0 = 0, c.set({ hm: bc }), ui.top(b);
        };

        // layout
        c._x = 'p._x';
        c._y = 'p._y';
        c._w = 'p._w';
        c.h = 30;
        c.x_ = 'n._x + 10';
        c.y_ = 'n._y + 6';

        b.y_ = 'n._y + 40';
        b.x_ = 'n._x + 10';
        b.w_ = 'n._w - 20';
        b.h_ = 'n._h - 50';

        b.alias('t', t);
        b.set(g);

        return b;
    };

    // |  hsplit
    // \____________________________________________/

    exports.hSplit = function (g) {
        // parts
        const b = ui.group();
        b.l = 1;
        const d = ui.rect();
        d._b = b;
        d.l = 1;
        d.w = 5;
        b.minw = 50;

        // styling
        d.f = 'mix(mix(t.dlghi,t.splitter1,n.i1),mix(t.splitter3,t.splitter2,n.i0),pow(sin(c.x*P),0.8))';

        //states
        d.f_;
        d.i = function () {
            d.a1 = -0.01;
            ui.cursor('ew-resize');
        };
        d.u_ = d.o = function () {
            d.a1 = 0.1;
            ui.cursor('default');
        };
        d.n_ = function () {
            d.a0 = 0.1;
        };
        d.c_ = function () {
            d.a0 = -0.01;
        };

        // apply behavior
        cm.hSplit(b, d);
        b.set(g);

        return b;
    };

    // |  vsplit
    // \____________________________________________/

    exports.vSplit = function (g) {
        // parts
        const b = ui.group();
        b.l = 1;
        const d = ui.rect();
        d._b = b;
        d.l = 1;
        d.h = 5;
        b.minh = 50;

        // styling
        d.f = 'mix(mix(t.dlghi,t.splitter1,n.i1),mix(t.splitter3,t.splitter2,n.i0),pow(sin(c.y*P),0.8))';

        // states
        d.f_;
        d.i = function () {
            d.a1 = -0.01;
            ui.cursor('ns-resize');
        };
        d.u_ = d.o = function () {
            d.a1 = 0.1;
            ui.cursor('default');
        };
        d.n_ = function () {
            d.a0 = 0.1;
        };
        d.c_ = function () {
            d.a0 = -0.01;
        };
        // apply behavior
        cm.vSplit(b, d);
        b.set(g);

        return b;
    };
    // |  fold
    // \____________________________________________/
    exports.fold = function (g) {
        // +- icon tree icon
        return ui.rect(function (n) {
            n.y = 20;
            n.w = 15;
            n.h = 15;
            n.f = '' + 'mix(vec4(0,0,0,0),white,' + 'clamp(pow(pow((1-2*len(c-0.5)),1.0)*(pow(sin(c.x*P),88)*ts(2)+pow(sin(c.y*P),88))*0.5+0.8,4)-0.75,0,1)+' + '0.7*pow(sin(P*len(vec2(pow(2*(c.x-0.5),2),pow(2*(c.y-0.5),2))) -0.3-0.5*ts(2)),4)' + ')';
        });
    };

    // |  c9
    // \____________________________________________/
    exports.ico_c9 = function (g) {
        return ui.rect(function (n) {
            n.y = 300;
            n.w = 100;
            n.h = 100;
            n.f = '' + 'mix(vec4(0,0,0,0),white,' + '(1-clamp(pow(5*len(c-0.5-vec2(-0.25*ts(1),0)),30*ts(1)),0,1) * ' + 'clamp(pow(5*len(c-0.5-vec2(+0.25*ts(1),0)),30*ts(1)),0,1) *  ' + 'clamp(pow(5*len(c-0.5-vec2(0,-.17*pow(ts(1),4))),30*ts(1)),0,1) *' + 'clamp(pow(5*len(c-0.5-vec2(0,0)),30*ts(1)),0,1) *' + 'clamp(pow(5*len(c-0.5-vec2(-.12*ts(1),0)),30*ts(1)),0,1) *' + 'clamp(pow(5*len(c-0.5-vec2(+.12*ts(1),0)),30*ts(1)),0,1))' + ')';
        });
    };

    // |  horizontal slides with kb nav
    // \____________________________________________/
    exports.slides = function (g) {
        const b = ui.group();

        const fnt_big = ui.gl.pfont('55px Monaco');
        const fnt_med = ui.gl.pfont('30px Monaco');

        //| our slide template
        b.slide = function (g) {
            const n = ui.rect();
            n.l = 1;
            n.b = fnt_big;
            n.f = 'mix(black,gray,c.y);';

            //| part templates
            n.title = function (t, y) {
                const g = fn.named(arguments);
                const n = ui.text();
                n.x = '0.5*p.w - 0.5*n.w'; // center
                n.y = 5;
                n.b = fnt_big;
                n.f = 'font * white';
                n.set(g);
                return n;
            };

            let bc = 0;
            //| bullet
            n.bullet = function (t, y) {
                const g = fn.named(arguments);
                const n = ui.text();
                n.x = '0.5*p.w - 0.5*800 + 20';
                n.y = '0.5*p.h - 0.5*600 + 20 + n.yv*40';
                n.yv = bc++;
                n.b = fnt_med;
                n.f = 'font * white';
                n.set(g);
                return n;
            };

            // picture frame
            n.pic = function (g) {
                const n = ui.rect();
                n.x = '0.5*p.w - 0.5*n.w';
                n.y = '0.5*p.h - 0.5*n.h';
                n.w = 800;
                n.h = 600;
                n.set(g);
                return n;
            };
            n.set(g);
            return n;
        };
        cm.slides(b);
        b.set(g);

        return b;
    };
});
