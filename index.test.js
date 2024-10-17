let { equal, throws } = require('uvu/assert')
let { test } = require('uvu')
let postcss = require('postcss').default

let plugin = require('./')

function normalize(css) {
  return css
    .replace(/([:;{}]|\*\/|\/\*)/g, ' $1 ')
    .replace(/\s\s+/g, ' ')
    .replace(/ ([;:])/g, '$1')
    .trim()
}

function run(input, output, opts) {
  let result = postcss([plugin(opts)]).process(input, { from: '/test.css' })
  equal(normalize(result.css), normalize(output))
  equal(result.warnings().length, 0)
}

test('unwraps rule inside rule', () => {
  run(
    'a { a: 1 } a { a: 1; b { b: 2; c { c: 3 } } }',
    'a { a: 1 } a { a: 1; } a b { b: 2; } a b c { c: 3 }'
  )
})

test('cleans rules after unwrap', () => {
  run('a { b .one {} b .two {} }', 'a b .one {} a b .two {}')
})

test('preserve empty rules if preserveEmpty is set to true', () => {
  run('a { b .one {} b .two {} }', 'a { } a b .one {} a b .two {}', {
    preserveEmpty: true
  })
})

test('hoists at-root', () => {
  run('a { & {} @at-root { b {} } }', 'a {} b {}')
})

test('hoists at-root 2', () => {
  run('a { @at-root { b {} } }', 'b {}')
})

test('at-root short hand', () => {
  run('a { & {} @at-root b { } }', 'a {} b {}')
})

test('hoists multiple at-roots', () => {
  run(
    `a {
      b {
        & {}
        @at-root {
          c1 {}
          c2 {}
        }
        @at-root {
          d {}
        }
      }
    }`,
    `a b {}
    c1 {}
    c2 {}
    d {}`
  )
})

test('hoists at-root and media siblings', () => {
  run(
    `a {
      x: x;
      a2 {}
      @at-root {
        b {}
      }
      @media x {
        c {}
      }
      /* asdadf */
    }`,
    `a {
      x: x;
      /* asdadf */
    }
    a a2 {}
    b {}
    @media x {
      a c {}
    }`
  )
})

test('at-root stops at media', () => {
  run('@media x { a { & {} @at-root { b { } } } }', '@media x { a {} b {} }')
})

test('at-root unwraps nested media', () => {
  run('a { & {} @media x { @at-root { b { } } } }', 'a {} @media x { b {} }')
})

test('nested at-root with nested media', () => {
  run(
    `a {
      & {}
      @at-root {
        b {
          @at-root {
            c {
              & {}
            }
            @media y {
              d {}
            }
          }
        }
      }
    }`,
    `a {}
    c {}
    @media y {
      d {}
    }`
  )
})

test('tolerates immediately nested at-root', () => {
  run(
    `a {
      & {}
      @at-root {
        @at-root foo {
          c {}
        }
      }
    }`,
    `a {}
    foo c {}`
  )
})

test('tolerates top-level at-root', () => {
  run(
    `@at-root {
      a {}
    }
    @media x {
      @at-root {
        b {}
      }
    }`,
    `a {}
    @media x {
      b {}
    }`
  )
})

test('tolerates immediately nested at-root #2', () => {
  run(
    `@media x {
      a {
        & {}
        @at-root {
          @at-root (without: media) {
            c {}
          }
        }
      }
    }`,
    `@media x {
      a {}
    }
    c {}`
  )
})

test('tolerates immediately nested at-root #3', () => {
  run(
    `@media x {
      a {
        & {}
        @at-root (without: media) {
          @at-root (without: media) {
            c {}
          }
        }
      }
    }`,
    `@media x {
      a {}
    }
    a c {}`
  )
})

test('at-root supports (without: all)', () => {
  run(
    `@media x {
      @supports (z:y) {
        a {
          & {}
          @at-root (without: all) {
            b {}
            @media y {
              c {}
            }
          }
          b {}
        }
      }
    }`,
    `@media x {
      @supports (z:y) {
        a {}
      }
    }
    b {}
    @media y {
      c {}
    }
    @media x {
      @supports (z:y) {
            a b {}
      }
    }`
  )
})

test('at-root supports (with: all)', () => {
  run(
    `@media x {
      @supports (z:y) {
        a {
          & {}
          @at-root (with: all) {
            b {}
            @media y {
              c {}
            }
            @media z {
              & {}
            }
          }
        }
      }
    }`,
    `@media x {
      @supports (z:y) {
        a {}
        a b {}
        @media y {
          a c {}
        }
        @media z {
          a {}
        }
      }
    }`
  )
})

test('at-root supports (without: foo)', () => {
  run(
    `@media x {
      a {
        & {}
        @at-root (without: media) {
          b {}
        }
      }
    }`,
    `@media x {
      a {}
    }
    a b {}`
  )
})

test('at-root supports (without: foo) 2', () => {
  run(
    `@supports (y:z) {
      @media x {
        a {
          b {}
          @at-root (without: media) {
            c {}
          }
        }
      }
    }`,
    `@supports (y:z) {
      @media x {
        a b {}
      }
      a c {}
    }`
  )
})

test('at-root supports (with: foo)', () => {
  run(
    `@supports (y:z) {
      @media x {
        a {
          b {}
          @at-root (with: supports) {
            c {}
          }
        }
      }
    }`,
    `@supports (y:z) {
      @media x {
        a b {}
      }
      a c {}
    }`
  )
})

test('at-root supports (without: foo) 3', () => {
  run(
    `@supports (y:z) {
      @media x {
        a {
          b {}
          @at-root (without: supports) {
            c {}
          }
        }
      }
    }`,
    `@supports (y:z) {
      @media x {
        a b {}
      }
    }
    @media x {
      a c {}
    }`
  )
})

test('at-root supports (without: foo) 4', () => {
  run(
    `@media x {
      @supports (y:z) {
        a {
          & {}
          @at-root (without: supports) {
            b {}
          }
        }
      }
    }`,
    `@media x {
      @supports (y:z) {
        a {}
      }
      a b {}
    }`
  )
})

test('at-root supports (without: foo) 5', () => {
  run(
    `@media x {
      @supports (a:b) {
        @media (y) {
          @supports (c:d) {
            a {
              & {}
              @at-root (without: supports) {
                b {}
              }
              c {}
            }
            d {}
          }
        }
        e {}
        f {}
      }
    }`,
    `@media x {
      @supports (a:b) {
        @media (y) {
          @supports (c:d) {
            a {}
          }
        }
      }
      @media (y) {
        a b {}
      }
      @supports (a:b) {
        @media (y) {
          @supports (c:d) {
            a c {}
            d {}
          }
        }
        e {}
        f {}
      }
    }`
  )
})

test('replaces ampersand', () => {
  run('a { body &:hover b {} }', 'body a:hover b {}')
})

test('replaces ampersands', () => {
  run('a { &:hover, &:active {} }', 'a:hover, a:active {}')
})

test('replaces ampersand in string', () => {
  run('.block { &_elem {} }', '.block_elem {}')
})

test('unwrap rules inside at-rules', () => {
  run(
    '@media (max-width: 500px) { a { b {} } }',
    '@media (max-width: 500px) { a b {} }'
  )
})

test('unwraps at-rule', () => {
  run(
    'a { b { @media screen { width: auto } } }',
    '@media screen {a b { width: auto } }'
  )
})

test('unwraps at-rule with rules', () => {
  run(
    'a { @media screen { b { color: black } } }',
    '@media screen { a b { color: black } }'
  )
})

test('unwraps font-face to top level css', () => {
  run(
    '.a { @font-face { font-family:font; src:url() format("woff"); } }',
    '@font-face { font-family:font; src:url() format("woff"); }'
  )
})

test('unwraps multiple fonts to top level css', () => {
  run(
    '.a { @font-face { font-family:f1; } @font-face { font-family:f2; }}',
    '@font-face { font-family:f1; } @font-face { font-family:f2; }'
  )
})

test('unwraps at-rules', () => {
  run(
    'a { a: 1 } a { @media screen { @supports (a: 1) { a: 1 } } }',
    'a { a: 1 } @media screen { @supports (a: 1) { a { a: 1 } } }'
  )
})

test('leaves nested @media blocks as is', () => {
  run(
    `a { a: 1 }
    a {
      @media screen {
        b {
          @media (max-width: 100rem) {
            @media (min-width: 50rem) {
              a: 1
            }
          }
        }
      }
    }`,
    `a { a: 1 }
    @media screen {
      @media (max-width: 100rem) {
        @media (min-width: 50rem) {
          a b { a: 1 }
        }
      }
    }`
  )
})

test('@at-root fully espacpes nested @media blocks', () => {
  run(
    `a { x: 3 }
    a {
      @media screen {
        b {
          @media (max-width: 100rem) {
            x: 2;
            @at-root (without: media) {
              @media (min-width: 50rem) {
                x: 1;
              }
            }
          }
        }
      }
    }`,
    `a { x: 3 }
    @media screen {
      @media (max-width: 100rem) {
        a b { x: 2; }
      }
    }
    @media (min-width: 50rem) {
      a b { x: 1 }
    }`
  )
})

test('Multi nested @media is resolved', () => {
  run(
    `a {
      @media screen {
        b {
          @media (max-width: 100rem) {
            y: y;
            c {
              @media (min-width: 50rem) {
                x: x
              }
            }
          }
        }
      }
    }`,
    `@media screen {
      @media (max-width: 100rem) {
        a b {
          y: y
        }
        @media (min-width: 50rem) {
          a b c { x:x }
        }
      }
    }`
  )
})

test('unwraps at-rules with interleaved properties', () => {
  run(
    'a { a: 1 } a { color: red; @media screen { @supports (a: 1) { a: 1 } } background: green }',
    'a { a: 1 } a { color: red; } @media screen { @supports (a: 1) { a { a: 1 } } } a { background: green }'
  )
})

test('does not move custom at-rules', () => {
  run(
    '.one { @mixin test; } .two { @media screen { @mixin test; } } .three { @media screen { @mixin test { color: black } } } .four { @phone { color: black } }',
    '.one { @mixin test; } @media screen { .two { @mixin test } } @media screen { .three { @mixin test { color: black } } } @phone { .four { color: black } }',
    { bubble: ['phone'] }
  )
})

test('does not move custom at-rules placed under nested bubbling ones', () => {
  run(
    '.one { @supports (color: black) { @media screen { @mixin test; } } } .two { @supports (color: black) { @media screen { @mixin test { color: black } } } }',
    '@supports (color: black) { @media screen {.one { @mixin test } } } @supports (color: black) { @media screen { .two { @mixin test { color: black } } } }'
  )
})

test('supports bubble option with at-name', () => {
  run('a { @phone { color: black } }', '@phone {a { color: black } }', {
    bubble: ['@phone']
  })
})

test('unwraps keyframes', () => {
  run(
    'a { color: white; @keyframes name { to { color: black } } }',
    'a { color: white; } @keyframes name { to { color: black } }'
  )
})

test('supports unwrap option with at-name', () => {
  run('a { @phone { color: black } }', '@phone { color: black }', {
    unwrap: ['@phone']
  })
})

test('processes comma', () => {
  run('.one, .two { a {} }', '.one a, .two a {}')
})

test('processes comma with ampersand', () => {
  run('.one, .two { &:hover {} }', '.one:hover, .two:hover {}')
})

test('processes comma inside', () => {
  run('a, b { .one, .two {} }', 'a .one, a .two, b .one, b .two {}')
})

test('clears empty selector after comma', () => {
  run('a, b { .one, .two, {} }', 'a .one, a .two, b .one, b .two {}')
})

test("Save the parent's comment", () => {
  run('a { /*i*/ b {} }', 'a { /*i*/ } a b {}')
})

test('Save the comments for the parent and child', () => {
  run(
    `a { 
    /*i*/ 
    /*o*/
    b {} }`,

    `a { /*i*/ } /*o*/ a b {}`
  )
})

test('Save the comments for the parent and child with at-rule', () => {
  run(
    `a { /*i*/ 
    /*o*/
    @media { one: 1 } }`,

    `a { /*i*/ } /*o*/ @media {a { one: 1 } }`
  )
})

test('moves comment with declaration', () => {
  run('a { @media { /*B*/ one: 1 } }', '@media { a { /*B*/ one: 1 } }')
})

test('moves comment with declaration without properties', () => {
  run('a { @media { /*B*/ } }', '@media { a { /*B*/ } }')
})

test('saves order of rules', () => {
  run('.one { & .two {} & .tree {} }', '.one .two {} .one .tree {}')
})

test('copies rule for declarations after nested rule', () => {
  run(
    'a { a: 1; &b { b: 2 } c: 1; &c { d: 5 } e: 6 } c { f: 1 }',
    'a { a: 1; } ab { b: 2 } a { c: 1; } ac { d: 5 } a { e: 6; } c { f: 1 }'
  )
})

test('copies rule for declarations after nested rule and before at-rule', () => {
  run(
    'a { &b { a: 1 } b: 2; @media { c: 3 } }',
    'ab { a: 1 } a { b: 2 } @media {a { c: 3 } }'
  )
})

test('does not replace ampersand inside string', () => {
  run(
    'div { &[data-category="sound & vision"] {} }',
    'div[data-category="sound & vision"] {}'
  )
})

test('replaces ampersand in adjacent sibling selector', () => {
  run('div { & + & {} }', 'div + div {}')
})

test('replaces ampersands in not selector', () => {
  run('.a { &:not(&.no) {} }', '.a:not(.a.no) {}')
})

test('correctly replaces tail ampersands', () => {
  run('.a { .b & {} }', '.b .a {}')
})

test('correctly replaces tail ampersands that are nested further down', () => {
  run('.a { .b { .c & {} } }', '.c .a .b {}')
})

test('correctly replaces tail ampersands that are nested inside ampersand rules', () => {
  run('.a { &:hover { .b { .c & {} } } }', '.c .a:hover .b {}')
})

test('preserves child order when replacing tail ampersands', () => {
  run(
    '.a { color: red; .first {} @mixinFirst; .b & {} @mixinLast; .last {} }',
    '.a { color: red; } .a .first {} .a { @mixinFirst; } .b .a {} .a { @mixinLast; } .a .last {}'
  )
})

test('handles :host selector case', () => {
  run(':host { &(:focus) {} }', ':host(:focus) {}')
})

test('works with other visitors', () => {
  let css = 'a{b{color:red}@mixin;}'
  let mixinPlugin = () => {
    return {
      AtRule: {
        mixin(node) {
          node.replaceWith('.in{.deep{color:blue}}')
        }
      },
      postcssPlugin: 'mixin'
    }
  }
  mixinPlugin.postcss = true
  let out = postcss([plugin, mixinPlugin]).process(css, {
    from: undefined
  }).css
  equal(out, 'a b{color:red}a .in .deep{color:blue}')
})

test('works with other visitors #2', () => {
  let css = 'a { @mixin; b {color:red} }'
  let mixinPlugin = () => {
    return {
      AtRule: {
        mixin(node) {
          node.replaceWith('.in { .deep {color:blue} }')
        }
      },
      postcssPlugin: 'mixin'
    }
  }
  mixinPlugin.postcss = true
  let out = postcss([plugin, mixinPlugin]).process(css, {
    from: undefined
  }).css
  equal(out, 'a .in .deep {color:blue} a b {color:red}')
})

test('shows clear errors on missed semicolon', () => {
  let css = 'a{\n  color: black\n  @mixin b { }\n}\n'
  throws(() => {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }, '2:3: Missed semicolon')
})

test('shows clear errors on other errors', () => {
  let css = 'a{\n  -Option/root { }\n}\n'
  throws(() => {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }, ':2:3: Unexpected')
})

test('errors on unknown @at-root parameters', () => {
  let css = 'a {\n  @at-root (wonky: "blah") {\n    b {}\n  }\n}'
  throws(() => {
    css = postcss([plugin]).process(css, { from: undefined }).css
  }, ':2:3: Unknown @at-root parameter "(wonky: \\"blah\\")"')
})

test('third level dependencies', () => {
  run(
    '.text {&:hover{border-color: red;&:before{color: red;}}}',
    '.text:hover{border-color: red;}.text:hover:before{color: red;}'
  )
})

test('bubbles @layer blocks', () => {
  run(
    `@media x {
      a {
        @layer foo {
          x:x
        }
      }
    }`,
    `@media x {
      @layer foo {
        a {
          x:x
        }
      }
    }`
  )
})

test('third level dependencies #2', () => {
  run('.selector{:global{h2{color:pink}}}', '.selector :global h2{color:pink}')
})

test('Name of at-root is configurable', () => {
  let rootRuleName = '_foobar_'
  run(`a { & {} @${rootRuleName} { b {} } }`, `a {} b {}`, {
    rootRuleName
  })
})

test('The rooRuleName option may start with "@"', () => {
  let rootRuleName = '@_foobar_'
  run(`a { & {} ${rootRuleName} { b {} } }`, `a {} b {}`, {
    rootRuleName
  })
})

test.run()
