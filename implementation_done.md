# Implementation Done - Automation & System Refinements

This document summarizes the changes made to automate signed document delivery, enhance contractor estimate logic, and improve general system usability.

## 1. Automating Signed Documents

### Backend: Manual Trigger with Async Processing
- **File**: `Backend/transactiondata/views.py`
- **Lines**: 1040-1065, 1561-1575
- **Change**: Disabled all automatic background triggers upon document signing. Instead, the `send_signed_documents` action (triggered by the manual "Send" button) now offloads the delivery to **Django-Q** using `async_task`. This ensures the UI remains responsive while the system handles the template rendering and document attachment in the background.

### Backend: Validation Fix for Automation Events
- **File**: `Backend/masterdata/views.py`
- **Lines**: 859-869, 903-918
- **Change**: Added `signed_documents_email` to the list of strictly permitted `task_functions` in `ScheduleViewSet` to allow creating an automation schedule for signed documents without triggering a 400 validation error. Additionally, configured it as an event-driven task (`mapped_type = 'D'`, far-future `next_run`) so it doesn't default to Hourly.

### Backend: Dynamic Template Selection
- **File**: `Backend/transactiondata/email_utils.py`
- **Lines**: 254-275
- **Change**: Updated `render_email_template` to prioritize the `document_id` specified in the active Automation Schedule for that purpose.

### Frontend: Event-Driven Automation UI
- **File**: `Frontend/crm_front/src/components/AddAutomationForm.tsx`
- **Lines**: 33-36, 174-245
- **Change**: Added `signed_documents_email` to the event-driven array and separated logical checks for "Hybrid" tasks (like Invoices/Receipts which are both scheduled and immediate) vs "Event-Driven Only" tasks (Signed Documents, New Lead, Closed). Purely event-driven tasks now hide the frequency/interval inputs and display a green info box explaining the trigger behavior.

---

## 2. Contractor Estimate Enhancements

### Backend: Advanced Calculations
- **File**: `Backend/transactiondata/models.py`
- **Lines**: 643-650, 688-695
- **Change**: Enhanced `WorkOrder.update_total()` to automatically trigger recalculations for all percentage-based items when a base rate changes. Added `recalculate_amount()` helper to `ContractorEstimateLineItem`.

### Backend: Work Order Generation Logic
- **File**: `Backend/transactiondata/views.py`
- **Lines**: 1111-1121
- **Change**: Updated the conversion logic to correctly copy `charge_type` and `percentage` from customer estimate items to the contractor work order.

### Backend: Charge Definition Organization Context
- **File**: `Backend/transactiondata/views.py`
- **Lines**: 123-146
- **Change**: Updated `ChargeDefinitionViewSet.get_queryset` to correctly filter and merge charges from ancestor organizations (franchisors) and descendant organizations (sub-branches).

### Frontend: Fix Paginated Charge Loading
- **File**: `Frontend/crm_front/src/components/AddEstimateLineItemForm.tsx`
- **Lines**: 56-64
- **Change**: Updated `fetchChargeDefinitions` to correctly handle both direct array and paginated object (`results`) responses from the API.

---

## 3. Document Tags & Formatting

### Backend: New Custom Tags
- **File**: `Backend/transactiondata/utils.py`
- **Line**: 184 (within `process_document_template`)
- **Change**: Added logic for:
    - `{{customer_phone}}`
    - `{{pickup_time_window}}`, `{{delivery_time_window}}`
    - `{{pickup_date_range}}`, `{{delivery_date_range}}`
    - `{{payment_amount}}`, `{{payment_date}}`, `{{payment_type}}`
    - Support for `[move_date]` bracketed format.

### Backend: Clean Up Textbox Rendering
- **File**: `Backend/transactiondata/utils.py`
- **Change**: Removed forced inline styles (font-family/size) from the textbox replacement logic to ensure consistency with the parent document style.

---

## 4. User Interface & Workflow

### Frontend: UI Experience
- **File**: `Frontend/crm_front/src/components/AddCustomerForm.tsx`
- **Lines**: 183-463
- **Change**: Converted all static `Card` components within the Add/Edit Customer modal to be `Collapse` components, allowing users to collapse sections such as Address, Move, CRM, and Notes.

- **File**: `Frontend/crm_front/src/pages/CustomerTimeline.tsx`
- **Lines**: 51-52, 260-268, 860+
- **Change**: Added `isEditFormVisible` state and an "Edit Customer" button to the timeline, allowing quick access to update the customer without leaving the feed.

- **File**: `Frontend/crm_front/src/pages/EstimateEditor.tsx`
- **Lines**: 1105-1175
- **Change**: Reworked the Contractor Costs data table. Added a new `Percentage` column. Conditionally blocked the `Contractor Rate` column to prevent editing flat rates on percentage-based (`percent`) or weight-based (`per_lb`) items, showing `-` for percentage rows.

### Frontend: Document Tag Styling
- **File**: `Frontend/crm_front/src/components/DocumentEditor.tsx`
- **Lines**: 223-228
- **Change**: Removed the blue background and text coloring from dynamically inserted tags (e.g. `{{customer_name}}`) so they match the surrounding document text properly.

### Backend: Work Order Resend Logic
- **File**: `Backend/transactiondata/views.py`
- **Lines**: 1912-1914
- **Change**: Updated `WorkOrderViewSet.send_email` to reset status to `pending` if the order was previously `cancelled`, `declined`, or `rejected`.

### Backend: Document Mapping Fix
- **File**: `Backend/masterdata/views.py`
- **Lines**: 657-661
- **Change**: Removed `organization` kwarg from `DocumentMappingViewSet.perform_create` since the `DocumentServiceTypeBranchMapping` model does not take an `organization` parameter. Fixes `TypeError` when mapping documents.
