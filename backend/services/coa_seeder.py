import uuid

def seed_coa(supabase_client, workbench_id: str, business_type: str = "services", size: str = "small", industry: str = "others"):
    """
    Seeds the 3-layer Chart of Accounts (Account -> Sub-account -> Label).
    Full taxonomy based on user's Universal Sub-accounts list.
    """
    
    # 1. UNIVERSAL SUB-ACCOUNTS (BASE LAYER)
    # 5 Fixed Accounts: ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
    base_structure = {
        "ASSETS": {
            "type": "asset",
            "sub_accounts": {
                "Cash & Cash Equivalents": [],
                "Bank Accounts": [],
                "Accounts Receivable (AR)": [],
                "Inventory": [],
                "Prepaid Expenses": [],
                "Short-term Investments": [],
                "GST Input Credit / Tax Receivables": [],
                "Property, Plant & Equipment (PPE)": [],
                "Intangible Assets": [],
                "Long-term Investments": [],
                "Capital Work-in-Progress": [],
                "Security Deposits": [],
                "Deferred Tax Assets": []
            }
        },
        "LIABILITIES": {
            "type": "liability",
            "sub_accounts": {
                "Accounts Payable (AP)": [],
                "Short-term Loans": [],
                "Accrued Expenses": [],
                "Deferred Revenue": [],
                "GST Payable / Tax Payables": [],
                "Long-term Debt": [],
                "Lease Liabilities": [],
                "Deferred Tax Liabilities": [],
                "Provisions": []
            }
        },
        "EQUITY": {
            "type": "equity",
            "sub_accounts": {
                "Share Capital": [],
                "Additional Paid-in Capital": [],
                "Retained Earnings": [],
                "Reserves & Surplus": [],
                "Owner’s Drawings": []
            }
        },
        "REVENUE": {
            "type": "income",
            "sub_accounts": {
                "Operating Revenue": [],
                "Other Income": [],
                "Interest Income": [],
                "Gains (Asset sale, Forex etc.)": []
            }
        },
        "EXPENSES": {
            "type": "expense",
            "sub_accounts": {
                "Cost of Goods Sold (COGS)": [],
                "Salaries & Wages": [],
                "Rent": [],
                "Utilities": [],
                "Marketing & Advertising": [],
                "Software & Subscriptions": [],
                "Legal & Professional Fees": [],
                "Travel & Entertainment": [],
                "Interest Expense": [],
                "Bank Charges": [],
                "Depreciation": [],
                "Amortization": [],
                "Losses": []
            }
        }
    }

    # 2. INDUSTRY SPECIFIC OVERLAYS (Adds specialized sub-accounts or labels)
    overlays = {
        "manufacturing": {
            "ASSETS": {
                "Inventory": ["Raw Material Inventory", "Work-in-Progress (WIP)", "Finished Goods Inventory"],
                "Property, Plant & Equipment (PPE)": ["Factory Equipment", "Plant & Machinery"]
            },
            "EXPENSES": {
                "Cost of Goods Sold (COGS)": ["Raw Materials Consumed", "Direct Labor", "Factory Power & Fuel", "Machine Maintenance", "Factory Rent", "Quality Control Costs", "Packaging Costs"]
            },
            "LIABILITIES": {
                "Current Liabilities": ["Supplier Advances"] # Fallback if needed
            }
        },
        "services": {
            "REVENUE": {
                "Operating Revenue": ["Consulting Fees", "Retainer Income", "Project-based Income"]
            },
            "EXPENSES": {
                "Operating Expenses (OPEX)": ["Contractor Payments", "Third-party Tools"]
            }
        },
        "trading": {
            "ASSETS": {
                "Inventory": ["Purchased Goods Inventory"]
            },
            "EXPENSES": {
                "Cost of Goods Sold (COGS)": ["Inventory Purchases", "Logistics & Freight", "Warehousing Costs"]
            }
        },
        "ecommerce": {
            "ASSETS": {
                "Inventory": ["Multi-channel Inventory"],
                "Accounts Receivable (AR)": ["Payment Gateway Receivables"]
            },
            "REVENUE": {
                "Operating Revenue": ["Online Sales", "Marketplace Revenue", "Returns & Refunds (Contra)"]
            },
            "EXPENSES": {
                "Operating Expenses (OPEX)": ["Platform Fees", "Payment Gateway Charges", "Shipping & Fulfillment", "Discounts & Coupons"]
            }
        },
        "construction": {
            "ASSETS": {
                "Capital Work-in-Progress": ["WIP Projects"]
            },
            "REVENUE": {
                "Operating Revenue": ["Contract Revenue", "Milestone Billing"]
            },
            "EXPENSES": {
                "Cost of Goods Sold (COGS)": ["Site Labor", "Raw Materials", "Contractor Payments", "Project Overheads"]
            }
        },
        "technology": {
            "ASSETS": {
                "Intangible Assets": ["Capitalized Development Costs"]
            },
            "REVENUE": {
                "Operating Revenue": ["SaaS Subscriptions", "Licensing Fees", "API Usage Revenue"]
            },
            "EXPENSES": {
                "Operating Expenses (OPEX)": ["Cloud Infrastructure", "R&D Software"]
            }
        }
    }

    # Apply Industry Overlay
    selected_industry = industry.lower()
    if selected_industry in overlays:
        industry_data = overlays[selected_industry]
        for account_name, a_data in industry_data.items():
            for sub_name, labels in a_data.items():
                if sub_name not in base_structure[account_name]["sub_accounts"]:
                    base_structure[account_name]["sub_accounts"][sub_name] = []
                base_structure[account_name]["sub_accounts"][sub_name].extend(labels)

    # Seed to Supabase
    try:
        acc_order = 1
        for account_name, data in base_structure.items():
            # 1. Create Account (Level 1)
            acc_resp = supabase_client.table("coa_accounts").insert({
                "workbench_id": workbench_id,
                "name": account_name,
                "type": data["type"],
                "is_system": True,
                "display_order": acc_order,
                "level": 1
            }).execute()
            acc_id = acc_resp.data[0]["id"]
            acc_order += 1

            sub_order = 1
            for sub_name, labels in data["sub_accounts"].items():
                # 2. Create Sub-Account (Level 2)
                sub_resp = supabase_client.table("coa_accounts").insert({
                    "workbench_id": workbench_id,
                    "name": sub_name,
                    "type": data["type"],
                    "parent_id": acc_id,
                    "sub_account": account_name,
                    "is_system": True,
                    "display_order": sub_order,
                    "level": 2
                }).execute()
                sub_id = sub_resp.data[0]["id"]
                sub_order += 1

                # 3. Create Essential Labels (Level 3) for the sub-account
                # We seed one default label per sub-account to make the platform usable immediately
                label_data = {
                    "workbench_id": workbench_id,
                    "name": sub_name, # Use sub-account name as the default label name
                    "type": data["type"],
                    "sub_account": sub_name,
                    "is_system": False
                }
                supabase_client.table("labels").insert(label_data).execute()

        return {"status": "success", "message": "Full 3-Layer COA seeded successfully"}
    except Exception as e:
        print(f"[ERROR] COA Seeding failed: {str(e)}")
        return {"status": "error", "message": str(e)}

async def seed_default_coa(supabase_client, workbench_id: str):
    return seed_coa(supabase_client, workbench_id)
