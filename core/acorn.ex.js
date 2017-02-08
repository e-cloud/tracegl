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
            return this.whitespace && this.whitespace.match(/\n/);
        }

        get beforeEnd() {
            return this.whitespace && this.whitespace.match(/\n/) || this.d.semi || this.d.braceR;
        }

        get fnscope() {
            return this.d.parenL ? this.d.d : this.d.d.d;
        }

        get last() {
            let node = this;
            while (node._nextSibling) {
                node = node._nextSibling;
            }
            return node;
        }

        get astParent() {
            let node = this;
            while (node._nextSibling) {
                node = node._nextSibling;
            }
            return node;
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
                this.tokTree.token = this.tokTree.whitespace = ''; // .whitespace
                if (this.start !== 0) {
                    this.tokTree.whitespace = this.input.slice(0, this.start);
                }

                /*this.options.onToken = (token) => {
                 if (this.start > this.lastTokEnd && !this.value) {
                 token.tokTree = this.tokTree
                 token.pos = this.pos
                 token.input = this.input

                 finishToken.call(token)
                 this.tokTree = token.tokTree
                 }
                 }*/

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
            } else if (opts.compact &&
                       parentStart._lastChild &&
                       (type == TokenTypes.name &&
                        parentStart._lastChild._type == TokenTypes.dot ||
                        type == TokenTypes.dot &&
                        parentStart._lastChild._type == TokenTypes.name)
            ) {
                node = parentStart._lastChild;
                node._type = type;
                node.token += input.slice(tokStart, tokEnd);
            } else {
                // node._child = n._child
                // node._nextSibling = n._nextSibling
                // node._lastChild = n._lastChild
                // node._parent = n._parentStart
                // node._prevSibling = n._prevSibling
                // node._type = n._type
                // node.token = n.tokenStr
                node = new Node();
                node._parent = parentStart;
                node._type = type;
                node.token = input.slice(tokStart, tokEnd);
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
                node.whitespace = input.slice(tokEnd, tokPos);
            } else {
                node.whitespace = '';
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

        acornOpts.locations = true

        const program = acorn.parse(input, acornOpts);

        return program;
    };
});
