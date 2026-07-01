import os
from services.llm_service import generate_answer

def generate_devops_asset(repo_path: str, asset_type: str) -> str:
    """Auto-generates DevOps infrastructure assets based on the tech stack detected in the codebase."""
    
    # 1. Tech stack detection scan
    files_in_root = os.listdir(repo_path) if os.path.exists(repo_path) else []
    detected_stack = []
    
    if "requirements.txt" in files_in_root or "main.py" in files_in_root or "app.py" in files_in_root:
        detected_stack.append("Python (FastAPI/Flask)")
    if "package.json" in files_in_root:
        detected_stack.append("NodeJS/React/Vite")
    if "go.mod" in files_in_root:
        detected_stack.append("Go")
    if "pom.xml" in files_in_root:
        detected_stack.append("Java Maven")
        
    stack_desc = ", ".join(detected_stack) if detected_stack else "Generic Application"

    prompt_details = {
        "dockerfile": "Dockerfile: Multi-stage build, minimal alpine base runner, correct ports, node_modules/venv caching, non-root user.",
        "docker-compose": "docker-compose.yml: services defining app containers, environment variables, volumes, depends_on, database healthchecks.",
        "github-actions": ".github/workflows/main.yml: CI/CD workflow executing checkout, install dependencies, run linter, run tests, build check.",
        "kubernetes": "Kubernetes manifest containing Deployment, Service (NodePort or ClusterIP), ConfigMap, and Ingress YAML.",
        "helm": "Helm Chart Values.yaml definition mapping replicaCount, image registry, service ports, ingress paths, and resource limits."
    }
    
    asset_spec = prompt_details.get(asset_type.lower(), "DevOps configuration asset")

    prompt = f"""You are a senior DevOps Engineer and SRE.
Generate an enterprise-grade DevOps configuration file for the following tech stack: {stack_desc}.

Asset Type Requirement:
{asset_spec}

Repository Root Contents: {files_in_root}

Return ONLY the raw file contents (e.g. valid Dockerfile lines or clean YAML).
Do NOT wrap the output in markdown code fences, do not write introduction or summary, only output the file contents.
"""
    return generate_answer(prompt).strip()
