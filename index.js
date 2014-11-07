var move = function (rule, after) {
    var selector = [];
    var root     = rule;
    var last     = null;

    do {
        selector.unshift(root.selector);
        last = root;
        root = root.parent;
    } while ( root.parent );

    if ( !after ) after = last;

    var before = rule.before;
    var clone  = rule.clone({ selector: selector.join(' ') });
    rule.removeSelf();
    root.insertAfter(after, clone);
    clone.before = before;
    return clone;
};

var rule = function (rule) {
    var child;
    var unwraped    = false;
    var insertAfter = false;
    for ( var i = 0; i < rule.childs.length; i++ ) {
        var child = rule.childs[i];

        if ( child.type == 'rule' ) {
            unwraped = true;
            insertAfter = move(child, insertAfter);
            i--;
        }
    }
    if ( unwraped && rule.childs.length == 0 ) rule.removeSelf();
};

var process = function (css) {
    var child;
    for ( var i = 0; i < css.childs.length; i++ ) {
        child = css.childs[i];
        if ( child.type == 'rule' ) rule(child);
    }
};

module.exports = { postcss: process };
