import pytest
from unittest.mock import patch
from celery_app import app
from tasks.indexing_tasks import index_repository_task, archive_and_upload_task

# Configure Celery app for testing (synchronous task execution)
app.conf.update(
    task_always_eager=True,
    task_eager_propagates=True,
)


@pytest.fixture(autouse=True)
def mock_db_and_observability():
    """Mock DB services and telemetry logging to avoid actual database writes during tests."""
    with (
        patch("tasks.indexing_tasks.update_repository_status") as mock_status,
        patch("tasks.indexing_tasks.update_indexing_progress") as mock_progress,
        patch("tasks.indexing_tasks.log_event") as mock_log,
    ):
        yield mock_status, mock_progress, mock_log


def test_index_repository_task_happy_path(mock_db_and_observability):
    mock_status, mock_progress, _ = mock_db_and_observability

    # Mock index_repository_generator to yield indexing steps
    mock_steps = [
        {"stage": "Cloning", "progress": 20, "message": "Cloning repository..."},
        {"stage": "Parsing", "progress": 50, "message": "Parsing code files..."},
        {
            "stage": "Completed",
            "progress": 100,
            "message": "Completed",
            "data": {"files_indexed": 12, "chunks_indexed": 45},
        },
    ]

    with (
        patch(
            "tasks.indexing_tasks.index_repository_generator", return_value=mock_steps
        ),
        patch("tasks.indexing_tasks.build_knowledge_graph") as mock_build_kg,
    ):
        # Execute the Celery task
        result = index_repository_task.delay("mock/path", "repo-123", "user-456")

        # Assert result status
        assert result.successful()

        # Assert database and progress updates were triggered correctly
        mock_status.assert_any_call("repo-123", "indexing")
        mock_status.assert_any_call(
            repo_id="repo-123", status="completed", files_indexed=12, chunks_indexed=45
        )

        # Verify knowledge graph generation was triggered after completion
        mock_build_kg.assert_called_once_with("mock/path", "repo-123")

        # Verify progress tracking calls
        assert (
            mock_progress.call_count == len(mock_steps) + 1
        )  # 1 initial + len(mock_steps)


def test_index_repository_task_failure(mock_db_and_observability):
    mock_status, mock_progress, _ = mock_db_and_observability

    from celery.exceptions import Retry

    # Simulate an exception in the generator
    with patch(
        "tasks.indexing_tasks.index_repository_generator",
        side_effect=ValueError("Disk Full"),
    ):
        # In eager mode, Celery raises Retry to indicate a retry attempt
        with pytest.raises(Retry):
            index_repository_task.delay("mock/path", "repo-123", "user-456")

        # Verify database is updated to failed
        mock_status.assert_any_call("repo-123", status="failed")

        # Verify failed progress update was written
        assert mock_progress.called
        last_call_args = mock_progress.call_args[0]
        assert last_call_args[0] == "mock/path"
        assert last_call_args[1]["progress"] == 100
        assert last_call_args[1]["stage"] == "Failed"
        assert last_call_args[1]["failed"] is True


def test_archive_and_upload_task():
    # Mock the archive_and_upload_repo service
    with patch(
        "services.repo_service.archive_and_upload_repo", return_value=True
    ) as mock_service:
        result = archive_and_upload_task.delay(
            path="mock/repo/path",
            repo_name="test-repo",
            repo_url="https://github.com/test/repo",
            repo_id="repo-123",
        )

        assert result.successful()
        mock_service.assert_called_once_with(
            "mock/repo/path",
            "test-repo",
            repo_url="https://github.com/test/repo",
            repo_id="repo-123",
        )
