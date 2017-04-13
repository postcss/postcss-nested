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
    run('a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
        'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }');
});

it('cleans rules after unwrap', () => {
    run('a { b .one {} b .two {} }',
        'a b .one {}\na b .two {}');
});

it('replaces ampersand', () => {
    run('a { body &:hover b {} }',
        'body a:hover b {}');
});

it('replaces ampersands', () => {
    run('a { &:hover, &:active {} }',
        'a:hover, a:active {}');
});

it('replaces ampersand in string', () => {
    run('.block { &_elem {} }',
        '.block_elem {}');
});

it('unwrap rules inside at-rules', () => {
    run('@media (max-width: 500px) { a { b {} } }',
        '@media (max-width: 500px) { a b {} }');
});

it('unwraps at-rule', () => {
    run('a { b { @media screen { width: auto } } }',
        '@media screen {\n    a b {\n        width: auto\n    }\n}');
});

it('unwraps at-rule with rules', () => {
    run('a { @media screen { b { color: black } } }',
        '@media screen {\n    a b {\n        color: black\n    }\n}');
});

it('unwraps at-rules', () => {
    run('a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
        'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }');
});

it('do not move custom at-rules', () => {
    run('.one { @mixin test; } .two { @phone { color: black } }',
        '.one { @mixin test; } @phone { .two { color: black } }',
        { bubble: ['phone'] });
});

it('supports bubble option with at-name', () => {
    run('a { @phone { color: black } }',
        '@phone {\n    a {\n        color: black\n    }\n}',
        { bubble: ['@phone'] });
});

it('processes comma', () => {
    run('.one, .two { a {} }',
        '.one a, .two a {}');
});

it('processes comma with ampersand', () => {
    run('.one, .two { &:hover {} }',
        '.one:hover, .two:hover {}');
});

it('processes comma inside', () => {
    run('a, b { .one, .two {} }',
        'a .one, a .two, b .one, b .two {}');
});

it('moves comment with rule', () => {
    run('a {\n    /*B*/\n    b {}\n}',
        '/*B*/\na b {}');
});

it('moves comment with at-rule', () => {
    run('a {\n    /*B*/\n    @media {\n        one: 1\n    }\n}',
        '/*B*/\n@media {\n    a {\n        one: 1\n    }\n}');
});

it('moves comment with declaration', () => {
    run('a {\n    @media {\n        /*B*/\n        one: 1\n    }\n}',
        '@media {\n    a {\n        /*B*/\n        one: 1\n    }\n}');
});

it('parses example', () => {
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
    run(input, output);
});
