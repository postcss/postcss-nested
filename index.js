// @ts-check
let parser = require('postcss-selector-parser')

/** @typedef {import('postcss').ChildNode}  ChildNode */
/** @typedef {import('postcss').Comment}  Comment */
/** @typedef {import('postcss').Declaration}  Declaration */
/** @typedef {import('postcss').Rule}  PostcssRule */
/** @typedef {import('postcss').AtRule}  AtRule */
/** @typedef {typeof import('postcss').Rule}  RuleConstructor */
/** @typedef {parser.Root}  Root */
/** @typedef {parser.Node}  Node */
/** @typedef {parser.Selector}  Selector */
/** @typedef {Record<string, true>}  RuleMap  Simple lookup table for \@-rules */

/**
 * Run a selector string through postcss-selector-parser
 *
 * @param {string} rawSelector
 * @param {PostcssRule} [rule]
 * @returns {Selector}
 */
 function parse(rawSelector, rule) {
  /** @type {parser.Root | undefined} */
  let nodes
  let saver = parser(parsed => {
    nodes = parsed
  })
  try {
    saver.processSync(rawSelector)
    if (typeof nodes === 'undefined') {
      // Should never happen but @ts-check can't deduce the side-effect
      // triggered by `saver.processSync(str)`
      throw new Error('Parsing failed')
    }
  } catch (e) {
    if (rawSelector.includes(':')) {
      throw rule ? rule.error('Missed semicolon') : e
    } else {
      throw rule ? rule.error(e.message) : e
    }
  }
  return nodes.at(0)
}

/**
 * Replaces the "&" token in a node's selector with the parent selector
 * similar to what SCSS does.
 *
 * Mutates the nodes list
 *
 * @param {Extract<Node, { nodes: Array }>} nodes
 * @param {Selector} parent
 * @returns {boolean} Indicating whether a replacement took place or not.
 */
function interpolateAmpInSelecctor (nodes, parent) {
  let replaced = false
  nodes.each(/** @type {Node} */ node => {
    if (node.type === 'nesting') {
      let clonedParent = parent.clone({})
      if (node.value !== '&') {
        node.replaceWith(
          parse(node.value.replace('&', clonedParent.toString()))
        )
      } else {
        node.replaceWith(clonedParent)
      }
      replaced = true
    } else if ('nodes' in node && node.nodes) {
      if (interpolateAmpInSelecctor(node, parent)) {
        replaced = true
      }
    }
  })
  return replaced
}

 /**
  * Combines parent and child selectors, in a SCSS-like way
  *
  * @param {PostcssRule} parent
  * @param {PostcssRule} child
  * @returns {Array<string>} An array of new, merged selectors
 */
 function mergeSelectors (parent, child) {
  /** @type {Array<string>} */
  let merged = []
  parent.selectors.forEach(sel => {
    let parentNode = parse(sel, parent)

    child.selectors.forEach(selector => {
      if (!selector) {
        return
      }
      let node = parse(selector, child)
      let replaced = interpolateAmpInSelecctor(node, parentNode)
      if (!replaced) {
        // FIXME: Resolve these @ts-check errors somehow.
        node.prepend(parser.combinator({ value: ' ' }))
        node.prepend(parentNode.clone({}))
      }
      merged.push(node.toString())
    })
  })
  return merged
}

/**
 * @param {ChildNode | undefined} comment
 * @param {ChildNode} after
 * @returns {ChildNode} updated "after" node
 */
function pickComment (comment, after) {
  if (comment && comment.type === 'comment') {
    after.after(comment)
    return comment
  } else {
    return after
  }
}

function createFnAtruleChilds (/** @type {RuleMap} */ bubble) {
  /**
   * @param {PostcssRule} rule
   * @param {AtRule} atrule
   * @param {boolean} bubbling
   */
  return function atruleChilds (rule, atrule, bubbling) {
    /** @type {Array<ChildNode>} */
    let children = []
    atrule.each(child => {
      if (child.type === 'comment') {
        children.push(child)
      } else if (child.type === 'decl') {
        children.push(child)
      } else if (child.type === 'rule' && bubbling) {
        child.selectors = mergeSelectors(rule, child)
      } else if (child.type === 'atrule') {
        if (child.nodes && bubble[child.name]) {
          atruleChilds(rule, child, true)
        } else {
          children.push(child)
        }
      }
    })
    if (bubbling) {
      if (children.length) {
        let clone = rule.clone({ nodes: [] })
        for (let child of children) {
          clone.append(child)
        }
        atrule.prepend(clone)
      }
    }
  }
}

/**
 * @param {string} selector
 * @param {Array<ChildNode>} declarations
 * @param {ChildNode} after
 * @param {RuleConstructor} Rule
 */
function pickDeclarations (selector, declarations, after, Rule) {
  let parent = new Rule({
    selector,
    nodes: []
  })

  for (let declaration of declarations) {
    parent.append(declaration)
  }

  after.after(parent)
  return parent
}

/**
 * @param {Array<string>} defaults,
 * @param {Array<string>} [custom]
 */
function atruleNames (defaults, custom) {
  /** @type {RuleMap} */
  let list = {}
  for (let name of defaults) {
    list[name] = true
  }
  if (custom) {
    for (let name of custom) {
      list[name.replace(/^@/, '')] = true
    }
  }
  return list
}

/** @type {import('./').Nested} */
module.exports = (opts = {}) => {
  let bubble = atruleNames(['media', 'supports'], opts.bubble)
  let atruleChilds = createFnAtruleChilds(bubble)
  let unwrap = atruleNames(
    [
      'document',
      'font-face',
      'keyframes',
      '-webkit-keyframes',
      '-moz-keyframes'
    ],
    opts.unwrap
  )
  let preserveEmpty = opts.preserveEmpty

  return {
    postcssPlugin: 'postcss-nested',
    Rule (rule, { Rule }) {
      let unwrapped = false
      /** @type {ChildNode} */
      let after = rule
      let copyDeclarations = false
      /** @type {Array<ChildNode>} */
      let declarations = []

      rule.each(child => {
        if (child.type === 'rule') {
          if (declarations.length) {
            after = pickDeclarations(rule.selector, declarations, after, Rule)
            declarations = []
          }

          copyDeclarations = true
          unwrapped = true
          child.selectors = mergeSelectors(rule, child)
          after = pickComment(child.prev(), after)
          after.after(child)
          after = child
        } else if (child.type === 'atrule') {
          if (declarations.length) {
            after = pickDeclarations(rule.selector, declarations, after, Rule)
            declarations = []
          }

          if (child.name === 'at-root') {
            unwrapped = true
            atruleChilds(rule, child, false)

            let nodes = child.nodes
            if (child.params) {
              nodes = [new Rule({ selector: child.params, nodes: child.nodes })]
            }

            after.after(nodes)
            after = nodes[nodes.length - 1]
            child.remove()
          } else if (bubble[child.name]) {
            copyDeclarations = true
            unwrapped = true
            atruleChilds(rule, child, true)
            after = pickComment(child.prev(), after)
            after.after(child)
            after = child
          } else if (unwrap[child.name]) {
            copyDeclarations = true
            unwrapped = true
            atruleChilds(rule, child, false)
            after = pickComment(child.prev(), after)
            after.after(child)
            after = child
          } else if (copyDeclarations) {
            declarations.push(child)
          }
        } else if (child.type === 'decl' && copyDeclarations) {
          declarations.push(child)
        }
      })

      if (declarations.length) {
        after = pickDeclarations(rule.selector, declarations, after, Rule)
      }

      if (unwrapped && preserveEmpty !== true) {
        rule.raws.semicolon = true
        if (rule.nodes.length === 0) rule.remove()
      }
    }
  }
}
module.exports.postcss = true
