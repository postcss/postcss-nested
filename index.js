var postcss = require('postcss');

var selector = function (parent, node) {
    return parent.selectors.map(function (i) {
        return node.selectors.map(function (j) {
            if ( j.indexOf('&') === -1 ) {
                return i + ' ' + j;
            } else {
                return j.replace(/&/g, i);
            }
        }).join(', ');
    }).join(', ');
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

var processRule = function (rule, bubble) {
    var unwrapped = false;
    var after     = rule;
    rule.each(function (child) {
        if ( child.type === 'rule' ) {
            unwrapped = true;
            child.selector = selector(rule, child);
            after = child.moveAfter(after);
        } else if ( child.type === 'atrule' ) {
            if ( bubble.indexOf(child.name) !== -1 ) {
                unwrapped = true;
                atruleChilds(rule, child);
                after = child.moveAfter(after);
            }
        }
    });
    if ( unwrapped ) {
        if ( rule.nodes.length === 0 ) {
            rule.removeSelf();
        } else {
            rule.semicolon = true;
        }
    }
};

module.exports = postcss.plugin('postcss-nested', function (opts) {
    var bubble = ['media', 'support', 'document'];
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
