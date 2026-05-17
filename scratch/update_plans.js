import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const newPlans = [
  {
    id: 'free',
    name: 'Free',
    price_inr: 0,
    max_workbenches: 0,
    max_chat_sessions: 10,
    retention_days: 7,
    description: 'No workbench access. View only demo features.'
  },
  {
    id: 'go',
    name: 'Go',
    price_inr: 5000,
    max_workbenches: 5,
    max_chat_sessions: 100,
    retention_days: 30,
    description: 'Up to 5 workbenches. Limited doc_vault uploads & mapping labels.'
  },
  {
    id: 'pro',
    name: 'Pro',
    price_inr: 10000,
    max_workbenches: 10,
    max_chat_sessions: 1000,
    retention_days: 365,
    description: 'Up to 10 workbenches. Investor view, high uploads, and full mapping labels.'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_inr: 20000,
    max_workbenches: 999,
    max_chat_sessions: 9999,
    retention_days: 9999,
    description: 'Custom workbench limits, dedicated support, and full feature access.'
  }
];

async function updatePlans() {
  console.log('Updating plans...');
  for (const plan of newPlans) {
    const { data, error } = await supabase
      .from('plans')
      .upsert(plan, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error updating plan ${plan.id}:`, error);
    } else {
      console.log(`Updated plan ${plan.id}`);
    }
  }
}

updatePlans();
