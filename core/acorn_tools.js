// | Acorn.js tools |____________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports, module) {
    "no tracegl"

    const acorn = require('./acorn');

    exports.dump = function (node, tok) {
        tok = tok || ''
        const IsArray = Array.isArray(node);
        let start = (IsArray ? '[' : '{');
        for (const key in node) {
            if (node.hasOwnProperty(key)) {

                if (key == 'parent' || key == 'tokens' || key == 'start' || key == 'end' || key == 'token' || key == 'loc') continue
                if (key == 'token') {
                    start += '\n' + tok + 'token: ' + node[key].t
                    continue
                }
                const value = node[key];
                start += '\n' + tok + key + ': '
                if (typeof value == 'object') {
                    start += exports.dump(value, tok + ' ')
                }
                else {
                    start += value
                }
            }
        }
        start += '\n' + tok.slice(1) + (IsArray ? ']' : '}')
        return start
    }

    //
    // AST walker
    //

    const walk = {
        Literal: {}, // 1 single node
        Identifier: {}, // 2 array of nodes
        Program: { body: 2 }, // 3 keyss structure
        ExpressionStatement: { expression: 1 }, // 4 value endpoint
        BreakStatement: {},
        ContinueStatement: {},
        DebuggerStatement: {},
        DoWhileStatement: { body: 1, test: 1 },
        ReturnStatement: { argument: 1 },
        SwitchStatement: { discriminant: 1, cases: 2 },
        SwitchCase: { consequent: 2, test: 1 },
        WhileStatement: { test: 1, body: 1 },
        WithStatement: { object: 1, body: 1 },
        EmptyStatement: {},
        LabeledStatement: { body: 1, label: 4 },
        BlockStatement: { body: 2 },
        ForStatement: { init: 1, test: 1, update: 1, body: 1 },
        ForInStatement: { left: 1, right: 1, body: 1 },
        VariableDeclaration: { declarations: 2 },
        VariableDeclarator: { id: 4, init: 1 },
        SequenceExpression: { expressions: 2 },
        AssignmentExpression: { left: 1, right: 1 },
        ConditionalExpression: { test: 1, consequent: 1, alternate: 1 },
        LogicalExpression: { left: 1, right: 1 },
        BinaryExpression: { left: 1, right: 1 },
        UpdateExpression: { argument: 1 },
        UnaryExpression: { argument: 1 },
        CallExpression: { callee: 1, arguments: 2 },
        ThisExpression: {},
        ArrayExpression: { elements: 2 },
        NewExpression: { callee: 1, arguments: 2 },
        FunctionDeclaration: { id: 4, params: 2, body: 1 },
        FunctionExpression: { id: 4, params: 2, body: 1 },
        ObjectExpression: { properties: 3 },
        MemberExpression: { object: 1, property: 1 },
        IfStatement: { test: 1, consequent: 1, alternate: 1 },
        ThrowStatement: { argument: 1 },
        TryStatement: { block: 1, handlers: 2, finalizer: 1 },
        CatchClause: { param: 1, guard: 1, body: 1 }
    };

    // walk through the ast tree
    function walkDown(node, walkerMap, parent) {
        if (!node) return
        const traverseFunc = walkerMap[node.type];
        if (traverseFunc) {
            if (traverseFunc(node, parent)) return
        }
        const typeMap = walk[node.type];
        for (const key in typeMap) {
            const type = typeMap[key]; // type
            const nodeProp = node[key]; // node prop
            if (type == 2) { // array
                if (!Array.isArray(nodeProp)) {
                    throw new Error("invalid type")
                }
                for (let i = 0; i < nodeProp.length; i++) {
                    walkDown(nodeProp[i], walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node: node,
                        index: i
                    })
                }
            } else if (type == 3) { // keys
                if (!Array.isArray(nodeProp)) {
                    throw new Error("invalid type")
                }
                for (let i = 0; i < nodeProp.length; i++) {
                    walkDown(nodeProp[i].value, walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node: node,
                        index: i,
                        key: nodeProp[i].key
                    })
                }
            } else { // single node or value
                if (nodeProp) {
                    walkDown(nodeProp, walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node: node
                    })
                }
            }
        }
    }

    function walkUp(p, o) {
        while (p) {
            const f = o[p.node.type];
            if (f && f(p.node, p)) break
            p = p.up
        }
    }

    exports.walkDown = walkDown
    exports.walkUp = walkUp

    //
    // AST serializer
    //

    let strSeparator;

    function stringifyExpression(expr) {
        if (!expr || !expr.type) return ''
        return stringifyExpressionMap[expr.type](expr)
    }

    function stringifyBlock(b) {
        let s = '';
        for (let i = 0; i < b.length; i++) {
            s += stringifyExpression(b[i]) + strSeparator
        }
        return s
    }

    function stringifySeq(b) {
        let s = '';
        for (let i = 0; i < b.length; i++) {
            if (i) s += ', '
            s += stringifyExpression(b[i])
        }
        return s
    }

    const stringifyExpressionMap = {
        Literal: function (n) {
            return n.raw
        },
        Identifier: function (n) {
            return n.name
        },
        Program: function (n) {
            return stringifyBlock(n.body)
        },
        ExpressionStatement: function (n) {
            return stringifyExpression(n.expression)
        },
        BreakStatement: function (n) {
            return 'break'
        },
        ContinueStatement: function (n) {
            return 'continue'
        },
        DebuggerStatement: function (n) {
            return 'debugger'
        },
        DoWhileStatement: function (n) {
            return 'do' + stringifyExpression(n.body) + strSeparator + 'while(' + stringifyExpression(n.test) + ')'
        },
        ReturnStatement: function (n) {
            return 'return ' + stringifyExpression(n.argument)
        },
        SwitchStatement: function (n) {
            return 'switch(' + stringifyExpression(n.discriminant) + '){' + stringifyBlock(n.cases) + '}'
        },
        SwitchCase: function (n) {
            return 'case ' + stringifyExpression(n.test) + ':' + strSeparator + stringifyBlock(n.consequent)
        },
        WhileStatement: function (n) {
            return 'while(' + stringifyExpression(n.test) + ')' + stringifyExpression(n.body)
        },
        WithStatement: function (n) {
            return 'with(' + stringifyExpression(n.object) + ')' + stringifyExpression(n.body)
        },
        EmptyStatement: function (n) {
            return ''
        },
        LabeledStatement: function (n) {
            return stringifyExpression(n.label) + ':' + strSeparator + stringifyExpression(n.body)
        },
        BlockStatement: function (n) {
            return '{' + strSeparator + stringifyBlock(n.body) + '}'
        },
        ForStatement: function (n) {
            return 'for(' + stringifyExpression(n.init) + ';' + stringifyExpression(n.test) + ';' + stringifyExpression(n.update) + ')' + stringifyExpression(n.body)
        },
        ForInStatement: function (n) {
            return 'for(' + stringifyExpression(n.left) + ' in ' + stringifyExpression(n.right) + ')' + stringifyExpression(n.body)
        },
        VariableDeclarator: function (n) {
            return stringifyExpression(n.id) + ' = ' + stringifyExpression(n.init)
        },
        VariableDeclaration: function (n) {
            return 'var ' + stringifySeq(n.declarations)
        },
        SequenceExpression: function (n) {
            return stringifySeq(n.expressions)
        },
        AssignmentExpression: function (n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right)
        },
        ConditionalExpression: function (n) {
            return stringifyExpression(n.test) + '?' + stringifyExpression(n.consequent) + ':' + stringifyExpression(n.alternate)
        },
        LogicalExpression: function (n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right)
        },
        BinaryExpression: function (n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right)
        },
        UpdateExpression: function (n) {
            return n.prefix ? n.operator + stringifyExpression(n.argument) : stringifyExpression(n.argument) + n.operator
        },
        UnaryExpression: function (n) {
            return n.prefix ? n.operator + stringifyExpression(n.argument) : stringifyExpression(n.argument) + n.operator
        },
        CallExpression: function (n) {
            return stringifyExpression(n.callee) + '(' + stringifySeq(n.arguments) + ')'
        },
        ThisExpression: function (n) {
            return 'this'
        },
        ArrayExpression: function (n) {
            return '[' + stringifySeq(n.elements) + ']'
        },
        NewExpression: function (n) {
            return 'new ' + stringifyExpression(n.callee) + '(' + stringifySeq(n.arguments) + ')'
        },
        FunctionDeclaration: function (n) {
            return 'function' + (n.id ? ' ' + stringifyExpression(n.id) : '') + '(' + stringifySeq(n.params) + ')' + stringifyExpression(n.body)
        },
        FunctionExpression: function (n) {
            return 'function' + (n.id ? ' ' + stringifyExpression(n.id) : '') + '(' + stringifySeq(n.params) + ')' + stringifyExpression(n.body)
        },
        ObjectExpression: function (n) {
            let str = '{';
            const b = n.properties;
            for (let i = 0; i < b.length; i++) {
                if (i) {
                    str += ', '
                }
                str += stringifyExpression(b.key) + ':' + stringifyExpression(b.value)
            }
            str += '}'
            return str
        },
        MemberExpression: function (n) {
            if (n.computed) {
                return stringifyExpression(n.object) + '[' + stringifyExpression(n.property) + ']'
            }
            return stringifyExpression(n.object) + '.' + stringifyExpression(n.property)
        },
        IfStatement: function (n) {
            return 'if(' + stringifyExpression(n.test) + ')' + stringifyExpression(n.consequent) + strSeparator +
              (n.alternate ? 'else ' + stringifyExpression(n.alternate) + strSeparator : '')
        },
        ThrowStatement: function (n) {
            return 'throw ' + stringifyExpression(n.argument)
        },
        TryStatement: function (n) {
            return 'try ' + stringifyExpression(n.block) + strSeparator + stringifyBlock(n.handlers) + strSeparator +
              (n.finalizer ? 'finally ' + stringifyBlock(n.finalizer) : '')
        },
        CatchClause: function (n) {
            return 'catch(' + stringifyExpression(n.param) + (n.guard ? ' if ' + stringifyExpression(n.guard) : ')') + stringifyExpression(n.body)
        }
    }

    function stringify(n, sep) {
        strSeparator = sep || '\n'
        return stringifyExpression(n)
    }

    exports.stringify = stringify

    const types = acorn.tokTypes;

    function nodeProto(proto) {

        // property getter type checking
        for (const key in types) {
            (function (k) {
                proto.__defineGetter__(k, function () {
                    return this._t == types[k]
                })
            })(key)
        }
        // other types
        proto.__defineGetter__('isAssign', function () {
            return this._t && this._t.isAssign
        })
        proto.__defineGetter__('isLoop', function () {
            return this._t && this._t.isLoop
        })
        proto.__defineGetter__('prefix', function () {
            return this._t && this._t.prefix
        })
        proto.__defineGetter__('beforeExpr', function () {
            return this._t && this._t.beforeExpr
        })
        proto.__defineGetter__('beforeNewline', function () {
            return this.w && this.w.match(/\n/)
        })
        proto.__defineGetter__('beforeEnd', function () {
            return this.w && this.w.match(/\n/) || this.d.semi || this.d.braceR
        })
        proto.__defineGetter__('fnscope', function () {
            return this.d.parenL ? this.d.d : this.d.d.d
        })
        proto.__defineGetter__('last', function () {
            let node = this;
            while (node._d) {
                node = node._d;
            }
            return node
        })
        proto.__defineGetter__('astParent', function () {
            let node = this;
            while (node._d) {
                node = node._d;
            }
            return node
        })

        // walker
        proto.walk = function (cb) {
            let node = this;
            const parent = node;
            cb(node)
            node = node._c
            while (node && node != parent) {
                cb(node)
                if (node._c) {
                    node = node._c
                } else {
                    while (node != parent) {
                        if (node._d) {
                            node = node._d;
                            break
                        }
                        node = node._p
                    }
                }
            }
        }
    }

    function Node() {
        this.id = Node.uuid()
    }

    Node.uuid = (function () {
        let id = 0
        return function () {
            return id++
        }
    }())

    nodeProto(Node.prototype)

    // acorn parse wrapper that also spits out a token tree
    exports.parse = function (inpt, opts) {
        const hackTool = {
            finishToken: finishToken,
            initTokenState: initTokenState,
            tokTree: new Node()
        };
        hackTool.tokTree.root = 1
        hackTool.tokTree.t = hackTool.tokTree.w = ''

        if (opts && opts.compact) hackTool.compact = 1
        if (opts && opts.noclose) hackTool.noclose = 1

        const n = acorn.parse(inpt, opts, hackTool);
        n.tokens = hackTool.tokTree
        return n
    }

    function initTokenState(hack, tokPos, input) {
        if (tokPos != 0) hack.tokTree.w = input.slice(0, tokPos)
    }

    function finishToken(hack, type, val, input, tokStart, tokEnd, tokPos) {
        let lastLeftMatch = hack.tokTree;
        let node
        if (type == types.eof) {
            return
        }
        if (type == types.regexp && lastLeftMatch._e && lastLeftMatch._e._t.binop == 10) {
            // verify this one
            node = lastLeftMatch._e
        } else if (hack.compact && lastLeftMatch._e &&
          (
            type == types.name && lastLeftMatch._e._t == types.dot ||
            type == types.dot && lastLeftMatch._e._t == types.name
          )
        ) {
            node = lastLeftMatch._e
            node._t = type
            node.t += input.slice(tokStart, tokEnd)
        } else {
            node = new Node()
            const llmNode = lastLeftMatch;
            node._p = llmNode // n._prevLeftMatch
            node._t = type // n._type
            node.t = input.slice(tokStart, tokEnd) // n.tokenStr
            // todo: if may be useless
            if (llmNode) {
                if (!llmNode._c) {
                    llmNode._e = llmNode._c = node // t._c=t._next_identifier
                } else {
                    llmNode._e._d = node // t._down
                    node._u = llmNode._e // t._up
                    llmNode._e = node // t._end
                }
            }
        }

        if (tokEnd != tokPos) {
            node.w = input.slice(tokEnd, tokPos)
        } else {
            node.w = ''
        }

        let newLastLeftMatch = lastLeftMatch
        if (type == types.braceL || type == types.bracketL || type == types.parenL) {
            newLastLeftMatch = node
        }
        else if (type == types.braceR || type == types.bracketR || type == types.parenR) {
            if (hack.noclose) {
                if (!lastLeftMatch._e._u) {
                    delete lastLeftMatch._c
                    delete lastLeftMatch._e
                } else {
                    delete lastLeftMatch._e._u._d
                }
            }
            if (lastLeftMatch._p) {
                newLastLeftMatch = lastLeftMatch._p
            }
        }
        hack.tokTree = newLastLeftMatch
    }
})
