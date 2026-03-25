import time
import threading
from collections import deque
from typing import Deque


class RateLimiter:
    """Token-bucket style IP rate limiter using a sliding window."""

    def __init__(self, limit: int = 60, window: int = 60):
        self._limit = limit          # max requests per window
        self._window = window        # window size in seconds
        self._buckets: dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Return True if the request should be allowed, False if rate-limited."""
        now = time.monotonic()
        cutoff = now - self._window

        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = deque()

            bucket = self._buckets[key]

            # Remove timestamps outside the current window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= self._limit:
                return False

            bucket.append(now)
            return True
