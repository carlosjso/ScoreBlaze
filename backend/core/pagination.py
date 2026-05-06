from __future__ import annotations

from math import ceil
from typing import Sequence, TypeVar

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

T = TypeVar("T")


def paginate_sequence(items: Sequence[T], page: int, page_size: int) -> tuple[list[T], int, int, int]:
    total_items = len(items)
    total_pages = max(1, ceil(total_items / page_size) if page_size > 0 else 1)
    normalized_page = min(max(1, page), total_pages)
    start = (normalized_page - 1) * page_size
    end = start + page_size
    return list(items[start:end]), normalized_page, page_size, total_items
