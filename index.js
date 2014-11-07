var move = function (rule) {
    var selector = [];
    var root     = rule;
    var last     = null;

    do {
        selector.unshift(root.selector);
        last = root;
        root = root.parent;
    } while ( root.parent );

    var clone  = rule.clone({ selector: selector.join(' ') });
    root.insertAfter(last, clone);
    rule.removeSelf();
};

var rule = function (rule) {
    var child;
    for ( var i = 0; i < rule.childs.length; i++ ) {
        var child = rule.childs[i];

        if ( child.type == 'rule' ) {
            move(child);
            i--;
        }
    }
};

var process = function (css) {
    var child;
    for ( var i = 0; i < css.childs.length; i++ ) {
        child = css.childs[i];
        if ( child.type == 'rule' ) rule(child);
    }
};

module.exports = { postcss: process };
