// | Instrumenter |______________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(require => {
    const log = require('../core/fn');
    const acorn = require('../core/acorn');
    const acorn_tools = require('../core/acorn_tools');
    const io_channel = require('../core/io_channel');
    const dlog = require('../core/debug-helper');
    const Table = require('cli-table');

    const G_STR = '_$_';

    function tracehub() {
        //TRACE
        try {
            _$_;
        }
        catch (error) {
            _$_ = {};
            (function () {
                const isNode = typeof process != 'undefined';
                const isBrowser = typeof window != 'undefined';
                const isWorker = !isNode && !isBrowser;

                if (isNode) global._$_ = _$_;

                const max_depth = 1;
                const max_count = 5;

                function dump(input, depth) {
                    const type = typeof input;
                    if (type == 'string') {
                        if (input.length > 100) {
                            return `${input.slice(0, 100)}...`;
                        }
                        return input;
                    }
                    if (type == 'boolean') {
                        return input;
                    }
                    if (type == 'number') {
                        if (input === Infinity) {
                            return '_$_Infinity';
                        }
                        if (input == NaN) {
                            return '_$_NaN';
                        }
                        return input;
                    }
                    if (type == 'function') {
                        return '_$_function';
                    }
                    if (type == 'undefined') {
                        return '_$_undefined';
                    }
                    if (type == 'object') {
                        if (input === null) {
                            return null;
                        }
                        if (Array.isArray(input)) {
                            if (input.length == 0) {
                                return [];
                            }
                            if (depth >= max_depth) {
                                return '_$_[..]';
                            }
                            var out = [];
                            for (var k = 0; k < input.length && k < max_count; k++) {
                                const m = input[k];
                                out[k] = dump(m, depth + 1);
                            }
                            if (k < input.length) {
                                out[k] = '...';
                            }
                            return out;
                        }
                        if (depth >= max_depth) {
                            return '_$_{..}';
                        }
                        var obj = {};
                        let count = 0;
                        try {
                            let pd;
                            for (var k in input) {
                                if (pd = Object.getOwnPropertyDescriptor(input, k)) {
                                    if (count++ > max_count) {
                                        obj['...'] = 1;
                                        break;
                                    }
                                    if (pd.value !== undefined) {
                                        obj[k] = dump(pd.value, depth + 1);
                                    }
                                }
                            }
                        }
                        catch (e) {
                        }
                        return obj;
                    }
                }

                const channel = //CHANNEL
                  0;
                if (isBrowser) {
                    _$_.channel = channel('/io_X_X');
                    _$_.channel.data = function (msg) {
                        if (msg.reload) location.reload();
                    };
                    //_$_.channel = {send : function(){}}
                    window.onerror = function (error, url, linenr) {
                        console.log('onerror', error, url, linenr)
                    };
                } else if (isWorker) {
                    _$_.channel = {
                        send() {}
                    };
                } else if (isNode) {
                    _$_.channel = {
                        send(m) {
                            try {
                                if (process.send) {
                                    process.send(m);
                                } else {
                                    process.stderr.write(`\x1F${JSON.stringify(m)}\x17`);
                                }
                            }
                            catch (e) {
                                console.log('test', e, m);
                            }
                        }
                    };
                }
                let depth = 0; // depth
                let depthId = 0;
                let gc = 1;

                let lastReturn = 0; // last return

                // function call entry
                if (typeof global !== 'undefined') {
                    _$_.enter = function (lineId, args, thisObj, upWhat) {
                        if (lastReturn) {
                            console.log('\nenter', lastReturn)
                            _$_.channel.send(lastReturn, 1);
                            lastReturn = 0;
                        }
                        // dump arguments
                        depth++;
                        if (!depthId) {
                            depthId = global.setTimeout(function () {
                                depthId = depth = 0;
                            }, 0);
                        }
                        const msg = {
                            i: lineId,
                            g: gc++,
                            d: depth,
                            u: upWhat,
                            t: global.Date.now()
                        };
                        if (args) {
                            msg.a = [];
                            for (let j = 0; j < args.length; j++) {
                                msg.a[j] = dump(args[j], 0);
                            }
                        } else {
                            msg.a = null;
                        }
                        console.log('\nenter', msg)
                        _$_.channel.send(msg);
                        return msg.g;
                    };
                } else {
                    _$_.enter = function (lineId, args, thisObj, upWhatttt) {
                        if (lastReturn) {
                            console.log('\nenter', lastReturn)
                            _$_.channel.send(lastReturn, 1);
                            lastReturn = 0;
                        }
                        // dump arguments
                        depth++;
                        if (!depthId) {
                            depthId = setTimeout(function () {
                                depthId = depth = 0;
                            }, 0);
                        }
                        const msg = {
                            i: lineId,
                            g: gc++,
                            d: depth,
                            u: upWhatttt,
                            t: Date.now()
                        };
                        if (args) {
                            msg.a = [];
                            for (let j = 0; j < args.length; j++) {
                                msg.a[j] = dump(args[j], 0);
                            }
                        } else {
                            msg.a = null;
                        }
                        console.log('\nenter', msg)
                        _$_.channel.send(msg);
                        return msg.g;
                    };
                }

                // callsite annotation for last return
                _$_.callLine = function (lineId, returnVal) {
                    if (!lastReturn) {
                        return returnVal;
                    }
                    lastReturn.c = lineId;
                    console.log('\ncallLine', lastReturn)
                    _$_.channel.send(lastReturn);
                    lastReturn = 0;
                    return returnVal;
                };
                // function exit
                _$_.exit = function (lineId, ret, value, x) {
                    if (lastReturn) {
                        console.log('\nexit', lastReturn)
                        _$_.channel.send(lastReturn, 1);
                        lastReturn = 0;
                    }
                    for (const k in ret) {
                        const localVar = ret[k];
                        if (localVar !== null) {
                            const t = typeof localVar;
                            if (t == 'undefined' || t == 'function') {
                                ret[k] = `_$_${t}`;
                            } else if (t == 'object') {
                                ret[k] = dump(localVar, 0);
                            } else if (t == 'number') {
                                if (localVar === Infinity) {
                                    ret[k] = '_$_Infinity';
                                }
                                if (localVar === NaN) {
                                    ret[k] = '_$_NaN';
                                }
                            }
                        }
                    }
                    ret.g = gc++;
                    ret.i = lineId;
                    ret.d = depth;
                    if (arguments.length > 2) {
                        ret.v = dump(value, 0);
                        ret.x = x;
                    }
                    lastReturn = ret;
                    if (depth > 0) {
                        depth--;
                    }
                    return value;
                };
            })();
        }
        //TRACE
    }

    let head;

    function mkHead() {
        function strip(input) {
            /* var program = acorn_tools.parse(input)
             var table = new Table()
             program.tokens.walk(function (n) {
             table.push(dlog.raw(n))
             })
             console.log(table.toString())*/
            return input;
        }

        // trace impl
        const traceSrc = tracehub.toString().match(/\/\/TRACE[\s\S]*\/\/TRACE/)[0];
        // fetch io channel
        for (const k in define.factory) {
            if (k.includes('core/io_channel')) {
                const chn = define.factory[k].toString().match(/\/\/CHANNEL(?:\n|\r)([\s\S]*)\/\/CHANNEL/)[1].trim();
                return strip(`${ traceSrc.replace('//CHANNEL', chn) }\n`);
            }
        }
    }

    function instrument(file, src, inputId, options) {
        if (!head) {
            head = mkHead();
        }
        src = src.replace(/^#.*?\n/, '\n').replace(/\t/g, '   ');
        let node;
        try {
            node = acorn.parse(src, { locations: 1 });
        }
        catch (err) {
            log(`Parse error instrumenting ${ file } ${ err }`);
            return {
                input: src, //cutUp(cuts,src),
                output: src,
                id: inputId,
                d: {}
            };
        }

        if (options.dump) {
            log('dump', acorn_tools.dump(node));
        }
        // verify parse
        const dictionary = {};
        let id = inputId;

        const linkedList = log.list('_prevSibling', '_nextSibling');

        instrumentFn(node, file, true, 0);

        return {
            input: src, //cutUp(cuts,src),
            clean: cutUp(linkedList, src),
            output: head + cutUp(linkedList, src),
            id,
            d: dictionary
        };

        function cutUp(cuts, str) {
            let out = '';
            let begin = 0;
            let listNode = cuts.first();
            while (listNode) {
                out += str.slice(begin, listNode.i);
                out += listNode.v;
                begin = listNode.i;
                listNode = listNode._nextSibling;
            }
            out += str.slice(begin);
            return out;
        }

        // insert a item into the linked list
        function insert(index, value) {
            if (index === undefined) throw new Error();
            const listNode = {
                i: index,
                v: value
            };
            linkedList.sorted(listNode, 'i');
            return listNode;
        }

        function instrumentFn(node, name, isRoot, parentId) {
            // if the first thing in the body is
            if (node.body
                && node.body.body
                && node.body.body[0]
                && node.body.body[0].type == 'ExpressionStatement'
                && node.body.body[0].expression.type == 'Literal'
                && node.body.body[0].expression.value == 'no tracegl') {
                return;
            }

            const funcId = id;
            let fnHead;
            if (!isRoot) {
                fnHead = insert(node.body.start + 1, '');
                const args = [];
                for (let i = 0; i < node.params.length; i++) {
                    const p = node.params[i];
                    args[i] = {
                        n: acorn_tools.stringify(p),
                        x: p.loc.start.column,
                        y: p.loc.start.line,
                        ex: p.loc.end.column,
                        ey: p.loc.end.line
                    };
                }

                dictionary[id++] = {
                    x: node.body.loc.start.column,
                    y: node.body.loc.start.line,
                    ex: node.body.loc.end.column,
                    ey: node.body.loc.end.line,
                    sx: node.loc.start.column,
                    sy: node.loc.start.line,
                    n: name,
                    a: args
                };
            } else {
                fnHead = insert(node.start, '');
                dictionary[id++] = {
                    x: node.loc.start.column,
                    y: node.loc.start.line,
                    ex: node.loc.end.column,
                    ey: node.loc.end.line,
                    n: name,
                    a: [],
                    root: 1
                };
            }

            const loopIds = [];

            function addLoop(body, startPos, endPos) {
                if (!body || !('type' in body)) return;

                let x;
                let o;
                if (body.type == 'BlockStatement') {
                    x = `${ G_STR }b.l${ id }++;`;
                    o = 1;
                } else if (body.type == 'ExpressionStatement') {
                    x = `${ G_STR }b.l${ id }++,`;
                    o = 0;
                } else if (body.type == 'EmptyStatement') {
                    x = `${ G_STR }b.l${ id }++`;
                    o = 0;
                }
                if (x) {
                    insert(body.start + o, x);
                    loopIds.push(id);
                    dictionary[id++] = {
                        x: startPos.column,
                        y: startPos.line,
                        ex: endPos.column,
                        ey: endPos.line
                    };
                }
            }

            function logicalExpression(node) {
                let hasLogic = 0;
                // if we have logical expressions we only mark the if
                acorn_tools.walkDown(node, {
                    LogicalExpression(node, p) {
                        // insert ( ) around logical left and right
                        hasLogic = 1;
                        if (node.left.type != 'LogicalExpression') {
                            insert(node.left.start, `(${ G_STR }b.b${ id }=`);
                            insert(node.left.end, ')');
                            dictionary[id++] = {
                                x: node.left.loc.start.column,
                                y: node.left.loc.start.line,
                                ex: node.left.loc.end.column,
                                ey: node.left.loc.end.line
                            };
                        }
                        if (node.right.type != 'LogicalExpression') {
                            insert(node.right.start, `(${ G_STR }b.b${ id }=`);
                            insert(node.right.end, ')');
                            dictionary[id++] = {
                                x: node.right.loc.start.column,
                                y: node.right.loc.start.line,
                                ex: node.right.loc.end.column,
                                ey: node.right.loc.end.line
                            };
                        }
                    },
                    FunctionExpression() {
                        return 1;
                    },
                    FunctionDeclaration() {
                        return 1;
                    }
                });
                return hasLogic;
            }

            function needSemi(parent, pos) {
                if (pos) {
                    let c = pos - 1;
                    let cc = src.charAt(c);
                    while (c > 0) {
                        if (cc != ' ' && cc != '\t' && cc != '\r' && cc != '\n') break;
                        cc = src.charAt(--c);
                    }
                    //console.log(cc)
                    if (cc == '(') return false;
                }
                return parent.node.type ==
                       'ExpressionStatement' &&
                       (parent.up.node.type ==
                        'BlockStatement' ||
                        parent.up.node.type ==
                        'Program' ||
                        parent.up.node.type ==
                        'SwitchCase');
            }

            acorn_tools.walkDown(isRoot ? node : node.body, {
                FunctionExpression(node, parent) {
                    //return 1
                    let name = 'function()';
                    acorn_tools.walkUp(parent, {
                        VariableDeclarator(node) {
                            return name = acorn_tools.stringify(node.id);
                        },
                        AssignmentExpression(node) {
                            return name = acorn_tools.stringify(node.left);
                        },
                        ObjectExpression(node, parent) {
                            return name = acorn_tools.stringify(parent.key);
                        },
                        CallExpression(node) {
                            let id = ''; // use deepest id as name
                            acorn_tools.walkDown(node.callee, {
                                Identifier(node) {
                                    id = node.name;
                                }
                            });
                            if (id == 'bind') return;
                            return name = `${ node.callee.type == 'FunctionExpression' ? '()' : id }->`;
                        }
                    });
                    instrumentFn(node, name, false, funcId);
                    return 1;
                },
                FunctionDeclaration(node) {
                    //return 1
                    instrumentFn(node, acorn_tools.stringify(node.id), false, funcId);
                    return 1;
                },
                ForInStatement(node) {
                    addLoop(node.body, node.loc.start, node.body.loc.start);
                },
                ForStatement(node) {
                    addLoop(node.body, node.loc.start, node.body.loc.start);
                },
                WhileStatement(node) {
                    addLoop(node.body, node.loc.start, node.body.loc.start);
                },
                DoWhileStatement(node) {
                    addLoop(node.body, node.loc.start, node.body.loc.start);
                },
                IfStatement(node) {
                    const b = node.test;
                    insert(b.start, `${ G_STR }b.b${ id }=`);
                    const m = dictionary[id++] = {
                        x: node.loc.start.column,
                        y: node.loc.start.line,
                        ex: node.test.loc.end.column + 1,
                        ey: node.test.loc.end.line
                    };
                    // lets go and split apart all boolean expressions in our test
                    if (logicalExpression(node.test)) {
                        m.ex = m.x + 2;
                        m.ey = m.y;
                    }
                    //addBlock(node.consequent)
                    //addBlock(node.alternate)
                },
                ConditionalExpression(node, parent) {
                    const b = node.test;
                    if (!logicalExpression(node.test)) {
                        insert(b.start, `${ needSemi(parent, b.start) ? ';' : '' }(${ G_STR }b.b${ id }=`);

                        insert(b.end, ')');
                        dictionary[id++] = {
                            x: b.loc.start.column,
                            y: b.loc.start.line,
                            ex: b.loc.end.column + 1,
                            ey: b.loc.end.line
                        };
                    }
                },
                SwitchCase(node) {
                    const testNode = node.test;
                    if (testNode) {
                        insert(node.colon, `${ G_STR }b.b${ id }=1;`);
                        dictionary[id++] = {
                            x: node.loc.start.column,
                            y: node.loc.start.line,
                            ex: testNode.loc.end.column,
                            ey: testNode.loc.end.line
                        };
                    }
                },
                VariableDeclarator(node) {
                    if (node.init &&
                        node.init.type !=
                        'Literal' &&
                        node.init.type !=
                        'FunctionExpression' &&
                        node.init.type !=
                        'ObjectExpression') {
                        addAssign(node.id.loc, node.init.start);
                    }
                },
                ObjectExpression(node) {
                    for (let i = 0; i < node.properties.length; i++) {
                        const k = node.properties[i].key;
                        const v = node.properties[i].value;
                        if (v &&
                            v.type !=
                            'Literal' &&
                            v.type !=
                            'FunctionExpression' &&
                            v.type !=
                            'ObjectExpression') {
                            addAssign(k.loc, v.start);
                        }
                    }
                },
                AssignmentExpression(node) {
                    if (/*node.operator == '='*/node.right.type !=
                                                'Literal' &&
                                                node.right.type !=
                                                'FunctionExpression' &&
                                                node.right.type !=
                                                'ObjectExpression') {
                        addAssign(node.left.loc, node.right.start);
                    }
                },
                CallExpression(node, parent) {
                    // only if we are the first of a SequenceExpression
                    if (parent.node.type ==
                        'SequenceExpression' &&
                        parent.node.expressions[0] ==
                        node) {
                        parent = parent.up;
                    }
                    insert(node.start, `${ needSemi(parent, node.start) ? ';' : '' }(${ G_STR }.callLine(${ id },`);
                    insert(node.end - 1, '))');
                    const a = [];

                    for (const arg of node.arguments) {
                        if (arg) {
                            a.push({
                                x: arg.loc.start.column,
                                y: arg.loc.start.line,
                                ex: arg.loc.end.column,
                                ey: arg.loc.end.line
                            });
                        } else {
                            a.push(null);
                        }
                    }

                    let ce = 0;
                    if (node.callee.type == 'MemberExpression') {
                        if (node.callee.property.name == 'call') ce = 1;
                        if (node.callee.property.name == 'apply') ce = 2;
                    }
                    dictionary[id++] = {
                        x: node.callee.loc.start.column,
                        y: node.callee.loc.start.line,
                        ex: node.callee.loc.end.column,
                        ey: node.callee.loc.end.line,
                        a,
                        ce
                    };
                },
                NewExpression(node, parent) {
                    if (parent.node.type ==
                        'SequenceExpression' &&
                        parent.node.expressions[0] ==
                        node) {
                        parent = parent.up;
                    }
                    insert(node.start, `${ needSemi(parent, node.start) ? ';' : '' }(${ G_STR }.callLine(${ id },`);
                    insert(node.end, '))');
                    const a = [];

                    for (const arg of node.arguments) {
                        if (arg) {
                            a.push({
                                x: arg.loc.start.column,
                                y: arg.loc.start.line,
                                ex: arg.loc.end.column,
                                ey: arg.loc.end.line
                            });
                        } else {
                            a.push(null);
                        }
                    }

                    dictionary[id++] = {
                        isnew: 1,
                        x: node.callee.loc.start.column,
                        y: node.callee.loc.start.line,
                        ex: node.callee.loc.end.column,
                        ey: node.callee.loc.end.line,
                        a
                    };
                },
                ReturnStatement(node) {
                    if (node.argument) {
                        //assignId.push(id)
                        //cut(node.start+6, " "+gs+".b="+gs+"b,"+gs + "["+iid+"][" + (id-iid) + "]=")
                        insert(node.argument.start, `(${ G_STR }.exit(${ id },${ G_STR }b,(`);
                        insert(node.argument.end, ')))');
                    } else {
                        insert(node.start + 6, ` ${ G_STR }.exit(${ id }, ${ G_STR }b)`);
                    }
                    dictionary[id++] = {
                        x: node.loc.start.column,
                        y: node.loc.start.line,
                        ret: funcId,
                        r: 1
                    };
                    // return object injection
                },
                CatchClause(node) {
                    // catch clauses need to send out a depth-reset message
                    // cut(node.body.start + 1, gs + '.x('+gs+'d,'+gs+'b.x'+id+'='+ac.stringify(node.param)+');')
                    insert(node.body.start + 1, `${ G_STR }b.x${ id }=${ acorn_tools.stringify(node.param) };`);

                    // lets store the exception as logic value on the catch
                    dictionary[id++] = {
                        x: node.loc.start.column,
                        y: node.loc.start.line,
                        ex: node.loc.start.column + 5,
                        ey: node.loc.start.line
                    };
                }
            });

            function addAssign(mark, inj) {
                insert(inj, `${ G_STR }b.a${ id }=`);
                dictionary[id++] = {
                    x: mark.start.column,
                    y: mark.start.line,
                    ex: mark.end.column,
                    ey: mark.end.line
                };
            }

            // write function entry
            let str = `var ${ G_STR }b={};`;
            if (loopIds.length) {
                str = `var ${ G_STR }b={`;
                for (var i = 0; i < loopIds.length; i++) {
                    if (i) str += ',';
                    str += `l${ loopIds[i] }:0`;
                }
                str += '};';
            }

            let tryStart = 'try{';
            let tryEnd = `}catch(x){${ G_STR }.exit(${ id },${ G_STR }b,x,1);throw x;}`;

            if (options.nocatch) {
                tryStart = '';
                tryEnd = '';
            }

            if (isRoot) {
                fnHead.v = `var ${ G_STR }g${ funcId }=${ G_STR }.enter(${ funcId },null,0,0);${ str }${ tryStart }`;
                insert(node.end, `;${ G_STR }.exit(${ id },${ G_STR }b)${ tryEnd }`);
                dictionary[id++] = {
                    x: node.loc.end.column,
                    y: node.loc.end.line,
                    ret: funcId,
                    root: 1
                };
            } else {
                fnHead.v = `var ${ G_STR }g${ funcId }=${ G_STR }.enter(${ funcId },arguments,this,${ G_STR }g${ parentId });${ str }${ tryStart }`;
                insert(node.body.end - 1, `;${ G_STR }.exit(${ id },${ G_STR }b)${ tryEnd }`);
                dictionary[id++] = {
                    x: node.body.loc.end.column,
                    y: node.body.loc.end.line,
                    ret: funcId
                };
            }
        }
    }

    return instrument;
});
