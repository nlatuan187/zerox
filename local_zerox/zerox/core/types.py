from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Page:
    content: str
    page: int
    content_length: int

@dataclass
class ZeroxOutput:
    pages: List[Page]
    total_pages: int
    total_content_length: int
    error: Optional[str] = None
