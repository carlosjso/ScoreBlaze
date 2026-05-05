from fastapi import Depends
from sqlalchemy.orm import Session

from database.alchemy import get_db
from database.unit_of_work import UnitOfWork


def get_unit_of_work(db: Session = Depends(get_db)) -> UnitOfWork:
    return UnitOfWork(db)
