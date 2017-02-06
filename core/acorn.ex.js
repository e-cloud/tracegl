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
                        return this._type === TokenTypes[k];
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
            node = node._child;
            while (node && node != parent) {
                cb(node);
                if (node._child) {
                    node = node._child;
                } else {
                    while (node != parent) {
                        if (node._nextSibling) {
                            node = node._nextSibling;
                            break;
                        }
                        node = node._parent;
                    }
                }
            }
        }

        get isAssign() {
            return this._type && this._type.isAssign;
        }

        get isLoop() {
            return this._type && this._type.isLoop;
        }

        get prefix() {
            return this._type && this._type.prefix;
        }

        get beforeExpr() {
            return this._type && this._type.beforeExpr;
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
            while (t._nextSibling) {
                t = t._nextSibling;
            }
            return t;
        }

        get astParent() {
            let t = this;
            while (t._nextSibling) {
                t = t._nextSibling;
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
            if (type == TokenTypes.regexp && parentStart._lastChild && parentStart._lastChild._type.binop == 10) {
                // verify this one
                node = parentStart._lastChild;
            } else if (opts.compact && parentStart._lastChild && (type == TokenTypes.name && parentStart._lastChild._type == TokenTypes.dot || type == TokenTypes.dot && parentStart._lastChild._type == TokenTypes.name)) {
                node = parentStart._lastChild;
                node._type = type;
                node.t += input.slice(tokStart, tokEnd);
            } else {
                // node._child = n._child
                // node._nextSibling = n._nextSibling
                // node._lastChild = n._lastChild
                // node._parent = n._parentStart
                // node._prevSibling = n._prevSibling
                // node._type = n._type
                // node.t = n.tokenStr
                node = new Node();
                node._parent = parentStart;
                node._type = type;
                node.t = input.slice(tokStart, tokEnd);
                // todo: if may be useless
                if (parentStart) {
                    if (!parentStart._child) {
                        parentStart._lastChild = parentStart._child = node; // t._child=
                    } else {
                        parentStart._lastChild._nextSibling = node;
                        node._prevSibling = parentStart._lastChild;
                        parentStart._lastChild = node;
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
                    if (!parentStart._lastChild._prevSibling) {
                        delete parentStart._child;
                        delete parentStart._lastChild;
                    } else {
                        delete parentStart._lastChild._prevSibling._nextSibling;
                    }
                }
                if (parentStart._parent) {
                    newParentStart = parentStart._parent;
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
             if (n.w.indexOf('\n') !== -1 && !n._child) {
                 if (!(n.t === '}' && n._parent._nextSibling && n._parent._nextSibling.t === '}')) {
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
