from services.reader_service import read_file
from services.call_graph_service import (
    extract_function_calls
)

code = read_file(
    "repos/codepilot-ai/backend/api/repository.py"
)

graph = extract_function_calls(code)

print(graph)