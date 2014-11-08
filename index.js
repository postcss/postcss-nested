var selector = function (parent, node) {
    if ( node.selector.indexOf('&') == -1 ) {
        return parent.selector + ' ' + node.selector;
    } else {
        return node.selector.replace(/&/g, parent.selector);
    }
};

var move = function (what, where, after) {
    var clone = what.clone();
    what.removeSelf();
    where.insertAfter(after, clone);
    return clone;
};

var atruleChilds = function (rule, atrule) {
    var clone;
    var decls = [];
    atrule.each(function (node) {
        if ( node.type == 'decl' ) {
            clone = node.clone();
            clone.before = node.before;
            decls.push( clone );
            node.removeSelf();
        } else if ( node.type == 'rule' ) {
            node.selector = selector(rule, node);
        } else if ( node.type == 'atrule' ) {
            atruleChilds(rule, node);
        }
    });
    if ( decls.length ) {
        clone = rule.clone({ childs: [] });
        for ( var i = 0; i < decls.length; i++ ) {
            clone.append( decls[i] );
        }
        atrule.prepend(clone);
        clone.before = atrule.before;
    }
};

var moveAtrule = function (rule, atrule, after) {
    atruleChilds(rule, atrule);
    return move(atrule, rule.parent, after || rule.parent);
};

var moveRule = function (rule, after) {
    var to     = rule.parent.parent;
    var before = rule.before;
    var moved  = move(rule, to, after || rule.parent);
    moved.selector = selector(rule.parent, moved);
    moved.before   = rule.before;
    return moved;
};

var rule = function (rule) {
    var unwrapped   = false;
    var insertAfter = false;
    rule.each(function (child) {
        if ( child.type == 'rule' ) {
            unwrapped = true;
            insertAfter = moveRule(child, insertAfter);
        } else if ( child.type == 'atrule' ) {
            unwrapped = true;
            insertAfter = moveAtrule(rule, child, insertAfter);
        }
    });
    if ( unwrapped && rule.childs.length === 0 ) rule.removeSelf();
};

var process = function (node) {
    node.each(function (child) {
        if ( child.type == 'rule' ) {
            rule(child);
        } else if ( child.type == 'atrule' ) {
            process(child);
        }
    });
};

module.exports = { postcss: process };
