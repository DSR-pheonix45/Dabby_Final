from abc import ABC, abstractmethod
from typing import List, Union
from schemas.coa_translation import UniversalCOAObject

class BaseERPAdapter(ABC):
    @abstractmethod
    def can_handle(self, file_content: bytes, filename: str, mime_type: str = "") -> bool:
        """Determines if this adapter can parse the given file content or filename pattern."""
        pass

    @abstractmethod
    def parse(self, file_content: bytes, filename: str) -> List[UniversalCOAObject]:
        """Parses the raw file content and returns a standardized list of UniversalCOAObjects."""
        pass
