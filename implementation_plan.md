# Detailed Implementation Plan

## Proposed Changes

### 1. Contractor Estimate Charge Definitions Not Showing
**File:** `Frontend/crm_front/src/components/AddEstimateLineItemForm.tsx`  
**File:** `Backend/transactiondata/views.py`
- **Issue:** The contractor tab in the `AddEstimateLineItemForm` dropdown fails to list all charge definitions. This occurs because the backend does not return `estimate_only` charges by default, and the frontend also aggressively filters out charges when building the dropdown.
- **Solution:** Ensure the backend query allows explicit fetching of all charges for the contractor context, and update the frontend `filterOption` logic to reliably render every valid charge.
- **Code Change:** 
  - In `transactiondata/views.py`, modify `ChargeDefinitionViewSet.get_queryset` (line 124) to properly honor the `include_estimate_only=true` flag so the query returns all definitions.
  - In `AddEstimateLineItemForm.tsx`, confirm the `fetchChargeDefinitions` method maps the returned array directly into the `chargeDefinitions` state without erroneously filtering active items.

### 2. Charge Weight not pulling correctly, Fuel Surcharge is Flat Price
**File:** `Backend/transactiondata/models.py`  
**File:** `Frontend/crm_front/src/components/AddEstimateLineItemForm.tsx`  
- **Issue:** When adding a contractor line item, it always acts as a flat fee instead of adapting to weight (for `per_lb`) or multiplying against the subtotal (for `percent` like Fuel Surcharge). The `ContractorEstimateLineItem` model entirely lacks the percentage base logic that normal estimate line items have.
- **Solution:** Upgrade the `ContractorEstimateLineItem` model and `save()` calculation to support weight-based math and percentage math based on the parent Work Order's base charges.
- **Code Change:**
  - In `transactiondata/models.py`, add `charge_type` and `percentage` fields to the `ContractorEstimateLineItem` model.
  - In `transactiondata/models.py` for `ContractorEstimateLineItem.save()`, update the calculation so that when `charge_type == 'per_lb'`, `total_amount = contractor_rate * self.work_order.weight_lbs`. When `charge_type == 'percent'`, calculate the `total_amount` based on the sum of other active line items in the work order.
  - In `AddEstimateLineItemForm.tsx`, ensure the `onSubmit` handler passes the correct `charge_type` and `percentage` payloads via the API POST mapping.

### 3. Contractor Assignment Reactivation upon Resending changes
**File:** `Backend/transactiondata/views.py`  
- **Issue:** If a contractor declines an assignment, the Work Order status becomes "declined". Clicking "Email Contractor" again resends the email, but the Work Order remains in the declined state, preventing the contractor from interacting with the public portal.
- **Solution:** Force the Work Order's status back to 'pending' whenever the internal team resends the assignment email.
- **Code Change:**
  - In `WorkOrderViewSet.send_email` on line 1873, inject this explicit check:
    ```python
    if work_order.status in ['cancelled', 'declined', 'rejected']:
        work_order.status = 'pending'
        work_order.save(update_fields=['status'])
    ```

### 4. Edit Client Information Button in Timeline
**File:** `Frontend/crm_front/src/pages/CustomerTimeline.tsx`  
- **Issue:** The CRM timeline page lacks a built-in mechanism to effortlessly modify the root customer data without navigating back fully to the main customer list page.
- **Solution:** Embed the `AddCustomerForm` modal inside the `CustomerTimeline` page and provide a quick-access "Edit Customer" button near the top profile card.
- **Code Change:**
  - Import `<AddCustomerForm />` into `CustomerTimeline.tsx`.
  - Add standard state hooks `isEditFormVisible` and `editingCustomer`.
  - Inject a `<Button icon={<EditOutlined />}>Edit Customer</Button>` in the generic profile header mapping.
  - Upon button click, populate `editingCustomer` with the active `Customer` dictionary. On form sumbit success (`onSuccessCallBack`), call the existing `fetchCustomerInfo()` to refresh data.

### 5. Document Tags: Customer Phone, Brackets around Dates, Time Windows
**File:** `Backend/transactiondata/utils.py`  
- **Issue:** The document code `process_document_template` lacks replacement definitions for `{{customer_phone}}`, raw bracket inputs `[move_date]`, and explicit `pickup_time_window` objects.
- **Solution:** Explicitly wire these tag names into the inline dictionary replacements before the PDF renderer converts them.
- **Code Change:**
  - Write explicit replacements in `process_document_template`:
    ```python
    html_content = html_content.replace('{{customer_phone}}', customer.phone or '')
    html_content = html_content.replace('[move_date]', estimate.customer.move_date.strftime('%B %d, %Y') if estimate.customer.move_date else '')
    html_content = html_content.replace('{{pickup_time_window}}', str(estimate.pickup_time_window) if estimate.pickup_time_window else '')
    html_content = html_content.replace('{{delivery_time_window}}', str(estimate.delivery_time_window) if estimate.delivery_time_window else '')
    ```

### 6. Missing Payment Tags in Documents
**File:** `Backend/transactiondata/utils.py`  
- **Issue:** Sent documents cannot print the latest payment details because the replacement tags `{{payment_amount}}`, `{{payment_date}}`, and `{{payment_method}}` are not evaluated.
- **Solution:** Add a query to fetch the newest `PaymentReceipt` for the estimate to populate these variables dynamically in the HTML payload.
- **Code Change:**
  - Inside `process_document_template`, execute:
    ```python
    payment = PaymentReceipt.objects.filter(estimate=estimate).last() or PaymentReceipt.objects.filter(invoice__estimate=estimate).last()
    if payment:
        html_content = html_content.replace('{{payment_amount}}', f"${payment.amount:.2f}")
        html_content = html_content.replace('{{payment_date}}', payment.payment_date.strftime('%B %d, %Y'))
        html_content = html_content.replace('{{payment_type}}', payment.get_payment_method_display())
    ```

### 7. Sending Signed Documents via Automation Template
**File:** `Backend/transactiondata/views.py`  
**File:** `Backend/transactiondata/email_utils.py`   
**File:** `Frontend/crm_front/src/pages/Automation.tsx`
- **Issue:** The system currently tries to blindly email signed documents automatically when the customer signs, and it lacks the ability to use a user-defined Automation Template when you manually push the "Send All Signed" button.
- **Solution:** Remove all automatic background delivery. Add the `"signed_documents_email"` automation type so admins can assign an Email Template, and completely redirect the frontend's manual "Send All Signed Documents" button to securely pull and use this template.
- **Code Change:** 
  - **Frontend:** In `Automation.tsx`, explicitly add `'signed_documents_email'` (`Send Signed Documents`) to the list of automation `taskTypeOptions` so the user can bind an Email Template.
  - **Backend (Disable Automation):** In `transactiondata/views.py:EstimateDocumentViewSet.submit_document`, delete the `async_task` call so that signed documents are NEVER automatically sent.
  - **Backend (email routing):** In `transactiondata/email_utils.py`, update `send_signed_documents_email` to utilize the template dictated by `render_email_template(purpose='signed_documents_email')`.
  - **Backend (Manual Button):** Within the manual dispatch route (`EstimateViewSet.send_signed_documents`, line 1013), forcefully evaluate `get_active_schedule('signed_documents_email')` prior to dispatch so the button grabs the correct UI template and sends it. If no active automation is found, return an error back to the frontend to politely alert the user to configure their Automation first.

### 8. Document Tag Text Formatting
**File:** `Backend/transactiondata/utils.py`  
- **Issue:** When customer signatures or parsed tags are injected into documents, they output via strings explicitly forced to look identical (e.g., `<span style="font-weight: normal; color: #000;">`). This breaks the custom styling if a document wants the tag to be bolded or a specific dark-grey color natively.
- **Solution:** Remove the forced inline styles from the `replace_textbox_tag` formatting strings.
- **Code Change:**
  - Refactor `replace_textbox_tag` inside `process_document_template` (line 303) from:
    `<span style="font-weight: normal; color: #000;">{text_value}</span>`
    To:
    `<span>{text_value}</span>` 
    So the text flawlessly adopts the font style natively dictating the paragraph.

### 9. Document Editor Logo/Image Preservation
**File:** `Frontend/crm_front/src/components/DocumentEditor.tsx`  
**File:** `Backend/transactiondata/email_utils.py`  
**File:** `Backend/transactiondata/utils.py`  
**File:** `Backend/masterdata/views.py`  
- **Issue:** When users paste or add logos in the Document Editor, they are sometimes not preserved when documents are saved or sent via email. This occurs because: (1) SunEditor can create temporary blob URLs instead of converting images to base64, (2) Backend file reading uses wrong encoding on Windows, (3) HTML files served without charset header.
- **Solution:** Multi-pronged fix: Convert blob URLs to base64 on save, fix backend file encoding, add proper charset headers.
- **Code Change:**
  - In `DocumentEditor.tsx`, add `convertBlobUrlsToBase64()` helper function before `handleSave()` to convert any blob URLs to base64 data URIs before saving the document.
  - In `email_utils.py` `render_email_template()`, change file open from `'r'` to `'rb'` mode with explicit UTF-8 decode to prevent encoding corruption on Windows.
  - In `utils.py` `convert_images_to_base64()` function, add blob URL detection with warning log.
  - In `masterdata/views.py` `view_file()`, add `charset=utf-8` to Content-Type header for HTML files.

---

## Verification Plan

### Automated Tests
- N/A, UI and tag rendering will be tested manually. 

### Manual Verification
1. Open an estimate editor -> Contractor tab -> Click "Add Charge". Verify dropdown loads all charges.
2. Verify adding a fuel surcharge as a percentage computes based on weight/subtotal correctly.
3. Decline a WorkOrder. Click "Email Contractor". Refresh and verify status is `pending`.
4. Navigate to Timeline. Click "Edit Customer", save, verify changes reflect immediately.
5. Create a test template with bracketed dates, `{{pickup_time_window}}`, and phone number. Check the generated PDF strings.
6. Verify `{{payment_amount}}` tags display the real payment data in generated PDFs.
7. Set up a "Signed Documents" automation in Automations UI. 
   - Test A: Sign a document via the public customer link. **Ensure no email is sent.**
   - Test B: Click the manual `Send All Signed Documents` button in the UI. Check that the email correctly arrives using the selected Automation template.
8. Validate tag text format is strictly black and matches the base fonts.
