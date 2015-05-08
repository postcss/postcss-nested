var list = require('postcss/lib/list');

var selector = function (parent, node) {
    return list.comma(parent.selector)
        .map(function (i) {
            return list.comma(node.selector)
                .map(function (j) {
                    if ( j.indexOf('&') === -1 ) {
                        return i + ' ' + j;
                    } else {
                        return j.replace(/&/g, i);
                    }
                })
                .join(', ');
        })
        .join(', ');
};

var atruleChilds = function (rule, atrule) {
    var clone;
    var decls = [];
    atrule.each(function (child) {
        if ( child.type === 'decl' ) {
            decls.push( child );
        } else if ( child.type === 'rule' ) {
            child.selector = selector(rule, child);
        } else if ( child.type === 'atrule' ) {
            atruleChilds(rule, child);
        }
    });
    if ( decls.length ) {
        clone = rule.clone({ nodes: [] });
        for ( var i = 0; i < decls.length; i++ ) decls[i].moveTo(clone);
        atrule.prepend(clone);
    }
};

var processRule = function (rule) {
    var unwrapped = false;
    var after     = rule;
    rule.each(function (child) {
        if ( child.type === 'rule' ) {
            unwrapped = true;
            child.selector = selector(rule, child);
            after = child.moveAfter(after);
        } else if ( child.type === 'atrule' ) {
            unwrapped = true;
            atruleChilds(rule, child);
            after = child.moveAfter(after);
        }
    });
    if ( unwrapped && rule.nodes.length === 0 ) rule.removeSelf();
};

var process = function (node) {
    node.each(function (child) {
        if ( child.type === 'rule' ) {
            processRule(child);
        } else if ( child.type === 'atrule' ) {
            process(child);
        }
    });
};

module.exports = function () {
    return process;
};

module.exports.postcss = process;
