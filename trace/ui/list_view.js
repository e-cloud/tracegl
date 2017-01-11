// | List view |________________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports, module) {

    const fn = require('../../core/fn');
    const ui = require('../../core/ui/ui');
    const ct = require('../../core/ui/controls');
    const tm = require('../../core/ui/text_mix');
    const ts = require('../../core/ui/text_shaders');

    //|  Styling
    //\____________________________________________/

    const font1 = ui.gl.sfont(navigator.platform.match(/Mac/) ? '12px Menlo' : '12px Lucida Console');

    function listView(g) {
        const view = ui.rect({ f: 't.codeBg' });

        view._v_ = ct.vScrollHider({ h: 'p.h - 10' });
        view._h_ = ct.hScrollHider({ w: 'p.w - 10' });

        view.set(g);
        view.font = font1;
        //|  rendering
        //\____________________________________________/

        // shaders+-
        view.sh = {
            lrShadow: ui.rect.drawer({ f: 'mix(vec4(0,0,0,0.3),vec4(0,0,0,0),c.x)' }), // dropshadow
            topShadow: ui.rect.drawer({ f: 'mix(vec4(0,0,0,0.3),vec4(0,0,0,0),c.y)' }),
            text: ui.gl.getShader(ts.codeText), // text
            select: ui.gl.getShader(ts.selectRect), // selection
            cursor: ui.rect.drawer({ f: 't.codeCursor' }), // cursor
            line: ui.rect.drawer({ f: 't.codeLine' }), // linemark
            hover: ui.rect.drawer({ f: 't.codeHover' }),
            mark: ui.rect.drawer({ f: 't.codeMark' })
        };
        // mix in behaviors
        tm.viewport(view);
        tm.cursors(view, {
            singleCursor: 1,
            noSelect: 1,
            cursor: 'default'
        });
        tm.drawing(view);
        tm.storage(view);

        view.vps.gx = 0;
        view.vps.gy = 0;

        // connect to a db object
        if (view.db) {
            view.text = view.db.text;
            view.db.font = view.font;
            view.db.sh.text = view.sh.text;

            let rt = 0;
            view.db.changed(function () {
                view.tw = view.db.tw;
                view.th = view.db.th;
                if (!rt) {
                    rt = setTimeout(function () {
                        rt = 0;
                        // if the scrollbars are at 'end' we should keep them at the end
                        view.size();
                        ui.redraw(view);
                    }, 0);
                }
            });
        }

        // connect cursors
        if (view.cursor) {
            view.cursor.linked = view;
            view.vcs = view.cursor.vcs;
            view.dcs = view.cursor.dcs;
            // crosslink the 'view' change event
            view.viewChange = function (x, y) {
                //b.cursor.view(x, y, 0, 1)
                fn('here1');
            };
            let last;
            view.cursor.viewChange = function (x, y) {
                // alright so we have a cursor selection,
                // lets fetch the data stored at our first cursor
                const c = view.dcs.l.first() || view.vcs.l.first();
                //fn(c!=null, c.d!=null, last!=c.d, b.db.selectTrace !=0)
                if (c && c.d && last != c.d && view.db.selectTrace) view.db.selectTrace(last = c.d);
                view.view(x, y, 0, 1);
                if (view.cursorMove) view.cursorMove();
            };
        }

        // if we
        view.o = function () {
            // set the view back to our head cursor
            if (view.linked) {
                const c = view.vcs.l.first();
                if (c) {
                    view.linked.view(0, c.y, 0, 1, 1);
                }
            } else {
                view.hy = -1;
                ui.redraw(view);
            }
        };

        view.textHover = function () {
            if (view.linked && view.linked.cursorMove) view.linked.cursorMove();
            ui.redraw(view);
            if (view.linked) ui.redraw(view.linked);
        };

        // rendering
        let ly = 0;

        function layer() {

            ui.view(view, view.vps.o);

            if (!view._v_.pg) view.size();

            // draw hover cursor
            const y = view.hy;
            if (y >= 0) view.sh.hover.rect(view.vps.o.x, view.vps.o.y - view.vps.ss + (y + view.vps.y) * view.vps.sy + view.vps.gy, view.vps.o.w, view.vps.sy);

            if (ly != y) {
                ly = y;
                if (view.linked) {
                    view.linked.hy = y;
                    view.linked.view(0, y, 0, 1, 1);
                }
            }
            // draw selection line
            var c = view.vcs.l.first();
            while (c) {
                view.sh.mark.rect(view.vps.o.x, view.vps.o.y - view.vps.ss + (view.vps.y + c.y) * view.vps.sy + view.vps.gy, view.vps.o.w, view.vps.sy);
                c = c._d;
            }
            var c = view.dcs.l.first();
            while (c) {
                view.sh.mark.rect(view.vps.o.x, view.vps.o.y - view.vps.ss + (view.vps.y + c.y) * view.vps.sy + view.vps.gy, view.vps.o.w, view.vps.sy);
                c = c._d;
            }
            view.drawText();

            //ui.clip(b.vps.o.x, b.vps.o.y, b.vps.o.w, b.vps.o.h )
            view.drawShadows();
        }

        view.l = layer;

        view.show = function () {
            view.l = layer;
            ui.redraw(view);
        };

        view.hide = function () {
            if (view.l !== -1) {
                view.l = -1;
                ui.redraw(view);
            }
        };

        return view;
    }

    return listView;
});
