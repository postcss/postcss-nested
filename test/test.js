var postcss = require('postcss');
var nested  = require('../');
var expect  = require('chai').expect;

var processor = postcss(nested);

var check = function (input, output) {
    expect( processor.process(input).css ).to.equal(output);
};

describe('postcss-nested', function () {

    it('unwraps rule inside rule', function () {
        check('a { a: 1; b { b: 2; c { c: 3 } } }',
              'a { a: 1 } a b { b: 2 } a b c { c: 3 }');
    });

    it('cleans rules after unwrap', function () {
        check('a { b .one {} b .two {} }',
              'a b .one {} a b .two {}');
    });

    it('replaces ampersand', function () {
        check('a { body &:hover b {} }',
              'body a:hover b {}');
    });

    it('replaces ampersands', function () {
        check('a { &:hover, &:active { } }',
              'a:hover, a:active { }');
    });

    it('replaces ampersand in string', function () {
        check('.block { &_elem { } }',
              '.block_elem { }');
    });

    it('unwrap rules inside at-rules', function () {
        check('@media (max-width: 500px) { a { b { } } }',
              '@media (max-width: 500px) { a b { } }');
    });

    it('unwraps at-rule', function () {
        check('.block { .el { @media (max-width: 500px) { width: auto } } }',
              '@media (max-width: 500px) { .block .el { width: auto } }');
    });

    it('unwraps at-rule with rules', function () {
        check('a { @media (max-width: 500px) { b { color: black } } }',
              '@media (max-width: 500px) { a b { color: black } }');
    });

    it('unwraps at-rule with rules inside');

    it('fix spaces in uncompressed CSS');

});
