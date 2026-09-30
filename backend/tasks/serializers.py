from rest_framework import serializers

from .models import Category, Task


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name")
        read_only_fields = ("id",)


class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "status", "priority", "due_date", "created_at",
            "completed_at", "category", "category_name",
        )
        read_only_fields = ("id", "created_at", "completed_at", "category_name")

    def validate_category(self, category):
        if category and category.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Choose one of your own categories.")
        return category