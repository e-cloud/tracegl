// | Code view |______________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require) {

    const fn = require('../../core/fn');
    const ui = require('../../core/ui/ui');

    const acorn_tools = require('../../core/acorn_tools');

    const tm = require('../../core/ui/text_mix');

    //|  Styling
    //\____________________________________________/

    const ft1 = ui.gl.sfont(navigator.platform.match(/Mac/) ? '12px Menlo' : '12px Lucida Console');

    function codeDb() {

        const db = { sh: {} };
        db.files = {};
        let c;

        let ls = 0; // leading spaces
        let lw = 0; // leading width
        function addWhitespace(f, text, fg) {
            // process whitespace and comments
            const l = text.length;
            let v = f.text.last() || f.addChunk('', c);
            // if n.w contains comments
            for (let i = 0; i < l; i++) {
                c = text.charCodeAt(i);
                if (c == 32) {
                    // space
                    // are we crossing a tab boundary?
                    if (ls && !(v.x % tabWidth)) {
                        v = f.addChunk('\x7F', ctbl.tab);
                    } else {
                        v.x++;
                    }
                } else if (c == 9) {
                    // tab
                    // snap to tab boundary
                    const tw = tabWidth - v.x % tabWidth;
                    // output tabline ad tw
                    if (ls && !(v.x % tabWidth)) {
                        v = f.addChunk('\x7F', ctbl.tab);
                        v.x += tabWidth - 1;
                    } else {
                        v.x += tw;
                    }
                } else if (c == 10) {
                    // newline
                    const xold = v.x;
                    if (v.x < lw) {
                        // output missing tabs
                        for (v.x = v.x ? tabWidth : 0; v.x < lw; v.x += tabWidth - 1) {
                            v = f.addChunk('\x7F', ctbl.tab);
                        }
                    }
                    f.endLine(xold);
                    ls = 1;
                } else {
                    // output blue comment thing
                    if (ls) {
                        lw = v.x;
                        ls = 0;
                    }
                    v = f.addChunk(text.charAt(i), fg || ctbl.comment);
                }
            }
        }

        // theme lookup
        const ctbl = {
            'num': ui.t.codeNumber,
            'regexp': ui.t.codeRegexp,
            'name': ui.t.codeName,
            'string': ui.t.codeString,
            'keyword': ui.t.codeOperator,
            'var': ui.t.codeVardef,
            'tab': ui.t.codeTab,
            'comment': ui.t.codeComment,
            'operator': ui.t.codeOperator
        };

        const tabWidth = 3;

        db.fetch = function (name, cb) {
            // if we dont have name,
        };

        db.parse = function (name, src) {
            const f = db.files[name] || (db.files[name] = {});
            f.file = name;
            // create text storage on file object
            tm.storage(f);
            f.font = ft1; // todo centralize font
            f.sh = { text: db.sh.text };
            src = src.replace(/^#.*?\n/, '\n');
            f.lines = src.replace(/\t/, new Array(tabWidth + 1).join(' ')).split(/\n/);

            const t = acorn_tools.parse(src);
            t.tokens.walk(function (n) {
                if (n.t) {
                    // colorize token
                    let c = ctbl[n._t.label];
                    if (!c) {
                        if (n._t.binop || n._t.isAssign) {
                            c = ctbl.operator;
                        } else if (n._t.keyword) {
                            if (n.t == 'var' || n.t == 'function') {
                                c = ctbl.var;
                            } else {
                                c = ctbl.keyword;
                            }
                        } else {
                            c = ctbl.name;
                        }
                    }
                    // process token
                    if (n.t.includes('\n')) {
                        const a = n.t.split(/\n/);
                        for (let i = 0; i < a.length; i++) {
                            f.addChunk(a[i], c);
                            if (i < a.length - 1) f.endLine();
                        }
                    } else {
                        if (ls) {
                            lw = f.text.last().x;
                            ls = 0;
                        }
                        f.addChunk(n.t, c);
                    }
                }
                addWhitespace(f, n.w);
            });
            //b.size()
            return f;
        };

        return db;
    }

    return codeDb;
});
