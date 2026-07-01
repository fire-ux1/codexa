import os
import services.llm_service
from services.flow_explainer_service import explain_flow

# If LLM_API_KEY is not set, mock the generate_answer call
if not os.environ.get("LLM_API_KEY"):
    services.llm_service.generate_answer = lambda prompt: "Mocked flow explanation content."

result = explain_flow("backend")

print(result["flow"])
print("\n" + "=" * 50 + "\n")
print(result["explanation"])
