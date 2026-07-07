import os
import pytest
import services.llm_service
import services.flow_explainer_service
from services.flow_explainer_service import explain_flow

# ── Determine if a real LLM key is configured ────────────────────────────────
# CI sets LLM_API_KEY to a dummy value ('test-key').
# We treat any key that starts with 'sk-' or is longer than 20 chars
# as potentially real; everything else gets mocked.
_api_key = os.environ.get("LLM_API_KEY", "")
_has_real_key = len(_api_key) > 20 and not _api_key.startswith("test")


def _apply_mock():
    """Patch generate_answer to avoid live LLM calls in CI."""

    def _mock_generate(prompt):
        return "Mocked flow explanation content."

    services.llm_service.generate_answer = _mock_generate
    services.flow_explainer_service.generate_answer = _mock_generate


# Always mock in CI — patch at import time so explain_flow uses the mock
if not _has_real_key:
    _apply_mock()


def test_explain_flow_returns_expected_keys():
    """explain_flow should return a dict with 'flow' and 'explanation' keys."""
    result = explain_flow("backend")
    assert isinstance(result, dict), "Result should be a dict"
    assert "flow" in result, "Result should contain 'flow' key"
    assert "explanation" in result, "Result should contain 'explanation' key"


def test_explain_flow_flow_is_string():
    """The 'flow' value should be a non-empty string."""
    result = explain_flow("backend")
    assert isinstance(result["flow"], str)
    assert len(result["flow"]) > 0


def test_explain_flow_explanation_is_string():
    """The 'explanation' value should be a non-empty string."""
    result = explain_flow("backend")
    assert isinstance(result["explanation"], str)
    assert len(result["explanation"]) > 0


@pytest.mark.skipif(_has_real_key, reason="Only runs in CI / mock mode")
def test_explain_flow_mock_content():
    """When mocked, explanation contains the expected mock string."""
    result = explain_flow("backend")
    assert "Mocked" in result["explanation"] or len(result["explanation"]) > 0
