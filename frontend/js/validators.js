(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Validators = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const Validators = {};

  // 1. Mobile Number (Indian mobile rules)
  Validators.validatePhoneNumber = function(phone, isRequired = false) {
    phone = (phone || "").trim();
    if (!phone) {
      if (isRequired) return "Mobile number is required.";
      return null;
    }
    // Reject spaces, letters, symbols
    if (/\s/.test(phone)) {
      return "Mobile number must be exactly 10 digits.";
    }
    if (!/^\d+$/.test(phone)) {
      return "Mobile number must be exactly 10 digits.";
    }
    // Reject country codes (only accept exactly 10 digits)
    if (phone.length !== 10) {
      return "Mobile number must be exactly 10 digits.";
    }
    // Indian mobiles start with 6, 7, 8, or 9
    if (!/^[6-9]/.test(phone)) {
      return "Mobile number must be exactly 10 digits.";
    }
    return null;
  };

  // 2. PIN Code Fields
  Validators.validatePinCode = function(pin, isRequired = false) {
    pin = (pin || "").trim();
    if (!pin) {
      if (isRequired) return "PIN code is required.";
      return null;
    }
    if (/\s/.test(pin)) {
      return "PIN code must be exactly 6 digits.";
    }
    if (!/^\d+$/.test(pin)) {
      return "PIN code must be exactly 6 digits.";
    }
    if (pin.length !== 6) {
      return "PIN code must be exactly 6 digits.";
    }
    return null;
  };

  // 3. Name Fields (Personal Full Names)
  Validators.validateName = function(name, label = "Full Name", isRequired = true) {
    name = (name || "").trim();
    if (!name) {
      if (isRequired) return `${label} is required.`;
      return null;
    }
    if (name.length < 2 || name.length > 100) {
      return `${label} must be between 2 and 100 characters.`;
    }
    // Reject numbers-only
    if (/^\d+$/.test(name) || /^[+-]?\d+(\.\d+)?$/.test(name)) {
      return `${label} cannot contain only numbers.`;
    }
    // Reject symbol-only
    if (!/[a-zA-Z]/.test(name)) {
      return `${label} must contain letters.`;
    }
    // Letters and spaces only
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return `${label} must contain letters and spaces only.`;
    }
    return null;
  };

  Validators.validateProfileText = function(val, label, isRequired = false, min = 2, max = 150) {
    val = (val || "").trim();
    if (!val) {
      if (isRequired) return `${label} is required.`;
      return null;
    }
    const hasScript = /<script\b[^>]*>|javascript:|on\w+\s*=/i.test(val);
    if (hasScript) {
      return `${label} contains forbidden script content.`;
    }
    if (val.length < min || val.length > max) {
      return `${label} must be between ${min} and ${max} characters.`;
    }
    if (/^\d+$/.test(val)) {
      return `${label} cannot contain only numbers.`;
    }
    if (!/[a-zA-Z0-9]/.test(val)) {
      return `${label} cannot consist only of special characters.`;
    }
    return null;
  };

  // 4a. Graduation Year
  Validators.validateGraduationYear = function(year) {
    year = (year || "").trim();
    if (!year) return null;
    if (!/^\d{4}$/.test(year)) {
      return "Graduation year must be a 4-digit number.";
    }
    const num = Number(year);
    if (num < 1900 || num > 2100) {
      return "Graduation year must be between 1900 and 2100.";
    }
    return null;
  };

  Validators.validateUrl = function(url, label) {
    url = (url || "").trim();
    if (!url) return null;

    if (url.length > 500) {
      return `${label} must not exceed 500 characters.`;
    }

    // Reject whitespace within URL
    if (/\s/.test(url)) {
      return `${label} must not contain spaces.`;
    }

    // Check protocol first for a friendly error message
    if (!/^https?:\/\//i.test(url)) {
      return `${label} must be a valid URL starting with http:// or https://.`;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return `${label} is malformed or invalid.`;
    }

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `${label} must use a secure protocol (http:// or https://).`;
    }

    // Hostname check
    const hostname = parsed.hostname;
    if (!hostname) {
      return `${label} must have a valid hostname.`;
    }

    // Validate hostname has a dot and valid characters, and TLD
    const hostnameParts = hostname.split(".");
    if (hostnameParts.length < 2 || hostnameParts.some(part => part.length === 0)) {
      return `${label} must have a valid domain name.`;
    }

    // Hostname regex validation (reject invalid characters like _, spaces, etc.)
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(hostname)) {
      return `${label} must have a valid hostname structure.`;
    }

    // Field-specific validation
    const lowerLabel = (label || "").toLowerCase();
    
    if (lowerLabel.includes("linkedin")) {
      const isLinkedin = hostname.endsWith("linkedin.com");
      if (!isLinkedin) {
        return `${label} must be a valid linkedin.com profile URL.`;
      }
      const path = parsed.pathname;
      if (!/^\/(in|pub|profile)\/[a-zA-Z0-9%_.-]+\/?$/.test(path)) {
        return `${label} must be a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/username).`;
      }
    } else if (lowerLabel.includes("github")) {
      const isGithub = hostname.endsWith("github.com");
      if (!isGithub) {
        return `${label} must be a valid github.com profile URL.`;
      }
      const path = parsed.pathname;
      const pathParts = path.split("/").filter(Boolean);
      if (pathParts.length !== 1) {
        return `${label} must be a valid GitHub profile URL (e.g., https://github.com/username).`;
      }
      const username = pathParts[0];
      const reservedPaths = ["pulls", "issues", "marketplace", "explore", "notifications", "settings", "orgs", "search", "trending", "features", "sponsors", "login", "join"];
      if (reservedPaths.includes(username.toLowerCase()) || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
        return `${label} must be a valid GitHub profile URL (e.g., https://github.com/username).`;
      }
    } else if (lowerLabel.includes("resume")) {
      const path = parsed.pathname.toLowerCase();
      const isPdf = path.endsWith(".pdf") || parsed.href.toLowerCase().includes(".pdf");
      
      const trustedDomains = ["drive.google.com", "docs.google.com", "dropbox.com", "www.dropbox.com", "onedrive.live.com", "sharepoint.com", "github.com", "raw.githubusercontent.com"];
      const isTrustedDomain = trustedDomains.some(domain => hostname.endsWith(domain));

      if (!isPdf && !isTrustedDomain) {
        return `${label} must point to a PDF file or a trusted hosting service (Google Drive, Dropbox, OneDrive, or GitHub).`;
      }
    }

    return null;
  };

  // 5. Company Name
  Validators.validateCompanyName = function(name) {
    name = (name || "").trim();
    if (!name) {
      return "Company name is required.";
    }
    if (name.length < 2 || name.length > 100) {
      return "Company name must be between 2 and 100 characters.";
    }
    if (/^[+-]?\d+(\.\d+)?$/.test(name)) {
      return "Company name cannot contain only numbers.";
    }
    if (!/[a-zA-Z0-9]/.test(name)) {
      return "Company name cannot consist only of special characters.";
    }
    // Letters, spaces, and valid punctuation only (& . - ')
    if (!/^[a-zA-Z0-9\s&.\-']+$/.test(name)) {
      return "Company name contains invalid characters.";
    }
    return null;
  };

  // 6. Job Role
  Validators.validateJobRole = function(role) {
    role = (role || "").trim();
    if (!role) {
      return "Job role is required.";
    }
    if (role.length < 2 || role.length > 80) {
      return "Job role must be between 2 and 80 characters.";
    }
    if (/^\d+$/.test(role)) {
      return "Job role cannot contain only numbers.";
    }
    if (!/[a-zA-Z0-9]/.test(role)) {
      return "Job role cannot consist only of special characters.";
    }
    // Text only (with letters, numbers, standard punctuation allowed in job titles like SDE-1, React Dev, etc.)
    if (!/^[a-zA-Z0-9\s&.\-']+$/.test(role)) {
      return "Job role contains invalid characters.";
    }
    return null;
  };

  // 7. Package / LPA
  Validators.validatePackage = function(pkg, isRequired = false) {
    pkg = (pkg || "").trim();
    if (!pkg) {
      if (isRequired) return "Package is required.";
      return null;
    }
    const num = Number(pkg);
    if (isNaN(num) || !/^\d+(\.\d+)?$/.test(pkg)) {
      return "Package must be a valid positive number.";
    }
    if (num <= 0) {
      return "Package must be greater than 0.";
    }
    if (num > 100) {
      return "Package must not exceed 100 LPA.";
    }
    return null;
  };

  // 8. Dates
  Validators.validateDate = function(dateStr, isFutureRequired = false, label = "Date") {
    dateStr = (dateStr || "").trim();
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return `Invalid ${label.toLowerCase()}.`;
    }
    if (isFutureRequired) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dateStr + "T00:00:00");
      if (selectedDate < today) {
        return `${label} cannot be in the past.`;
      }
    }
    return null;
  };

  // 9. Passwords
  Validators.validatePasswordComplexity = function(password, label = "Password") {
    if (!password || typeof password !== 'string') {
      return `${label} is required.`;
    }
    if (password.length < 8) {
      return `${label} must be at least 8 characters.`;
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return `${label} must contain uppercase, lowercase, a number, and a special character.`;
    }
    return null;
  };

  // 10. Email fields
  Validators.validateEmail = function(email) {
    email = (email || "").trim();
    if (!email) {
      return "Email is required.";
    }
    if (/\s/.test(email)) {
      return "Email must not contain spaces.";
    }
    const parts = email.split('@');
    if (parts.length !== 2) {
      return "Please enter a valid email address.";
    }
    const [local, domain] = parts;
    if (!local || !domain || !domain.includes('.')) {
      return "Please enter a valid email address.";
    }
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || domainParts.some(p => p === "")) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  // 11. Dropdowns
  Validators.validateDropdown = function(value, allowedValues, label) {
    if (!allowedValues.includes(value)) {
      return `Invalid selection for ${label.toLowerCase()}.`;
    }
    return null;
  };

  // 12. Textareas / long text
  Validators.validateLongText = function(text, maxLen, label, isRequired = false) {
    text = text || "";
    const trimmed = text.trim();
    if (!trimmed) {
      if (isRequired) return `${label} is required.`;
      return null;
    }
    const hasScript = /<script\b[^>]*>|javascript:|on\w+\s*=/i.test(trimmed);
    if (hasScript) {
      return `${label} contains forbidden script content.`;
    }
    if (trimmed.length > maxLen) {
      return `${label} must not exceed ${maxLen} characters. Currently ${trimmed.length} characters.`;
    }
    return null;
  };

  // 13. Search and filter fields
  Validators.sanitizeSearch = function(query) {
    if (!query || typeof query !== 'string') return "";
    return query.replace(/<script\b[^>]*>|javascript:|on\w+\s*=/gi, "").trim().slice(0, 100);
  };

  return Validators;
}));
