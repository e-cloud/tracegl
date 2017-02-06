// | Function, utility lib|_____________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function () {

    let fn = console.log.bind(console);

    fn.list = list;
    fn.stack = stack;

    fn.ps = pubsub;

    fn.wait = wait;
    fn.repeat = repeat;
    fn.events = events;

    fn.dt = dateTime;
    fn.mt = mersenneTwister;
    fn.sha1hex = sha1hex;
    fn.rndhex = randomHex;
    fn.tr = printStackTrace;
    fn.dump = dump;
    fn.walk = walk;

    fn.min = min;
    fn.max = max;
    fn.clamp = clamp;
    fn.nextpow2 = nextpow2;

    fn.named = convertArgumentsToObject;

    // |  named arguments
    // \____________________________________________/
    function convertArgumentsToObject(args, func) {
        const t = typeof args[0];
        if (t == 'function' || t == 'object') {
            return t;
        }
        if (!func) {
            func = convertArgumentsToObject.caller;
        }
        if (!func._child) {
            func._child = func.toString();
        }
        if (!func._n) {
            func._n = func._child.match(/function.*?\((.*?)\)/)[1].split(',');
        }
        const names = func._n;
        if (args.length > names.length) {
            throw new Error(`Argument list mismatch, ${args.length} instead of ${names.length}`);
        }
        const map = {};
        for (let i = 0, j = args.length; i < j; i++) {
            map[names[i]] = args[i];
        }
        return map;
    }

    // |  left right linked list
    // \____________________________________________/
    function list(leftId, rightId) {
        //		var u // unique id/
        //		var f // free slot
        let beginNode; // begin
        let endNode; // end

        function li(...args) {
            return li.fn.apply(0, args);
        }

        li.fn = function (a) {
            if (arguments.length > 1) {
                let rm = {};
                for (let i = 0, j = arguments.length; i < j; i++) {
                    li.add(rm[i] = arguments[i]);
                }
                return function () {
                    for (const i in rm) {
                        li.rm(rm[i]);
                    }
                    rm = null;
                };
            }
            li.add(a);
            return function () {
                if (a) {
                    li.rm(a);
                }
                a = null;
            };
        };

        let length = 0;
        li.len = 0;
        li.add = add;
        li.rm = remove;

        li.clear = function () {
            let node = beginNode;
            while (node) {
                const right = node[rightId];
                delete node[rightId];
                delete node[leftId];
                node = right;
            }
            beginNode = endNode = undefined;
            li.len = length = 0;
        };

        li.drop = function () {
            beginNode = endNode = undefined;
            li.len = length = 0;
        };

        //|  add an item to the list
        function add(item) {
            if (arguments.length > 1) {
                for (let i = 0, j = arguments.length; i < j; i++) {
                    add(arguments[i]);
                }
                return length;
            }
            // already in list
            if (leftId in item || rightId in item || beginNode == item) {
                return length;
            }

            if (!endNode) {
                beginNode = endNode = item;
            } else {
                endNode[rightId] = item;
                item[leftId] = endNode;
                endNode = item;
            }

            li.len = ++length;
            if (length == 1 && li.fill) {
                li.fill();
            }
            return length;
        }

        //|  add a sorted item scanning from the end
        li.sorted = function (item, propName) {
            if (leftId in item || rightId in item || beginNode == item) {
                return length;
            }

            let track = endNode;

            while (track) {
                if (track[propName] <= item[propName]) {
                    // insert after a
                    if (track[rightId]) {
                        track[rightId][leftId] = item;
                        item[rightId] = track[rightId];
                    } else {
                        endNode = item;
                    }
                    item[leftId] = track;
                    track[rightId] = item;
                    break;
                }
                track = track[leftId];
            }
            if (!track) {
                // add beginning
                if (!endNode) endNode = item;
                if (beginNode) {
                    item[rightId] = beginNode;
                    beginNode[leftId] = item;
                }
                beginNode = item;
            }

            li.len = ++length;
            if (length == 1 && li.fill) {
                li.fill();
            }
            return length;
        };

        //|  remove item from the list
        function remove(item) {
            if (arguments.length > 1) {
                for (let i = 0, j = arguments.length; i < j; i++) {
                    remove(arguments[i]);
                }
                return length;
            }

            let took = 0;
            if (beginNode == item) {
                beginNode = item[rightId];
                took++;
            }
            if (endNode == item) {
                endNode = item[leftId];
                took++;
            }
            if (item[rightId]) {
                if (item[leftId]) {
                    item[rightId][leftId] = item[leftId];
                } else {
                    delete item[rightId][leftId];
                }
                took++;
            }
            if (item[leftId]) {
                if (item[rightId]) {
                    item[leftId][rightId] = item[rightId];
                } else {
                    delete item[leftId][rightId];
                }
                took++;
            }

            if (!took) return;

            delete item[rightId];
            delete item[leftId];

            //if(!e && f) freeid()
            li.len = --length;

            if (!length && li.empty) {
                li.empty();
            }
            return length;
        }

        //|  run all items in the list
        li.run = function(...args) {
            let node = beginNode;
            let validResult;
            let result;
            while (node) {
                result = node(...args);
                validResult = result !== undefined ? result : validResult;
                node = node[rightId];
            }
            return validResult;
        };

        //|  iterate over all items
        li.each = function (iterate) {
            let node = beginNode;
            let pos = 0;
            let validResult;
            let result;
            while (node) {
                const next = node[rightId];
                result = iterate(node, li, pos);
                if (result !== undefined) {
                    validResult = result;
                }
                node = next;
                pos++;
            }
            return validResult;
        };

        //|  check if item is in the list
        li.has = function (item) {
            return leftId in item || rightId in item || beginNode == item;
        };

        li.first = function () {
            return beginNode;
        };

        li.last = function () {
            return endNode;
        };

        return li;
    }

    // |  apply event pattern to object
    // \____________________________________________/
    function events(target) {

        target.on = function (event, callback) {
            const eventList = this.$l || (this.$l = {});
            const a = eventList[event];
            if (!a) {
                eventList[event] = callback;
            } else {
                if (Array.isArray(a)) {
                    a.push(event);
                } else {
                    eventList[event] = [eventList[event], callback];
                }
            }
        };

        target.off = function (event, callback) {
            const eventList = this.$l || (this.$l = {});
            if (!eventList) return;
            const eventCb = eventList[event];

            if (!eventCb) return;

            if (Array.isArray(eventCb)) {
                for (let i = 0; i < eventCb.length; i++) {
                    if (eventCb[i] == callback) {
                        eventCb.splice(i, 1);
                        i--;
                    }
                }
            } else if (eventList[event] == callback) {
                delete eventList[event];
            }
        };

        target.clear = function (e) {
            const list = this.$l;

            if (!list) return;

            delete list[e];
        };

        target.emit = function (event) {
            const list = this.$l;
            if (!list) return;
            const cb = list[event];

            if (!cb) return;

            if (arguments.length > 1) {
                const args = Array.prototype.slice.call(arguments, 1);
                if (typeof cb == 'function') {
                    cb(...args);
                } else {
                    for (let i = 0; i < cb.length; i++) {
                        cb[i].apply(null, args);
                    }
                }
            } else {
                if (typeof cb == 'function') {
                    cb();
                } else {
                    for (let i = 0; i < cb.length; i++) {
                        cb[i]();
                    }
                }
            }
        };
    }

    // |  simple fixed integer stack
    // \____________________________________________/
    function stack() {
        function Stack(...args) {
            return Stack.fn.apply(null, args);
        }

        Stack.fn = function (a) {
            if (arguments.length > 1) {
                let rm = {};
                for (let i = 0, j = arguments.length; i < j; i++) {
                    rm[push(arguments[i])] = 1;
                }
                return function () {
                    for (const i in rm) {
                        Stack.rm(i);
                    }
                    rm = null;
                };
            } else {
                let i = push(a);
                return function () {
                    if (i !== undefined) Stack.rm(i);
                    i = undefined;
                };
            }
        };

        Stack.push = push;
        Stack.shift = shift;
        Stack.set = set;
        //|  length of the stack, externals are readonly
        let begin = Stack.beg = 1;
        let end = Stack.end = 1;
        let length = Stack.len = 0;

        //|  return item on bottom of stack
        Stack.bottom = function () {
            if (begin == end) return null;
            return Stack[begin];
        };

        //|  item on the top of the staci
        Stack.top = function () {
            if (begin == end) return null;
            return Stack[end];
        };

        //|  push item to the top of the stack
        function push(arg) {
            if (arguments.length > 1) {
                let r;
                for (let i = 0, j = arguments.length; i < j; i++) {
                    r = push(arguments[i]);
                }
                return r;
            }

            Stack[end++] = arg;
            Stack.len = ++length;
            return (Stack.end = end) - 1;
        }

        //|  pop item from the top of the stack
        Stack.pop = function () {
            const item = Stack[end - 1];
            if (begin != end) {
                delete Stack[end];
                while (end != begin && !(end in Stack)) {
                    end--;
                }
                if (! --length) {
                    Stack.beg = Stack.end = begin = end = 1;
                } // cancel drift
                Stack.len = length;
            } else {
                begin = end = 1;
                Stack.len = length = 0;
            }
            Stack.end = end;
            return item;
        };

        //|  insert item at the bottom of the stack
        function shift(arg) {
            if (arguments.length > 1) {
                let r;
                for (let i = 0, j = arguments.length; i < j; i++) {
                    r = push(arguments[i]);
                }
                return r;
            }

            Stack[--begin] = arg;
            Stack.len = ++length;
            return Stack.beg = begin;
        }

        //|  remove item at the bottom of the stack
        Stack.unshift = function () {
            if (begin != end) {
                delete Stack[begin];
                while (begin != end && !(begin in Stack)) {
                    begin++;
                }
                if (! --length) Stack.beg = Stack.end = begin = end = 1;
                Stack.len = length;
            }
            return Stack.beg;
        };

        //|  set an item with a particular index
        function set(index, value) {
            if (arguments.length > 2) {
                let r;
                for (let i = 0, j = arguments.length; i < j; i += 2) {
                    r = add(arguments[i], arguments[i + 1]);
                }
                return r;
            }
            Stack[index] = value;
            if (index < begin) {
                Stack.beg = begin = index;
            }
            if (index >= end) {
                Stack.end = end = index + 1;
            }
            return index;
        }

        //|  remove item with particular index
        Stack.rm = function (index) {
            if (!index in Stack) return;

            delete Stack[index];

            if (! --length) {
                Stack.len = 0;
                Stack.beg = Stack.end = begin = end = 1;
                return index;
            }
            Stack.len = length;
            if (index == begin) {
                while (begin != end && !(begin in Stack)) {
                    Stack.beg = ++begin;
                }
            }
            if (index == end) {
                while (end != begin && !(end in Stack)) {
                    Stack.end = --end;
                }
            }
            return index;
        };

        //|  iterate over all items in the stack
        Stack.each = function (iterate) {
            let valid;
            let result;
            for (let i = begin; i < end; i++) {
                if (i in Stack) {
                    result = iterate(Stack[i], Stack, i);
                    if (result !== undefined) {
                        valid = result;
                    }
                }
            }
            return valid;
        };

        return Stack;
    }

    // | create a random hex string
    // \____________________________________________/
    function randomHex(number) {
        let s = '';
        for (let i = 0; i < number; i++) {
            s += parseInt(Math.random() * 16).toString(16);
        }
        return s.toLowerCase();
    }

    // |  pubsub for all your event needs
    // \____________________________________________/
    function pubsub(ileft, iright) {

        const li = list(ileft || '_psl', iright || '_psr');
        const of = li.fn;
        li.fn = function (i) {
            if (arguments.length == 1 && typeof i == 'function') {
                return of(i);
            } // pubsub

            return li.run.apply(null, arguments); // otherwise forward the call to all
        };
        return li;
    }

    // |  mersenne twister -- a random number generator
    // |  Inspired by http://homepage2.nifty.com/magicant/sjavascript/mt.js
    // \____________________________________________/
    function mersenneTwister(s, h) {
        // seed, itemarray or hash
        if (s === undefined) {
            s = new Date().getTime();
        }
        let p;
        let t;
        if (h) {
            p = {};
            let j = 0;
            for (let i in h) {
                p[j++] = h[i];
            }
            t = j;
        }
        m = new Array(624);

        m[0] = s >>> 0;
        for (let i = 1; i < m.length; i++) {
            const a = 1812433253;
            const b = m[i - 1] ^ m[i - 1] >>> 30;
            const x = a >>> 16;
            const y = a & 0xffff;
            const c = b >>> 16;
            const d = b & 0xffff;
            m[i] = (x * d + y * c << 16) + y * d >>> 0;
        }
        let i = m.length;

        function nx(a) {
            let v;
            if (i >= m.length) {
                let k = 0;
                const N = m.length;
                const M = 397;
                do {
                    v = m[k] & 0x80000000 | m[k + 1] & 0x7fffffff;
                    m[k] = m[k + M] ^ v >>> 1 ^ (v & 1 ? 0x9908b0df : 0);
                } while (++k < N - M);
                do {
                    v = m[k] & 0x80000000 | m[k + 1] & 0x7fffffff;
                    m[k] = m[k + M - N] ^ v >>> 1 ^ (v & 1 ? 0x9908b0df : 0);
                } while (++k < N - 1);
                v = m[N - 1] & 0x80000000 | m[0] & 0x7fffffff;
                m[N - 1] = m[M - 1] ^ v >>> 1 ^ (v & 1 ? 0x9908b0df : 0);
                i = 0;
            }

            v = m[i++];
            v ^= v >>> 11, v ^= v << 7 & 0x9d2c5680, v ^= v << 15 & 0xefc60000, v ^= v >>> 18;
            if (a !== undefined) {
                v = ((a >>> 5) * 0x4000000 + (v >>> 6)) / 0x20000000000000;
                if (p) return p[Math.round(v * (t - 1))];
                return v;
            }
            return nx(v);
        }

        return nx;
    }

    // |  sha1
    // |  Inspired by http://www.webtoolkit.info/javascript-sha1.html
    // \____________________________________________/
    function sha1hex(m) {
        function rl(n, s) {
            return n << s | n >>> 32 - s;
        }

        function lsb(v) {
            let s = '';
            let i;
            let vh;
            let vl;
            for (i = 0; i <= 6; i += 2) {
                vh = v >>> i * 4 + 4 & 0x0f, vl = v >>> i * 4 & 0x0f, s += vh.toString(16) + vl.toString(16);
            }
            return s;
        }

        function hex(v) {
            let s = '';
            let i;
            let j;
            for (i = 7; i >= 0; i--) {
                j = v >>> i * 4 & 0x0f, s += j.toString(16);
            }
            return s;
        }

        function utf8(s) {
            s = s.replace(/\r\n/g, '\n');
            let u = '';
            const fc = String.fromCharCode;
            for (let n = 0; n < s.length; n++) {
                const c = s.charCodeAt(n);
                if (c < 128) {
                    u += fc(c);
                } else if (c > 127 && c < 2048) {
                    u += fc(c >> 6 | 192), u += fc(c & 63 | 128);
                } else {
                    u += fc(c >> 12 | 224), u += fc(c >> 6 & 63 | 128), u += fc(c & 63 | 128);
                }
            }
            return u;
        }

        m = utf8(m);

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
            j = m.charCodeAt(i) << 24 | m.charCodeAt(i + 1) << 16 | m.charCodeAt(i + 2) << 8 | m.charCodeAt(i + 3), wa.push(j);
        }

        const r = l % 4;
        if (r == 0) {
            i = 0x080000000;
        } else if (r == 1) {
            i = m.charCodeAt(l - 1) << 24 | 0x0800000;
        } else if (r == 2) {
            i = m.charCodeAt(l - 2) << 24 | m.charCodeAt(l - 1) << 16 | 0x08000;
        } else {
            i = m.charCodeAt(l - 3) << 24 | m.charCodeAt(l - 2) << 16 | m.charCodeAt(l - 1) << 8 | 0x80;
        }

        wa.push(i);
        while (wa.length % 16 != 14) {
            wa.push(0);
        }
        wa.push(l >>> 29);
        wa.push(l << 3 & 0x0ffffffff);

        for (bs = 0; bs < wa.length; bs += 16) {
            for (i = 0; i < 16; i++) {
                u[i] = wa[bs + i];
            }
            for (i = 16; i <= 79; i++) {
                u[i] = rl(u[i - 3] ^ u[i - 8] ^ u[i - 14] ^ u[i - 16], 1);
            }

            a = v, b = w, c = x, d = y, e = z;

            for (i = 0; i <= 19; i++) {
                t = rl(a, 5) + (b & c | ~b & d) + e + u[i] + 0x5A827999 & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t;
            }
            for (i = 20; i <= 39; i++) {
                t = rl(a, 5) + (b ^ c ^ d) + e + u[i] + 0x6ED9EBA1 & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t;
            }
            for (i = 40; i <= 59; i++) {
                t = rl(a, 5) + (b & c | b & d | c & d) + e + u[i] + 0x8F1BBCDC & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t;
            }
            for (i = 60; i <= 79; i++) {
                t = rl(a, 5) + (b ^ c ^ d) + e + u[i] + 0xCA62C1D6 & 0x0ffffffff, e = d, d = c, c = rl(b, 30), b = a, a = t;
            }

            v = v + a & 0x0ffffffff;
            w = w + b & 0x0ffffffff;
            x = x + c & 0x0ffffffff;
            y = y + d & 0x0ffffffff;
            z = z + e & 0x0ffffffff;
        }
        return (hex(v) + hex(w) + hex(x) + hex(y) + hex(z)).toLowerCase();
    }

    // |  wait for t milliseconds
    // \____________________________________________/
    function wait(time) {
        const pubCallback = pubsub();
        pubCallback.empty = function () {
            clearTimeout(timer);
        };
        const timer = setTimeout(pubCallback, time);
        return pubCallback;
    }

    // |  repeat with an interval of t milliseconds
    // \____________________________________________/
    function repeat(time) {
        const pubCallback = pubsub();
        pubCallback.empty = function () {
            clearInterval(timer);
        };
        let timer = setInterval(pubCallback, time);
        return pubCallback;
    }

    // |  next larger number which is the power of 2, like 3 => 4, 15 => 16, 24 => 36
    // \____________________________________________/
    function nextpow2(x) {
        --x;
        for (let i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    }

    // |  clamp things => restrict a value to a given range
    // \____________________________________________/
    function clamp(x, min /*range left*/, max /*range right*/) {
        return x < min ? min : x > max ? max : x;
    }

    // |  min
    // \____________________________________________/
    function min(a, b) {
        return a < b ? a : b;
    }

    // |  max
    // \____________________________________________/
    function max(a, b) {
        return a > b ? a : b;
    }

    // |  delta time helper
    // \____________________________________________/
    function dateTime() {
        let nowTime = now();

        function now() {
            return typeof performance !== 'undefined' ? performance.now() : Date.now();
        }

        function dt() {
            return now() - nowTime;
        }

        dt.log = function (msg) {
            return console.log((msg ? msg : '') + (now() - nowTime));
        };

        dt.reset = function () {
            nowTime = now();
        };
        return dt;
    }

    // |  quick stacktrace
    // \____________________________________________/
    function printStackTrace() {
        console.log('stack', new Error().stack);
    }

    // |  node walker
    // \____________________________________________/
    function walk(node, parentNode, traverse) {
        const traversId = typeof traverse != 'function' && traverse;
        let z = 0;
        while (node && node != parentNode) {
            if (traversId) {
                if (traversId in node) {
                    node[traversId](node);
                }
            } else {
                traverse(node, z);
            }

            if (node._child) {
                node = node._child;
                z++;
            } else if (node._nextSibling) {
                node = node._nextSibling;
            } else {
                while (node && !node._nextSibling && node != parentNode) {
                    node = node._parent;
                    z--;
                }
                if (node) node = node._nextSibling;
            }
        }
    }

    // |  dump objects to string
    // \____________________________________________/
    function dump(dumper, // dump object
    options, // options {m:99 max depth,  p:0 pack, c:0  capacity, n:1 no recursion }*/,
    stringArr, // internal string
    depth, // internal depth
    stack // internal object stack
    ) {
        if (!stringArr) {
            stringArr = [];
            stack = [];
            depth = 0;
        }
        options = options || {};
        let curId; // indent current string
        let parentId; // indent parent string
        let newLine; // newline string
        let iter; // iterator
        let len; // length of loop
        let test; // test variable in recurblock
        let currentPos = stringArr.length; // current output

        switch (typeof dumper) {
            case 'function':
            case 'object':
                if (dumper == null) {
                    stringArr[currentPos++] = 'null';
                    break;
                }
                if (depth >= (options.m || 99)) {
                    stringArr[currentPos++] = '{...}';
                    break;
                }
                stack.push(dumper);

                if (options.p) {
                    curId = curId = newLine = '';
                } else {
                    curId = new Array(depth + 2).join(' ');
                    parentId = new Array(depth + 1).join(' ');
                    newLine = '\n';
                }

                if (dumper.constructor == Array) {
                    stringArr[currentPos++] = '[';
                    stringArr[currentPos++] = newLine;
                    for (let k = 0; k < dumper.length; k++) {
                        stringArr[currentPos++] = curId;
                        for (iter = 0, test = dumper[k], len = stack.length; iter < len; iter++) {
                            if (stack[iter] == test) break;
                        }

                        let c1 = currentPos;
                        if (iter == len) {
                            dump(test, options, stringArr, depth + 1, stack);
                        } else {
                            stringArr[currentPos++] = `nested: ${iter}`;
                        }

                        currentPos = stringArr.length;
                        let c2 = currentPos;
                        console.log('pos', c1, c2);
                        if (stringArr.slice(c1, c2 - c1).join('').length < 50) {
                            for (let c3 = c1; c3 < c2; c3++) {
                                stringArr[c3] = stringArr[c3].replace ? stringArr[c3].replace(/[\r\n\t]|\s\s/g, '') : stringArr[c3];
                            }
                        }
                        // we check the substring length and fold if < n


                        stringArr[currentPos++] = `, ${newLine}`;
                    }
                    stringArr[currentPos - 1] = `${newLine + parentId}]`;
                } else {
                    if (typeof dumper == 'function') {
                        stringArr[currentPos++] = '->';
                    }
                    stringArr[currentPos++] = '{';
                    stringArr[currentPos++] = newLine;

                    for (const key in dumper) {
                        if (dumper.hasOwnProperty(key)) {
                            if (options.c && currentPos > options.c) {
                                stringArr[currentPos++] = '<...>';
                                break;
                            }
                            stringArr[currentPos++] = `${curId + (key.match(/[^a-zA-Z0-9_]/) ? '\'' + key + '\'' : key)}:`;
                            for (iter = 0, test = dumper[key], len = stack.length; iter < len; iter++) {
                                if (stack[iter] == test) break;
                            }

                            let c1 = currentPos;
                            if (iter == len) {
                                dump(test, options, stringArr, depth + 1, stack);
                            } else {
                                stringArr[currentPos++] = `[nested: ${iter}]`;
                            }

                            currentPos = stringArr.length;

                            let c2 = currentPos;
                            if (stringArr.slice(c1, c2).join('').length < 200) {
                                for (let c3 = c1; c3 < c2; c3++) {
                                    if (stringArr[c3] && typeof stringArr[c3] == 'string') {
                                        stringArr[c3] = stringArr[c3].replace(/[\r\n\t]|\s\s/g, '');
                                    }
                                }
                            }

                            stringArr[currentPos++] = `, ${newLine}`;
                        }
                    }
                    stringArr[currentPos - 1] = `${newLine + parentId}}`;
                }
                stack.pop();
                break;
            case 'string':
                stringArr[currentPos++] = `'${dumper}'`;
                break;
            default:
                stringArr.push(dumper);
                break;
        }

        return depth ? 0 : stringArr.join('');
    }

    return fn;
});
