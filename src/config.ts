const website: string = process.env.MY_SITE ?? "https://ruofeng.me";

export const SITE = {
  website: website, // replace this with your deployed domain
  author: "Lei",
  profile: website,
  desc: "The place I write.",
  title: "Ruofeng's Blog",
  ogImage: "",
  lightAndDarkMode: false,
  postPerIndex: 8,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
