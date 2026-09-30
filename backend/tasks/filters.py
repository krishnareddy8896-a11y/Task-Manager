from datetime import timedelta

from django.utils import timezone
from django_filters import rest_framework as filters

from .models import Task


class TaskFilter(filters.FilterSet):
    due = filters.CharFilter(method="filter_due")

    class Meta:
        model = Task
        fields = ("status", "priority", "due_date")

    def filter_due(self, queryset, name, value):
        today = timezone.localdate()
        if value == "today":
            return queryset.filter(due_date=today)
        if value == "overdue":
            return queryset.exclude(status=Task.Status.DONE).filter(due_date__lt=today)
        if value == "this_week":
            return queryset.filter(due_date__gte=today, due_date__lte=today + timedelta(days=6))
        return queryset