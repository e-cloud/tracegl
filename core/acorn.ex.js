// acorn ex
define(function (require, exports, module) {
    'no tracegl';

    const acorn = require('./acorn');
    const TokenTypes = acorn.tokTypes;

    function nodeProto(proto) {
        // property getter type checking
        for (const k in TokenTypes) {
            // for js scope to use clojure
            (function (k) {
                Object.defineProperty(proto, k.startsWith('_') ? k.slice(1) : k, {
                    get() {
                        return this._t === TokenTypes[k];
                    }
                });
            })(k);
        }
    }

    class Node {
        constructor() {
            this.id = Node.uuid();
        }

        // walker
        walk(cb) {
            let node = this;
            const parent = node;
            cb(node);
            node = node._c;
            while (node && node != parent) {
                cb(node);
                if (node._c) {
                    node = node._c;
                } else {
                    while (node != parent) {
                        if (node._d) {
                            node = node._d;
                            break;
                        }
                        node = node._p;
                    }
                }
            }
        }

        get isAssign() {
            return this._t && this._t.isAssign;
        }

        get isLoop() {
            return this._t && this._t.isLoop;
        }

        get prefix() {
            return this._t && this._t.prefix;
        }

        get beforeExpr() {
            return this._t && this._t.beforeExpr;
        }

        get beforeNewline() {
            return this.w && this.w.match(/\n/);
        }

        get beforeEnd() {
            return this.w && this.w.match(/\n/) || this.d.semi || this.d.braceR;
        }

        get fnscope() {
            return this.d.parenL ? this.d.d : this.d.d.d;
        }

        get last() {
            let t = this;
            while (t._d) {
                t = t._d;
            }
            return t;
        }

        get astParent() {
            let t = this;
            while (t._d) {
                t = t._d;
            }
            return t;
        }
    }

    Node.uuid = function () {
        let id = 0;
        return function () {
            return id++;
        };
    }();

    nodeProto(Node.prototype);

    acorn.plugins.traceToken = function (parser, options) {
        const opts = typeof options === 'object' ? options : {};

        parser.extend('parse', function (originFn) {
            return function () {
                this.tokTree = new Node();
                this.tokTree.root = 1;
                this.tokTree.t = this.tokTree.w = ''; // .whitespace
                if (this.start !== 0) {
                    this.tokTree.w = this.input.slice(0, this.start);
                }

                const program = originFn.call(this);
                program.tokens = this.tokTree;
                return program;
            };
        });

        parser.extend('updateContext', function (originFn) {
            return function (prevType) {
                originFn.call(this, prevType);

                finishToken.call(this);
            };
        });

        function finishToken() {
            const parentStart = this.tokTree; // aka last left match node, like { ( [
            const input = this.input;
            const type = this.type;
            const tokStart = this.start;
            const tokEnd = this.end;
            const tokPos = this.pos;

            let node;

            if (type == TokenTypes.eof) {
                return;
            }
            if (type == TokenTypes.regexp && parentStart._e && parentStart._e._t.binop == 10) {
                // verify this one
                node = parentStart._e;
            } else if (opts.compact && parentStart._e && (type == TokenTypes.name && parentStart._e._t == TokenTypes.dot || type == TokenTypes.dot && parentStart._e._t == TokenTypes.name)) {
                node = parentStart._e;
                node._t = type;
                node.t += input.slice(tokStart, tokEnd);
            } else {
                // node._c = n._child
                // node._d = n._nextSibling
                // node._e = n._lastChild
                // node._p = n._parentStart
                // node._u = n._prevSibling
                // node._t = n._type
                // node.t = n.tokenStr
                node = new Node();
                node._p = parentStart;
                node._t = type;
                node.t = input.slice(tokStart, tokEnd);
                // todo: if may be useless
                if (parentStart) {
                    if (!parentStart._c) {
                        parentStart._e = parentStart._c = node; // t._c=
                    } else {
                        parentStart._e._d = node;
                        node._u = parentStart._e;
                        parentStart._e = node;
                    }
                }
            }

            if (tokEnd != tokPos) {
                node.w = input.slice(tokEnd, tokPos);
            } else {
                node.w = '';
            }

            let newParentStart = parentStart;
            if (type == TokenTypes.braceL || type == TokenTypes.bracketL || type == TokenTypes.parenL) {
                newParentStart = node;
            } else if (type == TokenTypes.braceR || type == TokenTypes.bracketR || type == TokenTypes.parenR) {
                if (opts.noclose) {
                    if (!parentStart._e._u) {
                        delete parentStart._c;
                        delete parentStart._e;
                    } else {
                        delete parentStart._e._u._d;
                    }
                }
                if (parentStart._p) {
                    newParentStart = parentStart._p;
                }
            }
            this.tokTree = newParentStart;
        }
    };

    const logger = require('./debug-helper');

    module.exports.parse = function (input, opts) {
        const acornOpts = opts || {};
        acornOpts.plugins = {};

        acornOpts.plugins.traceToken = acornOpts.plugins.traceToken || {};

        if (opts && opts.compact) {
            acornOpts.plugins.traceToken.compact = true;
        }
        if (opts && opts.noclose) {
            acornOpts.plugins.traceToken.noclose = true;
        }

        const program = acorn.parse(input, acornOpts);

        /* console.log('=================================================================\n=================================================================')
         const output = []
         let src = ''
         program.tokens.walk(function (n) {
             output.push(logger.gen(n, 25))
             src += n.t
             if (n.w.indexOf('\n') !== -1 && !n._c) {
                 if (!(n.t === '}' && n._p._d && n._p._d.t === '}')) {
                     src += ';'
                 }
             } else if (n.w.indexOf(' ') != -1) {
                 src += ' '
             }
         })
          console.log(output.join('\n'))
         console.log('=================================================================')
         console.log(src)*/

        return program;
    };
});