/**
 * Helper to extract formatted company letterhead, tax IDs, address, and bank details
 * from the active workbench settings.
 */
export const getWorkbenchCompanyDetails = (activeWorkbench, user = null) => {
  if (!activeWorkbench) {
    return {
      name: "Your Company",
      legalName: "Your Company Pvt Ltd",
      logo: null,
      address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka, 560038, India",
      street: "100 Feet Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      country: "India",
      gstin: "29AAAAA0000A1Z5",
      pan: "ABCDE1234F",
      cin: "U72900KA2024PTC123456",
      email: user?.email || "",
      bankDetails: {
        bankName: "HDFC Bank",
        accountNumber: "50200049281734",
        ifsc: "HDFC0001234",
        branch: "Indiranagar Branch",
        accountName: "Your Company Pvt Ltd"
      }
    };
  }

  // Address formatting from Workbench Settings address object
  let addressStr = "";
  if (activeWorkbench.address) {
    if (typeof activeWorkbench.address === "string") {
      addressStr = activeWorkbench.address;
    } else {
      const parts = [
        activeWorkbench.address.street,
        activeWorkbench.address.city,
        activeWorkbench.address.state,
        activeWorkbench.address.pincode,
        activeWorkbench.address.country || activeWorkbench.country
      ].filter(Boolean);
      addressStr = parts.join(", ");
    }
  }

  if (!addressStr) {
    addressStr = [
      activeWorkbench.city,
      activeWorkbench.country || "India"
    ].filter(Boolean).join(", ");
  }

  // Primary Bank account details from Workbench Settings
  const primaryBank = (activeWorkbench.bank_accounts && activeWorkbench.bank_accounts.length > 0)
    ? activeWorkbench.bank_accounts[0]
    : {};

  return {
    name: activeWorkbench.name || "Your Company",
    legalName: activeWorkbench.legal_name || activeWorkbench.name || "Your Company Pvt Ltd",
    logo: activeWorkbench.logo || null,
    address: addressStr || "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    street: activeWorkbench.address?.street || "",
    city: activeWorkbench.address?.city || activeWorkbench.city || "",
    state: activeWorkbench.address?.state || "",
    pincode: activeWorkbench.address?.pincode || "",
    country: activeWorkbench.country || activeWorkbench.address?.country || "India",
    gstin: activeWorkbench.gstin || "29AAAAA0000A1Z5",
    pan: activeWorkbench.pan || "ABCDE1234F",
    cin: activeWorkbench.cin || "U72900KA2024PTC123456",
    email: user?.email || activeWorkbench.email || "",
    bankDetails: {
      bankName: primaryBank.bank_name || "HDFC Bank",
      accountNumber: primaryBank.account_number || "50200049281734",
      ifsc: primaryBank.ifsc || "HDFC0001234",
      branch: primaryBank.branch || "Main Branch",
      accountName: activeWorkbench.legal_name || activeWorkbench.name || "Your Company Pvt Ltd"
    }
  };
};
