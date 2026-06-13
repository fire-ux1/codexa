from services.flow_explainer_service import (
    explain_flow
)

result = explain_flow(
    "repos/codepilot-ai",
    "clone_repo"
)

print(result["flow"])

print("\n" + "=" * 50 + "\n")

print(result["explanation"])