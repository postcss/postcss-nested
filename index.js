var postcss = require('postcss');
var parser = require('postcss-selector-parser');

function parse(str) {
    var nodes;
    var saver = parser(function (parsed) {
        nodes = parsed;
    });
    saver.processSync(str);
    return nodes.at(0);
}

function replace(nodes, parent) {
    var replaced = false;
    nodes.each(function (i) {
        if (i.type === 'nesting') {
            i.replaceWith(parent.clone());
            replaced = true;
        } else if (i.nodes) {
            if (replace(i, parent)) {
                replaced = true;
            }
        }
    });
    return replaced;
}

function selectors(parent, child) {
    var result = [];
    parent.selectors.forEach(function (i) {
        var parentNode = parse(i);

        child.selectors.forEach(function (j) {
            var node = parse(j);
            var replaced = replace(node, parentNode);
            if (!replaced) {
                node.prepend(parser.combinator({ value: ' ' }));
                node.prepend(parentNode.clone());
            }
            result.push(node.toString());
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
    /*
     * Bubble up font face to top level css and ignore nested selectors
     */
    if (atrule.name === 'font-face') return;

    if ( children.length ) {
        var clone = rule.clone({ nodes: [] });
        for ( var i = 0; i < children.length; i++ ) {
            clone.append(children[i]);
        }
        atrule.prepend(clone);
    }
}

function processRule(rule, bubble, preserveEmpty) {
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
    if ( unwrapped && preserveEmpty !== true ) {
        rule.raws.semicolon = true;
        if ( rule.nodes.length === 0 ) rule.remove();
    }
}

module.exports = postcss.plugin('postcss-nested', function (opts) {
    var bubble = ['media', 'supports', 'document', 'font-face'];
    if ( opts && opts.bubble ) {
        bubble = bubble.concat(opts.bubble.map(function (i) {
            return i.replace(/^@/, '');
        }));
    }
    var preserveEmpty = opts ? opts.preserveEmpty : false;

    var process = function (node) {
        node.each(function (child) {
            if ( child.type === 'rule' ) {
                processRule(child, bubble, preserveEmpty);
            } else if ( child.type === 'atrule' ) {
                process(child);
            }
        });
    };
    return process;
});
