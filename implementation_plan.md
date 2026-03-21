# Implementation Plan - CRM Enhancements (Detailed)

This document outlines the detailed plan for all requested CRM changes, following the requested format.

---

## 1. Weight and Labor Recalculation Sync

**Issue**: When `weight_lbs` or `labour_hours` are changed on an Estimate, the recalculation only affects the Customer Estimate. The Contractor Quote (Work Order) remains static, leading to potential payout discrepancies.

**Proposed Solution**: Implement a synchronization mechanism in the backend. When `calculate_estimate` is called, it should also identify any linked active Work Orders and update their corresponding snapshot fields. Additionally, trigger a recalculation of the Work Order's own line items (ContractorEstimateLineItem) which might depend on these values (e.g., "Per Lb" charges).

**Code Change Required**:
- **[MODIFY] [utils.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/utils.py)**: In `calculate_estimate`, after updating estimate totals, add logic to find related `WorkOrder` objects and update their `weight_lbs` and `labour_hours`.
- **[MODIFY] [models.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/models.py)**: Ensure `WorkOrder.save()` or a dedicated method triggers `update_total()` and forces line items to re-evaluate their `total_amount` based on updated snapshots.

---

## 2. Contractor Portal: Time Windows and Notes

**Issue**: The Contractor Portal (`PublicWorkOrderPortal`) only shows dates for pickup and delivery. Contractors also need to see specific time windows. Additionally, "Contractor Notes" should be visible there.

**Proposed Solution**: 
1. Update the backend API that serves the public portal to include the string labels for the `TimeWindow` foreign keys.
2. Update the frontend to display these windows and the notes section.

**Code Change Required**:
- **[MODIFY] [views.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/views.py)**: In `WorkOrderViewSet.public_access`, add `pickup_time_window` and `delivery_time_window` to the `estimate_details` dictionary.
- **[MODIFY] [PublicWorkOrderPortal.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/PublicWorkOrderPortal.tsx)**: 
    - Display the time windows next to the dates in the "Schedule & Metrics" card.
    - Add a new Card or section to display `workOrder.notes`.

---

## 3. Notes Management Overhaul

**Issue**: The current "External Notes" naming is unclear. The system needs three distinct note types: Customer Notes (formerly External), Internal Notes, and Contractor Notes.

**Proposed Solution**:
1. Rename/Alias `external_notes` to `customer_notes`.
2. Add `internal_notes` and `contractor_notes` to the `Estimate` model.
3. Sync `contractor_notes` from `Estimate` to `WorkOrder.notes` during conversion.

**Code Change Required**:
- **[MODIFY] [models.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/models.py)**: 
    - Update `Estimate` model fields. 
    - Update `WorkOrder` to clarify that its `notes` field is primarily for the contractor.
- **[MODIFY] [EstimateEditor.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/EstimateEditor.tsx)**: Update the UI to show three distinct text areas with appropriate labels.

---

## 4. Financial Record CRUD and PDF Regeneration

**Issue**: Financial records (Deposits/PaymentReceipts, Expenses, Purchases) are difficult to manage (lack Edit/Delete). Editing a Deposit should automatically update balances and regenerate the relevant PDFs.

**Proposed Solution**:
1. Ensure `ModelViewSet` actions are fully implemented and exposed in the frontend.
2. Use Django signals to cascade updates (balance calculation and PDF generation).

**Code Change Required**:
- **[MODIFY] [signals.py](file:///d:/Projects/CRM_Adrian/Backend/transactiondata/signals.py)**: Add/Update `post_save` and `post_delete` signals for `PaymentReceipt` to call `estimate.calculate_balance()` and `invoice.calculate_balance()`, then trigger async PDF generation tasks.
- **[MODIFY] [Finance.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/Finance.tsx)**: Add action buttons (Edit/Delete) to the transaction tables and link them to modals/forms.

---

## 5. Site Visit Screen Enhancement

**Issue**: The site visit screen is too basic. It should display full customer info and allow editing that info directly via a modal.

**Proposed Solution**: Update the `SiteVisits` component to include more data points and integrate the existing `CustomerForm` logic in a modal.

**Code Change Required**:
- **[MODIFY] [SiteVisits.tsx](file:///d:/Projects/CRM_Adrian/Frontend/crm_front/src/pages/SiteVisits.tsx)**: 
    - Map through more fields in the `workOrder.estimate.customer` object.
    - Add an "Edit Customer" button that triggers an Ant Design `Modal` containing the customer edit form.

---

## 6. Lead Ingestion Field Mapping

**Issue**: The automated lead ingestion endpoint only maps a hardcoded set of basic fields, ignoring many other `Customer` model fields.

**Proposed Solution**: Generalize the `process_raw_endpoint_leads` task to handle any field that has a mapping configured in the `EndpointConfiguration`.

**Code Change Required**:
- **[MODIFY] [tasks.py](file:///d:/Projects/CRM_Adrian/Backend/masterdata/tasks.py)**: Refactor the mapping logic to iterate over all keys in `mapping_config` and map them to the `Customer` object if the field exists on the model.

---

## Verification Plan

### Automated Tests
- `python manage.py test transactiondata.tests`: I will add test cases specifically for the `Estimate` -> `WorkOrder` sync and the `PaymentReceipt` signals.

### Manual Verification
1. **Recalculation**: Change weight on an Estimate -> Check Work Order total payout.
2. **Contractor Portal**: Open public WO link -> Verify windows and notes are visible.
3. **Finance**: Edit a deposit -> Check PDF in Document Library and check Estimate balance.
4. **Lead Ingestion**: Send a test lead with 'origin_address' -> Verify it's created correctly in CRM.
