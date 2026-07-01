from services.architecture_service import generate_structure
from services.symbol_service import get_repository_symbols
from services.llm_service import generate_answer


import json

def review_repository(repo_path: str):
    structure = generate_structure(repo_path)
    symbols = get_repository_symbols(repo_path)

    symbol_text = ""
    for symbol in symbols[:20]:
        symbol_text += f"""
FILE: {symbol["file"]}
SYMBOL: {symbol["name"]}
TYPE: {symbol["type"]}

{symbol["content"]}

-----------------------------------
"""

    prompt = f"""
You are a senior staff software engineer and software architect.
Review this repository and provide a structured JSON assessment.

Repository Structure:
{structure}

Key Functions And Classes:
{symbol_text}

Provide your review in VALID JSON format ONLY. Do not include any explanation or markdown formatting outside the JSON block.
The JSON must adhere to the following schema:
{{
  "score": <number_from_0_to_10>,
  "architecture": "<detailed_markdown_architecture_assessment>",
  "maintainability": "<detailed_markdown_maintainability_assessment>",
  "security": "<detailed_markdown_security_assessment>",
  "performance": "<detailed_markdown_performance_assessment>",
  "code_smells": "<detailed_markdown_code_smells_assessment>",
  "duplicate_code": "<detailed_markdown_duplicate_code_assessment>",
  "best_practices": "<detailed_markdown_best_practices_assessment>",
  "recommendations": [
    "<recommendation_1>",
    "<recommendation_2>",
    ...
  ]
}}
Ensure the JSON is correctly escaped and valid. Keep markdown text inside quotes clean and properly escaped.
"""

    raw_answer = generate_answer(prompt)
    
    # Extract JSON if wrapped in markdown code block
    json_text = raw_answer.strip()
    if json_text.startswith("```"):
        lines = json_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        json_text = "\n".join(lines).strip()

    try:
        data = json.loads(json_text)
    except Exception as e:
        print(f"Failed to parse LLM response as JSON: {e}. Raw response: {raw_answer}")
        data = {
            "score": 5.0,
            "architecture": "Failed to parse structured review. Raw output below:\n\n" + raw_answer,
            "maintainability": "N/A",
            "security": "N/A",
            "performance": "N/A",
            "code_smells": "N/A",
            "duplicate_code": "N/A",
            "best_practices": "N/A",
            "recommendations": ["Re-run repository review to get structured data."]
        }

    return data

