// | Code view |______________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require) {

    const ui = require('../../core/ui/ui');

    const ct = require('../../core/ui/controls');
    const tm = require('../../core/ui/text_mix');
    const ts = require('../../core/ui/text_shaders');

    //|  Styling
    //\____________________________________________/

    const ft1 = ui.gl.sfont(navigator.platform.match(/Mac/) ? '12px Menlo' : '12px Lucida Console');

    function codeView(g) {

        // background
        const view = ui.rect({ f: 't.codeBg' });

        // scrollbars
        view._v_ = ct.vScroll({ h: 'p.h - 10' });
        view._h_ = ct.hScroll({ w: 'p.w - 10' });

        view.set(g);
        view.font = ft1;

        //|  rendering
        //\____________________________________________/

        // shaders+-
        view.sh = {
            text: ui.gl.getShader(ts.codeText), // text
            select: ui.gl.getShader(ts.selectRect), // selection
            cursor: ui.rect.drawer({ f: 't.codeCursor' }), // cursor
            line: ui.rect.drawer({ f: 't.codeLineBg' }), // linemark
            lrShadow: ui.rect.drawer({ f: 'mix(vec4(0,0,0,0.2),vec4(0,0,0,0),c.x)' }), // dropshadow
            topShadow: ui.rect.drawer({ f: 'mix(t.codeBg,vec4(0,0,0,0),c.y)' })
        };

        // mix in behaviors
        tm.viewport(view);
        tm.cursors(view);
        tm.drawing(view);

        // rendering
        view.l = function () {
            ui.view(view, view.vps.o);

            if (!view._v_.pg) view.size();
            // update line numbers
            view.linesUpdate(ui.t.codeLine);
            view.drawLineMarks();
            view.drawLines();

            ui.clip(view.vps.o.x + view.vps.gx, view.vps.o.y, view.vps.o.w - view.vps.gx, view.vps.o.h);

            // draw if/else markers

            view.drawSelection();
            if (view.text) {
                view.drawText();
            }
            view.drawCursors();

            ui.clip(view.vps.o.x, view.vps.o.y, view.vps.o.w, view.vps.o.h);
            view.drawShadows();
        };

        return view;
    }

    return codeView;
});