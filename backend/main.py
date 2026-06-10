from fastapi import FastAPI

app = FastAPI(
    title="CodePilot AI",
    version="1.0.0"
)

@app.get("/")
def root():
    return {"message": "CodePilot AI Running"}