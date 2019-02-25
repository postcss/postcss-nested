var postcss = require('postcss')

var plugin = require('./')

function run (input, output, opts) {
  return postcss([plugin(opts)]).process(input, { from: undefined })
    .then(function (result) {
      expect(result.css).toEqual(output)
      expect(result.warnings()).toHaveLength(0)
    })
}

it('unwraps rule inside rule', function () {
  return run(
    'a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
    'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }')
})

it('cleans rules after unwrap', function () {
  return run(
    'a { b .one {} b .two {} }',
    'a b .one {} a b .two {}')
})

it('preserve empty rules if preserveEmpty is set to true', function () {
  return run(
    'a { b .one {} b .two {} }',
    'a { } a b .one {} a b .two {}', { preserveEmpty: true })
})

it('replaces ampersand', function () {
  return run(
    'a { body &:hover b {} }',
    'body a:hover b {}')
})

it('replaces ampersands', function () {
  return run(
    'a { &:hover, &:active {} }',
    'a:hover, a:active {}')
})

it('replaces ampersand in string', function () {
  return run(
    '.block { &_elem {} }',
    '.block_elem {}')
})

it('unwrap rules inside at-rules', function () {
  return run(
    '@media (max-width: 500px) { a { b {} } }',
    '@media (max-width: 500px) { a b {} }')
})

it('unwraps at-rule', function () {
  return run(
    'a { b { @media screen { width: auto } } }',
    '@media screen {a b { width: auto } }')
})

it('unwraps at-rule with rules', function () {
  return run(
    'a { @media screen { b { color: black } } }',
    '@media screen { a b { color: black } }')
})

it('unwraps font-face to top level css', function () {
  return run(
    '.a { @font-face { font-family:font; src:url() format("woff"); } }',
    '@font-face { font-family:font; src:url() format("woff"); }'
  )
})

it('unwraps multiple fonts to top level css', function () {
  return run(
    '.a { @font-face { font-family:f1; } @font-face { font-family:f2; }}',
    '@font-face { font-family:f1; } @font-face { font-family:f2; }'
  )
})

it('unwraps at-rules', function () {
  return run(
    'a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
    'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }')
})

it('do not move custom at-rules', function () {
  return run(
    '.one { @mixin test; } .two { @phone { color: black } }',
    '.one { @mixin test; } @phone { .two { color: black } }',
    { bubble: ['phone'] })
})

it('supports bubble option with at-name', function () {
  return run(
    'a { @phone { color: black } }',
    '@phone {a { color: black } }',
    { bubble: ['@phone'] })
})

it('unwraps keyframes', function () {
  return run(
    'a { color: white; @keyframes name { to { color: black } } }',
    'a { color: white; } @keyframes name { to { color: black } }')
})

it('supports unwrap option with at-name', function () {
  return run(
    'a { @phone { color: black } }',
    '@phone { color: black }',
    { unwrap: ['@phone'] })
})

it('processes comma', function () {
  return run(
    '.one, .two { a {} }',
    '.one a, .two a {}')
})

it('processes comma with ampersand', function () {
  return run(
    '.one, .two { &:hover {} }',
    '.one:hover, .two:hover {}')
})

it('processes comma inside', function () {
  return run(
    'a, b { .one, .two {} }',
    'a .one, a .two, b .one, b .two {}')
})

it('moves comment with rule', function () {
  return run(
    'a { /*B*/ b {} }',
    '/*B*/ a b {}')
})

it('moves comment with at-rule', function () {
  return run(
    'a { /*B*/ @media { one: 1 } }',
    '/*B*/ @media {a { one: 1 } }')
})

it('moves comment with declaration', function () {
  return run(
    'a { @media { /*B*/ one: 1 } }',
    '@media {a { /*B*/ one: 1 } }')
})

it('saves order of rules', function () {
  return run(
    '.one { & .two {} & .tree {} }',
    '.one .two {} .one .tree {}')
})

it('does not replace ampersand inside string', function () {
  return run(
    'div { &[data-category="sound & vision"] {} }',
    'div[data-category="sound & vision"] {}')
})

it('replaces ampersand in adjacent sibling selector', function () {
  return run('div { & + & {} }', 'div + div {}')
})

it('replaces ampersands in not selector', function () {
  return run('.a { &:not(&.no) {} }', '.a:not(.a.no) {}')
})

it('handles :host selector case', function () {
  return run(':host { &(:focus) {} }', ':host(:focus) {}')
})

it('shows clear errors on missed semicolon', function () {
  var css = 'a{\n  color: black\n  @mixin b { }\n}\n'
  expect(function () {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }).toThrowError('2:3: Missed semicolon')
})

it('shows clear errors on other errors', function () {
  var css = 'a{\n  -Option/root { }\n}\n'
  expect(function () {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }).toThrowError(':2:3: Unexpected')
})
