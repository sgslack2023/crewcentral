# CRM Enhancements Implementation Plan

This plan outlines the changes required to update internal work order statuses, improve the estimate-to-contractor-quote conversion, update payment methods, and implement a robust invoice generation workflow.

## Proposed Changes

### Backend: Transaction Data Models
#### [MODIFY] [models.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/models.py)

**1. WorkOrder.STATUS_CHOICES** (for internal work orders):
*   Current choices: `pending`, `accepted`, `completed`, `disputed`, `cancelled`
*   New choices for internal work orders:
    *   `not_booked` - "Not Booked"
    *   `booked` - "Booked"  
    *   `in_progress` - "Move in Progress"
    *   `completed` - "Completed" (keep)
    *   `cancelled` - "Cancelled" (keep)
*   **Implementation Option A**: Add `INTERNAL_STATUS_CHOICES` tuple and use it when `work_order_type='internal'`
*   **Implementation Option B**: Override `clean()` method to validate status based on work_order_type
*   Note: External work orders (`work_order_type='external'`) keep existing choices for contractor workflow

**2. PaymentReceipt.PAYMENT_METHODS**:
*   Current: `credit_card`, `bank_transfer`, `cash`, `check`, `other`
*   Updated:
    *   `credit_card` - "Credit Card" (keep)
    *   `e_transfer` - "E-Transfer" (rename from `bank_transfer`)
    *   `cash` - "Cash" (keep)
    *   `certified_cheque` - "Certified Cheque" (rename from `check`)
    *   `other` - "Other" (keep)
*   **Migration Required**: Create data migration to update existing records with old values

**3. InvoiceLineItem Model** (NEW):
*   Currently Invoice stores only totals (subtotal, tax_amount, total_amount) from Estimate
*   For custom line items, create new model:
    ```python
    class InvoiceLineItem(models.Model):
        invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
        description = models.CharField(max_length=255)
        quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
        rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
        amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
        display_order = models.PositiveIntegerField(default=0)
    ```
*   **Migration Required**: New model migration

### Backend: Transaction Data Views
#### [MODIFY] [views.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/views.py)
*   **Estimate to Contractor Quote**: Update `WorkOrderViewSet.generate_work_order` and `convert_to_work_order` to:
    *   Carry over `weight_lbs` and `labour_hours` from the Estimate to the Work Order snapshot.
    *   Set `contractor_rate` in `ContractorEstimateLineItem` to match the `rate` from the `EstimateLineItem` by default.
*   **Invoice Generation Preview**: Add a `preview_invoice` action to `EstimateViewSet` or `WorkOrderViewSet` that:
    *   Accepts custom line items, dates, and notes from the modal
    *   Generates a temporary invoice PDF (without saving to database)
    *   Returns the PDF file for preview in browser
    *   Does NOT create Invoice record or trigger any async tasks
*   **Invoice Generation with Custom Line Items**: Update `WorkOrderViewSet.generate_invoice` action to:
    *   Accept optional JSON payload with custom line items (description, rate, quantity, amount)
    *   Accept optional custom dates (issue_date, due_date) and notes
    *   If custom line items provided, use those instead of estimate line items
    *   If no custom data provided, use existing logic (estimate totals)
    *   **IMPORTANT**: Maintain Django Q async task pattern:
        *   Create Invoice object synchronously
        *   Queue `generate_invoice_pdf_async` task via `async_task()` for PDF generation
        *   Queue `send_invoice_async` task via `async_task()` for email sending (if customer has email)
        *   Return response immediately without waiting for PDF/email
*   **Invoice Deletion & Reset**: Add a `delete_and_reset` action to `InvoiceViewSet` that:
    1.  Deletes the invoice and its PDF file.
    2.  Resets the associated Estimate status from `invoiced` back to `approved` (or previous status).
    3.  Resets the Work Order's `invoiced` flag if applicable.
    4.  Creates a CustomerActivity record for the deletion.

### Backend: Serializers
#### [MODIFY] [serializers.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/serializers.py)
*   Add `InvoiceLineItemSerializer` for new InvoiceLineItem model
*   Update `InvoiceSerializer` to include nested `items` field (read/write)
*   Update `PaymentReceiptSerializer` to use new payment method choices

### Backend: Utils
#### [MODIFY] [utils.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/utils.py)
*   Update `generate_invoice_pdf()` function to:
    *   Use `InvoiceLineItem` records for PDF generation
    *   Remove dependency on Estimate line items

### Frontend: Types & Constants
#### [MODIFY] [types.ts](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/utils/types.ts)
*   Add `InvoiceLineItemProps` interface
*   Update `InvoiceProps` to include optional `items: InvoiceLineItemProps[]`
*   Update `WorkOrderProps.status` type definition for internal work orders
*   Update `PaymentReceiptProps.payment_method` type definition with new values

### Frontend: Components
#### [NEW] [GenerateInvoiceModal.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/components/GenerateInvoiceModal.tsx)
*   A new modal component for generating invoices with custom line items.
*   Opens when user clicks existing "Invoice Order" button in EstimateEditor.
*   Features:
    *   Pre-filled with estimate line items (editable).
    *   Add/remove line items dynamically.
    *   Editable fields: description, rate, quantity, amount per line item.
    *   Editable invoice dates (issue date, due date).
    *   Custom notes field.
    *   Real-time calculation of subtotal, tax, and total.
    *   **Two action buttons:**
        *   **"Preview"**: Opens a preview of the invoice PDF in a new window/modal (without creating the invoice)
        *   **"Generate Invoice"**: Calls `WorkOrderViewSet.generate_invoice` with custom line items payload, creates invoice, queues PDF generation and email via Django Q

#### [MODIFY] [CollectDepositModal.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/components/CollectDepositModal.tsx)
*   Update the payment method dropdown values: `credit_card`, `e_transfer`, `cash`, `certified_cheque`, `other`.

### Frontend: Pages
#### [MODIFY] [EstimateEditor.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/EstimateEditor.tsx)
*   In "Financials" section (Internal Work Order tab):
    *   Modify existing "Invoice Order" button click handler to open `GenerateInvoiceModal` instead of directly calling API
    *   Pass work order ID and estimate data to modal
    *   Add "Delete Invoice" button if estimate status is `invoiced` (calls `delete_and_reset` action)
*   Update internal work order status dropdown to show new choices: `Not Booked`, `Booked`, `Move in Progress`, `Cancelled`, `Completed`
*   Update status tag colors/labels to match new choices

#### [MODIFY] [Finance.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/Finance.tsx)
*   Add "Invoice Order" button at top of page:
    *   Clicking opens a modal/popover with Job ID input field
    *   User enters Job ID (estimate ID) and clicks "Fetch" or presses Enter
    *   Fetches estimate details via API
    *   On success, opens `GenerateInvoiceModal` pre-filled with estimate line items
    *   Handle errors (estimate not found, already invoiced, no work order, etc.)
*   Update invoice table:
    *   Add "Delete" action button per invoice row
    *   Clicking delete calls `InvoiceViewSet.delete_and_reset` action
    *   Show confirmation dialog before deletion
    *   Refresh invoice list after successful deletion

## Verification Plan

### Automated Tests
*   **Backend Integration Test**: Test the `delete_and_reset` endpoint to ensure the estimate's status reverts, and the invoice is deleted.
*   **Unit Test**: Test the line item carry-over from `Estimate` to `WorkOrder` with weights and rates correctly assigned.
*   **Unit Test**: Test InvoiceLineItem creation and PDF generation with custom line items.

### Manual Verification
1.  **Internal Work Order Status Update**: Open an estimate with internal work order, choose "Move in Progress" from the dropdown, save, and verify it updates.
2.  **Payment Methods**: Create a payment receipt and verify new payment methods (E-Transfer, Certified Cheque) appear in dropdown.
3.  **Contractor Quote**: Convert an estimate with weight/rate to a contractor quote and verify those fields are populated on the quote's items.
4.  **Invoice Modal - Preview**:
    *   Click "Invoice Order" button on an estimate
    *   Modal opens with estimate line items pre-filled
    *   Modify a line item (change quantity or rate)
    *   Click "Preview" and verify PDF shows modified values
    *   Close preview (invoice NOT created yet)
5.  **Invoice Modal - Generate**:
    *   Click "Invoice Order" button on an estimate
    *   Modify line items as needed
    *   Click "Generate Invoice"
    *   Verify success message appears immediately (async pattern)
    *   Verify estimate status changes to "invoiced"
    *   Wait a few seconds, then verify PDF is generated (check download link)
6.  **Invoice Deletion**: Delete the generated invoice from the Finance dashboard and verify the estimate status returns to previous state.
7.  **Job ID Generation**: Navigate to Finance, click "Invoice Order" button, enter a Job ID, verify it fetches estimate details and opens the invoice modal.

---

## Implementation Order (Recommended)

### Phase 1: Backend Foundation
1. Create `InvoiceLineItem` model and migration
2. Update `PaymentReceipt.PAYMENT_METHODS` with data migration for existing records
3. Add `INTERNAL_STATUS_CHOICES` to WorkOrder model
4. Create/update serializers

### Phase 2: Backend Actions
5. Update `generate_invoice_pdf()` to support InvoiceLineItem records
6. Add `preview_invoice` action (returns temporary PDF)
7. Update `generate_invoice` action to accept custom line items
8. Add `delete_and_reset` action to InvoiceViewSet
9. Update contractor quote carry-over (weight_lbs, labour_hours)

### Phase 3: Frontend
10. Update types.ts with new interfaces
11. Create `GenerateInvoiceModal.tsx` component
12. Update `EstimateEditor.tsx` to use modal
13. Update `Finance.tsx` for Job ID search and delete
14. Update `CollectDepositModal.tsx` payment methods
15. Update status dropdowns for internal work orders

### Phase 4: Testing & Verification
16. Run migrations on development
17. Manual testing per verification plan
18. Deploy to production

---

## Implementation Notes

### Django Q Async Pattern (CRITICAL)
The current invoice generation uses Django Q for background processing. **This pattern must be maintained**:

**Current Flow:**
1. Frontend calls `WorkOrderViewSet.generate_invoice` action
2. Backend creates Invoice object synchronously
3. Backend queues `generate_invoice_pdf_async` task via `async_task()` 
4. Backend queues `send_invoice_async` task via `async_task()` (if customer email exists)
5. Backend returns response immediately
6. Django Q worker processes PDF generation and email sending in background

**Signal-based Automation:**
- `signals.py` has `post_save` receiver on Invoice model
- When Invoice is created, it automatically queues PDF generation and email tasks
- This automation should continue to work with custom line items

**For New Implementation:**
1. Create Invoice object
2. Create InvoiceLineItem records for each custom line item
3. Let existing signal handlers queue async tasks OR queue manually
4. Return response immediately - do NOT wait for PDF/email
5. Frontend shows success message immediately

### Data Migration Notes

**PaymentReceipt.PAYMENT_METHODS migration:**
```python
def migrate_payment_methods(apps, schema_editor):
    PaymentReceipt = apps.get_model('transactiondata', 'PaymentReceipt')
    PaymentReceipt.objects.filter(payment_method='bank_transfer').update(payment_method='e_transfer')
    PaymentReceipt.objects.filter(payment_method='check').update(payment_method='certified_cheque')
```

### Known Issues & Limitations

#### Performance
*   **Server Database Queries**: Some operations (charge category creation) can take 30+ seconds on production server. This is a database/infrastructure issue, not code-related. Consider:
    *   Database connection pooling optimization
    *   Server resource scaling (CPU/RAM)
    *   Database indexing review
    *   Network latency between app server and database

#### Organization Context
*   **Charge Definitions**: Now filtered to exact organization match only (simplified from parent/child hierarchy)
*   **Rationale**: Each organization should have its own charges and definitions
*   **Impact**: Parent organization charges won't automatically appear in child organizations
