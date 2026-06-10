# Party Import Feature - Complete Integration Guide

## QUICK START

### For Users:
1. **Admin Portal** → **Integrations** → **Import Parties**
2. Choose import method:
   - **Zoho CRM** (auto-sync)
   - **Salesforce** (auto-sync)
   - **CSV Upload** (manual with modal form)
3. Follow step-by-step wizard
4. Review preview before confirming
5. Parties auto-linked to GL accounts

### For Developers:
- React components: `/src/components/Workbenches/detail/PartyImportModal.jsx`
- Backend endpoint: `/backend/routers/import.py`
- CSV template: `/public/templates/dabby_party_import_template.csv`
- Design docs: `PARTY_IMPORT_MODAL.md` and `PARTY_IMPORT_MODAL_COMPONENTS.md`

---

## WORKFLOW OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN INITIATES IMPORT - THREE PATHS                        │
└─────────────────────────────────────────────────────────────┘

PATH 1: CRM Integration (Recommended - API-based)
├─ Click "Import Parties"
├─ Select "Zoho CRM" or "Salesforce"
├─ OAuth redirect to provider
├─ Grant permissions
├─ Return to Dabby with access token
├─ System fetches contacts/accounts from CRM
├─ Auto-matches with GL accounts
└─ Parties ready for AR/AP

PATH 2: CSV Upload (Manual Fallback - File-based)
├─ Click "Import Parties"
├─ Select "CSV Upload"
├─ Download template (10-column CSV)
├─ Fill with party data (name, email, phone, etc.)
├─ Upload CSV file
├─ System validates & shows preview
├─ Review new vs. update counts
├─ Confirm import
├─ Parties created/updated in system
└─ Auto-linked to GL accounts

PATH 3: Manual Single Entry (Quick Add)
├─ In AR/AP flow, click "Add New Party" button
├─ Modal form opens with all fields
├─ Fill form (party_name, email, phone, address, etc.)
├─ Click "Save"
├─ Immediately ready for invoice/bill
└─ No need to import entire CSV
```

---

## DETAILED IMPLEMENTATION CHECKLIST

### Phase 1: Frontend UI Components (React)
- [ ] `PartyImportModal.jsx` - Main modal container
  - [ ] Step 1: Method selection (Zoho/Salesforce/CSV)
  - [ ] Step 2: Upload/OAuth (depending on method)
  - [ ] Step 3: Preview with validation
  - [ ] Step 4: Completion screen

- [ ] `MethodSelection.jsx` - Three options displayed
  - [ ] Zoho CRM card with OAuth trigger
  - [ ] Salesforce card with OAuth trigger
  - [ ] CSV Upload card with drag-drop

- [ ] `CSVUploadStep.jsx` - File upload interface
  - [ ] Template download link
  - [ ] Drag-drop zone
  - [ ] File input
  - [ ] Progress indicator

- [ ] `PreviewStep.jsx` - Validation & confirmation
  - [ ] Summary stats (new/update/error counts)
  - [ ] Table preview (first 5 rows)
  - [ ] Error highlighting (row-level)
  - [ ] Confirmation checkbox

- [ ] `ManualPartyEntryModal.jsx` - Single party form
  - [ ] 10 input fields (name, email, phone, etc.)
  - [ ] Real-time validation (format checking)
  - [ ] Submit button with loading state
  - [ ] Error message display

### Phase 2: Backend Endpoints (FastAPI)
- [ ] `POST /api/import/csv-preview`
  - [ ] Accept CSV file or parsed rows
  - [ ] Validate each row against schema
  - [ ] De-duplicate against existing parties
  - [ ] Return preview data (new/update counts, errors)

- [ ] `POST /api/import/csv-confirm`
  - [ ] Create/update parties in database
  - [ ] Return summary (created/updated counts)
  - [ ] Link parties to GL accounts (Debtors/Creditors)
  - [ ] Trigger GL posting if needed

- [ ] `POST /api/import/zoho-oauth-callback`
  - [ ] Exchange code for access token
  - [ ] Store token securely (encrypted)
  - [ ] Trigger Zoho contacts fetch

- [ ] `POST /api/import/salesforce-oauth-callback`
  - [ ] Exchange code for access token
  - [ ] Store token securely (encrypted)
  - [ ] Trigger Salesforce accounts fetch

- [ ] `POST /api/import/fetch-crm-parties`
  - [ ] Call external CRM API (Zoho or SF)
  - [ ] Map CRM fields to Dabby schema
  - [ ] De-duplicate
  - [ ] Return preview data

- [ ] `POST /api/parties` (existing, but validate for imports)
  - [ ] Create single party
  - [ ] Used by manual entry modal

### Phase 3: Database Schema
- [ ] `parties` table (already defined in spec)
  - [ ] Columns: name, party_type, email, phone, gst_number, address, city, state, credit_terms_days, is_active
  - [ ] Indexes on workspace_id, email, crm_type
  - [ ] Unique constraint on (workspace_id, email)

- [ ] `party_import_history` table (audit)
  - [ ] track_id, workspace_id, import_date, method (CRM/CSV/Manual)
  - [ ] import_count, created_count, updated_count
  - [ ] status, error_details (JSON)

- [ ] `crm_integrations` table (connection tracking)
  - [ ] workspace_id, crm_type (zoho/salesforce)
  - [ ] access_token (encrypted), refresh_token (encrypted)
  - [ ] last_sync, sync_status

### Phase 4: Security & Compliance
- [ ] Encrypt CRM access tokens in database
- [ ] DPDP Act: Collect PII only from authorized parties
- [ ] Rate limit imports (max 5000 parties/import)
- [ ] Audit trail for all imports
- [ ] CORS: Only allow frontend domain
- [ ] RLS: Ensure workspace isolation

### Phase 5: Integration with AR/AP
- [ ] AR: New Invoice modal
  - [ ] Customer dropdown loads from parties
  - [ ] "Add New Party" quick link opens manual form
  - [ ] Auto-fill email, address on party selection

- [ ] AP: New Bill modal
  - [ ] Vendor dropdown loads from parties
  - [ ] "Add New Party" quick link opens manual form
  - [ ] Auto-fill info on vendor selection

### Phase 6: Testing Checklist
- [ ] **CSV Import**
  - [ ] Valid CSV with 10 columns imports successfully
  - [ ] Invalid CSV (wrong headers) shows error
  - [ ] Duplicate emails in CSV file → de-duped
  - [ ] Duplicate emails in system → marked as "UPDATE"
  - [ ] Missing required fields → error on that row
  - [ ] Invalid email/phone format → highlighted in preview
  - [ ] Parties created in GL with correct account links

- [ ] **Manual Entry**
  - [ ] Form validates in real-time (email, phone, GST)
  - [ ] Required fields enforced
  - [ ] Save button disabled if validation fails
  - [ ] On save, party immediately usable in invoices/bills

- [ ] **CRM Integration** (Zoho/Salesforce)
  - [ ] OAuth flow redirects correctly
  - [ ] Tokens stored securely
  - [ ] CRM contacts fetched successfully
  - [ ] Field mapping works (contact_name → party_name)
  - [ ] De-duplication logic prevents duplicates
  - [ ] Parties linked to correct GL accounts

- [ ] **GL Linking**
  - [ ] Customer parties linked to "Debtors" GL account
  - [ ] Vendor parties linked to "Creditors" GL account
  - [ ] Both-type parties linked to both accounts

- [ ] **Error Handling**
  - [ ] Network errors show retry button
  - [ ] Invalid file format shows clear message
  - [ ] Row-level errors show specific field problems
  - [ ] Success/failure summary clear after import

### Phase 7: Performance Optimization
- [ ] Batch insert/update (not individual queries)
- [ ] Async processing for large files (>1000 rows)
- [ ] Paging for preview table (only show first 5 rows)
- [ ] Lazy load state list (if needed)

### Phase 8: Documentation
- [ ] CSV template file available at `/public/templates/dabby_party_import_template.csv`
- [ ] API documentation (Swagger) updated with new endpoints
- [ ] User guide (screenshot + steps)
- [ ] Error message reference (all possible errors)

---

## CSV VALIDATION RULES (Complete)

| Field | Required | Type | Length | Format | Example | Error Message |
|-------|----------|------|--------|--------|---------|----------------|
| party_name | ✓ | String | 2-100 | Alphanumeric + spaces | ABC Trading Ltd | Must be 2-100 characters |
| party_type | ✓ | String | — | Exact: `Customer`, `Vendor`, `Both` | Customer | Invalid: must be Customer, Vendor, or Both |
| email | ✓ | Email | — | RFC 5322 | info@abc.com | Invalid email format |
| phone | ✓ | Phone | 10 | +91 XXXXX XXXXX | +91 9876543210 | Invalid: use +91 XXXXX XXXXX format |
| gst_number | ✗ | String | 15 | Alphanumeric | 27AABCU9603R1Z0 | If provided, must be exactly 15 chars |
| address | ✓ | Text | 10-500 | Any | 123 Business Park | Minimum 10 characters required |
| city | ✓ | String | — | From list or free text | Bangalore | City required |
| state | ✓ | String | — | Indian state name | Karnataka | Must be valid Indian state |
| credit_terms_days | ✓ | Integer | — | 0-365 | 30 | Must be between 0 and 365 |
| is_active | ✓ | Boolean | — | `true` or `false` | true | Must be true or false |

---

## API ENDPOINTS SUMMARY

### Import Endpoints

**1. POST /api/import/csv-preview**
```json
Request:
{
  "workspace_id": "uuid",
  "parties": [
    {
      "party_name": "ABC Ltd",
      "party_type": "Customer",
      "email": "info@abc.com",
      "phone": "+91 9876543210",
      "gst_number": "27AABCU9603R1Z0",
      "address": "123 Park",
      "city": "Bangalore",
      "state": "Karnataka",
      "credit_terms_days": 30,
      "is_active": true
    }
  ]
}

Response:
{
  "new_count": 125,
  "update_count": 17,
  "error_count": 0,
  "preview_rows": [...],
  "errors": []
}
```

**2. POST /api/import/csv-confirm**
```
multipart/form-data:
  - file: [CSV file]
  - workspace_id: "uuid"

Response:
{
  "status": "success",
  "created": 125,
  "updated": 17,
  "total": 142
}
```

**3. POST /api/import/zoho-oauth-callback**
```
Query params:
  - code: [authorization code from Zoho]
  - workspace_id: "uuid"

Response:
{
  "status": "success",
  "token_stored": true,
  "crm_type": "zoho"
}
```

**4. POST /api/import/fetch-crm-parties**
```json
Request:
{
  "workspace_id": "uuid",
  "crm_type": "zoho"
}

Response:
{
  "parties_found": 250,
  "preview": [...],
  "status": "ready_for_preview"
}
```

---

## GL ACCOUNT LINKING LOGIC

After parties are imported, the system must link them to GL accounts:

```python
def link_parties_to_gl(workspace_id, parties):
    """
    For each party:
    - If party_type = 'Customer' or 'Both' → Link to "Debtors" account
    - If party_type = 'Vendor' or 'Both' → Link to "Creditors" account
    """

    for party in parties:
        if party.party_type in ['Customer', 'Both']:
            debtors_account = get_account_by_code(workspace_id, 'AR1001')  # Debtors account
            create_party_account_mapping(party.id, debtors_account.id)

        if party.party_type in ['Vendor', 'Both']:
            creditors_account = get_account_by_code(workspace_id, 'AP2001')  # Creditors account
            create_party_account_mapping(party.id, creditors_account.id)
```

---

## ERROR MESSAGE USER GUIDANCE

### Guide to show users when errors occur:

```
❌ VALIDATION ERROR
Row 3: XYZ Manufacturing Ltd
- Email field: invalid format (use: name@domain.com)
- Phone field: must start with +91 and have 10 digits

✓ ACTION: Fix the errors and re-upload the CSV
```

```
✓ IMPORT PREVIEW
You're about to import:
✓ 125 new parties (will be created)
☄️ 17 existing parties (email matches → will update)
❌ 3 rows skipped due to errors

View errors | Fix & Re-upload | Continue with 125 valid rows
```

```
🎉 IMPORT COMPLETE
✓ Successfully imported 142 parties
✓ Linked to GL accounts (Debtors, Creditors)

Next: Start creating invoices/bills using these parties
Navigate to: AR → New Invoice OR AP → New Bill
```

---

## INTEGRATION WITH AR/AP WORKFLOWS

### In AR (Invoice Creation):

```jsx
// When selecting customer in invoice form:
<CustomerSelector
  onSelect={(party) => {
    setCustomer(party);
    setEmail(party.email);
    setAddress(party.address);
    setCreditTerms(party.credit_terms_days);
  }}
  onAddNew={() => {
    openManualPartyEntryModal('Customer', (newParty) => {
      setCustomer(newParty);
    });
  }}
/>
```

### In AP (Bill Creation):

```jsx
// When selecting vendor in bill form:
<VendorSelector
  onSelect={(party) => {
    setVendor(party);
    setEmail(party.email);
    setAddress(party.address);
    setCreditTerms(party.credit_terms_days);
  }}
  onAddNew={() => {
    openManualPartyEntryModal('Vendor', (newParty) => {
      setVendor(newParty);
    });
  }}
/>
```

---

## SUMMARY: WHAT GETS DONE

### User Journey:

1. **Admin first login** → Onboarding
   - Step 3: "Import customers/vendors from CRM"
   - Offers three options: Zoho, Salesforce, CSV

2. **Admin selects method** → Workflow starts
   - **Zoho/SF**: OAuth flow, auto-fetch, preview, import
   - **CSV**: Download template, upload file, validate, preview, import

3. **Parties imported** → Auto-linked to GL
   - Customers → Debtors account
   - Vendors → Creditors account
   - Both → Both accounts

4. **Accountant uses parties** → In AR/AP flows
   - Create invoice: Select customer from dropdown
   - Create bill: Select vendor from dropdown
   - Quick add: "+ Add New Party" button for immediate entry

5. **System maintains** → De-duplication & audit
   - No duplicate emails per workspace
   - Import history tracked
   - Errors logged for investigation

---

## FILES CREATED / TO CREATE

✅ **Documentation (created):**
- `PARTY_IMPORT_MODAL.md` - Full design spec
- `PARTY_IMPORT_MODAL_COMPONENTS.md` - React implementation
- `dabby_party_import_template.csv` - Download template
- This integration guide

⬜ **Frontend (to create):**
- `PartyImportModal.jsx` - Main modal container
- `MethodSelection.jsx` - Step 1
- `CSVUploadStep.jsx` - Step 2 (CSV path)
- `PreviewStep.jsx` - Step 3
- `ManualPartyEntryModal.jsx` - Single entry form
- `partyImportService.js` - Utility functions

⬜ **Backend (to create):**
- `routers/import.py` - All import endpoints
- `services/crm_service.py` - Zoho/SF integration
- Database migrations for `parties`, `party_import_history`, `crm_integrations` tables

⬜ **Testing (to create):**
- Unit tests for CSV validation
- Integration tests for GL linking
- E2E tests for full workflows

---

## DEPLOYMENT READINESS CHECKLIST

- [ ] All React components coded and tested
- [ ] All FastAPI endpoints implemented and tested
- [ ] Database schema created with migrations
- [ ] CSV template file available for download
- [ ] Error messages user-friendly and clear
- [ ] DPDP compliance verified (PII handling)
- [ ] Security audit passed (token encryption, RLS, CORS)
- [ ] Performance tested (import 5000 parties < 30s)
- [ ] Documentation complete (README, API docs, user guide)
- [ ] Smoke tests pass (add party, invoice workflow)

---

**Status:** 🟡 Ready for implementation
**Estimated Dev Time:** 2-3 days (both frontend & backend)
**Dependencies:** Supabase schema, CRM OAuth apps configured

