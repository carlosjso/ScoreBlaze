from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

USER_NAME_MAX_LENGTH = 250
USER_PASSWORD_MIN_LENGTH = 8
USER_PASSWORD_MAX_LENGTH = 128

class UserBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=USER_NAME_MAX_LENGTH
    )
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=USER_PASSWORD_MIN_LENGTH,
        max_length=USER_PASSWORD_MAX_LENGTH
    )
    role_name: Optional[str] = Field(default=None, max_length=100)

class UserUpdate(UserBase):
    password: Optional[str] = Field(
        default=None,
        min_length=USER_PASSWORD_MIN_LENGTH,
        max_length=USER_PASSWORD_MAX_LENGTH
    )
    role_name: Optional[str] = Field(default=None, max_length=100)

class UserOut(UserBase):
    id: int
    created_at: datetime
    roles: list[str] = []
    model_config = ConfigDict(from_attributes=True)

class UserTableItem(UserOut):
    role_count: int = 0

class UserTablePageOut(BaseModel):
    items: list[UserTableItem]
    page: int
    page_size: int
    total_items: int
    total_pages: int

class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class RoleCreate(RoleBase):
    pass

class RoleUpdate(RoleBase):
    pass

class RoleOut(RoleBase):
    id: int
    user_count: int = 0
    is_system: bool = False

class RoleTableItem(RoleOut):
    pass

class RoleTablePageOut(BaseModel):
    items: list[RoleTableItem]
    page: int
    page_size: int
    total_items: int
    total_pages: int

class PermissionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(PermissionBase):
    pass

class PermissionOut(PermissionBase):
    id: int
    role_count: int = 0

class PermissionTableItem(PermissionOut):
    pass

class PermissionTablePageOut(BaseModel):
    items: list[PermissionTableItem]
    page: int
    page_size: int
    total_items: int
    total_pages: int

class RolePermissionActionOut(BaseModel):
    key: str
    label: str
    permission_name: str
    enabled: bool

class RolePermissionModuleOut(BaseModel):
    key: str
    label: str
    description: str
    allow_all: bool
    permissions: list[RolePermissionActionOut]

class RolePermissionMatrixOut(BaseModel):
    role: RoleOut
    modules: list[RolePermissionModuleOut]

class RolePermissionMatrixUpdate(BaseModel):
    permission_names: list[str] = Field(default_factory=list)
