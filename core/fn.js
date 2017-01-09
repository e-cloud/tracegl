// | Function, utility lib|_____________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function () {

    if (console.log.bind) {
        var fn = console.log.bind(console)
    } else {
        var fn = function () {
            let s = '';
            for (let i = 0; i < arguments.length; i++) {
                s += (s ? ', ' : '') + arguments[i]
            }
            console.log(s)
        }
    }

    fn.list = list
    fn.stack = stack

    fn.ps = ps

    fn.wait = wait
    fn.repeat = repeat
    fn.events = events

    fn.dt = dt
    fn.mt = mt
    fn.sha1hex = sha1hex
    fn.rndhex = rndhex
    fn.tr = tr
    fn.dump = dump
    fn.walk = walk

    fn.min = min
    fn.max = max
    fn.clamp = clamp
    fn.nextpow2 = nextpow2

    fn.named = named

    // |  named arguments
    // \____________________________________________/
    function named(a, f) {
        const t = typeof a[0];
        if (t == 'function' || t == 'object') return t
        if (!f) f = named.caller
        if (!f._c) f._c = f.toString()
        if (!f._n) f._n = f._c.match(/function.*?\((.*?)\)/)[1].split(',')
        const n = f._n;
        if (a.length > n.length) throw new Error("Argument list mismatch, " + a.length + " instead of " + n.length)
        const g = {};
        for (let i = 0, j = a.length; i < j; i++) {
            g[n[i]] = a[i]
        }
        return g
    }


    // |  left right linked list
    // \____________________________________________/
    function list(l, r) {
//		var u // unique id/
//		var f // free slot
        let begin; // begin
        let end; // end

        function li() {
            return li.fn.apply(0, arguments)
        }

        li.fn = function (a) {
            if (arguments.length > 1) {
                let rm = {};
                for (let i = 0, j = arguments.length; i < j; i++) {
                    li.add(rm[i] = arguments[i])
                }
                return function () {
                    for (const i in rm) {
                        li.rm(rm[i])
                    }
                    rm = null
                }
            }
            li.add(a)
            return function () {
                if (a) li.rm(a)
                a = null
            }
        }

        let ln = 0;
        li.len = 0
        li.add = add
        li.rm = rm

        li.clear = function () {
            let n = begin;
            while (n) {
                const m = n[r];
                delete n[r]
                delete n[l]
                n = m
            }
            begin = end = undefined
            li.len = ln = 0
        }

        li.drop = function () {
            begin = end = undefined
            li.len = ln = 0
        }

        //|  add an item to the list
        function add(i) {

            if (arguments.length > 1) {
                for (const i = 0, j = arguments.length; i < j; i++) {
                    add(arguments[i])
                }
                return ln
            }
            // already in list
            if (l in i || r in i || begin == i) return ln

            if (!end) {
                begin = end = i
            } else {
                end[r] = i, i[l] = end, end = i
            }

            li.len = ++ln
            if (ln == 1 && li.fill) li.fill()
            return ln
        }

        //|  add a sorted item scanning from the  end
        li.sorted = function (i, s) {
            if (l in i || r in i || begin == i) return ln
            let a = end;
            while (a) {
                if (a[s] <= i[s]) { // insert after a
                    if (a[r]) {
                        a[r][l] = i, i[r] = a[r]
                    } else {
                        end = i
                    }
                    i[l] = a
                    a[r] = i
                    break
                }
                a = a[l]
            }
            if (!a) { // add beginning
                if (!end) end = i
                if (begin) i[r] = begin, begin[l] = i
                begin = i
            }

            li.len = ++ln
            if (ln == 1 && li.fill) li.fill()
            return ln
        }


        //|  remove item from the list
        function rm(i) {
            if (arguments.length > 1) {
                for (const i = 0, j = arguments.length; i < j; i++) {
                    rm(arguments[i])
                }
                return ln
            }

            let t = 0;
            if (begin == i) begin = i[r], t++
            if (end == i) end = i[l], t++
            if (i[r]) {
                if (i[l]) {
                    i[r][l] = i[l]
                } else {
                    delete i[r][l]
                }
                t++
            }
            if (i[l]) {
                if (i[r]) {
                    i[l][r] = i[r]
                } else {
                    delete i[l][r]
                }
                t++
            }
            if (!t) return
            delete i[r]
            delete i[l]

            //if(!e && f) freeid()
            li.len = --ln

            if (!ln && li.empty) li.empty()
            return ln
        }

        //|  run all items in the list
        li.run = function () {
            let n = begin;
            let t;
            let v;
            while (n) {
                v = n.apply(null, arguments), t = v !== undefined ? v : t, n = n[r]
            }
            return t
        }

        //|  iterate over all items
        li.each = function (c) {
            let n = begin;
            let j = 0;
            let t;
            while (n) {
                const x = n[r];
                v = c(n, li, j)
                if (v !== undefined) t = v
                n = x, j++
            }
            return t
        }

        //|  check if item is in the list
        li.has = function (i) {
            return l in i || r in i || begin == i
        }

        li.first = function () {
            return begin
        }

        li.last = function () {
            return end
        }

        return li
    }

    // |  apply event pattern to object
    // \____________________________________________/
    function events(o) {

        o.on = function (e, f) {
            const l = this.$l || (this.$l = {});
            const a = l[e];
            if (!a) {
                l[e] = f
            } else {
                if (Array.isArray(a)) {
                    a.push(event)
                } else {
                    l[e] = [l[e], f]
                }
            }
        }

        o.off = function (e, f) {
            const l = this.$l || (this.$l = {});
            if (!l) return
            const a = l[e];
            if (!a) return
            if (Array.isArray(a)) {
                for (let i = 0; i < a.length; i++) {
                    if (a[i] == f) a.splice(i, 1), i--
                }
            }
            else if (l[e] == f) delete l[e]
        }

        o.clear = function (e, f) {
            const l = this.$l;
            if (!l) return
            delete l[e]
        }

        o.emit = function (e) {
            const l = this.$l;
            if (!l) return
            const a = l[e];
            if (!a) return
            if (arguments.length > 1) {
                const arg = Array.prototype.slice.call(arguments, 1);
                if (typeof a == 'function') {
                    a.apply(null, arg)
                } else {
                    for (var i = 0; i < a.length; i++) {
                        a[i].apply(null, arg)
                    }
                }
            } else {
                if (typeof a == 'function') {
                    a()
                } else {
                    for (var i = 0; i < a.length; i++) {
                        a[i]()
                    }
                }
            }
        }
    }

    // |  simple fixed integer stack
    // \____________________________________________/
    function stack() {
        function st() {
            return st.fn.apply(null, arguments)
        }

        st.fn = function (a) {
            if (arguments.length > 1) {
                let rm = {};
                for (var i = 0, j = arguments.length; i < j; i++) {
                    rm[push(arguments[i])] = 1
                }
                return function () {
                    for (const i in rm) {
                        st.rm(i)
                    }
                    rm = null
                }
            } else {
                var i = push(a)
                return function () {
                    if (i !== undefined) st.rm(i)
                    i = undefined
                }
            }
        }

        st.push = push
        st.shift = shift
        st.set = set
        //|  length of the stack, externals are readonly
        let b = st.beg = 1;
        let e = st.end = 1;
        let l = st.len = 0;

        //|  return item on bottom of stack
        st.bottom = function () {
            if (b == e) return null
            return st[b]
        }

        //|  item on the top of the staci
        st.top = function () {
            if (b == e) return null
            return st[e]
        }

        //|  push item to the top of the stack
        function push(a) {
            if (arguments.length > 1) {
                let r;
                for (let i = 0, j = arguments.length; i < j; i++) {
                    r = push(arguments[i])
                }
                return r
            }

            st[e++] = a, st.len = ++l
            return (st.end = e) - 1
        }

        //|  pop item from the top of the stack
        st.pop = function () {
            const p = st[e - 1];
            if (b != e) {
                delete st[e]
                while (e != b && !(e in st)) {
                    e--
                }
                if (!--l) st.beg = st.end = b = e = 1 // cancel drift
                st.len = l
            } else {
                b = e = 1, st.len = l = 0
            }
            st.end = e
            return p
        }

        //|  insert item at the bottom of the stack
        function shift(a) {
            if (arguments.length > 1) {
                let r;
                for (let i = 0, j = arguments.length; i < j; i++) {
                    r = push(arguments[i])
                }
                return r
            }

            st[--b] = a, st.len = ++l
            return st.beg = b
        }

        //|  remove item at the bottom of the stack
        st.unshift = function () {
            if (b != e) {
                delete st[b]
                while (b != e && !(b in st)) {
                    b++
                }
                if (!--l) st.beg = st.end = b = e = 1
                st.len = l
            }
            return st.beg
        }

        //|  set an item with a particular index
        function set(i, v) {
            if (arguments.length > 2) {
                let r;
                for (const i = 0, j = arguments.length; i < j; i += 2) {
                    r = add(arguments[i], arguments[i + 1])
                }
                return r
            }
            st[i] = v
            if (i < b) st.beg = b = i
            if (i >= e) st.end = e = i + 1
            return i
        }

        //|  remove item with particular index
        st.rm = function (i) {
            if (!i in st) return
            delete st[i]
            if (!--l) {
                st.len = 0
                st.beg = st.end = b = e = 1
                return i
            }
            st.len = l
            if (i == b) {
                while (b != e && !(b in st)) {
                    st.beg = ++b
                }
            }
            if (i == e) {
                while (e != b && !(e in st)) {
                    st.end = --e
                }
            }
            return i
        }

        //|  iterate over all items in the stack
        st.each = function (c) {
            let r;
            let v;
            for (let i = b; i < e; i++) {
                if (i in st) {
                    v = c(st[i], st, i)
                    if (v !== undefined) r = v
                }
            }
            return v
        }

        return st
    }

    // | create a random hex string
    // \____________________________________________/
    function rndhex(n) {
        let s = "";
        for (let i = 0; i < n; i++) {
            s += parseInt(Math.random() * 16).toString(16)
        }
        return s.toLowerCase()
    }

    // |  pubsub for all your event needs
    // \____________________________________________/
    function ps(il, ir) {

        const li = list(il || '_psl', ir || '_psr');
        const of = li.fn;
        li.fn = function (i) {
            if (arguments.length == 1 && typeof i == 'function') return of(i) // pubsub
            return li.run.apply(null, arguments) // otherwise forward the call to all
        }
        return li
    }

    // |  mersenne twister
    // |  Inspired by http://homepage2.nifty.com/magicant/sjavascript/mt.js
    // \____________________________________________/
    function mt(s, h) {
        // seed, itemarray or hash
        if (s === undefined) s = new Date().getTime();
        let p;
        let t;
        if (h) {
            p = {}
            let j = 0;
            for (var i in h) {
                p[j++] = h[i]
            }
            t = j
        }
        m = new Array(624)

        m[0] = s >>> 0
        for (var i = 1; i < m.length; i++) {
            const a = 1812433253;
            const b = (m[i - 1] ^ (m[i - 1] >>> 30));
            const x = a >>> 16;
            const y = a & 0xffff;
            const c = b >>> 16;
            const d = b & 0xffff;
            m[i] = (((x * d + y * c) << 16) + y * d) >>> 0
        }
        var i = m.length

        function nx(a) {
            let v;
            if (i >= m.length) {
                let k = 0;
                const N = m.length;
                const M = 397;
                do {
                    v = (m[k] & 0x80000000) | (m[k + 1] & 0x7fffffff)
                    m[k] = m[k + M] ^ (v >>> 1) ^ ((v & 1) ? 0x9908b0df : 0)
                }
                while (++k < N - M)
                do {
                    v = (m[k] & 0x80000000) | (m[k + 1] & 0x7fffffff)
                    m[k] = m[k + M - N] ^ (v >>> 1) ^ ((v & 1) ? 0x9908b0df : 0)
                }
                while (++k < N - 1)
                v = (m[N - 1] & 0x80000000) | (m[0] & 0x7fffffff)
                m[N - 1] = m[M - 1] ^ (v >>> 1) ^ ((v & 1) ? 0x9908b0df : 0)
                i = 0
            }

            v = m[i++]
            v ^= v >>> 11, v ^= (v << 7) & 0x9d2c5680, v ^= (v << 15) & 0xefc60000, v ^= v >>> 18
            if (a !== undefined) {
                v = ((a >>> 5) * 0x4000000 + (v >>> 6)) / 0x20000000000000
                if (p) return p[Math.round(v * ( t - 1 ))]
                return v
            }
            return nx(v)
        }

        return nx
    }

    // |  sha1
    // |  Inspired by http://www.webtoolkit.info/javascript-sha1.html
    // \____________________________________________/
    function sha1hex(m) {
        function rl(n, s) {
            return ( n << s ) | (n >>> (32 - s))
        }

        function lsb(v) {
            let s = "";
            let i;
            let vh;
            let vl;
            for (i = 0; i <= 6; i += 2) {
                vh = (v >>> (i * 4 + 4)) & 0x0f, vl = (v >>> (i * 4)) & 0x0f, s += vh.toString(16) + vl.toString(16)
            }
            return s
        }

        function hex(v) {
            let s = "";
            let i;
            let j;
            for (i = 7; i >= 0; i--) {
                j = (v >>> (i * 4)) & 0x0f, s += j.toString(16)
            }
            return s
        }

        function utf8(s) {
            s = s.replace(/\r\n/g, "\n");
            let u = "";
            const fc = String.fromCharCode;
            for (let n = 0; n < s.length; n++) {
                const c = s.charCodeAt(n);
                if (c < 128) {
                    u += fc(c)
                } else if ((c > 127) && (c < 2048)) {
                    u += fc((c >> 6) | 192), u += fc((c & 63) | 128)
                } else {
                    u += fc((c >> 12) | 224), u += fc(((c >> 6) & 63) | 128), u += fc((c & 63) | 128)
                }
            }
            return u
        }

        m = utf8(m)

        let bs;
        let i;
        let j;
        const u = new Array(80);
        let v = 0x67452301;
        let w = 0xEFCDAB89;
        let x = 0x98BADCFE;
        let y = 0x10325476;
        let z = 0xC3D2E1F0;
        let a;
        let b;
        let c;
        let d;
        let e;
        let t;
        const l = m.length;

        const wa = [];
        for (i = 0; i < l - 3; i += 4) {
            j = m.charCodeAt(i) << 24 | m.charCodeAt(i + 1) << 16 | m.charCodeAt(i + 2) << 8 | m.charCodeAt(i + 3), wa.push(j)
        }

        const r = l % 4;
        if (r == 0) {
            i = 0x080000000
        } else if (r == 1) {
            i = m.charCodeAt(l - 1) << 24 | 0x0800000
        } else if (r == 2) {
            i = m.charCodeAt(l - 2) << 24 | m.charCodeAt(l - 1) << 16 | 0x08000
        } else {
            i = m.charCodeAt(l - 3) << 24 | m.charCodeAt(l - 2) << 16 | m.charCodeAt(l - 1) << 8 | 0x80
        }

        wa.push(i)
        while ((wa.length % 16) != 14) {
            wa.push(0)
        }
        wa.push(l >>> 29)
        wa.push((l << 3) & 0x0ffffffff)

        for (bs = 0; bs < wa.length; bs += 16) {
            for (i = 0; i < 16; i++) {
                u[i] = wa[bs + i]
            }
            for (i = 16; i <= 79; i++) {
                u[i] = rl(u[i - 3] ^ u[i - 8] ^ u[i - 14] ^ u[i - 16], 1)
            }

            a = v, b = w, c = x, d = y, e = z

            for (i = 0; i <= 19; i++) {
                t = (rl(a, 5) + ((b & c) | (~b & d)) + e + u[i] + 0x5A827999) & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t
            }
            for (i = 20; i <= 39; i++) {
                t = (rl(a, 5) + (b ^ c ^ d) + e + u[i] + 0x6ED9EBA1) & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t
            }
            for (i = 40; i <= 59; i++) {
                t = (rl(a, 5) + ((b & c) | (b & d) | (c & d)) + e + u[i] + 0x8F1BBCDC) & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t
            }
            for (i = 60; i <= 79; i++) {
                t = (rl(a, 5) + (b ^ c ^ d) + e + u[i] + 0xCA62C1D6) & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t
            }

            v = (v + a) & 0x0ffffffff
            w = (w + b) & 0x0ffffffff
            x = (x + c) & 0x0ffffffff
            y = (y + d) & 0x0ffffffff
            z = (z + e) & 0x0ffffffff
        }
        return (hex(v) + hex(w) + hex(x) + hex(y) + hex(z)).toLowerCase()
    }

    // |  wait for t milliseconds
    // \____________________________________________/
    function wait(t) {
        const p = ps();
        p.empty = function () {
            clearTimeout(i)
        }
        var i = setTimeout(p, t)
        return p;
    }

    // |  repeat with an interval of t milliseconds
    // \____________________________________________/
    function repeat(t) {
        const p = ps();
        p.empty = function () {
            clearInterval(i)
        }
        var i = setInterval(p, t)
        return p;
    }

    // |  next larger power of 2
    // \____________________________________________/
    function nextpow2(x) {
        --x
        for (let i = 1; i < 32; i <<= 1) {
            x = x | x >> i
        }
        return x + 1
    }

    // |  clamp things
    // \____________________________________________/
    function clamp(a, mi, ma) {
        return a < mi ? mi : a > ma ? ma : a
    }

    // |  min
    // \____________________________________________/
    function min(a, b) {
        return a < b ? a : b
    }

    // |  max
    // \____________________________________________/
    function max(a, b) {
        return a > b ? a : b
    }

    // |  delta time helper
    // \____________________________________________/
    function dt() {
        let ci;
        if (typeof chrome !== "undefined" && typeof chrome.Interval === "function") {
            ci = new chrome.Interval
        }

        let n = now();

        function now() {
            return ci ? ci.microseconds() : Date.now()
        }

        function dt() {
            return now() - n
        }

        dt.log = function (m) {
            return console.log((m ? m : '') + (now() - n ))
        }

        dt.reset = function () {
            n = now()
        }
        return dt;
    }

    // |  quick stacktrace
    // \____________________________________________/
    function tr() {
        console.log(new Error().stack)
    }

    // |  node walker
    // \____________________________________________/
    function walk(n, sn, f) {
        const s = typeof f != 'function' && f;
        let z = 0;
        while (n && n != sn) {
            if (s) {
                if (s in n) n[s](n)
            }
            else {
                f(n, z)
            }

            if (n._c) {
                n = n._c, z++
            } else if (n._d) {
                n = n._d
            } else {
                while (n && !n._d && n != sn) {
                    n = n._p, z--
                }
                if (n) n = n._d
            }
        }
    }

    // |  dump objects to string
    // \____________________________________________/
    function dump(
      d, // dump object
      o, // options {m:99 max depth,  p:0 pack, c:0  capacity, n:1 no recursion }*/,
      s, // internal string
      z, // internal depth
      r  // internal object stack
    ) {

        if (!s) s = [], r = [], z = 0;
        o = o || {};
        let k;  // key for object enum
        let ic; // indent current string
        let ip; // indent parent string
        let nl; // newline string
        let i;  // iterator
        let l;  // length of loop
        let t;  // test variable in recurblock
        let c = s.length; // current output

        switch (typeof(d)) {
            case 'function':
            case 'object':
                if (d == null) {
                    s[c++] = "null"
                    break
                }
                if (z >= (o.m || 99)) {
                    s[c++] = "{...}"
                    break
                }
                r.push(d)

                if (o.p) {
                    ic = ic = nl = ""
                } else {
                    ic = Array(z + 2).join(' '), ip = Array(z + 1).join(' '), nl = "\n"
                }

                if (d.constructor == Array) {
                    s[c++] = "[", s[c++] = nl
                    for (k = 0; k < d.length; k++) {
                        s[c++] = ic
                        for (i = 0, t = d[k], l = r.length; i < l; i++) {
                            if (r[i] == t) break
                        }

                        var c1 = c
                        if (i == l) {
                            dump(t, o, s, z + 1, r)
                        } else {
                            s[c++] = "nested: " + i + ""
                        }

                        c = s.length
                        var c2 = c
                        console.log(c1, c2)
                        if (s.slice(c1, c2 - c1).join('').length < 50) {
                            for (var c3 = c1; c3 < c2; c3++) {
                                s[c3] = s[c3].replace ? s[c3].replace(/[\r\n\t]|\s\s/g, "") : s[c3]
                            }
                        }
                        // we check the substring length and fold if < n


                        s[c++] = ", " + nl
                    }
                    s[c - 1] = nl + ip + "]"
                } else {
                    if (typeof(d) == 'function') s[c++] = "->"
                    s[c++] = "{", s[c++] = nl

                    for (k in d) {
                        if (d.hasOwnProperty(k)) {
                            if (o.c && c > o.c) {
                                s[c++] = "<...>"
                                break
                            }
                            s[c++] = ic + (k.match(/[^a-zA-Z0-9_]/) ? "'" + k + "'" : k) + ':'
                            for (i = 0, t = d[k], l = r.length; i < l; i++) {
                                if (r[i] == t) break
                            }

                            var c1 = c
                            if (i == l) {
                                dump(t, o, s, z + 1, r)
                            } else {
                                s[c++] = "[nested: " + i + "]"
                            }

                            c = s.length

                            var c2 = c
                            if (s.slice(c1, c2).join('').length < 200) {
                                for (var c3 = c1; c3 < c2; c3++) {
                                    if (s[c3] && typeof(s[c3]) == 'string') {
                                        s[c3] = s[c3].replace(/[\r\n\t]|\s\s/g, "")
                                    }
                                }
                            }

                            s[c++] = ", " + nl
                        }
                    }
                    s[c - 1] = nl + ip + "}"
                }
                r.pop()
                break
            case 'string':
                s[c++] = "'" + d + "'"
                break
            default:
                s.push(d)
                break
        }

        return z ? 0 : s.join('')
    }

    return fn
})
