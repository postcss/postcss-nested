var postcss = require('postcss');

var plugin = require('./');

function run(input, output, opts) {
    return postcss([ plugin(opts) ]).process(input)
        .then(result => {
            expect(result.css).toEqual(output);
            expect(result.warnings().length).toBe(0);
        });
}

it('unwraps rule inside rule', () => {
    return run(
        'a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
        'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }');
});

it('cleans rules after unwrap', () => {
    return run(
        'a { b .one {} b .two {} }',
        'a b .one {} a b .two {}');
});

it('replaces ampersand', () => {
    return run(
        'a { body &:hover b {} }',
        'body a:hover b {}');
});

it('replaces ampersands', () => {
    return run(
        'a { &:hover, &:active {} }',
        'a:hover, a:active {}');
});

it('replaces ampersand in string', () => {
    return run(
        '.block { &_elem {} }',
        '.block_elem {}');
});

it('unwrap rules inside at-rules', () => {
    return run(
        '@media (max-width: 500px) { a { b {} } }',
        '@media (max-width: 500px) { a b {} }');
});

it('unwraps at-rule', () => {
    return run(
        'a { b { @media screen { width: auto } } }',
        '@media screen {a b { width: auto } }');
});

it('unwraps at-rule with rules', () => {
    return run(
        'a { @media screen { b { color: black } } }',
        '@media screen { a b { color: black } }');
});

it('unwraps at-rules', () => {
    return run(
        'a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
        'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }');
});

it('do not move custom at-rules', () => {
    return run(
        '.one { @mixin test; } .two { @phone { color: black } }',
        '.one { @mixin test; } @phone { .two { color: black } }',
        { bubble: ['phone'] });
});

it('supports bubble option with at-name', () => {
    return run(
        'a { @phone { color: black } }',
        '@phone {a { color: black } }',
        { bubble: ['@phone'] });
});

it('processes comma', () => {
    return run(
        '.one, .two { a {} }',
        '.one a, .two a {}');
});

it('processes comma with ampersand', () => {
    return run(
        '.one, .two { &:hover {} }',
        '.one:hover, .two:hover {}');
});

it('processes comma inside', () => {
    return run(
        'a, b { .one, .two {} }',
        'a .one, a .two, b .one, b .two {}');
});

it('moves comment with rule', () => {
    return run(
        'a { /*B*/ b {} }',
        '/*B*/ a b {}');
});

it('moves comment with at-rule', () => {
    return run(
        'a { /*B*/ @media { one: 1 } }',
        '/*B*/ @media {a { one: 1 } }');
});

it('moves comment with declaration', () => {
    return run(
        'a { @media { /*B*/ one: 1 } }',
        '@media {a { /*B*/ one: 1 } }');
});

it('saves order of rules', () => {
    return run(
        '.one { & .two {} & .tree {} }',
        '.one .two {} .one .tree {}');
});

it('does not replace ampersand inside string', () => {
    return run(
        'div { &[data-category="sound & vision"] {} }',
        'div[data-category="sound & vision"] {}');
});
