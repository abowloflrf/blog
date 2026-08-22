import { defineAstroPaperConfig } from "./src/types/config";

const website = process.env.MY_SITE ?? "https://ruofeng.me";

export default defineAstroPaperConfig({
  site: {
    url: website,
    title: "Ruofeng's Blog",
    description: "The place I write.",
    author: "Lei",
    profile: website,
    ogImage: "",
    lang: "en",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 8,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/abowloflrf" },
    { name: "x", url: "https://x.com/abowloflrf" },
    { name: "linkedin", url: "https://www.linkedin.com/in/ruofenglei" },
    { name: "mail", url: "mailto:i@ruofeng.me" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
