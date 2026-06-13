import os


def generate_structure(repo_path: str):

    tree = []

    for root, dirs, files in os.walk(repo_path):

        dirs[:] = [
            d for d in dirs
            if d not in {
                ".git",
                "__pycache__",
                "venv",
                "node_modules"
            }
        ]

        level = root.replace(repo_path, "").count(os.sep)

        indent = "    " * level

        tree.append(
            f"{indent}{os.path.basename(root)}/"
        )

        file_indent = "    " * (level + 1)

        for file in files:

            tree.append(
                f"{file_indent}{file}"
            )

    return "\n".join(tree)