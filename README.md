# PostCSS Nested [![Build Status](https://travis-ci.org/postcss/postcss-nested.png)](https://travis-ci.org/postcss/postcss-nested)

<img align="right" width="95" height="95" src="http://postcss.github.io/postcss/logo.png" title="Philosopher’s stone, logo of PostCSS">

[PostCSS](https://github.com/postcss/postcss) plugin to unwrap nested rules
like it Sass does.

```css
.phone {
    &_title {
        width: 500px
        @media (max-width: 500px) {
            width: auto
        }
    }
    body.is_dark &_title {
        color: white
    }
    img {
        display: block
    }
}
```

will be processed to:

```css
.phone_title {
    width: 500px
}
@media (max-width: 500px) {
    .phone_title {
        width: auto
    }
}
body.is_dark phone_title {
    color: white
}
.phone img {
    display: block
}
```

## Usage

See [PostCSS](https://github.com/postcss/postcss) docs for source map options
and other special cases.

### Grunt

```js
grunt.initConfig({
    postcss: {
        options: {
            processors: [ require('postcss-nested').postcss ]
        },
        dist: {
            src: 'css/*.css'
        }
    }
});

grunt.loadNpmTasks('grunt-postcss');
```

### Gulp

```js
var postcss = require('gulp-postcss');

gulp.task('css', function () {
     return gulp.src('./src/*.css')
        .pipe(postcss([ require('postcss-nested') ]))
        .pipe(gulp.dest('./dest'));
});
```

### Node

```
var postcss = require('postcss');
var nested  = require('postcss-nested');

var processed = postcss(nested).process(css).css;
```
