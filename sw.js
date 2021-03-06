if (!self.define) {
  let c,
    i = {};
  const n = (n, e) => (
    (n = new URL(n + ".js", e).href),
    i[n] ||
      new Promise((i) => {
        if ("document" in self) {
          const c = document.createElement("script");
          (c.src = n), (c.onload = i), document.head.appendChild(c);
        } else (c = n), importScripts(n), i();
      }).then(() => {
        let c = i[n];
        if (!c) throw new Error(`Module ${n} didn’t register its module`);
        return c;
      })
  );
  self.define = (e, o) => {
    const s =
      c ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (i[s]) return;
    let r = {};
    const f = (c) => n(c, s),
      d = { module: { uri: s }, exports: r, require: f };
    i[s] = Promise.all(e.map((c) => d[c] || f(c))).then((c) => (o(...c), r));
  };
}
define(["./workbox-08e67d2d"], function (c) {
  "use strict";
  self.addEventListener("message", (c) => {
    c.data && "SKIP_WAITING" === c.data.type && self.skipWaiting();
  }),
    c.precacheAndRoute(
      [
        {
          url: "icons/100x100-icon.png",
          revision: "cbbf09d8284b241c6a4ee040cb81b60b",
        },
        {
          url: "icons/1024x1024-icon.png",
          revision: "07298da8f73a07230b36b15720728460",
        },
        {
          url: "icons/107x107-icon.png",
          revision: "aa3cdb63f82ca890bed07d7736cb6de9",
        },
        {
          url: "icons/114x114-icon.png",
          revision: "7eef6efa213cb873c449f7904dcfa728",
        },
        {
          url: "icons/120x120-icon.png",
          revision: "4c6fe4c9325f3ea7373e097d7cc12f5e",
        },
        {
          url: "icons/1240x1240-icon.png",
          revision: "7566078798fc521e8466ad6e7361d241",
        },
        {
          url: "icons/1240x600-icon.png",
          revision: "b70262585f2187fdf28d6e48c7d9f645",
        },
        {
          url: "icons/128x128-icon.png",
          revision: "b8f3743d4d99b64d6ed822b6c53247c4",
        },
        {
          url: "icons/142x142-icon.png",
          revision: "e9c41279a7999c762ca1f06286763ef3",
        },
        {
          url: "icons/144x144-icon.png",
          revision: "f0f1401ba4d43dd56729078166ac1212",
        },
        {
          url: "icons/150x150-icon.png",
          revision: "fbbb10b8633d5ed53237a85fb30d1fc6",
        },
        {
          url: "icons/152x152-icon.png",
          revision: "affd765bfb63119814029fc9eb7db333",
        },
        {
          url: "icons/167x167-icon.png",
          revision: "252b402aa92ba0cbf373d721297ca894",
        },
        {
          url: "icons/16x16-icon.png",
          revision: "edf422e77e2eded4d0ba937ab05d53cf",
        },
        {
          url: "icons/176x176-icon.png",
          revision: "020c8f5052c20156bd9b01387c18efd9",
        },
        {
          url: "icons/180x180-icon.png",
          revision: "000bcec7c248f899629b655f93e7b278",
        },
        {
          url: "icons/188x188-icon.png",
          revision: "ef25c708d5cd3ebd33da3f8d611d404b",
        },
        {
          url: "icons/192x192-icon.png",
          revision: "85d7500f63b5735f6c9f11028a3b97a9",
        },
        {
          url: "icons/200x200-icon.png",
          revision: "76d9abf24b8bf8bec3404437b8bbf1a5",
        },
        {
          url: "icons/20x20-icon.png",
          revision: "fb150340742dcc4c4e96a4616c5094e2",
        },
        {
          url: "icons/225x225-icon.png",
          revision: "3faa4b7cc6d272f068b035501c719fea",
        },
        {
          url: "icons/2480x1200-icon.png",
          revision: "be30c4519ae0f8cd041aa2bb4c6df7b9",
        },
        {
          url: "icons/24x24-icon.png",
          revision: "37d81be1160570fa836485ea91f17465",
        },
        {
          url: "icons/256x256-icon.png",
          revision: "29e0c657ac5f19e741bf9da9f799a4e9",
        },
        {
          url: "icons/284x284-icon.png",
          revision: "2ddfadffb89f0c12d1f315ca43fad679",
        },
        {
          url: "icons/29x29-icon.png",
          revision: "21b4a5b6945cadd9ced1db5208f94b90",
        },
        {
          url: "icons/300x300-icon.png",
          revision: "90a0d3b579b5f68819e9211dd13b1e0b",
        },
        {
          url: "icons/30x30-icon.png",
          revision: "ecdf6e3a9783bdc2d681b2bffc32f6b8",
        },
        {
          url: "icons/310x150-icon.png",
          revision: "ebd1cc5f1e82746ed11fe47259bf24e5",
        },
        {
          url: "icons/310x310-icon.png",
          revision: "f16ebb066921b7809e7f6b237e7fd8e4",
        },
        {
          url: "icons/32x32-icon.png",
          revision: "72d4b778320425e8c591ed9f9653b2da",
        },
        {
          url: "icons/36x36-icon.png",
          revision: "af5f686198925f92bd4023d066e362f7",
        },
        {
          url: "icons/388x188-icon.png",
          revision: "0ec2ee4037e4d0c8ac7154aac8199cb3",
        },
        {
          url: "icons/388x388-icon.png",
          revision: "1c7b462ac7672d224312ca00df83f53b",
        },
        {
          url: "icons/40x40-icon.png",
          revision: "6e03fba3f425aa1f98de8b0e85b2e494",
        },
        {
          url: "icons/44x44-icon.png",
          revision: "984fe158ee0689643eaf6ba472acfac3",
        },
        {
          url: "icons/465x225-icon.png",
          revision: "518d0c20ac97246cd39a4b36786c2327",
        },
        {
          url: "icons/465x465-icon.png",
          revision: "1038477bfcdef652565195f364329cfd",
        },
        {
          url: "icons/48x48-icon.png",
          revision: "2bebc87b5ed9197e68a9506cd71bbd66",
        },
        {
          url: "icons/50x50-icon.png",
          revision: "b33808c4ecfa1a9f461c08d45956bc34",
        },
        {
          url: "icons/512x512-icon.png",
          revision: "11e04dadcb0650f186d9281afffb2369",
        },
        {
          url: "icons/55x55-icon.png",
          revision: "33ae93afdb50d1fb78d294891fb8e6fe",
        },
        {
          url: "icons/57x57-icon.png",
          revision: "cfdee4e9c5a927d80436380c9e2df7ad",
        },
        {
          url: "icons/58x58-icon.png",
          revision: "02e04ca9467167d0e8977886de997eb2",
        },
        {
          url: "icons/600x600-icon.png",
          revision: "ca423a8742d209fc3e71d3ca3fd53315",
        },
        {
          url: "icons/60x60-icon.png",
          revision: "75b45dc2c14827b08d6cf7a590a2078d",
        },
        {
          url: "icons/620x300-icon.png",
          revision: "6cebd6d85b2431cbe60d75148b6c8888",
        },
        {
          url: "icons/620x620-icon.png",
          revision: "ff667f9d0fc77d12bfac39348c70703e",
        },
        {
          url: "icons/63x63-icon.png",
          revision: "76678a9e166ba5ea06204688fbd52f63",
        },
        {
          url: "icons/64x64-icon.png",
          revision: "6dafe8ecfb9fa2286d99dca042b0392a",
        },
        {
          url: "icons/66x66-icon.png",
          revision: "5b93dc4ed32b8f53ab1e0707c9ac4831",
        },
        {
          url: "icons/71x71-icon.png",
          revision: "d6c89c095092a75e851810d59b7fd518",
        },
        {
          url: "icons/72x72-icon.png",
          revision: "edecba8ce4211382864f315cf0b7b32d",
        },
        {
          url: "icons/75x75-icon.png",
          revision: "1f1ca1de89789be043556be69683320f",
        },
        {
          url: "icons/76x76-icon.png",
          revision: "caa4601f48c8ea37081d2371e6dae682",
        },
        {
          url: "icons/775x375-icon.png",
          revision: "a76ab6d1d35b426db7e05b10f52660d2",
        },
        {
          url: "icons/80x80-icon.png",
          revision: "4ae3897cfc4031a87731cd0040e2d195",
        },
        {
          url: "icons/87x87-icon.png",
          revision: "ac824883c0c1dc90e46db64f97ce6847",
        },
        {
          url: "icons/88x88-icon.png",
          revision: "074d367dc161df6c91d68dee7aa53dd2",
        },
        {
          url: "icons/89x89-icon.png",
          revision: "591ebd18b29488cfd6c291c8781f439e",
        },
        {
          url: "icons/930x450-icon.png",
          revision: "896f8c73c04014c09d71c61dd15602fa",
        },
        {
          url: "icons/96x96-icon.png",
          revision: "89778a81724043cb832707cc291035e4",
        },
        { url: "index.html", revision: "6a5050cea244ebd31465e05b5641c65e" },
        {
          url: "manifest.webmanifest",
          revision: "13c373515481d7e261317c23e9403961",
        },
        {
          url: "src/Berechnung.js",
          revision: "9da4f29b0bf61ee7877528abdbab7eb6",
        },
        {
          url: "src/Bereitschaft.js",
          revision: "f5abd5aa2698b8e36ac7d39c44c351a5",
        },
        {
          url: "src/bootstrap.bundle.min.js",
          revision: "7ccd9d390d31af98110f74f842ea9b32",
        },
        {
          url: "src/bootstrap.min.css",
          revision: "94994c66fec8c3468b269dc0cc242151",
        },
        {
          url: "src/Einstellungen.js",
          revision: "af5045cdfe111fcb15844c7339325cbb",
        },
        { url: "src/EWT.js", revision: "14f5d0b5bd97c8052c7381c27612c968" },
        {
          url: "src/feiertage.js",
          revision: "53fbe8fa3f527bcc1b8ed66199ad31e3",
        },
        { url: "src/fonts.css", revision: "11c9a3d8e24590b76eca192e97b8bab9" },
        {
          url: "src/footable.bootstrap.min.css",
          revision: "c7eb9ae3dd5a5481e0149f8989040c5d",
        },
        {
          url: "src/footable.min.js",
          revision: "d92d546170ac3770f060db863a497d10",
        },
        { url: "src/Home.js", revision: "6bcd9ce59217f9d66f25ee886141a2ed" },
        {
          url: "src/jquery.min.js",
          revision: "8fb8fee4fcc3cc86ff6c724154c49c42",
        },
        { url: "src/Login.js", revision: "c5a601746d8142afe934ff9d11103672" },
        {
          url: "src/manifest.json",
          revision: "328a41ac03572c5ea84bb8c088bdbd81",
        },
        {
          url: "src/Material_Icons_Outlined-400-fallback2.woff2",
          revision: "80ffd7f38b1f58a1a8c7125c12cc7878",
        },
        {
          url: "src/Material_Icons_Round-400-fallback3.woff2",
          revision: "82f9b1b404daf3f2637660b24d6e0e8e",
        },
        {
          url: "src/Material_Icons-400-fallback1.woff2",
          revision: "2ef373830aa561f31f385b4f343fd646",
        },
        {
          url: "src/moment-with-locales.min.js",
          revision: "086467ffe4ec91805eca31466c2c4124",
        },
        { url: "src/Neben.js", revision: "d258c7ffc76c078f06e14ab239e1222b" },
        {
          url: "src/Stylesheet.css",
          revision: "d9f81649eaba260260afca3212456970",
        },
        {
          url: "src/toastr.min.css",
          revision: "f284028c678041d687c6f1be6968f68a",
        },
        {
          url: "src/toastr.min.js",
          revision: "8ee1218b09fb02d43fcf0b84e30637ad",
        },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    );
});
//# sourceMappingURL=sw.js.map
