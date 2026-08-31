
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage
from app.models.schemas import ChatRequest, ChatResponse
from app.agents.hcp_agent import get_agent, TOOLS
from app.db.database import get_db, ChatMessage
import json
import logging
 
logger = logging.getLogger(__name__)
router = APIRouter()
 
 
@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        agent = get_agent()
 
        # Build message history
        messages = []
        for msg in request.conversation_history[-10:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))
 
        messages.append(HumanMessage(content=request.message))
 
        # Invoke the LangGraph agent
        state = {
            "messages": messages,
            "session_id": request.session_id,
            "last_action": None,
            "last_interaction_id": None,
            "result_data": None,
        }
 
        result = agent.invoke(state)
 
        # Extract final text response safely
        all_messages = result.get("messages", [])
        response_text = "I processed your request."
        for msg in reversed(all_messages):
            if hasattr(msg, "content") and msg.content and not hasattr(msg, "tool_calls"):
                response_text = msg.content
                break
            elif hasattr(msg, "content") and msg.content:
                # AIMessage that might have tool_calls but also text
                tool_calls = getattr(msg, "tool_calls", [])
                if not tool_calls and msg.content:
                    response_text = msg.content
                    break
 
        # Extract last_action and last_interaction_id from tool messages
        last_action = result.get("last_action")
        last_interaction_id = result.get("last_interaction_id")
        result_data = result.get("result_data")
 
        # Also scan messages for tool results if state keys missing
        if not last_action:
            from langchain_core.messages import ToolMessage
            for msg in reversed(all_messages):
                if hasattr(msg, "tool_calls") and getattr(msg, "tool_calls", []):
                    last_action = msg.tool_calls[-1].get("name") if msg.tool_calls else None
                    break
 
        # Save to DB
        try:
            db.add(ChatMessage(
                session_id=request.session_id,
                role="user",
                content=request.message
            ))
            db.add(ChatMessage(
                session_id=request.session_id,
                role="assistant",
                content=response_text,
                interaction_id=last_interaction_id,
            ))
            db.commit()
        except Exception as db_err:
            logger.warning(f"DB save failed (non-fatal): {db_err}")
            db.rollback()
 
        return ChatResponse(
            response=response_text,
            session_id=request.session_id,
            action_taken=last_action,
            interaction_id=last_interaction_id,
            data=result_data,
        )
 
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        # Return the actual error so you can debug
        return ChatResponse(
            response=f"Agent error: {str(e)}",
            session_id=request.session_id,
            action_taken=None,
            interaction_id=None,
            data=None,
        )
 
 
@router.get("/tools")
def list_tools():
    return {
        "tools": [
            {
                "name": t.name,
                "description": t.description,
            }
            for t in TOOLS
        ]
    }
 