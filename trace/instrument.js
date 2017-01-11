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

    const Global_STR = '_$_';

    function tracehub() {
        //TRACE
        try {
            _$_;
        } catch (error) {
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
                            var o = [];
                            for (var k = 0; k < input.length && k < max_count; k++) {
                                const m = input[k];
                                o[k] = dump(m, depth + 1);
                            }
                            if (k < input.length) {
                                o[k] = '...';
                            }
                            return o;
                        }
                        if (depth >= max_depth) {
                            return '_$_{..}';
                        }
                        var o = {};
                        let c = 0;
                        try {
                            let pd;
                            for (var k in input) {
                                if (pd = Object.getOwnPropertyDescriptor(input, k)) {
                                    if (c++ > max_count) {
                                        o['...'] = 1;
                                        break;
                                    }
                                    if (pd.value !== undefined) {
                                        o[k] = dump(pd.value, depth + 1);
                                    }
                                }
                            }
                        } catch (e) {}
                        return o;
                    }
                }

                const channel = //CHANNEL
                0;
                if (isBrowser) {
                    _$_.ch = channel('/io_X_X');
                    _$_.ch.data = function (m) {
                        if (m.reload) location.reload();
                    };
                    //_$_.ch = {send : function(){}}
                    window.onerror = function (error, url, linenr) {};
                } else if (isWorker) {
                    _$_.ch = {
                        send() {}
                    };
                } else if (isNode) {
                    _$_.ch = {
                        send(m) {
                            try {
                                if (process.send) {
                                    process.send(m);
                                } else {
                                    process.stderr.write(`\x1F${JSON.stringify(m)}\x17`);
                                }
                            } catch (e) {
                                console.log(e, m);
                            }
                        }
                    };
                }
                const lgc = 0;
                let depth = 0; // depth
                let di = 0;
                let gc = 1;

                let leftReturn = 0; // last return

                // function call entry

                if (typeof global !== 'undefined') {
                    _$_.f = function (i, a, t, u) {
                        if (leftReturn) {
                            _$_.ch.send(leftReturn, 1);
                            leftReturn = 0;
                        }
                        // dump arguments
                        depth++;
                        if (!di) {
                            di = global.setTimeout(function () {
                                di = depth = 0;
                            }, 0);
                        }
                        const r = {
                            i,
                            g: gc++,
                            d: depth,
                            u,
                            t: global.Date.now()
                        };
                        if (a) {
                            r.a = [];
                            for (let j = 0; j < a.length; j++) {
                                r.a[j] = dump(a[j], 0);
                            }
                        } else {
                            r.a = null;
                        }
                        _$_.ch.send(r);
                        return r.g;
                    };
                } else {
                    _$_.f = function (i, a, t, u) {
                        if (leftReturn) {
                            _$_.ch.send(leftReturn, 1);
                            leftReturn = 0;
                        }
                        // dump arguments
                        depth++;
                        if (!di) {
                            di = setTimeout(function () {
                                di = depth = 0;
                            }, 0);
                        }
                        const r = {
                            i,
                            g: gc++,
                            d: depth,
                            u,
                            t: Date.now()
                        };
                        if (a) {
                            r.a = [];
                            for (let j = 0; j < a.length; j++) {
                                r.a[j] = dump(a[j], 0);
                            }
                        } else {
                            r.a = null;
                        }
                        _$_.ch.send(r);
                        return r.g;
                    };
                }

                // callsite annotation for last return
                _$_.c = function (i, v) {
                    if (!leftReturn) {
                        return v;
                    }
                    leftReturn.c = i;
                    _$_.ch.send(leftReturn);
                    leftReturn = 0;
                    return v;
                };
                // function exit
                _$_.e = function (i, r, v, x) {
                    if (leftReturn) {
                        _$_.ch.send(leftReturn, 1);
                        leftReturn = 0;
                    }
                    for (const k in r) {
                        const j = r[k];
                        if (j !== null) {
                            const t = typeof j;
                            if (t == 'undefined' | t == 'function') {
                                r[k] = `_$_${t}`;
                            } else if (t == 'object') {
                                r[k] = dump(j, 0);
                            } else if (t == 'number') {
                                if (j === Infinity) {
                                    r[k] = '_$_Infinity';
                                }
                                if (j === NaN) {
                                    r[k] = '_$_NaN';
                                }
                            }
                        }
                    }
                    r.g = gc++;
                    r.i = i;
                    r.d = depth;
                    if (arguments.length > 2) {
                        r.v = dump(v, 0);
                        r.x = x;
                    }
                    leftReturn = r;
                    if (depth > 0) {
                        depth--;
                    }
                    return v;
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
        src = src.replace(/^\#.*?\n/, '\n').replace(/\t/g, '   ');
        let node;
        try {
            node = acorn.parse(src, { locations: 1 });
        } catch (err) {
            log(`Parse error instrumenting ${ file } ${ err }`);
            return {
                input: src, //cutUp(cuts,src),
                output: src,
                id: inputId,
                d: {}
            };
        }

        if (options.dump) {
            log(acorn_tools.dump(node));
        }
        // verify parse
        const dict = {};
        let id = inputId;

        const linkedList = log.list('_u', '_d');

        instrumentFn(node, file, true, 0);

        return {
            input: src, //cutUp(cuts,src),
            clean: cutUp(linkedList, src),
            output: head + cutUp(linkedList, src),
            id,
            d: dict
        };

        function cutUp(cuts, str) {
            let s = '';
            let b = 0;
            let n = cuts.first();
            while (n) {

                s += str.slice(b, n.i);
                s += n.v;
                b = n.i;
                n = n._d;
            }
            s += str.slice(b);
            return s;
        }

        // insert a item into the linked list
        function insert(index, value) {
            if (index === undefined) throw new Error();
            const n = {
                i: index,
                v: value
            };
            linkedList.sorted(n, 'i');
            return n;
        }

        function instrumentFn(node, name, isRoot, parentId) {
            // if the first thing in the body is
            if (node.body && node.body.body && node.body.body[0] && node.body.body[0].type == 'ExpressionStatement' && node.body.body[0].expression.type == 'Literal' && node.body.body[0].expression.value == 'no tracegl') {
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

                dict[id++] = {
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
                dict[id++] = {
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
                    x = `${ Global_STR }b.l${ id }++;`;
                    o = 1;
                } else if (body.type == 'ExpressionStatement') {
                    x = `${ Global_STR }b.l${ id }++,`;
                    o = 0;
                } else if (body.type == 'EmptyStatement') {
                    x = `${ Global_STR }b.l${ id }++`;
                    o = 0;
                }
                if (x) {
                    insert(body.start + o, x);
                    loopIds.push(id);
                    dict[id++] = {
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
                    LogicalExpression(n, p) {
                        // insert ( ) around logical left and right
                        hasLogic = 1;
                        if (n.left.type != 'LogicalExpression') {
                            insert(n.left.start, `(${ Global_STR }b.b${ id }=`);
                            insert(n.left.end, ')');
                            dict[id++] = {
                                x: n.left.loc.start.column,
                                y: n.left.loc.start.line,
                                ex: n.left.loc.end.column,
                                ey: n.left.loc.end.line
                            };
                        }
                        if (n.right.type != 'LogicalExpression') {
                            insert(n.right.start, `(${ Global_STR }b.b${ id }=`);
                            insert(n.right.end, ')');
                            dict[id++] = {
                                x: n.right.loc.start.column,
                                y: n.right.loc.start.line,
                                ex: n.right.loc.end.column,
                                ey: n.right.loc.end.line
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
                return parent.node.type == 'ExpressionStatement' && (parent.up.node.type == 'BlockStatement' || parent.up.node.type == 'Program' || parent.up.node.type == 'SwitchCase');
            }

            acorn_tools.walkDown(isRoot ? node : node.body, {
                FunctionExpression(n, p) {
                    //return 1
                    let name = 'function()';
                    acorn_tools.walkUp(p, {
                        VariableDeclarator(n, p) {
                            return name = acorn_tools.stringify(n.id);
                        },
                        AssignmentExpression(n, p) {
                            return name = acorn_tools.stringify(n.left);
                        },
                        ObjectExpression(n, p) {
                            return name = acorn_tools.stringify(p.key);
                        },
                        CallExpression(n, p) {
                            let id = ''; // use deepest id as name
                            acorn_tools.walkDown(n.callee, {
                                Identifier(n) {
                                    id = n.name;
                                }
                            });
                            if (id == 'bind') return;
                            return name = `${ n.callee.type == 'FunctionExpression' ? '()' : id }->`;
                        }
                    });
                    instrumentFn(n, name, false, funcId);
                    return 1;
                },
                FunctionDeclaration(n, p) {
                    //return 1
                    instrumentFn(n, acorn_tools.stringify(n.id), false, funcId);
                    return 1;
                },
                ForInStatement(n, p) {
                    addLoop(n.body, n.loc.start, n.body.loc.start);
                },
                ForStatement(n, p) {
                    addLoop(n.body, n.loc.start, n.body.loc.start);
                },
                WhileStatement(n, p) {
                    addLoop(n.body, n.loc.start, n.body.loc.start);
                },
                DoWhileStatement(n, p) {
                    addLoop(n.body, n.loc.start, n.body.loc.start);
                },
                IfStatement(n, p) {
                    const b = n.test;
                    insert(b.start, `${ Global_STR }b.b${ id }=`);
                    const m = dict[id++] = {
                        x: n.loc.start.column,
                        y: n.loc.start.line,
                        ex: n.test.loc.end.column + 1,
                        ey: n.test.loc.end.line
                    };
                    // lets go and split apart all boolean expressions in our test
                    if (logicalExpression(n.test)) {
                        m.ex = m.x + 2;
                        m.ey = m.y;
                    }
                    //addBlock(n.consequent)
                    //addBlock(n.alternate)
                },
                ConditionalExpression(n, p) {
                    const b = n.test;
                    if (!logicalExpression(n.test)) {
                        insert(b.start, `${ needSemi(p, b.start) ? ';' : '' }(${ Global_STR }b.b${ id }=`);

                        insert(b.end, ')');
                        dict[id++] = {
                            x: b.loc.start.column,
                            y: b.loc.start.line,
                            ex: b.loc.end.column + 1,
                            ey: b.loc.end.line
                        };
                    }
                },
                SwitchCase(n, p) {
                    const testNode = n.test;
                    if (testNode) {
                        insert(n.colon, `${ Global_STR }b.b${ id }=1;`);
                        dict[id++] = {
                            x: n.loc.start.column,
                            y: n.loc.start.line,
                            ex: testNode.loc.end.column,
                            ey: testNode.loc.end.line
                        };
                    }
                },
                VariableDeclarator(n, p) {
                    if (n.init && n.init.type != 'Literal' && n.init.type != 'FunctionExpression' && n.init.type != 'ObjectExpression') {
                        addAssign(n.id.loc, n.init.start);
                    }
                },
                ObjectExpression(n, p) {
                    for (let i = 0; i < n.properties.length; i++) {
                        const k = n.properties[i].key;
                        const v = n.properties[i].value;
                        if (v && v.type != 'Literal' && v.type != 'FunctionExpression' && v.type != 'ObjectExpression') {
                            addAssign(k.loc, v.start);
                        }
                    }
                },
                AssignmentExpression(n, p) {
                    if ( /*n.operator == '='*/n.right.type != 'Literal' && n.right.type != 'FunctionExpression' && n.right.type != 'ObjectExpression') {
                        addAssign(n.left.loc, n.right.start);
                    }
                },
                CallExpression(n, p) {
                    // only if we are the first of a SequenceExpression
                    if (p.node.type == 'SequenceExpression' && p.node.expressions[0] == n) p = p.up;
                    insert(n.start, `${ needSemi(p, n.start) ? ';' : '' }(${ Global_STR }.c(${ id },`);
                    insert(n.end - 1, '))');
                    const a = [];

                    for (const arg of n.arguments) {
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
                    if (n.callee.type == 'MemberExpression') {
                        if (n.callee.property.name == 'call') ce = 1;
                        if (n.callee.property.name == 'apply') ce = 2;
                    }
                    dict[id++] = {
                        x: n.callee.loc.start.column,
                        y: n.callee.loc.start.line,
                        ex: n.callee.loc.end.column,
                        ey: n.callee.loc.end.line,
                        a,
                        ce
                    };
                },
                NewExpression(n, p) {
                    if (p.node.type == 'SequenceExpression' && p.node.expressions[0] == n) p = p.up;
                    insert(n.start, `${ needSemi(p, n.start) ? ';' : '' }(${ Global_STR }.c(${ id },`);
                    insert(n.end, '))');
                    const a = [];

                    for (const arg of n.arguments) {
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

                    dict[id++] = {
                        isnew: 1,
                        x: n.callee.loc.start.column,
                        y: n.callee.loc.start.line,
                        ex: n.callee.loc.end.column,
                        ey: n.callee.loc.end.line,
                        a
                    };
                },
                ReturnStatement(n, p) {
                    if (n.argument) {
                        //assignId.push(id)
                        //cut(n.start+6, " "+gs+".b="+gs+"b,"+gs + "["+iid+"][" + (id-iid) + "]=")
                        insert(n.argument.start, `(${ Global_STR }.e(${ id },${ Global_STR }b,(`);
                        insert(n.argument.end, ')))');
                    } else {
                        insert(n.start + 6, ` ${ Global_STR }.e(${ id }, ${ Global_STR }b)`);
                    }
                    dict[id++] = {
                        x: n.loc.start.column,
                        y: n.loc.start.line,
                        ret: funcId,
                        r: 1
                    };
                    // return object injection
                },
                CatchClause(n, p) {
                    // catch clauses need to send out a depth-reset message
                    //cut(n.body.start + 1, gs + '.x('+gs+'d,'+gs+'b.x'+id+'='+ac.stringify(n.param)+');')
                    insert(n.body.start + 1, `${ Global_STR }b.x${ id }=${ acorn_tools.stringify(n.param) };`);

                    // lets store the exception as logic value on the catch
                    dict[id++] = {
                        x: n.loc.start.column,
                        y: n.loc.start.line,
                        ex: n.loc.start.column + 5,
                        ey: n.loc.start.line
                    };
                }
            });

            function addAssign(mark, inj) {
                insert(inj, `${ Global_STR }b.a${ id }=`);
                dict[id++] = {
                    x: mark.start.column,
                    y: mark.start.line,
                    ex: mark.end.column,
                    ey: mark.end.line
                };
            }

            // write function entry
            let s = `var ${ Global_STR }b={};`;
            if (loopIds.length) {
                s = `var ${ Global_STR }b={`;
                for (var i = 0; i < loopIds.length; i++) {
                    if (i) s += ',';
                    s += `l${ loopIds[i] }:0`;
                }
                s += '};';
            }

            let tryStart = 'try{';
            let tryEnd = `}catch(x){${ Global_STR }.e(${ id },${ Global_STR }b,x,1);throw x;}`;

            if (options.nocatch) {
                tryStart = '';
                tryEnd = '';
            }

            if (isRoot) {
                fnHead.v = `var ${ Global_STR }g${ funcId }=${ Global_STR }.f(${ funcId },null,0,0);${ s }${ tryStart }`;
                insert(node.end, `;${ Global_STR }.e(${ id },${ Global_STR }b)${ tryEnd }`);
                dict[id++] = {
                    x: node.loc.end.column,
                    y: node.loc.end.line,
                    ret: funcId,
                    root: 1
                };
            } else {
                fnHead.v = `var ${ Global_STR }g${ funcId }=${ Global_STR }.f(${ funcId },arguments,this,${ Global_STR }g${ parentId });${ s }${ tryStart }`;
                insert(node.body.end - 1, `;${ Global_STR }.e(${ id },${ Global_STR }b)${ tryEnd }`);
                dict[id++] = {
                    x: node.body.loc.end.column,
                    y: node.body.loc.end.line,
                    ret: funcId
                };
            }
        }
    }

    return instrument;
});