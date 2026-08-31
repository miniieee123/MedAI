"""
LangGraph AI Agent for HCP CRM Module
Manages HCP interactions via a graph-based agent with 8 specialized tools.
"""

import json
import os
import re
from datetime import datetime, timezone
from typing import Annotated, Any, Optional, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, Interaction, HCP, ChatMessage

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
    import logging
    logging.warning(
        "GROQ_API_KEY environment variable is not set. "
        "AI agent features will not work. Create a .env file with: GROQ_API_KEY=gsk_..."
    )

PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"


def sentiment_to_score(label: str) -> tuple[float, str]:
    """Convert a sentiment label to a numeric score and normalized label."""
    sent_lower = (label or "").lower()
    if "pos" in sent_lower:
        return 0.9, "Positive"
    elif "neg" in sent_lower:
        return 0.1, "Negative"
    return 0.5, "Neutral"


# ─────────────────────────────────────────────
# Agent State
# ─────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    last_action: Optional[str]
    last_interaction_id: Optional[int]
    result_data: Optional[Any]


# ─────────────────────────────────────────────
# TOOL 1: Log Interaction
# ─────────────────────────────────────────────

@tool
def log_interaction(
    hcp_name: str,
    interaction_type: Optional[str] = "visit",
    date: Optional[str] = None,
    time: Optional[str] = None,
    attendees: Optional[str] = None,
    topic: Optional[str] = None,
    materials: Optional[str] = None,
    samples: Optional[str] = None,
    sentiment: Optional[str] = "Neutral",
    outcomes: Optional[str] = None,
    follow_up: Optional[str] = None,
) -> dict:
    """
    Log a new interaction with a Healthcare Professional (HCP). 
    Extracts structured fields (hcp_name, interaction_type, date, time, attendees, topic, materials, samples, sentiment, outcomes, follow_up) from natural language.
    Saves to the database and returns the filled structured data to automatically populate the frontend form.
    """
    db: Session = SessionLocal()
    try:
        # Find or create HCP
        hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
        if not hcp:
            hcp = HCP(
                name=hcp_name, 
                specialization=topic or "Internal Medicine", 
                specialty=topic or "Internal Medicine",
                hospital="General Hospital", 
                institution="General Hospital",
                contact="contact@hcp.com",
                tier="B"
            )
            db.add(hcp)
            db.flush()

        date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        time_str = time or datetime.now(timezone.utc).strftime("%H:%M")

        # Convert sentiment to a numeric score for analytics compatibility
        sentiment_score, sentiment_label = sentiment_to_score(sentiment)

        # Generate a professional summary automatically if outcome / topics discussed are present
        summary_text = f"Met with {hcp_name}. Discussed {topic or 'general products'}. Sentiment was {sentiment_label}."
        if outcomes:
            summary_text += f" Outcome: {outcomes}"

        interaction = Interaction(
            hcp_id=hcp.id,
            hcp_name=hcp_name,
            interaction_type=interaction_type or "visit",
            date=date_str,
            time=time_str,
            attendees=attendees,
            topic=topic,
            materials=materials,
            samples=samples,
            sentiment=sentiment_label,
            outcomes=outcomes,
            follow_up=follow_up,
            
            # Compatibility columns
            notes=summary_text,
            summary=summary_text,
            sentiment_score=sentiment_score,
            outcome="positive" if sentiment_label == "Positive" else "negative" if sentiment_label == "Negative" else "neutral",
            follow_up_notes=follow_up,
            samples_provided=samples,
            materials_shared=materials,
            ai_insights=json.dumps({
                "key_topics": [topic] if topic else [],
                "action_items": [follow_up] if follow_up else [],
                "product_interest_level": "high" if sentiment_label == "Positive" else "medium",
                "concerns_raised": []
            })
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        autofill_payload = {
            "hcp_id": hcp.id,
            "hcp_name": hcp_name,
            "interaction_type": interaction_type or "visit",
            "date": date_str,
            "time": time_str,
            "attendees": attendees or "",
            "topic": topic or "",
            "materials": materials or "",
            "samples": samples or "",
            "sentiment": sentiment_label,
            "outcomes": outcomes or "",
            "follow_up": follow_up or "",
            "notes": summary_text
        }

        return {
            "success": True,
            "autofill": True,
            "interaction_id": interaction.id,
            "data": autofill_payload,
            "message": f"Successfully parsed and logged interaction #{interaction.id} for {hcp_name}. Frontend form has been auto-populated."
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 2: Edit Interaction
# ─────────────────────────────────────────────

@tool
def edit_interaction(
    interaction_id: int,
    field: str,
    new_value: str,
) -> dict:
    """
    Edit a specific field of an existing logged interaction.
    Allowed fields: sentiment, outcomes, follow_up, date, time, attendees, topic, materials, samples, interaction_type.
    """
    db: Session = SessionLocal()
    try:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not interaction:
            return {"success": False, "error": f"Interaction #{interaction_id} not found."}

        allowed_fields = [
            "sentiment", "outcomes", "follow_up", "date", "time", 
            "attendees", "topic", "materials", "samples", "interaction_type"
        ]
        if field not in allowed_fields:
            return {"success": False, "error": f"Field '{field}' cannot be edited. Allowed: {allowed_fields}"}

        setattr(interaction, field, new_value)
        
        # Sync compatibility columns
        if field == "sentiment":
            score, label = sentiment_to_score(new_value)
            interaction.sentiment_score = score
            interaction.outcome = "positive" if label == "Positive" else "negative" if label == "Negative" else "neutral"
        elif field == "outcomes":
            interaction.outcome = new_value.lower() if new_value.lower() in ["positive", "neutral", "negative"] else "neutral"
        elif field == "follow_up":
            interaction.follow_up_notes = new_value
        elif field == "topic":
            interaction.products_discussed = new_value
        elif field == "materials":
            interaction.materials_shared = new_value
        elif field == "samples":
            interaction.samples_provided = new_value

        interaction.updated_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "success": True,
            "interaction_id": interaction_id,
            "field_updated": field,
            "new_value": new_value,
            "message": f"Interaction #{interaction_id} updated: {field} changed to '{new_value}' successfully."
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 3: Suggest Follow-Up
# ─────────────────────────────────────────────

@tool
def suggest_followup(hcp_name: str, request_context: Optional[str] = None) -> dict:
    """
    Suggests follow-up schedule timing and resources for a doctor based on their interaction history or context.
    Input example: 'Doctor requested more info on efficacy.'
    """
    db: Session = SessionLocal()
    try:
        hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
        specialty = hcp.specialization if hcp else "General Specialty"
        
        prompt = f"""You are a medical representative sales assistant. Suggest a follow-up plan for {hcp_name} (Specialty: {specialty}).
        Context or request details: {request_context or 'Standard routine visit follow-up'}.
        
        Generate a follow-up plan as JSON with keys:
        - recommended_timing (e.g. "In 1 week" or "In 2 days")
        - priority_level (High/Medium/Low)
        - follow_up_actions (list of 2 actions)
        - materials_to_share (list of 2 documents/studies to share)
        
        Return ONLY valid JSON, no markdown."""

        llm = ChatGroq(api_key=GROQ_API_KEY, model=PRIMARY_MODEL, temperature=0.3)
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        text = re.sub(r"```json|```", "", text).strip()
        plan = json.loads(text)
        
        return {
            "success": True,
            "hcp_name": hcp_name,
            "suggested_followup": plan,
            "message": f"AI Follow-up suggestion generated for {hcp_name}."
        }
    except Exception as e:
        # Graceful fallback
        fallback_plan = {
            "recommended_timing": "In 1 week",
            "priority_level": "Medium",
            "follow_up_actions": ["Send product efficacy report", "Schedule virtual callback"],
            "materials_to_share": ["Clinical Trial Efficacy PDF", "Product FAQ brochure"]
        }
        return {
            "success": True,
            "hcp_name": hcp_name,
            "suggested_followup": fallback_plan,
            "message": f"Follow-up suggestion loaded (Fallback): {str(e)}"
        }
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 4: Summarize Interaction
# ─────────────────────────────────────────────

@tool
def summarize_interaction(notes: str) -> dict:
    """
    Converts detailed, long meeting notes into a concise, professional CRM note summary.
    """
    try:
        prompt = f"""You are a professional medical CRM transcription editor. Convert the following detailed sales rep notes into a concise 2-bullet CRM summary:
        
        Notes: "{notes}"
        
        Return ONLY a JSON object with a key 'summary' (a string) and 'bullet_points' (list of 2 strings). No markdown."""
        
        llm = ChatGroq(api_key=GROQ_API_KEY, model=PRIMARY_MODEL, temperature=0.2)
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        text = re.sub(r"```json|```", "", text).strip()
        summary_data = json.loads(text)
        
        return {
            "success": True,
            "summary": summary_data.get("summary", notes[:120]),
            "bullet_points": summary_data.get("bullet_points", [notes[:80]]),
            "message": "Interaction notes summarized successfully."
        }
    except Exception as e:
        return {
            "success": True,
            "summary": notes[:120] + "...",
            "bullet_points": [notes[:80]],
            "message": f"Summarized notes (Fallback): {str(e)}"
        }


# ─────────────────────────────────────────────
# TOOL 5: Search HCP History
# ─────────────────────────────────────────────

@tool
def search_hcp_history(hcp_name: str) -> dict:
    """
    Search and retrieve past meetings and interactions with a specific HCP doctor.
    """
    db: Session = SessionLocal()
    try:
        hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
        if not hcp:
            return {"success": False, "error": f"HCP doctor '{hcp_name}' not found."}

        interactions = (
            db.query(Interaction)
            .filter(Interaction.hcp_id == hcp.id)
            .order_by(Interaction.id.desc())
            .limit(5)
            .all()
        )

        history = []
        for i in interactions:
            history.append({
                "id": i.id,
                "date": i.date,
                "time": i.time,
                "topic": i.topic,
                "sentiment": i.sentiment,
                "outcomes": i.outcomes,
                "follow_up": i.follow_up,
                "type": i.interaction_type
            })

        return {
            "success": True,
            "hcp": {
                "name": hcp.name,
                "specialization": hcp.specialization or hcp.specialty,
                "hospital": hcp.hospital or hcp.institution
            },
            "interactions": history,
            "message": f"Found {len(history)} past interactions for {hcp.name}."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 6: Sentiment Analysis (Extra)
# ─────────────────────────────────────────────

@tool
def analyze_sentiment(text: str) -> dict:
    """
    Analyze the customer tone / doctor feedback. Returns Positive, Neutral, or Negative sentiment.
    """
    try:
        prompt = f"""Analyze the sentiment of this doctor interaction feedback:
        "{text}"
        Return ONLY JSON with keys:
        - sentiment (Positive, Neutral, Negative)
        - score (float between 0.0 and 1.0)
        - explanation (1 brief sentence)
        """
        llm = ChatGroq(api_key=GROQ_API_KEY, model=PRIMARY_MODEL, temperature=0.1)
        response = llm.invoke([HumanMessage(content=prompt)])
        data = json.loads(re.sub(r"```json|```", "", response.content.strip()))
        return {
            "success": True,
            "sentiment": data.get("sentiment", "Neutral"),
            "score": data.get("score", 0.5),
            "explanation": data.get("explanation", ""),
            "message": f"Sentiment analyzed: {data.get('sentiment')}"
        }
    except Exception as e:
        return {
            "success": True,
            "sentiment": "Neutral",
            "score": 0.55,
            "explanation": "Neutral response",
            "message": f"Sentiment analysis loaded (Fallback): {str(e)}"
        }


# ─────────────────────────────────────────────
# TOOL 7: Product Recommendation (Extra)
# ─────────────────────────────────────────────

@tool
def recommend_products(specialty: str) -> dict:
    """
    Recommends relevant pharmaceutical products based on a doctor's specialty/specialization.
    """
    spec_lower = specialty.lower()
    recommendations = []
    if "cardio" in spec_lower:
        recommendations = ["Cardiomax 10mg (ACE inhibitor)", "PainAway Pro (anti-inflammatory)"]
    elif "onco" in spec_lower:
        recommendations = ["OncoClear 200mg (immunotherapy)", "RheumRelief (steroid therapy)"]
    elif "neuro" in spec_lower:
        recommendations = ["Neurofix XR (neuropathy)", "MetaboBalance (metabolic support)"]
    elif "rheum" in spec_lower:
        recommendations = ["RheumRelief (arthritis)", "PainAway Pro (analgesic)"]
    else:
        recommendations = ["MetaboBalance (general wellness)", "PainAway Pro (pain management)"]

    return {
        "success": True,
        "specialty": specialty,
        "recommended_products": recommendations,
        "message": f"Recommended {len(recommendations)} products for {specialty}."
    }


# ─────────────────────────────────────────────
# TOOL 8: Analyze Territory Performance (Extra)
# ─────────────────────────────────────────────

@tool
def analyze_territory_performance(territory: Optional[str] = None, days: int = 30) -> dict:
    """
    Analyzes KPIs (total interactions, positive sentiment rate, top doctor engagements) in a territory.
    """
    db: Session = SessionLocal()
    try:
        query = db.query(Interaction)
        if territory:
            hcp_ids = [h.id for h in db.query(HCP).filter(HCP.territory == territory).all()]
            if hcp_ids:
                query = query.filter(Interaction.hcp_id.in_(hcp_ids))

        interactions = query.all()
        if not interactions:
            return {"success": True, "message": "No interactions found.", "kpis": {}}

        total = len(interactions)
        positive_count = sum(1 for i in interactions if i.sentiment == "Positive" or i.outcome == "positive")
        pos_rate = round((positive_count / total) * 100, 1) if total else 0

        # Gather HCP metrics
        hcp_counts = {}
        sentiment_sum = 0
        sentiment_count = 0
        for i in interactions:
            hcp_counts[i.hcp_name] = hcp_counts.get(i.hcp_name, 0) + 1
            if i.sentiment_score is not None:
                sentiment_sum += i.sentiment_score
                sentiment_count += 1
        
        avg_sentiment = round(sentiment_sum / sentiment_count, 2) if sentiment_count else 0.55
        top_hcps = sorted(hcp_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "success": True,
            "territory": territory or "All",
            "kpis": {
                "total_interactions": total,
                "average_sentiment": avg_sentiment,
                "positive_rate": pos_rate,
                "top_engaged_hcps": [{"name": n, "interactions": c} for n, c in top_hcps]
            },
            "recommendation": "Maintain high visit frequency in key oncology accounts. Introduce Cardiomax study to cardiovascular targets."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# ─────────────────────────────────────────────
# LangGraph Graph Definition
# ─────────────────────────────────────────────

TOOLS = [
    log_interaction,
    edit_interaction,
    suggest_followup,
    summarize_interaction,
    search_hcp_history,
    analyze_sentiment,
    recommend_products,
    analyze_territory_performance,
]

SYSTEM_PROMPT = """You are an AI-powered CRM assistant for pharmaceutical field sales representatives.
You help reps log doctor interactions and manage doctor history conversationally.

You have access to these tools:
1. log_interaction - Extract structured details and log a doctor meeting (automatically filling the frontend form)
2. edit_interaction - Update specific fields of an interaction (e.g. 'change sentiment to neutral')
3. suggest_followup - Suggest a follow-up action plan based on feedback
4. summarize_interaction - Create a concise bullet summary of long rep notes
5. search_hcp_history - Look up past meetings/interactions with a doctor
6. analyze_sentiment - Perform tone analysis on raw doctor comments
7. recommend_products - Recommend drugs based on doctor's specialty/specialization
8. analyze_territory_performance - Analyze metrics for the representative's territory

When the representative speaks in natural language (e.g. 'Met Dr. Raj today at 10 AM, discussed diabetes drug...'),
always choose log_interaction tool, extract all parameter fields, and call it. 
When they ask to 'edit' or 'change' a field, choose edit_interaction.
For follow-up questions, call suggest_followup.
Confirm actions clearly. Answer in a helpful, concise manner."""


def create_agent():
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY is not set. AI agent features require a valid Groq API key. "
            "Create a .env file in the backend directory with: GROQ_API_KEY=gsk_..."
        )
    llm = ChatGroq(
        api_key=GROQ_API_KEY,
        model=PRIMARY_MODEL,
        temperature=0.2,
    ).bind_tools(TOOLS)

    def call_model(state: AgentState) -> AgentState:
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
        response = llm.invoke(messages)
        return {"messages": [response]}

    def call_tools(state: AgentState) -> AgentState:
        last_message = state["messages"][-1]
        tool_map = {t.name: t for t in TOOLS}
        results = []
        last_action = None
        last_interaction_id = None
        result_data = None

        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            try:
                result = tool_map[tool_name].invoke(tool_args)
            except Exception as tool_err:
                result = {"success": False, "error": str(tool_err)}
            results.append(
                ToolMessage(content=json.dumps(result), tool_call_id=tool_call["id"])
            )
            last_action = tool_name
            if isinstance(result, dict):
                last_interaction_id = result.get("interaction_id")
                result_data = result

        return {
            "messages": results,
            "last_action": last_action,
            "last_interaction_id": last_interaction_id,
            "result_data": result_data,
        }

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("model", call_model)
    graph.add_node("tools", call_tools)
    graph.add_edge(START, "model")
    graph.add_conditional_edges("model", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "model")

    return graph.compile()


_agent = None
_agent_lock = __import__("threading").Lock()


def get_agent():
    global _agent
    if _agent is None:
        with _agent_lock:
            if _agent is None:
                _agent = create_agent()
    return _agent