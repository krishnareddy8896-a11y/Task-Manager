from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from tasks.models import Task


@pytest.mark.django_db
def test_tasks_are_private_and_stats_are_scoped():
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(username="owner", password="Passphrase123!")
    other = get_user_model().objects.create_user(username="other", password="Passphrase123!")
    Task.objects.create(owner=user, title="Mine", status=Task.Status.DONE, priority=Task.Priority.HIGH)
    Task.objects.create(owner=other, title="Theirs")
    client = APIClient()
    client.force_authenticate(user)

    response = client.get("/api/tasks/")
    stats = client.get("/api/tasks/stats/")

    assert response.status_code == 200
    assert [task["title"] for task in response.data] == ["Mine"]
    assert stats.data["total"] == 1
    assert stats.data["by_priority"]["high"] == 1


@pytest.mark.django_db
def test_due_filter_and_completion_timestamp():
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(username="filter", password="Passphrase123!")
    today = timezone.localdate()
    Task.objects.create(owner=user, title="Today", due_date=today)
    Task.objects.create(owner=user, title="Yesterday", due_date=today - timedelta(days=1))
    client = APIClient()
    client.force_authenticate(user)

    due_today = client.get("/api/tasks/?due=today")
    assert [task["title"] for task in due_today.data] == ["Today"]
    task = Task.objects.get(title="Today")
    task.status = Task.Status.DONE
    task.save()
    assert task.completed_at is not None