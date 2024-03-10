import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    shikiConfig: {
      theme: "rose-pine-dawn",
      wrap: true,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
  redirects: {
    '/1997/08/29/hello': '/posts/hello',
    '/2017/09/16/hello-again': '/posts/hello-again',
    '/2017/11/01/regex-note-1': '/posts/regex-note-1',
    '/2017/11/02/regex-note-2': '/posts/regex-note-2',
    '/2017/11/14/how-to-evaluate-a-vps': '/posts/how-to-evaluate-a-vps',
    '/2017/11/19/eight-queen-problem': '/posts/eight-queen-problem',
    '/2017/12/17/login-with-public-key-instead-of-password': '/posts/login-with-public-key-instead-of-password',
    '/2018/02/06/design-pattern-singleton': '/posts/design-pattern-singleton',
    '/2018/02/06/usage-of-auto-load-in-php-composer': '/posts/usage-of-auto-load-in-php-composer',
    '/2018/02/07/design-pattern-abstract-factory': '/posts/design-pattern-abstract-factory',
    '/2018/02/07/design-pattern-builder': '/posts/design-pattern-builder',
    '/2018/02/07/design-pattern-factory-method': '/posts/design-pattern-factory-method',
    '/2018/02/07/design-pattern-prototype': '/posts/design-pattern-prototype',
    '/2018/02/08/design-pattern-adapter': '/posts/design-pattern-adapter',
    '/2018/02/08/design-pattern-bridge': '/posts/design-pattern-bridge',
    '/2018/02/08/use-jwt-in-laravel-to-build-api': '/posts/use-jwt-in-laravel-to-build-api',
    '/2018/02/09/2018-02-09-design-pattern-facade': '/posts/2018-02-09-design-pattern-facade',
    '/2018/02/09/design-pattern-decorator': '/posts/design-pattern-decorator',
    '/2018/02/10/design-pattern-composite': '/posts/design-pattern-composite',
    '/2018/02/11/debug-c-cpp-in-linux-with-vscode': '/posts/debug-c-cpp-in-linux-with-vscode',
    '/2018/02/11/design-pattern-flyweight': '/posts/design-pattern-flyweight',
    '/2018/02/11/design-pattern-proxy': '/posts/design-pattern-proxy',
    '/2018/02/11/types-comparisons-in-php': '/posts/types-comparisons-in-php',
    '/2018/02/17/design-pattern-chain-of-responsibility': '/posts/design-pattern-chain-of-responsibility',
    '/2018/02/19/notesrepo-a-personal-note-manage-website': '/posts/notesrepo-a-personal-note-manage-website',
    '/2018/03/03/authentication-with-php-0': '/posts/authentication-with-php-0',
    '/2018/03/03/authentication-with-php-1': '/posts/authentication-with-php-1',
    '/2018/03/03/authentication-with-php-2': '/posts/authentication-with-php-2',
    '/2018/03/04/authentication-with-php-3': '/posts/authentication-with-php-3',
    '/2018/03/04/authentication-with-php-4': '/posts/authentication-with-php-4',
    '/2018/03/04/authentication-with-php-5': '/posts/authentication-with-php-5',
    '/2018/03/04/authentication-with-php-6': '/posts/authentication-with-php-6',
    '/2018/03/06/mysql-what-i-have-to-know': '/posts/mysql-what-i-have-to-know',
    '/2018/03/07/know-about-references-in-php-with-a-small-piece-of-code': '/posts/know-about-references-in-php-with-a-small-piece-of-code',
    '/2018/03/08/some-new-features-in-php7': '/posts/some-new-features-in-php7',
    '/2018/04/24/use-libpcap-to-send-and-capture': '/posts/use-libpcap-to-send-and-capture',
    '/2018/05/16/basic-usage-of-memcached': '/posts/basic-usage-of-memcached',
    '/2018/05/16/index-in-mysql': '/posts/index-in-mysql',
    '/2018/05/18/migration-of-blog-again': '/posts/migration-of-blog-again',
    '/2018/06/08/an-onsite-interview-of-airbnb': '/posts/an-onsite-interview-of-airbnb',
    '/2018/07/12/implement-hashtable-in-c': '/posts/implement-hashtable-in-c',
    '/2018/07/13/lru-cache': '/posts/lru-cache',
    '/2018/07/18/order-of-local-variable-allocation-on-the-stack': '/posts/order-of-local-variable-allocation-on-the-stack',
    '/2018/07/21/thougths-about-an-algorithm-problem-of-alibaba': '/posts/thougths-about-an-algorithm-problem-of-alibaba',
    '/2018/09/19/capture-packets-in-kubernetes': '/posts/capture-packets-in-kubernetes',
    '/2018/10/21/get-started-with-module-and-package-of-python': '/posts/get-started-with-module-and-package-of-python',
    '/2018/10/27/decorator-in-python': '/posts/decorator-in-python',
    '/2018/11/18/how-does-istio-pilot-push-eds-config': '/posts/how-does-istio-pilot-push-eds-config',
    '/2019/04/27/realtime-in-web': '/posts/realtime-in-web',
    '/2020/07/08/k8s-leader-election': '/posts/k8s-leader-election',
    '/2021/07/10/kubernetes-informer-in-depth': '/posts/kubernetes-informer-in-depth',
    '/2021/07/28/k8s-hpa-controller': '/posts/k8s-hpa-controller',
    '/2021/08/05/go-source-code-channel': '/posts/go-source-code-channel',
    '/2021/08/24/the-go-memory-model': '/posts/the-go-memory-model',
    '/2021/08/30/go-interface': '/posts/go-interface',
    '/2021/09/03/cpp-quick-guide': '/posts/cpp-quick-guide',
    '/2021/10/15/k8s-kube-scheduler': '/posts/k8s-kube-scheduler',
  }
});
