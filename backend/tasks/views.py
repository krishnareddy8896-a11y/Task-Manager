from django.db.models import Count, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import TaskFilter
from .models import Category, Task
from .serializers import CategorySerializer, TaskSerializer


class OwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)


class TaskViewSet(OwnedModelViewSet):
    queryset = Task.objects.select_related("category")
    serializer_class = TaskSerializer
    filterset_class = TaskFilter
    search_fields = ("title", "description", "category__name")
    ordering_fields = ("created_at", "due_date", "priority", "title")
    ordering = ("due_date", "-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        tasks = self.get_queryset()
        counts = tasks.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Task.Status.DONE)),
            pending=Count("id", filter=~Q(status=Task.Status.DONE)),
        )
        by_priority = tasks.values("priority").annotate(count=Count("id"))
        by_status = tasks.values("status").annotate(count=Count("id"))
        return Response({
            **counts,
            "by_priority": {item["priority"]: item["count"] for item in by_priority},
            "by_status": {item["status"]: item["count"] for item in by_status},
        })


class CategoryViewSet(OwnedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)