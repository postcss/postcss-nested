var postcss = require('postcss');

var selectors = function (parent, node) {
    var result = [];
    parent.selectors.forEach(function (i) {
        node.selectors.forEach(function (j) {
            if ( j.indexOf('&') === -1 ) {
                result.push(i + ' ' + j);
            } else {
                result.push(j.replace(/&/g, i));
            }
        });
    });
    return result;
};

var atruleChilds = function (rule, atrule) {
    var decls = [];
    atrule.each(function (child) {
        if ( child.type === 'decl' ) {
            decls.push( child );
        } else if ( child.type === 'rule' ) {
            child.selectors = selectors(rule, child);
        } else if ( child.type === 'atrule' ) {
            atruleChilds(rule, child);
        }
    });
    if ( decls.length ) {
        var clone = rule.clone({ nodes: [] });
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
            child.selectors = selectors(rule, child);
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
        rule.raws.semicolon = true;
        if ( rule.nodes.length === 0 ) rule.remove();
    }
};

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
