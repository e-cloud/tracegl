// | Trace Client|________________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require) {
    define.settings = define.settings || {};
    document.title = 'traceGL';

    const fn = require('../core/fn');
    const ui = require('../core/ui/ui');
    if (!ui.gl) return;

    const ct = require('../core/ui/controls');

    const themes = require('../core/ui/themes');

    let theme_type = define.settings.theme || 'dark';
    ui.theme(themes[define.settings.theme] || themes.dark); // set theme

    const ioChannel = require('../core/io_channel');

    const traceDb = require('./trace_db');
    const codeDb = require('./ui/code_db');
    const listView = require('./ui/list_view');
    const hoverText = require('./ui/hover_text');
    const codeBubble = require('./ui/code_bubble');

    const pass = fn.sha1hex('p4ssw0rd');
    const sess = fn.rndhex(8);
    const chan = ioChannel(`/io_${sess}_${pass}`);

    window.ui = ui;

    // theme reloading when file change
    define.reload = function (t) {
        console.log('reload', t);
        if (t.includes('themes.js')) {
            // reload themes
            require.reload('../core/themes', function (t) {
                ui.theme(t.dark);
                ui.redraw();
            });
            return 1; // dont refresh the browser
        }
    };
    ui.load(function () {
        let stackView;
        const tdb = traceDb();
        const sdb = traceDb(tdb);
        const cdb = codeDb();

        let paused;
        let paused_m;

        // io channel data function
        chan.data = function (msg) {
            if (msg.dict) {
                // parse incoming source
                cdb.parse(msg.f, msg.src);
                return tdb.addDict(msg);
            } else if (msg.settings) {
                define.settings = msg.settings;
                theme_type = define.settings.theme || 'dark';
                ui.theme(themes[define.settings.theme] || themes.dark);
                ui.redraw();
            } else {
                // we clicked pause, but we wont actually pause untill depth = 1
                if (paused && !paused_m) if (msg.d == 1) paused_m = paused;
                // we unpaused, but we wont unpause till we reach a depth = 1
                if (!paused && paused_m) if (msg.d == 1) paused_m = paused;

                if (paused_m) return;

                if (tdb.processTrace(msg) && searchBox.t.length && !searcher && matchSearch(msg)) {
                    sdb.addTrace(msg);
                    sdb.changed();
                }
            }
        };

        const bubbles = fn.list('prev', 'next');

        function clearTraces() {
            // clear the traceDb, searchDb
            // clear the bubbles and the
            tdb.clearText();
            sdb.clearText();
            tdb.msgIds = {};
            tdb.firstMessage = null;
            stackView.clearText();
            miniView.tvc = null;
            bigView.tvc = null;
            sminiView.tvc = null;
            sbigView.tvc = null;
            let b = bubbles.first();
            while (b) {
                b.hide();
                b = b.next;
            }
            tdb.changed();
            sdb.changed();
            ui.redraw();
        }

        function selectBubble(b, scroll) {
            let n = bubbles.first();
            while (n) {
                if (n != b) n.title.sel = 0;
                n = n.next;
            }
            b.title.sel = 1;
            if (scroll) {
                const v = bubbleBg._v_;
                v.ds(b.y - v.mv);
                ui.redraw(bubbleBg);
            }
        }

        function selectCall(y) {
            miniView.selectFirst(y);
            bigView.view(0, y, 0, 1, 1);
            // scroll up
            bubbleBg._v_.ds(-bubbleBg._v_.mv);
            stackView.ly = -1;
            stackView.selectFirst(0);
        }

        // respond to a selectTrace by building all the callbubbles
        sdb.selectTrace = function (m) {
            ui.dbg = m;
            // lets select the  m in tdb
            selectCall(m.y);
        };

        tdb.selectTrace = function (m) {
            //fn('selectTrace')
            let y = 0; // y pos
            let stacky = 0; // callstack counter
            const spacing = 1; // spacing between bubbles
            const rev = false; // reverse callstack
            let b = { next: bubbles.first() };
            let max = 64;
            stackView.clearText();

            if (rev) {
                while (m.p) {
                    m.p.c = m;
                    m = m.p;
                }
            }
            while (m && max > 0) {
                max--;
                // lookup line and file
                const l = tdb.lineDict[m.i];
                const f = tdb.fileDict[l && l.fid];
                if (!f) {
                    m = m.c;
                    continue;
                }

                // find available bubble for stack
                if (b) b = b.next;
                if (!b) {
                    b = codeBubble({ x: 1, y, w: 'p.w', h: 300, _parent: bubbleBg });
                    bubbles.add(b);
                    // sync selection between title and
                    (function (prev) {
                        b.title.p = function (n) {
                            const b = n._parent;
                            b.resetLine();
                            stackView.selectFirst(stackView.ly = b.stacky);
                            selectBubble(b);
                            ui.redraw(bubbleBg);
                            prev();
                        };
                    })(b.title.p);
                    b.clickLine = function (file, line) {
                        chan.send({ t: 'open', file, line });
                    };
                }

                // stackView cursor
                b.stacky = stacky;

                // build up the stackView
                stackView.addFormat(tdb.fmtCall(m), tdb.colors), stacky++;
                stackView.endLine(b);
                if (m.r && m.r.v !== '_$_undefined' && m.r.v !== undefined) {
                    stackView.addFormat(` ${tdb.fmtCall(m.r)}`, tdb.colors), stacky++;
                    stackView.endLine(b);
                    b.stackh = 2;
                } else {
                    b.stackh = 1;
                }

                // set the title on the bubble
                const headSize = b.setTitle(m, tdb);

                // position bubble
                b.x = 0;
                b.y = y;

                // select text in bubble
                const file = cdb.files[f.longName];
                const line = l.y;

                // get the function body height
                let height = (l.ey - l.y + 1) * b.body.vps.sy + headSize + 20;
                if (height > 6000) height = 6000;

                // check if we have to fetch the file
                b.setBody(m, tdb, file, line, height);
                y += height + spacing;
                // flip visibility
                if (b.l == -1) b.show(); //b.l = b.l2

                // remove callstack reversal
                if (rev) {
                    const c = m.c;
                    delete m.c;
                    m = c;
                } else {
                    m = m.p;
                }
            }
            // set total view width
            bubbleBg.vSize = y;
            bubbleBg.v_();
            // reset cursor
            stackView.selectFirst(0);
            stackView.hy = 0;
            stackView.v_();
            //bubbleBg._h_.ds(bubbleBg.hSize - bubbleBg.hScroll)
            // scroll to end
            ui.redraw();
            // hide left over bubbles
            b = b.next;
            while (b) {
                if (b.l != -1) b.hide();
                b = b.next;
            }
        };

        // main UI
        let mainGroup;
        let searchGroup;
        var miniView;
        var bigView;
        var sminiView;
        var sbigView;
        let hoverView;
        var bubbleBg;
        var searchBox;

        var searcher;

        let pattern = 0;
        let regexp = 0;

        function matchSearch(m) {
            const s = searchBox.t;
            if (s != pattern) {
                if (s.charAt(0) == '/') {
                    try {
                        regexp = new RegExp(s.slice(1), 'ig');
                    } catch (e) {
                        regexp = 0;
                    }
                } else {
                    regexp = 0;
                }
                pattern = s;
            }
            if (!regexp) {
                return m.s.includes(pattern);
            } else {
                return m.s.match(regexp) != null;
            }
        }

        function doSearch() {
            const s = searchBox.t;
            if (s.length) {
                mainGroup.hide();
                searchGroup.show();
                // first we clear the sdb
                sdb.clearText();
                if (searcher) clearInterval(searcher);
                sminiView.tvc = null;
                sbigView.tvc = null;
                let n = tdb.text.first();
                searcher = setInterval(function () {
                    const dt = fn.dt();
                    // we process n and a few others
                    let ntraces = 1000;
                    let nblocks = 500;
                    while (n && nblocks > 0 && ntraces > 0) {
                        // go through the lines
                        for (const m of n.ld) {
                            // simple search
                            if (matchSearch(m)) {
                                ntraces--;
                                sdb.addTrace(m);
                            }
                        }

                        nblocks--;
                        n = n._nextSibling;
                    }
                    sdb.changed();
                    if (!n) clearInterval(searcher), searcher = 0;
                }, 0);
            } else {
                mainGroup.show();
                searchGroup.hide();
            }
        }

        // main UI
        ui.group(function (n) {
            ui.rect(function (n) {
                n.f = 't.defbg';
                n.h = 32;
                ct.button({
                    y: 2,
                    x: 2,
                    w: 80,
                    t: 'Theme',
                    c() {
                        if (theme_type == 'dark') {
                            theme_type = 'light';
                        } else {
                            theme_type = 'dark';
                        }
                        ui.theme(themes[theme_type]);
                    }
                });
                ct.button({
                    y: 2,
                    x: 84,
                    w: 80,
                    t: 'Clear',
                    c() {
                        clearTraces();
                    }
                });
                ct.button({
                    y: 2,
                    w: 80,
                    x: 166,
                    t: 'Pause',
                    c(n) {
                        if (!n.paused) {
                            paused = n.paused = true;
                            n.ohc = n.hc;
                            n.hc = 'vec4(1,0,0,1)';
                        } else {
                            paused = n.paused = false;
                            n.hc = n.ohc;
                        }

                        // restart the nodejs app under testing and clears traces
                    }
                });
                ct.button({
                    y: 2,
                    x: 248,
                    w: 22,
                    t: 'x',
                    c() {
                        searchBox.t = '';
                        doSearch();
                    }
                });
                searchBox = ct.edit({
                    empty: 'search filter',
                    y: 2,
                    x: 272,
                    w: 'p.w - n.x',
                    c(n) {
                        doSearch();
                    }
                });
            });
            ct.vSplit(function (n) {
                n.y = 28;

                ui.group(function (n) {
                    n.h = 200;
                    ui.test = function () {
                        fn(n.eval('h'));
                    };
                    mainGroup = ct.hSplit(function (n) {
                        miniView = listView({ w: 267, zm: 0, db: tdb });
                        bigView = listView({ db: tdb, cursor: miniView });
                        // we also have a textView here which we flip to visible occasionally
                        // set alloc shader
                        cdb.sh.text = miniView.sh.text;
                    });
                    searchGroup = ct.hSplit(function (n) {
                        sminiView = listView({ w: 267, zm: 0, db: sdb });
                        sbigView = listView({ db: sdb, cursor: sminiView });
                        sbigView.vps.gx = 7;
                    });
                    searchGroup.hide();
                });

                ct.hSplit(function (n) {
                    stackView = listView({ w: 267 });
                    stackView.vps.gx = 5;
                    stackView.vps.gy = 5;
                    stackView.ly = -1;
                    stackView.viewChange = function (x, y) {
                        if (stackView.ly != y) {
                            stackView.ly = y;
                            const c = stackView.dcs.l.first() || stackView.vcs.l.first();
                            if (c && c.d) selectBubble(c.d, true);
                        }
                    };
                    bubbleBg = ui.rect(function (n) {
                        n.f = 't.defbg'; //mix(vec4(.2,.2,.2,1),vec4(.4,.4,.4,1),c.y)'
                        n.l = 1;
                        n._h_ = ct.hScrollHider();
                        n._v_ = ct.vScrollHider();
                        ct.hvScroll(n);
                    });
                });
            });
            // the hover info view
            n.hoverView = hoverView = hoverText();
            n.miniView = miniView;
            n.bigView = bigView;
            n.bubbleBg = bubbleBg;
            n.stackView = stackView;
            n.selectCall = selectCall;
            hoverView.show(false);
        });

        chan.send({ t: 'join' });

        ui.drawer();
    });
});
