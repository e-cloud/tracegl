// | Code view |______________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require) {

    const fn = require("../../core/fn");
    const ui = require("../../core/ui/ui");

    const tm = require("../../core/ui/text_mix");
    const textShader = require("../../core/ui/text_shaders");

    //|  Styling
    //\____________________________________________/

    const ft1 = ui.gl.sfont(
      navigator.platform.match(/Mac/) ?
      "12px Menlo" :
      "12px Lucida Console");

    hoverText.ft = ft1
    function hoverText(g) {
        "no tracegl"
        // background
        const view = ui.rect({ f: 'mix(vec4(0,0,0,0),alpha(t.codeBg2,0.9),1-smoothstep(0.5,1.0,n.shape(2*(c-.5))))' });
        view.shape = function (vec2_v) {
            return_float(len(vec2(pow(abs(v.x), n.w / 5), pow(abs(v.y), n.h / 5))))
        }

        // scrollbars
        //b._v_ = ct.vScroll({h:'p.h - 10'})
        //b._h_ = ct.hScroll({w:'p.w - 10'})

        view.set(g)
        view.font = ft1

        //|  rendering
        //\____________________________________________/

        // shaders+-

        const ts1 = textShader.codeText;
        //	ts1.f = 'subpix(texture2D(b,vec2(e.z*0.99609375 + c.x/(512./26.), e.w*0.99609375 +
        // c.y/(128./26.))),t.codeBg,theme(fg))'
//		ts1.f = 'subpix(texture2D(b,vec2(e.z*0.99609375 + c.x/(512./13.), e.w*0.99609375 +
// c.y/(512./13.))),t.codeBg,theme(fg))'
        //ts1.f = 'subpix(texture2D(b,vec2(0.219 + c.x*0.025390625, 0.191 + c.y*0.025390625)),t.codeBg,theme(fg))'
        //	ts1.f = 'fg*0.001+vec4(c.x, c.y,e.z,1)'//+subpix(texture2D(b,1.-vec2(e.z*0.99609375 + c.x/(512./26.),
        // e.w*0.99609375 + c.y/(256./26.))),t.codeBg,theme(fg))+red' ts1.dbg = 1
        view.sh = {
            text: ui.gl.getShader(ts1), // text
            select: ui.gl.getShader(textShader.selectRect), // selection
            cursor: ui.rect.drawer({ f: 't.codeCursor' }), // cursor
            line: ui.rect.drawer({ f: 't.codeLineBg' }), // linemark
            lrShadow: ui.rect.drawer({ f: 'mix(vec4(0,0,0,0.2),vec4(0,0,0,0),c.x)' }), // dropshadow
            topShadow: ui.rect.drawer({ f: 'mix(t.codeBg,vec4(0,0,0,0),c.y)' })
        }

        // mix in behaviors
        tm.viewport(view)
        tm.cursors(view)
        tm.drawing(view)
        tm.storage(view)

        view.vps.gx = 5
        view.vps.gy = 5

        view.fit = function (x, y) {
            const w = view.tw * view.vps.sx + 2 * view.vps.gx;
            x -= 0.5 * w
            if (x + w > ui.gl.width) {
                x = fn.max(0, x + (ui.gl.width - (x + w)))
            }
            if (x < 0) x = 0

            view.show(x, y + view.vps.sy, w,
              view.th * view.vps.sy + 1 * view.vps.gy
            )
        }

        view.show = function (x, y, w, h) {
            view.l = layer
            ui.redraw(view)
            ui.redrawRect(x, y, w, h)
            view.x = x
            view.y = y
            view.w = w
            view.h = h
        }

        view.hide = function () {
            if (view.l !== -1) {
                view.l = -1
                ui.redraw(view)
            }
        }

        // rendering
        function layer() {
            ui.view(view, view.vps.o)

            //if(!b._v_.pg) b.size()
            // draw if/else markers

            view.drawSelection()
            if (view.text) view.drawText()
        }

        view.l = layer
        return view
    }

    return hoverText
})
