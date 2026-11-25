Roundcube Webmail Skin "mARTdesign"
===================================

Child skin extending Roundcube's official `elastic` skin with the
mARTdesign visual identity (Creme light theme + Carbono dark theme,
self-hosted Inter & Comfortaa typography, official mARTdesign SVG assets).

BUILD
-----

From the Roundcube root directory (with `less` and `less-plugin-clean-css`
installed in `node_modules`):

```
    cd skins/martdesign && make css
```

Pre-compiled `.css` and `.min.css` bundles are tracked in this fork so
production servers do not require Node.js.
