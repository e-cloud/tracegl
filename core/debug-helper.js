define(function (require, exports, module) {
    String.prototype.padding = function (n, c) {
        var val = this.valueOf();
        if (Math.abs(n) <= val.length) {
            return val;
        }
        var m = Math.max((Math.abs(n) - this.length) || 0, 0);
        var pad = new Array(m + 1).join(String(c || ' ').charAt(0));
        //      var pad = String(c || ' ').charAt(0).repeat(Math.abs(n) - this.length);
        return (n < 0) ? pad + val : val + pad;
        //      return (n < 0) ? val + pad : pad + val;
    };

    const clr = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'grey']
    /*.map(function (s) {
     return 'bg' + s[0].toUpperCase() + s.slice(1)
     })*/
    function color(arr) {
        return arr
          /*.map(function (str, index) {
              const ci = str.indexOf(':') + 1
              return (str.slice(0, ci) + chalk[clr[index]](str.slice(ci)))
          })*/
    }

    function rw(s) {
        return typeof s !== 'undefined' ? s : 'empty'
    }

    function ot(n) {
        return n ? rw(n.id) : '\u0020'
    }

    function log(n) {
        console.log(gen(n))
    }

    function gen(n, padsize) {
        padsize = padsize || 30
        return [
            'id:' + ot(n),
            't:' + rw(n.t),
            '_p:' + ot(n._p),
            '_c:' + ot(n._c),
            '_e:' + ot(n._e),
            '_d:' + ot(n._d),
            '_u:' + ot(n._u)
        ].map(function (item) {
              return item.padding(padsize)
          })
          .join(', ')
    }

    function raw(n) {
        return color(['id:' + ot(n),
                      't:' + rw(n.t),
                      '_p:' + ot(n._p),
                      '_c:' + ot(n._c),
                      '_e:' + ot(n._e),
                      '_d:' + ot(n._d),
                      '_u:' + ot(n._u)])
    }

    log.gen = gen
    log.raw = raw

    module.exports = log
})
