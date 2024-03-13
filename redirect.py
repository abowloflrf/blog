import frontmatter
import os
import glob
from datetime import datetime
import requests

content = []


def parse_frontmatter():
    folder_path = "{}/src/content/blog".format(os.getcwd())
    md_files = glob.glob(os.path.join(folder_path, "*.md"))

    # 遍历所有的 .md 文件
    for file_path in md_files:
        with open(file_path, "r") as file:
            print(f"文件名：{os.path.basename(file_path)}")
            post = frontmatter.load(file)
            print(post.metadata["slug"])
            pubTime: datetime = post.metadata["pubDatetime"]
            print(pubTime.strftime("%Y/%m/%d"))
            print("-" * 20)  # 分隔线

            content.append(
                [
                    "/{}/{}".format(
                        pubTime.strftime("%Y/%m/%d"), post.metadata["slug"]
                    ),
                    "/posts/" + post.metadata["slug"],
                ]
            )


def fetch_ghost_api():
    r = requests.get(
        "https://ruofeng.me/ghost/api/v4/content/posts/?key={}&limit=all".format(
            os.environ["GHOST_KEY"]
        )
    )
    data = r.json()
    # data["posts"][0]["url"]
    # data["posts"][0]["slug"]
    for p in data["posts"]:
        content.append(
            [
                p["url"][len("https://ruofeng.me") : -1],
                "/posts/" + p["slug"],
            ]
        )


if __name__ == "__main__":
    fetch_ghost_api()
    content.sort()
    for c in content:
        print("'{}' : '{}',".format(c[0], c[1]))
