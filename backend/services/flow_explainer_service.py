print("Building graph...")

graph = build_repository_graph(repo_path)

print("Graph built")

print("Sending prompt to LLM...")

explanation = generate_answer(prompt)

print("LLM response received")