# Agentic Layer Architecture Plan

## 1. Overview
The **Agentic Layer** is a flexible framework sitting on top of the CRM's core logic. It allows specialized AI Agents to interact with system data and perform actions on behalf of users or automated triggers.

**Key Goals:**
- **Versatility**: Support diverse agents (Marketing, Customer Support, Operations/Alerts).
- **Security**: Strict Policy & Permission layer (Agent RBAC) to control what each agent can read/write.
- **Auditability**: Complete logs of Agent decisions and Tool executions.
- **Reliability**: leveraging the `Django-Q Flow` system for long-running agent tasks.

---

## 2. Core Concepts

### 2.1 The Agent
An **Agent** is a specialized worker defined by:
- **Persona**: System prompt and personality (e.g., "Helpful Support Rep" or "Aggressive Sales Optimizer").
- **Tools**: A subset of allowed functions (e.g., `send_email`, `create_campaign`, `read_invoice`).
- **Policy**: Limits on resources (e.g., "Can only access Standard User data" or "Max spend $50/day").

### 2.2 Permissions (The "Policy Layer")
Just like human users, Agents must have permissions. We do not give them `superuser` access.
- **Agent Roles**: Define what an agent can do using the existing User/Group model or a parallel `AgentPermission` model.
- **Scope Limits**: "Read-only on Invoices" vs "Read-Write on Campaigns".

### 2.3 Tools (Function Calling)
Standardized wrappers around CRM Service functions.
- **Input Schema**: Verified using Pydantic/DRF Serializers.
- **Output Schema**: Standardized JSON for LLM consumption.

### 2.4 Orchestration
- **Interactive**: Real-time chat (e.g., User asks "Draft an email").
- **Autonomous**: Background tasks (e.g., "Check overdue invoices every morning and email reminders").

---

## 3. Database Schema (Integrated from File 01 & 02)

### `agents` App (Registry - from `01 Agents Registry.md`)

#### `LT_LLM`
- **Purpose**: Encrypted credentials for providers (OpenAI, Anthropic).
- **Fields**: `name`, `provider`, `credentials_json` (encrypted), `is_active`.

#### `LT_AgentBlueprint`
- **Purpose**: Admin-defined **Templates** for specific personas (e.g., "Customer Support", "Ad Optimizer").
- **Fields**: 
  - `name`, `description`, `icon`.
  - `suggested_config`: FK to `LT_AgentConfig` (pre-set prompt/tools).
  - `category`: String (Sales, Marketing, Dev).

#### `LT_Agent`
- **Purpose**: Identity and failover logic.
- **Fields**:
  - `blueprint`: FK to `LT_AgentBlueprint` (optional).
  - `name`, `description`.
  - `active_config` (FK to `LT_AgentConfig`).
  - `backup_agent` (Failover).
  - `eval_agent` (Quality check).


#### `LT_AgentConfig`
- **Purpose**: Immutable versioned configuration.
- **Fields**:
  - `llm` (FK to `LT_LLM`).
  - `model_name`, `system_prompt`, `parameters_json`.
  - `immutable_lock`, `status` (draft/final).

#### `VoiceConfig` (Optional)
Settings for voice-enabled agents (e.g., ElevenLabs, Deepgram).
```python
class VoiceConfig(models.Model):
    agent_config = models.OneToOneField(LT_AgentConfig, on_delete=models.CASCADE)
    provider = models.CharField(max_length=50, choices=['elevenlabs', 'deepgram', 'openai'])
    voice_id = models.CharField(max_length=100) # e.g. "rachel"
    stt_provider = models.CharField(max_length=50, default='deepgram') # Speech-to-Text
    settings_json = models.JSONField(default=dict) # speed, stability, language
```

#### `LT_AgentUsage`
- **Purpose**: Audit log for LLM reasoning calls.
- **Fields**: `input_payload`, `output_payload`, `cost_usd`, `latency_ms`.

#### `LT_AgentMemory` (Long-Term)
- **Purpose**: Learned preferences and heuristics across sessions.
- **Fields**: `agent`, `scope` (global/org/entity), `key`, `value` (JSON).

#### `LT_AgentEvalRun`
- **Purpose**: Quality scoring and drift detection.
- **Fields**: `agent`, `workflow_run`, `score` (0-1.0), `feedback` (JSON).

### `workflows` App (Execution Orchestration)

#### `LT_WorkflowBlueprint`
- **Purpose**: Admin-defined **Templates** for common scenarios (e.g., "Marketing -> Sales").
- **Fields**: 
  - `name`, `description`, `icon`.
  - `graph_json`: The React Flow blueprint.
  - `is_public`: Boolean (visible to all orgs).
  - `category`: String (Marketing, Sales, Ops).

#### `LT_WorkflowDefinition`
- **Purpose**: An organization-specific **Instance** of a blueprint, or a custom flow.
- **Fields**: 
  - `organization`: FK to `Organization`.
  - `blueprint`: FK to `LT_WorkflowBlueprint` (optional).
  - `name`, `description`.
  - `graph_json`: The active, configured graph.
  - `failure_strategy`: (WAIT_FOR_HUMAN, ABORT, ROLLBACK).
  - `retry_policy`: JSON (max_retries, backoff).

#### `LT_WorkflowRun`
- **Purpose**: A live execution instance.
- **Fields**:
  - `workflow`: FK to `LT_WorkflowDefinition`.
  - `status`: PENDING, RUNNING, WAITING, DONE, FAILED.
  - `context`: JSONField (Shared memory between nodes).
  - `current_node_id`: String.

#### `LT_Trigger` (Unified Event System)
- **Purpose**: Unified entry points for workflows.
- **Fields**: `type` (cron, endpoint, event), `config` (schedule/endpoint), `workflow`, `is_active`.

#### `LT_NodeExecutionLog`
- **Purpose**: Audit trail for every individual node step.
- **Fields**: `workflow_run`, `node_id`, `node_type`, `input_data`, `output_data`, `status`.

---

### `security` App (The Policy Layer)

#### `LT_AgentPermission`
- **Purpose**: Capability definition (RBAC).
- **Fields**:
  - `agent`: FK to `LT_Agent`.
  - `resource`: (e.g., "campaigns", "invoices").
  - `action`: (e.g., "read", "write", "approve").
  - `constraints`: JSONField (e.g., `{"max_daily_budget": 50}`).

#### `LT_PolicyEvaluator` (Deterministic Gate)
- **Purpose**: The "Hard Gate" enforcing permissions post-reasoning.
- **Logic**: 
  1. Receives `Intent` from LangFlow.
  2. Map intent to `resource:action`.
  3. Validate against `LT_AgentPermission` and constraints (Budget, Time, Multi-tenancy).
  4. Returns `Decision` (ALLOW, DENY, REQUEST_APPROVAL).

#### `LT_ToolExecution` (Audit & Rollback)
- **Purpose**: Record of every side-effect.
- **Fields**: `agent`, `tool_name`, `input_payload`, `output_payload`, `status`.
- **Logic**: Support for compensating actions (Rollback) if specified in tool definition.

#### `LT_ApprovalRequest`
- **Purpose**: Human-in-the-loop blocking step.
- **Fields**: `flow_run`, `requested_by`, `action`, `payload`, `status` (pending/approved/rejected).



---

## 4. Architecture & Data Flow

### 4.1 Integration Logic (`03 Base Service Pattern.md`)
- **Tools** will be implemented as **Services** using the `@service` decorator.
- **Return Types**: Natural Python types (no `ServiceResult` envelopes).
- **Control Flow**: Exceptions for domain errors.

### 4.2 Output Storage (`05 Artifacts & Snapshots.md`)
- Agents will store deliverables (e.g., Ad Plans, Blog Posts) as **Artefacts**.
- **Snapshots**: Immutable JSON dumps of the generated content.

### 4.3 Visual Workflow Engine (The Split)
We distinguish between **Orchestration** (Flow) and **Reasoning** (Brain).

| Layer | Responsibility | Technology |
| :--- | :--- | :--- |
| **Orchestration** | Business logic, steps, waits, retries | **React Flow** + **Django-Q** |
| **Reasoning** | Prompt chains, tool selection, intent | **LangFlow** |
| **Execution** | Actual side effects (DB/API) | **Django Services** (`@service`) |
| **Policy** | Permission enforcement, budget checks | **Django Security Layer** |

#### Runtime Flow:
1. **Django-Q** picks up a `WorkflowRun`.
2. For an **Agent Node**, Django calls **LangFlow API** for reasoning.
3. LangFlow returns an **Intent** (e.g., "create_campaign").
4. **Django** checks `LT_AgentPermission`.
5. If valid, **Django Service** executes the tool.
6. Result is stored in `WorkflowRun.context` for the next node.

### 4.4 Voice Pipeline (Future Upgrade)
For agents interacting via voice (Phone/WebRTC):
1.  **Ingest**: Audio Stream (Twilio/Browser) -> **STT** (Deepgram/Whisper).
2.  **Think**: Text -> `LT_Agent` (via LangFlow for intent).
3.  **Respond**: Text Output -> **TTS** (ElevenLabs/OpenAI Audio).
4.  **Latency**: Optimized for <500ms turn-around (Streaming Mode).



### 4.2 Example Scenarios

#### Scenario A: Marketing Agent (Autonomous)
- **Goal**: "Run ads for chips."
- **User Permission**: `marketing.write`
- **Agent Permission**: `marketing.write`, `budget.read`
- **Flow**:
    1.  User prompts: "Sell Spicy Chips".
    2.  Agent calls `get_ad_account_balance`.
    3.  Agent calls `create_campaign_draft(name="Spicy Chips", budget=50)`.
    4.  Agent returns: "Draft created, please approve."

#### Scenario B: Invoice Reminder Agent (Alert System)
- **Goal**: "Alert me if invoices > 7 days overdue."
- **Trigger**: Cron job (Django-Q).
- **Flow**:
    1.  Cron triggers `InvoiceAgent`.
    2.  Agent calls `list_overdue_invoices(days=7)`.
    3.  Agent logic: "Found 3 invoices."
    4.  Agent calls `send_slack_alert(msg="3 invoices overdue...")`.

#### Scenario C: End-to-End Growth (Marketing -> Voice Sales)
- **Goal**: Full lifecycle from Ad creation to Voice closing.
- **Workflow**:
    1.  **Marketing Node (LangFlow)**: Generates a campaign plan (headlines, target audience).
    2.  **Approval Node (Human)**: User reviews the generated creative/plan and clicks "Approve".
    3.  **Ad Tool (`@service`)**: Creates ads on Meta/Google via integration adapters.
    4.  **Trigger (Endpoint)**: Customer clicks ad and submits a form → Inbound Lead created.
    5.  **Sales Manager Node**: Detects high-intent lead.
    6.  **Approval Node (Human)**: User reviews lead profile and confirms "Start Voice Call".
    7.  **Voice Interaction (`VoiceFlow`)**: 
        - Agent calls lead via Twilio/VAPI.
        - **STT**: "Hello, I saw your interest in Spicy Chips."
        - **Reasoning**: LangFlow determines customer interest level.
        - **TTS**: "Great! We have a 20% discount for first-timers."
    8.  **Tool Execution**: Agent calls `create_crm_lead` to qualify the prospect in CRM.

#### Detailed Execution Trace (Scenario C)

| Step | Action | Logic / Reasoning | Execution | Key Data Record / Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **1 — Marketing** | Generate Plan | **LangFlow** | Django-Q Node | `LT_WorkflowRun` (shared context) |
| **2 — Review** | **Approve Ads** | Human | **UI Action** | `LT_ApprovalRequest` (`status: approved`) |
| **3 — Ad Launch** | Create Ads | **LangFlow** Intent | Django Service | `LT_ToolExecution` (Google/Meta API) |
| **4 — Listening** | Wait for Lead | Event Loop | Endpoint Listener | `LT_WorkflowRun` (status: `WAITING`) |
| **5 — Intake** | Handle Lead | Django View | `resume_flow()` | `LT_WorkflowRun` (status: `RUNNING`) |
| **6 — Review** | **Approve Call** | Human | **UI Action** | `LT_ApprovalRequest` (`status: approved`) |
| **7 — Sales Call** | Dial Customer | **LangFlow** Brain | Voice Pipeline | `LT_FlowRun` (audio stream) |
| **8 — Interaction** | Speech Loop | **LangFlow** logic | Streaming Engine | `LT_AgentUsage` (billing / audit) |
| **9 — Closure** | Create CRM Lead | **LangFlow** decision | Django Service | `LT_ToolExecution` (DB write) |
| **10 — Archive** | Finalize | Archive Engine | Clear context | `Snapshot` (immutable audit dump) |



---

## 5. Implementation Roadmap

### Phase 1: Core Registry (`agents` app)
- Implement `LT_LLM`, `LT_Agent`, `LT_AgentConfig` using `01 Agents Registry.md` patterns.
- Setup `django-cryptography` for secure API keys.

### Phase 2: Flow Orchestration (`flows` app)
- Implement `LT_FlowRun` and `BaseFlow` logic (`02 Agent Flow System.md`).
- Integrate `django-q` for async execution.

### Phase 3: Services & Artifacts
- Create `@service` decorator for CRM tools (`03 Base Service Pattern.md`).
- Implement `Artefact` and `Snapshot` models (`05 Artifacts.md`).

### Phase 4: Visual Workflow Engine
- Set up **LangFlow**.
- Create custom LangFlow components for CRM Agents and Tools.
- Link internal `LT_Workflow` to LangFlow graphs.

### Phase 5: Voice Capabilities
- Implement `VoiceConfig` model.
- Build STT/TTS pipeline integration (Deepgram/ElevenLabs).
- Create "Phone Interface" flow for voice interaction.
