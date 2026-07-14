require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error: e1 } = await supabase.from('system_settings').upsert({
    key: 'group_name',
    value: 'EvergreenGroup'
  });
  if (e1) console.error("Error inserting group_name", e1);

  const { error: e2 } = await supabase.from('system_settings').upsert({
    key: 'sinhala_map',
    value: JSON.stringify({
      "DAC-3978": "උතුරු පිටිගල",
      "DAF-2360": "නාවක්කඩ",
      "DAI-2822": "මාපලගම",
      "JL-6292": "කහදූව",
      "PR-3677": "තිබ්බටුවාව",
      "PS-2215": "කුරුදුගහ",
      "LF-1250": "Estate Bolero",
      "LB-3400": "Estate Lorry",
      "NE-3863": "Bus",
      "PF-3549": "Labour Transport (JMC)",
      "LO-8301": "Dispatch Lorry",
      "DAH-8017": "බද්දේගම",
      "PS-2986": "මඩකඩහේන",
      "DAG-8800": "නාගොඩ"
    })
  });
  if (e2) console.error("Error inserting sinhala_map", e2);

  console.log("Migration applied successfully!");
}

run();
