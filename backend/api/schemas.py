from pydantic import BaseModel, HttpUrl


class RepositoryCloneRequest(BaseModel):
    repo_url: HttpUrl
    access_token: str | None = None


class RepositoryPathRequest(BaseModel):
    repo_path: str


class QuestionRequest(BaseModel):
    question: str
    repo_path: str | None = None
    stream: bool = False
