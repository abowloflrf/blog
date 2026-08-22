import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import slugify from "slugify";

const [, , title, customSlug] = process.argv;

if (!title) {
  process.stderr.write(
    '用法：pnpm post:new "文章标题" [自定义文件名]\n' +
      '示例：pnpm post:new "如何新增文章" new-post\n'
  );
  process.exitCode = 1;
} else {
  const postsDirectory = new URL("../src/content/posts/", import.meta.url);
  const generatedSlug = slugify(customSlug ?? title, {
    lower: true,
    strict: true,
  });
  const fallbackSlug = `post-${new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 15)}`;
  const baseSlug = generatedSlug || fallbackSlug;

  await mkdir(postsDirectory, { recursive: true });

  let slug = baseSlug;
  let suffix = 2;
  let fileUrl = new URL(`${slug}.md`, postsDirectory);

  while (await fileExists(fileUrl)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
    fileUrl = new URL(`${slug}.md`, postsDirectory);
  }

  const content = `---
title: ${JSON.stringify(title)}
pubDatetime: ${new Date().toISOString()}
description: ""
tags:
  - others
draft: true
---

从这里开始写正文。
`;

  await writeFile(fileUrl, content, { flag: "wx" });
  process.stdout.write(
    `已创建 ${path.relative(process.cwd(), fileUrl.pathname)}\n`
  );
}

async function fileExists(fileUrl) {
  try {
    await access(fileUrl);
    return true;
  } catch {
    return false;
  }
}
