var postcss = require('postcss');
var nested  = require('../');
var expect  = require('chai').expect;

var processor = postcss(nested);

var check = function (input, output) {
    expect( processor.process(input).css ).to.equal(output);
};

describe('postcss-nested', function () {

    it('unwraps rule inside rule', function () {
        check('a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
              'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }');
    });

    it('cleans rules after unwrap', function () {
        check('a { b .one {} b .two {} }',
              'a b .one {}\na b .two {}');
    });

    it('replaces ampersand', function () {
        check('a { body &:hover b {} }',
              'body a:hover b {}');
    });

    it('replaces ampersands', function () {
        check('a { &:hover, &:active {} }',
              'a:hover, a:active {}');
    });

    it('replaces ampersand in string', function () {
        check('.block { &_elem {} }',
              '.block_elem {}');
    });

    it('unwrap rules inside at-rules', function () {
        check('@media (max-width: 500px) { a { b {} } }',
              '@media (max-width: 500px) { a b {} }');
    });

    it('unwraps at-rule', function () {
        check('a { b { @media screen { width: auto } } }',
              '@media screen {\n    a b {\n        width: auto\n    }\n}');
    });

    it('unwraps at-rule with rules', function () {
        check('a { @media screen { b { color: black } } }',
              '@media screen {\n    a b {\n        color: black\n    }\n}');
    });

    it('unwraps at-rules', function () {
        check('a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
              'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }');
    });

    it('processes comma', function () {
        check('.one, .two { a {} }',
              '.one a, .two a {}');
    });

    it('processes comma with ampersand', function () {
        check('.one, .two { &:hover {} }',
              '.one:hover, .two:hover {}');
    });

    it('processes comma inside', function () {
        check('a, b { .one, .two {} }',
              'a .one, a .two, b .one, b .two {}');
    });

    it('parses example', function () {
        var input =  '.phone {\n' +
                     '    &_title {\n' +
                     '        width: 500px;\n' +
                     '        @media (max-width: 500px) {\n' +
                     '            width: auto;\n' +
                     '        }\n' +
                     '    }\n' +
                     '    body.is_dark &_title {\n' +
                     '        color: white;\n' +
                     '    }\n' +
                     '    img {\n' +
                     '        display: block;\n' +
                     '    }\n' +
                     '}';
        var output = '.phone_title {\n' +
                     '    width: 500px;\n' +
                     '}\n' +
                     '@media (max-width: 500px) {\n' +
                     '    .phone_title {\n' +
                     '        width: auto;\n' +
                     '    }\n' +
                     '}\n' +
                     'body.is_dark .phone_title {\n' +
                     '    color: white;\n' +
                     '}\n' +
                     '.phone img {\n' +
                     '    display: block;\n' +
                     '}';
        check(input, output);
    });

});
