// | Acorn.js tools |____________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports, module) {
    'no tracegl';

    const acornEx = require('./acorn.ex');

    exports.dump = function (node, tok = '') {
        const IsArray = Array.isArray(node);
        let start = IsArray ? '[' : '{';
        for (const key in node) {
            if (node.hasOwnProperty(key)) {

                if (key == 'parent' || key == 'tokens' || key == 'start' || key == 'end' || key == 'token' || key == 'loc') continue;
                if (key == 'token') {
                    start += `\n${tok}token: ${node[key].t}`;
                    continue;
                }
                const value = node[key];
                start += `\n${tok}${key}: `;
                if (typeof value == 'object') {
                    start += exports.dump(value, `${tok} `);
                } else {
                    start += value;
                }
            }
        }
        start += `\n${tok.slice(1)}${IsArray ? ']' : '}'}`;
        return start;
    };

    //
    // AST walker
    //

    // reference: https://github.com/estree/estree ||
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/estree/index.d.ts
    const walk = {
        Literal: {}, // 1 single node
        Identifier: {}, // 2 array of nodes
        Program: { body: 2 }, // 3 key structure
        ExpressionStatement: { expression: 1 }, // 4 value endpoint
        ClassDeclaration: { id: 1, superClass: 1, body: 1 },
        ClassExpression: { id: 1, superClass: 1, body: 1 },
        ArrayExpression: { elements: 2 },
        ArrowFunctionExpression: { expression: 1, body: 1, params: 2 },
        AssignmentExpression: { left: 1, right: 1 },
        BinaryExpression: { left: 1, right: 1 },
        BlockStatement: { body: 2 },
        BreakStatement: { label: 1 },
        CallExpression: { callee: 1, arguments: 2 },
        CatchClause: { param: 1, body: 1 },
        ConditionalExpression: { test: 1, consequent: 1, alternate: 1 },
        ContinueStatement: {},
        DebuggerStatement: {},
        DoWhileStatement: { body: 1, test: 1 },
        EmptyStatement: {},
        ForInStatement: { left: 1, right: 1, body: 1 },
        ForOfStatement: { left: 1, right: 1, body: 1 },
        ForStatement: { init: 1, test: 1, update: 1, body: 1 },
        FunctionDeclaration: { id: 4, params: 2, body: 1 },
        FunctionExpression: { id: 4, params: 2, body: 1 },
        IfStatement: { test: 1, consequent: 1, alternate: 1 },
        LabeledStatement: { body: 1, label: 4 },
        LogicalExpression: { left: 1, right: 1 },
        MemberExpression: { object: 1, property: 1 },
        MethodDefinition: { key: 1, value: 1 },
        NewExpression: { callee: 1, arguments: 2 },
        ObjectExpression: { properties: 2 },
        ReturnStatement: { argument: 1 },
        SequenceExpression: { expressions: 2 },
        SpreadElement: { argument: 1 },
        SwitchCase: { consequent: 2, test: 1 },
        SwitchStatement: { discriminant: 1, cases: 2 },
        TemplateLiteral: { quasis: 2, expressions: 2 },
        ThisExpression: {},
        ThrowStatement: { argument: 1 },
        TryStatement: { block: 1, handler: 1, finalizer: 1 },
        UnaryExpression: { argument: 1 },
        UpdateExpression: { argument: 1 },
        VariableDeclaration: { declarations: 2 },
        VariableDeclarator: { id: 4, init: 1 },
        WhileStatement: { test: 1, body: 1 },
        WithStatement: { object: 1, body: 1 },
    };

    // walk through the ast tree
    function walkDown(node, walkerMap, parent) {
        if (!node) return;
        const traverseFunc = walkerMap[node.type];
        if (traverseFunc) {
            if (traverseFunc(node, parent)) return;
        }
        const typeMap = walk[node.type];
        for (const key in typeMap) {
            const type = typeMap[key]; // type
            const nodeProp = node[key]; // node prop
            if (type == 2) {
                // array
                if (!Array.isArray(nodeProp)) {
                    throw new Error(`invalid type: ${node.type}`);
                }
                for (let i = 0; i < nodeProp.length; i++) {
                    walkDown(nodeProp[i], walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node,
                        index: i
                    });
                }
            } else if (type == 3) {
                // keys
                if (!Array.isArray(nodeProp)) {
                    throw new Error(`invalid type: ${node.type}`);
                }
                for (let i = 0; i < nodeProp.length; i++) {
                    walkDown(nodeProp[i].value, walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node,
                        index: i,
                        key: nodeProp[i].key
                    });
                }
            } else {
                // single node or value
                if (nodeProp) {
                    walkDown(nodeProp, walkerMap, {
                        up: parent,
                        sub: key,
                        type: node.type,
                        node
                    });
                }
            }
        }
    }

    function walkUp(p, o) {
        while (p) {
            const f = o[p.node.type];
            if (f && f(p.node, p)) break;
            p = p.up;
        }
    }

    exports.walkDown = walkDown;
    exports.walkUp = walkUp;

    //
    // AST serializer
    //

    let strSeparator;

    function stringifyExpression(expr) {
        if (!expr || !expr.type) return '';
        return stringifyExpressionMap[expr.type](expr);
    }

    function stringifyBlock(b) {
        let s = '';
        for (let i = 0; i < b.length; i++) {
            s += stringifyExpression(b[i]) + strSeparator;
        }
        return s;
    }

    function stringifySeq(b) {
        let s = '';
        for (let i = 0; i < b.length; i++) {
            if (i) s += ', ';
            s += stringifyExpression(b[i]);
        }
        return s;
    }

    const stringifyExpressionMap = {
        Literal(n) {
            return n.raw;
        },
        Identifier(n) {
            return n.name;
        },
        Program(n) {
            return stringifyBlock(n.body);
        },
        ExpressionStatement(n) {
            return stringifyExpression(n.expression);
        },
        BreakStatement(n) {
            return 'break';
        },
        ContinueStatement(n) {
            return 'continue';
        },
        DebuggerStatement(n) {
            return 'debugger';
        },
        DoWhileStatement(n) {
            return `do${stringifyExpression(n.body)}${strSeparator}while(${stringifyExpression(n.test)})`;
        },
        ReturnStatement(n) {
            return `return ${stringifyExpression(n.argument)}`;
        },
        SwitchStatement(n) {
            return `switch(${stringifyExpression(n.discriminant)}){${stringifyBlock(n.cases)}}`;
        },
        SwitchCase(n) {
            return `case ${stringifyExpression(n.test)}:${strSeparator}${stringifyBlock(n.consequent)}`;
        },
        WhileStatement(n) {
            return `while(${stringifyExpression(n.test)})${stringifyExpression(n.body)}`;
        },
        WithStatement(n) {
            return `with(${stringifyExpression(n.object)})${stringifyExpression(n.body)}`;
        },
        EmptyStatement(n) {
            return '';
        },
        LabeledStatement(n) {
            return `${stringifyExpression(n.label)}:${strSeparator}${stringifyExpression(n.body)}`;
        },
        BlockStatement(n) {
            return `{${strSeparator}${stringifyBlock(n.body)}}`;
        },
        ForStatement(n) {
            return `for(${stringifyExpression(n.init)};${stringifyExpression(n.test)};${stringifyExpression(n.update)})${stringifyExpression(n.body)}`;
        },
        ForInStatement(n) {
            return `for(${stringifyExpression(n.left)} in ${stringifyExpression(n.right)})${stringifyExpression(n.body)}`;
        },
        VariableDeclarator(n) {
            return `${stringifyExpression(n.id)} = ${stringifyExpression(n.init)}`;
        },
        VariableDeclaration(n) {
            return `var ${stringifySeq(n.declarations)}`;
        },
        SequenceExpression(n) {
            return stringifySeq(n.expressions);
        },
        AssignmentExpression(n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right);
        },
        ConditionalExpression(n) {
            return `${stringifyExpression(n.test)}?${stringifyExpression(n.consequent)}:${stringifyExpression(n.alternate)}`;
        },
        LogicalExpression(n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right);
        },
        BinaryExpression(n) {
            return stringifyExpression(n.left) + n.operator + stringifyExpression(n.right);
        },
        UpdateExpression(n) {
            return n.prefix ? n.operator + stringifyExpression(n.argument) : stringifyExpression(n.argument) + n.operator;
        },
        UnaryExpression(n) {
            return n.prefix ? n.operator + stringifyExpression(n.argument) : stringifyExpression(n.argument) + n.operator;
        },
        CallExpression(n) {
            return `${stringifyExpression(n.callee)}(${stringifySeq(n.arguments)})`;
        },
        ThisExpression(n) {
            return 'this';
        },
        ArrayExpression(n) {
            return `[${stringifySeq(n.elements)}]`;
        },
        NewExpression(n) {
            return `new ${stringifyExpression(n.callee)}(${stringifySeq(n.arguments)})`;
        },
        FunctionDeclaration(n) {
            return `function${n.id ? ' ' + stringifyExpression(n.id) : ''}(${stringifySeq(n.params)})${stringifyExpression(n.body)}`;
        },
        FunctionExpression(n) {
            return `function${n.id ? ' ' + stringifyExpression(n.id) : ''}(${stringifySeq(n.params)})${stringifyExpression(n.body)}`;
        },
        ObjectExpression(n) {
            let str = '{';
            const b = n.properties;
            for (let i = 0; i < b.length; i++) {
                if (i) {
                    str += ', ';
                }
                str += `${stringifyExpression(b.key)}:${stringifyExpression(b.value)}`;
            }
            str += '}';
            return str;
        },
        MemberExpression(n) {
            if (n.computed) {
                return `${stringifyExpression(n.object)}[${stringifyExpression(n.property)}]`;
            }
            return `${stringifyExpression(n.object)}.${stringifyExpression(n.property)}`;
        },
        IfStatement(n) {
            return `if(${stringifyExpression(n.test)})${stringifyExpression(n.consequent)}${strSeparator}${n.alternate ? 'else ' + stringifyExpression(n.alternate) + strSeparator : ''}`;
        },
        ThrowStatement(n) {
            return `throw ${stringifyExpression(n.argument)}`;
        },
        TryStatement(n) {
            return `try ${stringifyExpression(n.block)}${strSeparator}${stringifyBlock(n.handlers)}${strSeparator}${n.finalizer ? 'finally ' + stringifyBlock(n.finalizer) : ''}`;
        },
        CatchClause(n) {
            return `catch(${stringifyExpression(n.param)}${n.guard ? ' if ' + stringifyExpression(n.guard) : ')'}${stringifyExpression(n.body)}`;
        }
    };

    function stringify(n, sep) {
        strSeparator = sep || '\n';
        return stringifyExpression(n);
    }

    exports.stringify = stringify;

    // acorn parse wrapper that also spits out a token tree
    exports.parse = acornEx.parse;
});
