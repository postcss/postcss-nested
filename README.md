# PostCSS Nested [![Build Status](https://travis-ci.org/postcss/postcss-nested.svg)](https://travis-ci.org/postcss/postcss-nested)

<img align="right" width="135" height="95" src="http://postcss.github.io/postcss/logo-leftp.png" title="Philosopher’s stone, logo of PostCSS">

[PostCSS](https://github.com/postcss/postcss) plugin to unwrap nested rules
like how Sass does it.

```css
.phone {
    &_title {
        width: 500px;
        @media (max-width: 500px) {
            width: auto;
        }
    }
    body.is_dark &_title {
        color: white;
    }
    img {
        display: block;
    }
}
```

will be processed to:

```css
.phone_title {
    width: 500px;
}
@media (max-width: 500px) {
    .phone_title {
        width: auto;
    }
}
body.is_dark phone_title {
    color: white;
}
.phone img {
    display: block;
}
```

<a href="https://evilmartians.com/?utm_source=postcss-nested">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54">
</a>

## Usage

```js
postcss([ require('postcss-nested') ])
```

See [PostCSS] docs for examples for your environment.
