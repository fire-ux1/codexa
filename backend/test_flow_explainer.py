import os
import services.llm_service
from services.flow_explainer_service import explain_flow

import services.flow_explainer_service

# If LLM_API_KEY is not set, mock the generate_answer call
if not os.environ.get("LLM_API_KEY"):
    mock_func = lambda prompt: "Mocked flow explanation content."
    services.llm_service.generate_answer = mock_func
    services.flow_explainer_service.generate_answer = mock_func

result = explain_flow("backend")

print(result["flow"])
print("\n" + "=" * 50 + "\n")
print(result["explanation"])
