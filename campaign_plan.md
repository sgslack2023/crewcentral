# Campaign & Integration Architecture Plan

## 1. Campaigns App (`campaigns/`)

### Purpose
To manage marketing campaigns independently of specific platforms (Google, Meta), handling business logic, state management, and high-level metrics.

### Models

### Models

#### `Campaign`
- **Fields**:
  - `organization`: ForeignKey to `accounts.Organization`
  - `ad_account`: ForeignKey to `integrations.AdAccount` (PROTECT)
  - `name`: CharField
  - `platform`: CharField (choices: `google_ads`, `meta_ads`)
  - `objective`: CharField (choices: `leads`, `traffic`, `sales`)
  - `status`: CharField (choices: `draft`, `live`, `paused`, `completed`, `error`, default: `draft`)
  - `created_at`: DateTimeField

#### `CampaignBudget`
- **Purpose**: specific budget controls (Daily vs Lifetime) and currency handling.
- **Fields**:
  - `campaign`: OneToOneField to `Campaign` (CASCADE)
  - `type`: CharField (choices: `daily`, `lifetime`)
  - `amount`: DecimalField
  - `currency`: CharField

#### `Audience`
- **Purpose**: Reusable targeting rules (Location, Age, Interests).
- **Fields**:
  - `organization`: ForeignKey to `accounts.Organization`
  - `name`: CharField
  - `rules`: JSONField
  - `created_at`: DateTimeField

#### `CampaignUnit` (The "AdSet" or "AdGroup" Layer)
- **Purpose**: Grouping ads with specific targeting. Maps to **AdGroup** (Google) or **AdSet** (Meta).
- **Fields**:
  - `campaign`: ForeignKey to `Campaign` (CASCADE)
  - `audience`: ForeignKey to `Audience` (PROTECT)
  - `name`: CharField
  - `budget_allocation`: DecimalField (optional, for specific unit budgets)
  - `external_id`: CharField (Platform ID for this AdSet/AdGroup)

#### `AdCreative`
- **Purpose**: The actual ad content.
- **Fields**:
  - `campaign_unit`: ForeignKey to `CampaignUnit` (CASCADE)
  - `headline`: CharField
  - `description`: TextField
  - `media_url`: URLField
  - `call_to_action`: CharField
  - `version`: IntegerField (default: 1)
  - `parent`: ForeignKey to `self` (SET_NULL, null=True) — *For version history*

#### `MetricDefinition`
- **Purpose**: Normalize metrics across platforms (e.g., "link_clicks" vs "clicks").
- **Fields**:
  - `key`: CharField (e.g., `clicks`, `impressions`, `spend`)
  - `label`: CharField
  - `unit`: CharField

#### `CampaignMetric`
- **Purpose**: Store performance data linked to normalized definitions.
- **Fields**:
  - `campaign`: ForeignKey to `Campaign`
  - `metric`: ForeignKey to `MetricDefinition` (CASCADE)
  - `date`: DateField
  - `value`: DecimalField

#### `CampaignExecutionLog`
- **Purpose**: Audit trail for system actions and errors.
- **Fields**:
  - `campaign`: ForeignKey to `Campaign`
  - `action`: CharField (e.g., "launch", "pause")
  - `status`: CharField ("success", "error")
  - `message`: TextField
  - `created_at`: DateTimeField

#### `CampaignPlatformMap`
- **Purpose**: Maps internal campaigns to external platform IDs.
- **Fields**:
  - `campaign`: OneToOneString to `Campaign`
  - `platform`: CharField
  - `external_campaign_id`: CharField

### Services (`campaigns/services/`)
- `launch_campaign.py`:
    - Validates `CampaignBudget`.
    - Iterates `CampaignUnits` to create AdSets/AdGroups.
    - Creates Ads for each Unit.
    - Logs to `CampaignExecutionLog`.
- `pause_campaign.py`: Pauses campaign/units and logging.
- `resume_campaign.py`: Resumes campaign/units and logging.

### Adapters (`campaigns/adapters/`)
- `google_ads.py` & `meta_ads.py`:
  - `create_campaign(campaign, budget)`: Returns external ID.
  - `create_ad_group(unit)`: Returns external ID.
  - `create_ad(ad_creative)`: Returns external ID.
  - `fetch_normalized_metrics()`: Maps platform keys to `MetricDefinition`.

### Configuration (`campaigns/config.py`)
- **Purpose**: Define platform-specific constraints.
```python
PLATFORM_CAPABILITIES = {
    "google_ads": {
        "supports_images": False,
        "headline_max": 30,
    },
    "meta_ads": {
        "supports_images": True,
        "headline_max": 40,
    }
}
```

### Tasks (`campaigns/tasks.py`)
- `sync_campaign_metrics`:
    - Iterates live campaigns.
    - Fetches metrics via legacy provider.
    - Normalizes data against `MetricDefinition`.
    - Updates `CampaignMetric`.

---

## 2. Integrations App (`integrations/`)

### Purpose
To handle Authentication (OAuth) and Account Management for ad platforms. Segregated from campaign logic.

### Models

#### `Integration`
- **Purpose**: Store OAuth tokens per organization and provider.
- **Fields**:
  - `organization`: ForeignKey to `accounts.Organization`
  - `provider`: CharField (choices: `google_ads`, `meta_ads`)
  - `access_token`: TextField
  - `refresh_token`: TextField
  - `expires_at`: DateTimeField
  - `created_at`: DateTimeField

#### `AdAccount`
- **Purpose**: Specific ad accounts available under an integration.
- **Fields**:
  - `integration`: ForeignKey to `Integration`
  - `external_account_id`: CharField
  - `name`: CharField
  - `currency`: CharField

### Services (`integrations/services/`)
- `oauth.py`: Handle OAuth flow (exchange code for tokens).
- `token_refresh.py`: Refresh expired access tokens.
- `account_sync.py`: Fetch and update ad accounts from the provider.

### Providers (`integrations/providers/`)
- Low-level API wrappers (e.g., `GoogleAdsProvider`) that handle HTTP formatting and token injection.

---

## 3. Workflow & Data Flow

1.  **User Connects Platform**:
    - Frontend redirects to OAuth.
    - `integrations` app exchanges code -> saves `Integration`.
    - Fetches `AdAccount` list.
2.  **User Creates Campaign**:
    - Selects `AdAccount`.
    - Creates `Campaign` (draft).
    - Adds `AdCreative`s.
3.  **Launch**:
    - `launch_campaign` service called.
    - Adapters use `Integration` credentials via `AdAccount`.
    - External IDs saved to `CampaignPlatformMap`.
    - Status -> `live`.
4.  **Monitoring**:
    - `sync_campaign_metrics` task runs periodically.
    - Fetches data via Adapters -> saves to `CampaignMetric`.

---

## 4. Technology Stack
- **Backend Framework**: Django 5.2.6
- **Task Queue**: Django-Q (`django_q`)
- **Database**: SQLite (as per current settings, likely PostgreSQL in prod)
- **API**: Django Rest Framework (DRF)

---

## 5. Frontend Architecture (Ad Builder)

### Creative Studio
- **Goal**: A high-fidelity ad creation environment that mimics the destination platform.
- **Components**:
    - `AdBuilder.tsx`: Main wizard container.
    - `CreativeStudio.tsx`: Split-screen editor (Inputs on Left, Preview on Right).

### AdPreview Component
- **Purpose**: "What You See Is What You Get" verification.
- **Modes**:
    - **Google Search**: Text-only layout with green ad badge, headline, and URL display.
    - **Meta Feed**: Card layout with profile picture, sponsored label, media attachment, and CTA button.

### User Flow
1.  **Objective**: Select Leads/Traffic.
2.  **Connections**: Choose Google/Meta account.
3.  **Audience**: Location, Age, Interests.
4.  **Creative**:
    - User types headline -> Real-time update in Preview.
    - User uploads image -> Real-time update in Preview.
5.  **Review**: Final summary before API launch.

---

## 6. Creative Studio Example (Scenario: "Tasty Chips Co.")

**User Action**: The client wants to sell their new "Spicy Jalapeño Chips".

### Step A: Content Input (Left Panel)
The user fills out the universal ad form:
- **Headline**: "New Spicy Jalapeño Chips | 20% Off"
- **Description**: "Made with organic potatoes and real jalapeños. Crunch into the heat today!"
- **Media**: Uploads `chips_bag_spicy.jpg`
- **Call to Action**: "Shop Now"

### Step B: Real-Time Preview (Right Panel)
The `AdPreview` component immediately renders the following based on the selected platform:

#### If "Google Search" is selected:
> **[Ad]** **www.tastychips.co/spicy**
>
> <span style="font-size: 18px; color: #1a0dab; text-decoration: underline;">New Spicy Jalapeño Chips | 20% Off</span>
>
> Made with organic potatoes and real jalapeños. Crunch into the heat today!

*(Note: The uploaded image is ignored/hidden for Search ads, ensuring platform compliance.)*

#### If "Meta Feed" is selected:
> **Tasty Chips Co.** <span style="color: gray">Sponsored</span>
>
> Made with organic potatoes and real jalapeños. Crunch into the heat today!
>
> **[ IMAGE: chips_bag_spicy.jpg ]**
>
> <div style="background: #f0f0f0; padding: 10px; display: flex; justify-content: space-between;">
>   <div>
>     <strong>New Spicy Jalapeño Chips</strong><br>
>     <span style="color: gray">tastychips.co</span>
>   </div>
>   <button>Shop Now</button>
> </div>

**Result**: The user verifies both formats instantly without needing to check multiple websites.
