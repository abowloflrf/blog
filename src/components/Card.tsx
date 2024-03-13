import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { CollectionEntry } from "astro:content";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
}

export default function Card({ href, frontmatter, secHeading = true }: Props) {
  const { title, pubDatetime, modDatetime, description, tags } = frontmatter;

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-lg font-medium decoration-dashed hover:underline",
  };

  return (
    <li className="my-6">
      <a
        href={href}
        className="inline-block text-lg font-medium text-skin-accent decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0"
      >
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>
      <ul className="">
        {tags.map(tag => (
          <li
            key={tag}
            className="my-0.5 inline-block decoration-dashed hover:underline"
          >
            <a
              href={`/tags/${slugifyStr(tag)}/`}
              className="group pr-2 text-sm"
            >
              <span># {tag}</span>
            </a>
          </li>
        ))}
      </ul>
      <Datetime pubDatetime={pubDatetime} modDatetime={modDatetime} />
      <p>{description}</p>
    </li>
  );
}
