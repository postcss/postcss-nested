var move = function (rule, after) {
    var selector = [];
    var root     = rule.parent;
    var last     = null;

    do {
        selector.unshift(root.selector);
        last = root;
        root = root.parent;
    } while ( root.parent && root.type != 'atrule' );

    if ( rule.selector.indexOf('&') == -1 ) {
        selector.push(rule.selector);
        selector = selector.join(' ');
    } else {
        selector = selector.join(' ');
        selector = rule.selector.replace(/&/g, selector);
    }

    if ( !after ) after = last;

    var before = rule.before;
    var clone  = rule.clone({ selector: selector });
    rule.removeSelf();
    root.insertAfter(after, clone);
    clone.before = before;
    return clone;
};

var rule = function (rule) {
    var unwraped    = false;
    var insertAfter = false;
    rule.each(function (child) {
        if ( child.type == 'rule' ) {
            unwraped = true;
            insertAfter = move(child, insertAfter);
        }
    });
    if ( unwraped && rule.childs.length === 0 ) rule.removeSelf();
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
