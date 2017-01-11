// | Themes |___________________________________/
// |
// | (C) Mozilla Corp
// | licensed under MPL 2.0 http://www.mozilla.org/MPL/
// \____________________________________________/

define(function (require, exports) {
    function hex(c) {
        return `vec4(${(c >> 16 & 0xff) / 255},${(c >> 8 & 0xff) / 255},${(c & 0xff) / 255},1)`;
    }

    function hexs(c) {
        return hex(parseInt(c, 16));
    }

    exports.dark = {
        subpx: 'vec4(0,0,0,1)',
        dlgbg: hexs('808080'),
        dlghi: hexs('9996e2'),
        sliderbase: 'vec4(0,0,0,0.1)',
        splitter1: hexs('333333'),
        splitter2: hexs('444444'),
        splitter3: hexs('777777'),
        dlgtxt: hexs('FFFFFF'),
        defbg2: hexs('000000'),
        defbg: hexs('333333'),
        deftxt: hexs('D3D3D3'),
        deftbg: hexs('7f7f7f'),
        selbg: hexs('9996e2'),
        seltxt: hexs('000000'),
        codeHover: hexs('2E2D52'),
        codeSelect: hexs('424171'),
        codeMark: hexs('424171'),
        //		codeMark : hexs('035487'),
        //		codeSelect: hexs('033b6e'),
        codeCursor: hexs('FFFFFF'),
        codeBg2: hexs('4c4c4c'),
        codeCall: hexs('033b6e'),
        codeSelf: hexs('4D55A1'),
        codeArg: hexs('032c54'),
        codeBg: hexs('151426'),
        //		codeBg: hexs('001e3e'),
        codeFg: hexs('FFFFFF'),
        codeLineBg: hexs('001625'),
        codeLine: hexs('7a909e'),
        codeTab: hexs('3f5c73'),
        codeNumber: hexs('fb638d'),
        codeVardef: hexs('fdec85'),
        codeName: hexs('FFFFFF'),
        codeString: hexs('3ed625'),
        codeOperator: hexs('f59c25'),
        codeComment: hexs('1a89f3'),
        codeColor1: hexs('ffcccc'),
        codeColor2: hexs('ffe0cc'),
        codeColor3: hexs('fffecc'),
        codeColor4: hexs('c7f5c4'),
        codeColor5: hexs('c4f0f4'),
        codeColor6: hexs('c9c4f4'),
        codeColor7: hexs('f6c6e6'),
        codeColor8: hexs('ffffff'),
        codeExNone: hexs('660000'),
        codeExOnce: hexs('006600'),
        codeExMany: hexs('0B615E')
    };

    exports.light = {
        subpx: 'vec4(0,0,0,0.4)',
        dlgbg: hexs('FFFFFF'),
        //		dlgbg:  hexs('8F8F94'),
        dlghi: hexs('efefef'),
        sliderbase: 'vec4(0,0,0,0.1)',
        splitter1: hexs('5f5f5f'),
        splitter2: hexs('6f6f6f'),
        splitter3: hexs('9f9f9f'),
        dlgtxt: hexs('FFFFFF'),
        defbg2: hexs('3f3f3f'),
        defbg: hexs('6f6f6f'),
        deftxt: hexs('FFFFFF'),
        deftbg: hexs('7f7f7f'),
        selbg: hexs('9996e2'),
        seltxt: hexs('000000'),
        codeHover: hexs('FFF7C2'),
        codeSelect: hexs('d3e2f4'),
        codeMark: hexs('FFED75'),
        //		codeMark : hexs('035487'),
        //		codeSelect: hexs('033b6e'),
        codeCursor: hexs('000000'),
        codeBg2: hexs('ffffff'),
        codeCall: hexs('E0E6FF'),
        codeSelf: hexs('F2D9FC'),
        codeArg: hexs('D9E0FF'),
        //		codeBg: hexs('001e3e'),
        codeBg: hexs('ededed'),
        codeFg: hexs('000000'),
        codeLineBg: hexs('d3e2f4'),
        codeLine: hexs('808080'),
        codeTab: hexs('3f5c73'),
        codeNumber: hexs('0000FF'),
        codeVardef: hexs('8B0000'),
        codeName: hexs('000000'),
        codeString: hexs('006400'),
        codeOperator: hexs('f59c25'),
        codeComment: hexs('0000FF'),
        codeColor1: hexs('539a2f'),
        codeColor2: hexs('9aa633'),
        codeColor3: hexs('ac8935'),
        codeColor4: hexs('ac4d35'),
        codeColor5: hexs('a13143'),
        codeColor6: hexs('942d8b'),
        codeColor7: hexs('592d94'),
        codeColor8: hexs('2d3894'),
        codeExNone: hexs('FFE0E0'),
        codeExOnce: hexs('DDF0CE'),
        codeExMany: hexs('D6FFFE')
    };
});