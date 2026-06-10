// Email validation test — mirrors Signup.jsx & Login.jsx logic exactly

const ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com'];

// Signup validation (domain + basic regex)
const validateEmail = (value) => {
  const basicValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!basicValid) return false;
  const domain = value.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

// Login validation (domain only)
const validateEmailDomain = (value) => {
  const domain = value.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

const GREEN = '\x1b[32m✅';
const RED   = '\x1b[31m❌';
const RESET = '\x1b[0m';

const testCases = [
  // ✅ Should PASS
  { email: 'chirayu@gmail.com',      expect: true,  label: 'valid gmail' },
  { email: 'user@yahoo.com',         expect: true,  label: 'valid yahoo' },
  { email: 'user@outlook.com',       expect: true,  label: 'valid outlook' },
  { email: 'USER@GMAIL.COM',         expect: true,  label: 'uppercase domain (case insensitive)' },
  { email: 'first.last@gmail.com',   expect: true,  label: 'dots in local part' },
  { email: 'user+tag@gmail.com',     expect: true,  label: 'plus alias gmail' },

  // ❌ Should FAIL
  { email: 'user@company.com',       expect: false, label: 'company.com (blocked)' },
  { email: 'user@hotmail.com',       expect: false, label: 'hotmail.com (not in list)' },
  { email: 'user@icloud.com',        expect: false, label: 'icloud.com (not in list)' },
  { email: 'user@protonmail.com',    expect: false, label: 'protonmail.com (not in list)' },
  { email: 'notanemail',             expect: false, label: 'no @ symbol' },
  { email: '@gmail.com',             expect: false, label: 'empty local part' },
  { email: 'user@',                  expect: false, label: 'no domain' },
  { email: '',                       expect: false, label: 'empty string' },
  { email: 'user@gmail',             expect: false, label: 'no TLD' },
  { email: '  @gmail.com',           expect: false, label: 'space in local part' },
];

console.log('\n🧪 Email Domain Validation Test Suite');
console.log('='.repeat(55));

let passed = 0;
let failed = 0;

testCases.forEach(({ email, expect, label }) => {
  const result = validateEmail(email);
  const ok = result === expect;
  const icon = ok ? GREEN : RED;
  const status = ok ? 'PASS' : `FAIL (got ${result}, expected ${expect})`;
  console.log(`${icon} ${status}${RESET} — "${email}" (${label})`);
  if (ok) passed++; else failed++;
});

console.log('='.repeat(55));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
if (failed === 0) {
  console.log('\x1b[32m🎉 All tests passed!\x1b[0m\n');
} else {
  console.log(`\x1b[31m⚠️  ${failed} test(s) failed — review above.\x1b[0m\n`);
  process.exit(1);
}
