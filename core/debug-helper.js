define(function (require, exports, module) {
    String.prototype.padding = function (n, c) {
        const val = this.valueOf();
        if (Math.abs(n) <= val.length) {
            return val;
        }
        const m = Math.max(Math.abs(n) - this.length || 0, 0);
        const pad = new Array(m + 1).join(String(c || ' ').charAt(0));
        //      var pad = String(c || ' ').charAt(0).repeat(Math.abs(n) - this.length);
        return n < 0 ? pad + val : val + pad;
        //      return (n < 0) ? val + pad : pad + val;
    };

    const clr = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'grey'];
    /*.map(function (s) {
     return 'bg' + s[0].toUpperCase() + s.slice(1)
     })*/
    function color(arr) {
        return arr;
        /*.map(function (str, index) {
            const ci = str.indexOf(':') + 1
            return (str.slice(0, ci) + chalk[clr[index]](str.slice(ci)))
        })*/
    }

    function rw(s) {
        return typeof s !== 'undefined' ? s : 'empty';
    }

    function ot(n) {
        return n ? rw(n.id) : ' ';
    }

    function log(n) {
        console.log(gen(n));
    }

    function gen(n, padsize = 30) {
        return [`id:${ot(n)}`, `t:${rw(n.t)}`, `_parent:${ot(n._parent)}`, `_child:${ot(n._child)}`, `_lastChild:${ot(n._lastChild)}`, `_nextSibling:${ot(n._nextSibling)}`, `_prevSibling:${ot(n._prevSibling)}`].map(function (item) {
            return item.padding(padsize);
        }).join(', ');
    }

    function raw(n) {
        return color([`id:${ot(n)}`, `t:${rw(n.t)}`, `_parent:${ot(n._parent)}`, `_child:${ot(n._child)}`, `_lastChild:${ot(n._lastChild)}`, `_nextSibling:${ot(n._nextSibling)}`, `_prevSibling:${ot(n._prevSibling)}`]);
    }

    log.gen = gen;
    log.raw = raw;

    module.exports = log;
});
