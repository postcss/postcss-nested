var postcss = require('postcss');
var selectorParser = require('postcss-selector-parser');
var selectorProcessor = selectorParser();

function parseSelector(selector) {
    // Parse selector and get root's only child
    return selectorProcessor.process(selector).res.first;
}

/**
 * Concatinates nested selectors. Expects arguments to be
 * selector nodes returned from postcss-selector-parser
 */
function concatNested(selector, parentSelector) {
    var replaced = false;

    // Look for ampersand using postcss-selector-parser
    selector.walkNesting(function (ampersand) {
        ampersand.replaceWith(parentSelector.clone());
        replaced = true;
    });

    if (!replaced) {
        // If not found, join with a decendant combinator
        selector.prepend(selectorParser.combinator({ value: ' ' }));
        selector.prepend(parentSelector.clone());
    }

    return selector;
}

function selectors(parent, node) {
    var result = [];
    parent.selectors.forEach(function (i) {
        var parentParsed = parseSelector(i);

        node.selectors.forEach(function (j) {
            result.push(concatNested(parseSelector(j), parentParsed));
        });
    });
    return result;
}

function pickComment(comment, after) {
    if ( comment && comment.type === 'comment' ) {
        after.after(comment);
        return comment;
    } else {
        return after;
    }
}

function atruleChilds(rule, atrule) {
    var children = [];
    atrule.each(function (child) {
        if ( child.type === 'comment' ) {
            children.push( child );
        } if ( child.type === 'decl' ) {
            children.push( child );
        } else if ( child.type === 'rule' ) {
            child.selectors = selectors(rule, child);
        } else if ( child.type === 'atrule' ) {
            atruleChilds(rule, child);
        }
    });
    if ( children.length ) {
        var clone = rule.clone({ nodes: [] });
        for ( var i = 0; i < children.length; i++ ) {
            clone.append(children[i]);
        }
        atrule.prepend(clone);
    }
}

function processRule(rule, bubble) {
    var unwrapped = false;
    var after     = rule;
    rule.each(function (child) {
        if ( child.type === 'rule' ) {
            unwrapped = true;
            child.selectors = selectors(rule, child);
            after = pickComment(child.prev(), after);
            after.after(child);
            after = child;
        } else if ( child.type === 'atrule' ) {
            if ( bubble.indexOf(child.name) !== -1 ) {
                unwrapped = true;
                atruleChilds(rule, child);
                after = pickComment(child.prev(), after);
                after.after(child);
                after = child;
            }
        }
    });
    if ( unwrapped ) {
        rule.raws.semicolon = true;
        if ( rule.nodes.length === 0 ) rule.remove();
    }
}

module.exports = postcss.plugin('postcss-nested', function (opts) {
    var bubble = ['media', 'supports', 'document'];
    if ( opts && opts.bubble ) {
        bubble = bubble.concat(opts.bubble.map(function (i) {
            return i.replace(/^@/, '');
        }));
    }

    var process = function (node) {
        node.each(function (child) {
            if ( child.type === 'rule' ) {
                processRule(child, bubble);
            } else if ( child.type === 'atrule' ) {
                process(child);
            }
        });
    };
    return process;
});
