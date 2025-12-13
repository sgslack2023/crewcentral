from rest_framework import serializers
from .models import CustomUser,UserActivities, Roles
class CreateUserSerializer(serializers.Serializer):
    email=serializers.EmailField()
    fullname=serializers.CharField()

    role=serializers.ChoiceField(Roles)
    approved=serializers.BooleanField(default=False, required=False)

class LoginSerializer(serializers.Serializer):
        email=serializers.EmailField()
        password=serializers.CharField(required=False)
        is_new_user=serializers.BooleanField(default=False,required=False)


class UpdatePasswordSerializer(serializers.Serializer):
    user_id=serializers.CharField()
    password=serializers.CharField()

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model=CustomUser
        exclude=("password",)


class UserActivitiesSerializer(serializers.ModelSerializer):
    class Meta:
        model=UserActivities
        fields=("__all__")



class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    

class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=256)