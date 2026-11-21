from dataclasses import asdict, dataclass

from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.agents.teacher import TeacherInput, TeacherMode, teach
from app.models import AgentTrace, Attempt, Item, Topic
from app.orchestrator.state import SessionState

# SPEC 10: no more than 6 graph steps per student message.
MAX_STEPS = 6


@dataclass
class TurnContext:
    db: Session


def has_attempt(db: Session, user_id: int, item_id: int) -> bool:
    return bool(
        db.scalar(
            select(
                exists().where(Attempt.user_id == user_id, Attempt.item_id == item_id)
            )
        )
    )


def route(state: SessionState, runtime: Runtime[TurnContext]) -> SessionState:
    # "Attempt first, hint second": with an open task the Teacher only gives hints,
    # whatever the student asks for.
    mode: TeacherMode = state.get("action") or "explain"
    item_id = state.get("pending_item_id")
    if item_id is not None and not has_attempt(
        runtime.context.db, state["student_id"], item_id
    ):
        mode = "hint"
    return {"mode": mode}


def teacher(state: SessionState, runtime: Runtime[TurnContext]) -> SessionState:
    db = runtime.context.db
    topic_id = state.get("current_topic_id")
    topic = db.get(Topic, topic_id) if topic_id is not None else None
    item_id = state.get("pending_item_id")
    item = db.get(Item, item_id) if item_id is not None else None

    data = TeacherInput(
        mode=state["mode"],
        question=state["user_message"],
        course_id=state["course_id"],
        topic_title=topic.title if topic else None,
        language=state["language"],
        history=state.get("history", []),
        task_prompt=item.prompt if item and state["mode"] == "hint" else None,
    )
    output = teach(db, data)

    db.add(
        AgentTrace(
            session_id=state["session_id"],
            agent="teacher",
            input=asdict(data),
            output={
                "text": output.text,
                "citations": output.citations,
                "fragments": [
                    {"chunk_id": fragment.chunk_id, "score": fragment.score}
                    for fragment in output.fragments
                ],
            },
            model=output.llm.model,
            tokens_in=output.llm.tokens_in,
            tokens_out=output.llm.tokens_out,
            latency_ms=output.llm.latency_ms,
        )
    )
    return {
        "teacher_output": {
            "agent": "teacher",
            "content": output.text,
            "citations": output.citations,
        }
    }


def respond(state: SessionState) -> SessionState:
    # The one place that decides what the student sees; in M3 it also picks
    # between the Teacher and the Examiner.
    return {"reply": state["teacher_output"]}


def build_graph() -> StateGraph:
    graph = StateGraph(SessionState, context_schema=TurnContext)
    graph.add_node("route", route)
    graph.add_node("teacher", teacher)
    graph.add_node("respond", respond)
    graph.add_edge(START, "route")
    graph.add_edge("route", "teacher")
    graph.add_edge("teacher", "respond")
    graph.add_edge("respond", END)
    return graph


turn_graph = build_graph().compile()


def run_turn(db: Session, state: SessionState) -> SessionState:
    return turn_graph.invoke(
        state, {"recursion_limit": MAX_STEPS}, context=TurnContext(db)
    )
