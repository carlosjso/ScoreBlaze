from __future__ import annotations


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ValidationException(AppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class NotFoundException(AppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=409)
