let postcss = require('postcss')

let plugin = require('./')

function run (input, output, opts) {
  return postcss([plugin(opts)]).process(input, { from: undefined })
    .then(result => {
      expect(result.css).toEqual(output)
      expect(result.warnings()).toHaveLength(0)
    })
}

it('unwraps rule inside rule', () => {
  return run(
    'a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
    'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }'
  )
})

it('cleans rules after unwrap', () => {
  return run(
    'a { b .one {} b .two {} }',
    'a b .one {} a b .two {}'
  )
})

it('preserve empty rules if preserveEmpty is set to true', () => {
  return run(
    'a { b .one {} b .two {} }',
    'a { } a b .one {} a b .two {}',
    { preserveEmpty: true }
  )
})

it('hoists at-root', () => {
  return run(
    'a { & {} @at-root { b {} } }',
    'a {} b {}'
  )
})

it('at-root short hand', () => {
  return run(
    'a { & {} @at-root b { } }',
    'a {} b {}'
  )
})

it('replaces ampersand', () => {
  return run(
    'a { body &:hover b {} }',
    'body a:hover b {}'
  )
})

it('replaces ampersands', () => {
  return run(
    'a { &:hover, &:active {} }',
    'a:hover, a:active {}'
  )
})

it('replaces ampersand in string', () => {
  return run(
    '.block { &_elem {} }',
    '.block_elem {}'
  )
})

it('unwrap rules inside at-rules', () => {
  return run(
    '@media (max-width: 500px) { a { b {} } }',
    '@media (max-width: 500px) { a b {} }'
  )
})

it('unwraps at-rule', () => {
  return run(
    'a { b { @media screen { width: auto } } }',
    '@media screen {a b { width: auto } }'
  )
})

it('unwraps at-rule with rules', () => {
  return run(
    'a { @media screen { b { color: black } } }',
    '@media screen { a b { color: black } }'
  )
})

it('unwraps font-face to top level css', () => {
  return run(
    '.a { @font-face { font-family:font; src:url() format("woff"); } }',
    '@font-face { font-family:font; src:url() format("woff"); }'
  )
})

it('unwraps multiple fonts to top level css', () => {
  return run(
    '.a { @font-face { font-family:f1; } @font-face { font-family:f2; }}',
    '@font-face { font-family:f1; } @font-face { font-family:f2; }'
  )
})

it('unwraps at-rules', () => {
  return run(
    'a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
    'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }')
})

it('do not move custom at-rules', () => {
  return run(
    '.one { @mixin test; } .two { @phone { color: black } }',
    '.one { @mixin test; } @phone { .two { color: black } }',
    { bubble: ['phone'] }
  )
})

it('supports bubble option with at-name', () => {
  return run(
    'a { @phone { color: black } }',
    '@phone {a { color: black } }',
    { bubble: ['@phone'] }
  )
})

it('unwraps keyframes', () => {
  return run(
    'a { color: white; @keyframes name { to { color: black } } }',
    'a { color: white; } @keyframes name { to { color: black } }')
})

it('supports unwrap option with at-name', () => {
  return run(
    'a { @phone { color: black } }',
    '@phone { color: black }',
    { unwrap: ['@phone'] }
  )
})

it('processes comma', () => {
  return run(
    '.one, .two { a {} }',
    '.one a, .two a {}')
})

it('processes comma with ampersand', () => {
  return run(
    '.one, .two { &:hover {} }',
    '.one:hover, .two:hover {}'
  )
})

it('processes comma inside', () => {
  return run(
    'a, b { .one, .two {} }',
    'a .one, a .two, b .one, b .two {}'
  )
})

it('moves comment with rule', () => {
  return run(
    'a { /*B*/ b {} }',
    '/*B*/ a b {}'
  )
})

it('moves comment with at-rule', () => {
  return run(
    'a { /*B*/ @media { one: 1 } }',
    '/*B*/ @media {a { one: 1 } }'
  )
})

it('moves comment with declaration', () => {
  return run(
    'a { @media { /*B*/ one: 1 } }',
    '@media {a { /*B*/ one: 1 } }'
  )
})

it('saves order of rules', () => {
  return run(
    '.one { & .two {} & .tree {} }',
    '.one .two {} .one .tree {}'
  )
})

it('copies rule for declarations after nested rule', () => {
  return run(
    'a { a: 1; &b { b: 2 } c: 1; &c { d: 5 } e: 6 } c { f: 1 }',
    'a { a: 1; } ab { b: 2 } a { c: 1; } ac { d: 5 } a { e: 6; } c { f: 1 }'
  )
})

it('copies rule for declarations after nested rule and before at-rule', () => {
  return run(
    'a { &b { a: 1 } b: 2; @media { c: 3 } }',
    'ab { a: 1 } a { b: 2 } @media {a { c: 3 } }'
  )
})

it('does not replace ampersand inside string', () => {
  return run(
    'div { &[data-category="sound & vision"] {} }',
    'div[data-category="sound & vision"] {}'
  )
})

it('replaces ampersand in adjacent sibling selector', () => {
  return run('div { & + & {} }', 'div + div {}')
})

it('replaces ampersands in not selector', () => {
  return run('.a { &:not(&.no) {} }', '.a:not(.a.no) {}')
})

it('handles :host selector case', () => {
  return run(':host { &(:focus) {} }', ':host(:focus) {}')
})

it('shows clear errors on missed semicolon', () => {
  let css = 'a{\n  color: black\n  @mixin b { }\n}\n'
  expect(() => {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }).toThrow('2:3: Missed semicolon')
})

it('shows clear errors on other errors', () => {
  let css = 'a{\n  -Option/root { }\n}\n'
  expect(() => {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }).toThrow(':2:3: Unexpected')
})
