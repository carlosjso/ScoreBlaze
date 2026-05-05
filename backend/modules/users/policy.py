from core.exceptions import NotFoundException
from modules.users.domain import validate_unique_user_email
from modules.users.repositories import UserRepository


class UserPolicy:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_existing_user(self, user_id: int):
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user

    def ensure_email_available(self, email: str, current_user_id: int | None = None) -> None:
        existing_user = self.user_repo.get_by_email(email, include_deleted=True)
        validate_unique_user_email(
            existing_user.id if existing_user else None,
            current_user_id=current_user_id,
        )
