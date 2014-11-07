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
              'a { a: 1 }a b { b: 2 }a b c { c: 3 }');
    });

});
