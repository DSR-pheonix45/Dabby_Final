# Party Import Modal & CSV Fallback - Design Document

## OVERVIEW

The Party Import system has **3 modes:**
1. **Zoho CRM Integration** (API-based, OAuth)
2. **Salesforce Integration** (API-based, OAuth)
3. **CSV Upload** (manual fallback) - with form field mapping

---

## PART 1: MODAL FORM DESIGN

### Party Entry Form Fields (Single Entry Modal)

```
┌─────────────────────────────────────────────────────────┐
│ ADD NEW PARTY                              [X] Close    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ * Party Name                                            │
│ ┌──────────────────────────────────────────────────────┐│
│ │ e.g., ABC Trading Private Limited                    ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ * Party Type                                            │
│ ◯ Customer  ◯ Vendor  ◯ Both (Default: Customer)    │
│                                                          │
│ * Email Address                                         │
│ ┌──────────────────────────────────────────────────────┐│
│ │ accounts@abctrading.com                              ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ * Phone Number                                          │
│ ┌──────────────────────────────────────────────────────┐│
│ │ +91 98765 43210                                       ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ * GST Number (Optional)                                 │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 27AABCU9603R1Z0 (15 characters)                       ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ * Address                                               │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 123 Business Park, MG Road, Bangalore - 560001       ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ * City                                                  │
│ ┌──────────────────────── ──────────────────────────┐  │
│ │ Bangalore                                         │ ▼ ││
│ └──────────────────────────────────────────────────┘  │
│                                                          │
│ * State                                                 │
│ ┌──────────────────────── ──────────────────────────┐  │
│ │ Karnataka                                         │ ▼ ││
│ └──────────────────────────────────────────────────┘  │
│                                                          │
│ * Credit Terms (Days)                                   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 30 (Net-30 default)                                  ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ☑ Active Party                                          │
│                                                          │
│              [ Cancel ]  [ + Add Party ]                │
└─────────────────────────────────────────────────────────┘
```

---

## PART 2: MODAL FIELD SPECIFICATIONS

| Field Name | Required | Type | Validation | Example | CSV Header |
|------------|----------|------|-----------|---------|------------|
| **Party Name** | ✓ | Text | Min 2, Max 100 chars | ABC Trading Ltd | party_name |
| **Party Type** | ✓ | Dropdown | Customer, Vendor, Both | Customer | party_type |
| **Email** | ✓ | Email | Valid email format | info@abc.com | email |
| **Phone** | ✓ | Phone | +91 + 10 digits | +91 9876543210 | phone |
| **GST Number** | ✗ | Text | 15 chars (optional) | 27AABCU9603R1Z0 | gst_number |
| **Address** | ✓ | Text | Min 10 chars | 123 Business Park | address |
| **City** | ✓ | Dropdown/Text | Selected from list or free text | Bangalore | city |
| **State** | ✓ | Dropdown | Selected from India states | Karnataka | state |
| **Credit Terms** | ✓ | Number | 0-365 days | 30 | credit_terms_days |
| **Active** | ✓ | Checkbox | Enabled (default: Yes) | true | is_active |

---

## PART 3: CSV TEMPLATE

### CSV Header Row (10 columns, exact order):

```csv
party_name,party_type,email,phone,gst_number,address,city,state,credit_terms_days,is_active
```

### Sample CSV Data:

```csv
party_name,party_type,email,phone,gst_number,address,city,state,credit_terms_days,is_active
ABC Trading Private Limited,Customer,accounts@abc.com,+91 9876543210,27AABCU9603R1Z0,123 Business Park,Bangalore,Karnataka,30,true
XYZ Manufacturing Ltd,Vendor,purchase@xyz.com,+91 8765432109,29AABCU9603R1Z1,456 Industrial Zone,Mumbai,Maharashtra,45,true
Tech Solutions India,Both,hello@techsol.com,+91 7654321098,,789 Tech Park,Pune,Maharashtra,0,true
Global Exports,Customer,sales@globalexp.com,+91 6543210987,24AABCU9603R1Z2,321 Export Hub,Chennai,Tamil Nadu,60,true
```

### CSV Validation Rules:

| Field | Rule |
|-------|------|
| **party_name** | Required, 2-100 chars, no special chars except spaces and & |
| **party_type** | Required, must be: `Customer` OR `Vendor` OR `Both` |
| **email** | Required, must match email regex |
| **phone** | Required, must be +91 + 10 digits (with or without spaces) |
| **gst_number** | Optional, if provided must be exactly 15 alphanumeric chars |
| **address** | Required, min 10 chars |
| **city** | Required, must be in predefined city list OR free text (max 50 chars) |
| **state** | Required, must be one of Indian states |
| **credit_terms_days** | Required, must be 0-365 |
| **is_active** | Required, must be `true` OR `false` |

---

## PART 4: IMPORT FLOW WITH CSV FALLBACK

### Workflow: CRM Import with CSV Fallback

```
User clicks: Admin → Integrations → Import Parties
  ↓
┌────────────────────────────────────────────────────────────┐
│ IMPORT PARTIES                              [X] Close      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Choose Import Method:                                       │
│                                                             │
│ ◯ Zoho CRM (Recommended)                                   │
│   └─ Auto-sync customers & vendors from Zoho CRM via API   │
│                                                             │
│ ◯ Salesforce (Recommended)                                 │
│   └─ Auto-sync accounts from Salesforce via API            │
│                                                             │
│ ◯ CSV Upload (Manual Fallback)                             │
│   └─ Upload CSV file with party data                       │
│                                                             │
│              [ Next ]  [ Cancel ]                           │
└────────────────────────────────────────────────────────────┘
  ↓
IF "CSV Upload" selected:
  ↓
┌────────────────────────────────────────────────────────────┐
│ UPLOAD PARTY CSV                            [X] Close      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: Download Template                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Download the CSV template to fill with party data:    │ │
│ │ [ ⬇ Download Template ]                              │ │
│ │                                                        │ │
│ │ Template includes columns:                            │ │
│ │ • party_name (required)                               │ │
│ │ • party_type (required: Customer/Vendor/Both)         │ │
│ │ • email (required)                                    │ │
│ │ • phone (required)                                    │ │
│ │ • gst_number (optional)                               │ │
│ │ • address, city, state, credit_terms_days, is_active  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ Step 2: Upload CSV File                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Drag-drop CSV file here or click to browse             │ │
│ │                                                        │ │
│ │          [ Choose File ]                              │ │
│ │                  OR                                    │ │
│ │        Drag CSV file here                             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ℹ️  Accepted format: CSV only (.csv)                       │
│ ℹ️  Max file size: 10 MB                                   │
│ ℹ️  Max rows: 5000 parties per import                      │
│                                                             │
│              [ Cancel ]  [ Upload & Preview ]              │
└────────────────────────────────────────────────────────────┘
  ↓
(Backend processes CSV: Validates, de-duplicates, prepares preview)
  ↓
┌────────────────────────────────────────────────────────────┐
│ PREVIEW IMPORT                              [X] Close      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 3: Review & Confirm                                   │
│                                                             │
│ ✓ File processed successfully                              │
│ ℹ️  Total rows: 142                                        │
│ ✓ New parties: 125                                         │
│ ⚠️  Duplicates (existing email): 17 (will update)          │
│ ❌ Errors: 0                                               │
│                                                             │
│ Preview (first 5 rows):                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ # │ Party Name │ Type │ Email │ Phone │ Status       │ │
│ ├──┼────────────┼──────┼───────┼───────┼──────────────┤ │
│ │1 │ABC Trading │Cust. │accts@..│+91... │ NEW ✓       │ │
│ │2 │XYZ Mfg     │Vend. │purch@..│+91... │ NEW ✓       │ │
│ │3 │Tech Sol.   │Both  │hello@..│+91... │ UPDATE ⚠️   │ │
│ │4 │Global Exp. │Cust. │sales@..│+91... │ NEW ✓       │ │
│ │5 │More...     │...   │...     │...    │ ...         │ │
│ │  │[Scroll for more]      [ Show All ]                │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☑ I confirm the data looks correct                         │
│                                                             │
│              [ Cancel ]  [ Import Now ]                    │
└────────────────────────────────────────────────────────────┘
  ↓
(Backend creates/updates parties in GL)
  ↓
┌────────────────────────────────────────────────────────────┐
│ IMPORT COMPLETE ✓                           [X] Close      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ 🎉 Import successful!                                       │
│                                                             │
│ Summary:                                                    │
│ ✓ New parties created: 125                                 │
│ ✓ Existing parties updated: 17                             │
│ ✓ Total parties now: 487                                   │
│                                                             │
│ Parties are now linked to:                                 │
│ • "Debtors" GL account (for Customers)                     │
│ • "Creditors" GL account (for Vendors)                     │
│                                                             │
│ Next steps:                                                 │
│ 1. View party list: Admin → Parties → Master List          │
│ 2. Create invoice: Navigate to AR → New Invoice            │
│ 3. Create bill: Navigate to AP → New Bill                  │
│                                                             │
│                    [ Close & Return ]                       │
└────────────────────────────────────────────────────────────┘
```

---

## PART 5: ERROR HANDLING & VALIDATION

### CSV Validation Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| **Missing required field** | party_name, email, phone, etc. | Fill all required columns |
| **Invalid email format** | `email@` or `@domain.com` | Use format: `user@domain.com` |
| **Invalid phone format** | Not `+91 + 10 digits` | Use format: `+91 9876543210` |
| **Invalid GST number** | Not 15 chars (if provided) | GST must be 15 alphanumeric chars |
| **Invalid party_type** | Not `Customer`, `Vendor`, or `Both` | Use exact values only |
| **Invalid state** | Not in India state list | Use official state names |
| **Duplicate email (same file)** | 2+ rows with same email | Keep first, remove duplicates |
| **Address too short** | Less than 10 characters | Provide full address |
| **Active flag not boolean** | Not `true` or `false` | Use `true` or `false` |

### Row-Level Error Feedback

```
CSV Preview with Errors:

┌─────────────────────────────────────────────────────────────────┐
│ # │ Party Name │ Status         │ Error / Warning              │ │
├─┼──────────────┼────────────────┼────────────────────────────┤ │
│1 │ABC Trading  │ ✓ OK (NEW)     │ —                          │ │
│2 │⚠️ XYZ Corp  │ ⚠️ WARNING     │ Duplicate email (row 7)    │ │
│3 │❌ Tech Sol  │ ❌ ERROR       │ Invalid email format       │ │
│4 │Global Exp.  │ ✓ OK (NEW)     │ —                          │ │
│5 │More...      │ ...            │ ...                        │ │
└─────────────────────────────────────────────────────────────────┘

Error Categories:
✓ OK (NEW)     - Will be created
✓ OK (UPDATE)  - Will update existing party
⚠️ WARNING     - Will process but needs attention
❌ ERROR       - Row will be skipped

Options:
[ Skip errors & import valid rows ] [ Fix & re-upload CSV ]
```

---

## PART 6: MANUAL PARTY ENTRY MODAL (Fallback for Single Entry)

If user wants to add a party manually (one-at-a-time) instead of CSV:

```
Admin clicks: + Add New Party (from AR/AP screen or Party Master)
  ↓
┌─────────────────────────────────────────────────────────────┐
│ ADD NEW PARTY                              [X] Close        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ * Party Name *                                              │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ABC Trading Private Limited                               │ │
│ │ (Max 100 chars)                                          │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ❌ This field is required                                    │
│                                                              │
│ * Party Type (Customer / Vendor / Both)                     │
│ ◯ Customer  ◯ Vendor  ◯ Both  [Default: Customer]         │
│                                                              │
│ * Email Address *                                           │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ accounts@abctrading.com                                   │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ✓ Valid email format                                         │
│                                                              │
│ * Phone Number *                                            │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ +91 9876543210                                            │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ✓ Valid phone format                                         │
│                                                              │
│ GST Number (Optional)                                       │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 27AABCU9603R1Z0                                           │ │
│ │ (15 chars if provided)                                   │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ * Address *                                                 │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 123 Business Park, MG Road                                │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ * City *                                                    │
│ ┌──────────────────────────────── ──────────────────────┐   │
│ │ Bangalore                                          │ ▼ │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ * State *                                                   │
│ ┌──────────────────────────────── ──────────────────────┐   │
│ │ Karnataka                                          │ ▼ │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ * Credit Terms (Days) *                                     │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 30                                (Net-30 by default)     │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ ☑ Active Party (checked by default)                         │
│                                                              │
│                                                              │
│           [ Cancel ] [ + Add Another ] [ Save ]             │
└─────────────────────────────────────────────────────────────┘
```

---

## PART 7: BACKEND PROCESSING (CSV Import Logic)

### Step-by-step processing:

```python
# 1. Parse CSV file
csv_data = parse_csv(uploaded_file)

# 2. Validate each row
validated_rows = []
errors = []
for idx, row in enumerate(csv_data):
    errors_in_row = validate_row(row)
    if errors_in_row:
        errors.append({
            'row': idx + 2,  # Skip header (row 1)
            'party_name': row.get('party_name'),
            'errors': errors_in_row
        })
    else:
        validated_rows.append(row)

# 3. De-duplication (by email)
dedup_data = []
existing_parties = get_parties_by_email(workspace_id)
for row in validated_rows:
    if row['email'] in existing_parties:
        row['action'] = 'UPDATE'
        dedup_data.append(row)
    else:
        row['action'] = 'NEW'
        dedup_data.append(row)

# 4. Return preview to user
return {
    'total_rows': len(csv_data),
    'valid_rows': len(validated_rows),
    'new_parties': len([r for r in dedup_data if r['action'] == 'NEW']),
    'update_parties': len([r for r in dedup_data if r['action'] == 'UPDATE']),
    'error_count': len(errors),
    'preview': dedup_data[:5],  # First 5 rows for preview
    'errors': errors,  # All validation errors
}

# 5. On confirmation, create/update parties
for row in dedup_data:
    if row['action'] == 'NEW':
        create_party(workspace_id, row)
    else:
        update_party(workspace_id, row['email'], row)

# 6. Link to GL accounts automatically
link_parties_to_gl(
    workspace_id,
    customers=[p for p in dedup_data if p['party_type'] in ['Customer', 'Both']],
    vendors=[p for p in dedup_data if p['party_type'] in ['Vendor', 'Both']]
)
```

---

## PART 8: DATABASE SCHEMA FOR PARTIES

```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(100) NOT NULL,
  party_type VARCHAR(20) NOT NULL, -- 'Customer', 'Vendor', 'Both'
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,

  -- GST & Address
  gst_number VARCHAR(15) UNIQUE, -- Optional
  address TEXT NOT NULL,
  city VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,

  -- Credit Terms & Status
  credit_terms_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,

  -- CRM Integration
  crm_type VARCHAR(50), -- 'zoho_crm', 'salesforce', 'manual'
  crm_id VARCHAR(255), -- External CRM ID for syncing
  crm_last_sync TIMESTAMP,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(workspace_id, email), -- Email unique per workspace
  CONSTRAINT valid_party_type CHECK (party_type IN ('Customer', 'Vendor', 'Both')),
  CONSTRAINT valid_credit_terms CHECK (credit_terms_days BETWEEN 0 AND 365),
  CONSTRAINT valid_gst_length CHECK (gst_number IS NULL OR LENGTH(gst_number) = 15)
);

-- Index for fast lookups
CREATE INDEX idx_parties_workspace_type ON parties(workspace_id, party_type);
CREATE INDEX idx_parties_email ON parties(email);
CREATE INDEX idx_parties_crm_sync ON parties(workspace_id, crm_type) WHERE crm_id IS NOT NULL;
```

---

## PART 9: INTEGRATION WITH AR/AP FLOWS

### When creating a new Invoice (AR):

```
Accountant clicks: + New Invoice
  ↓
Modal opens: Invoice Creation
  ├─ Select Customer *
  │  ├─ Dropdown (loads all active Customer parties)
  │  ├─ If not found: "[ + Add New Party ]" button
  │  │  └─ Opens Party Entry Modal (full form)
  │  └─ On selection: Auto-fill email, address, credit terms
  ├─ Invoice details (date, amount, etc.)
  └─ [Save Invoice]

IF user clicks "+ Add New Party":
  ↓
  Party Modal opens with empty form fields
  ├─ User fills: name, email, phone, address, etc.
  ├─ User clicks [Save]
  ├─ New party created instantly
  ├─ Modal closes
  └─ Dropdown refreshes → user can select newly created party
```

### Same flow for Bills (AP):

```
Operator clicks: + New Bill
  ↓
Modal opens: Bill Creation
  ├─ Select Vendor *
  │  ├─ Dropdown (loads all active Vendor parties)
  │  ├─ If not found: "[ + Add New Party ]" button
  │  └─ On selection: Auto-fill info
  ├─ Bill details
  └─ [Save Bill]
```

---

## PART 10: CSV DOWNLOAD & EMAIL TEMPLATES

### CSV Template File Download

When user clicks "[ ⬇ Download Template ]":

**File Name:** `dabby_party_import_template.csv`

**Content:**
```csv
party_name,party_type,email,phone,gst_number,address,city,state,credit_terms_days,is_active
ABC Trading Private Limited,Customer,accounts@abc.com,+91 9876543210,27AABCU9603R1Z0,123 Business Park,Bangalore,Karnataka,30,true
XYZ Manufacturing Ltd,Vendor,purchase@xyz.com,+91 8765432109,29AABCU9603R1Z1,456 Industrial Zone,Mumbai,Maharashtra,45,true
Tech Solutions India,Both,hello@techsol.com,+91 7654321098,,789 Tech Park,Pune,Maharashtra,0,true
```

### Instructions in template (as CSV comments or separate text file):

```
PARTY IMPORT INSTRUCTIONS
=========================

1. PARTY_NAME (Required)
   - Business/Company name
   - Max 100 characters
   - Example: ABC Trading Private Limited

2. PARTY_TYPE (Required)
   - Allowed values: Customer, Vendor, Both
   - Example: Customer

3. EMAIL (Required)
   - Valid email format
   - Example: accounts@abc.com

4. PHONE (Required)
   - Format: +91 XXXXX XXXXX (10 digits)
   - Example: +91 9876543210

5. GST_NUMBER (Optional)
   - 15 character GST registration number
   - Example: 27AABCU9603R1Z0

6. ADDRESS (Required)
   - Full street address
   - Min 10 characters
   - Example: 123 Business Park, MG Road

7. CITY (Required)
   - City name (predefined list or free text)
   - Example: Bangalore

8. STATE (Required)
   - Indian state name
   - Example: Karnataka

9. CREDIT_TERMS_DAYS (Required)
   - Payment terms in days (0-365)
   - Example: 30 (for Net-30)

10. IS_ACTIVE (Required)
    - Allowed values: true, false
    - Example: true

TIPS:
- Save file as UTF-8 encoding
- Do not modify column headers
- Keep exactly 10 columns in this order
- Avoid special characters in names
```

---

## PART 11: SUMMARY TABLE (Form Fields → CSV Mapping)

| UI Form Field | CSV Column | Type | Required | Validation | Example |
|---|---|---|---|---|---|
| Party Name input | party_name | String | ✓ | 2-100 chars | ABC Trading Ltd |
| Party Type radio | party_type | String | ✓ | Customer/Vendor/Both | Customer |
| Email input | email | String | ✓ | Valid email | info@abc.com |
| Phone input | phone | String | ✓ | +91 + 10 digits | +91 9876543210 |
| GST input | gst_number | String | ✗ | 15 chars if provided | 27AABCU9603R1Z0 |
| Address textarea | address | String | ✓ | Min 10 chars | 123 Business Park |
| City dropdown | city | String | ✓ | From list or free text | Bangalore |
| State dropdown | state | String | ✓ | From state list | Karnataka |
| Credit Terms input | credit_terms_days | Number | ✓ | 0-365 | 30 |
| Active checkbox | is_active | Boolean | ✓ | true/false | true |

---

## IMPLEMENTATION CHECKLIST

- [ ] Frontend: Party Import modal (CRM + CSV tabs)
- [ ] Frontend: CSV upload drag-drop with validation feedback
- [ ] Frontend: CSV preview table with error highlighting
- [ ] Frontend: Manual party entry form (single entry modal)
- [ ] Backend: CSV parsing endpoint (`POST /api/import/csv-preview`)
- [ ] Backend: CSV import endpoint (`POST /api/import/csv-confirm`)
- [ ] Backend: Party CRUD endpoints (`GET/POST/PUT /api/parties`)
- [ ] Backend: GL linking logic (parties → Debtors/Creditors accounts)
- [ ] Database: Create `parties` table with constraints
- [ ] Database: Create import history audit table
- [ ] Testing: CSV validation (all error cases)
- [ ] Testing: De-duplication logic
- [ ] Testing: GL account linking
- [ ] Documentation: CSV template download
- [ ] Documentation: Error messages & user guidance

