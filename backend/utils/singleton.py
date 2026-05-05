from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import TypeVar

T = TypeVar("T")


def singleton(factory: Callable[..., T]) -> Callable[..., T]:
    instance: T | None = None

    @wraps(factory)
    def wrapper(*args, **kwargs) -> T:
        nonlocal instance
        if instance is None:
            instance = factory(*args, **kwargs)
        return instance

    return wrapper

