import frontmatter
import os
import glob
from datetime import datetime

folder_path = "{}/src/content/blog".format(os.getcwd())
md_files = glob.glob(os.path.join(folder_path, "*.md"))
content = []

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
                "/{}/{}".format(pubTime.strftime("%Y/%m/%d"), post.metadata["slug"]),
                "/posts/" + post.metadata["slug"],
            ]
        )

content.sort()

for c in content:
    print("'{}' : '{}',".format(c[0], c[1]))
