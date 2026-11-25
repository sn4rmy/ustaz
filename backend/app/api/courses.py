import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AdminUser, DbSession, get_current_user, require_admin
from app.llm import LLMError
from app.models import Course, Topic
from app.rag import MaterialError, add_material
from app.schemas.course import (
    CourseCreate,
    CourseOut,
    MaterialOut,
    Title,
    TopicCreate,
    TopicOut,
)

router = APIRouter(prefix="/courses", tags=["courses"])
logger = logging.getLogger(__name__)


def get_course(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "course_not_found")
    return course


@router.get("", dependencies=[Depends(get_current_user)])
def list_courses(db: DbSession) -> list[CourseOut]:
    courses = db.scalars(select(Course).order_by(Course.id))
    return [CourseOut.model_validate(course) for course in courses]


@router.get("/{course_id}/topics", dependencies=[Depends(get_current_user)])
def list_topics(course_id: int, db: DbSession) -> list[TopicOut]:
    get_course(db, course_id)
    topics = db.scalars(
        select(Topic)
        .where(Topic.course_id == course_id)
        .order_by(Topic.position, Topic.id)
    )
    return [TopicOut.model_validate(topic) for topic in topics]


@router.post(
    "", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)]
)
def create_course(data: CourseCreate, db: DbSession) -> CourseOut:
    course = Course(title=data.title, language=data.language)
    db.add(course)
    db.commit()
    return CourseOut.model_validate(course)


@router.post(
    "/{course_id}/topics",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_topic(course_id: int, data: TopicCreate, db: DbSession) -> TopicOut:
    get_course(db, course_id)
    topic = Topic(course_id=course_id, title=data.title, position=data.position)
    db.add(topic)
    db.commit()
    return TopicOut.model_validate(topic)


@router.post("/{course_id}/materials", status_code=status.HTTP_201_CREATED)
def upload_material(
    course_id: int,
    title: Annotated[Title, Form()],
    file: UploadFile,
    admin: AdminUser,
    db: DbSession,
) -> MaterialOut:
    get_course(db, course_id)
    try:
        material, chunks_count = add_material(
            db, course_id, title, file.filename or "", file.file.read(), admin.id
        )
    except MaterialError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from None
    except LLMError as error:
        logger.warning("Material upload failed, LLM error: %s", error)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "llm_unavailable"
        ) from None
    db.commit()
    return MaterialOut(id=material.id, title=material.title, chunks_count=chunks_count)
