// Script to check the actual structure of the student_profiles table
// Run with: node scripts/check-tables.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('Checking student_profiles table structure...');
    
    // Run raw SQL to get table structure
    const { data, error } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'student_profiles' 
          ORDER BY ordinal_position;
        `
      });
    
    if (error) {
      // RPC function might not exist, try direct query
      console.log('RPC not found, trying with direct query...');
      await executeDirectQuery();
    } else {
      console.log('Table structure for student_profiles:');
      console.table(data);
    }
    
    // Also check for cvs table to find the user_id field
    console.log('\nChecking cvs table structure for reference...');
    const { data: cvsData, error: cvsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'cvs' 
          ORDER BY ordinal_position;
        `
      });
    
    if (cvsError) {
      console.log('Could not check cvs table structure:', cvsError.message);
    } else {
      console.log('Table structure for cvs:');
      console.table(cvsData);
    }
    
  } catch (error) {
    console.error('Error checking table structure:', error.message);
    console.log('Trying direct SQL query...');
    await executeDirectQuery();
  }
}

async function executeDirectQuery() {
  try {
    // Create a list of tables
    const { data: tables, error: tablesError } = await supabase
      .from('_metadata')
      .select('table_name');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError.message);
      return;
    }
    
    console.log('Available tables:');
    console.table(tables || []);
    
    // Fetch a sample record to see the structure
    console.log('Fetching a sample student profile...');
    const { data: sampleProfile, error: sampleError } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample student profile:', sampleError.message);
    } else if (sampleProfile && sampleProfile.length > 0) {
      console.log('Sample student profile structure:');
      console.log(JSON.stringify(sampleProfile[0], null, 2));
    } else {
      console.log('No student profiles found in the database.');
    }
    
    // Fetch a sample CV record to see the structure
    console.log('\nFetching a sample CV...');
    const { data: sampleCV, error: cvError } = await supabase
      .from('cvs')
      .select('*')
      .limit(1);
    
    if (cvError) {
      console.error('Error fetching sample CV:', cvError.message);
    } else if (sampleCV && sampleCV.length > 0) {
      console.log('Sample CV structure:');
      console.log(JSON.stringify(sampleCV[0], null, 2));
    } else {
      console.log('No CVs found in the database.');
    }
  } catch (error) {
    console.error('Error in direct query:', error.message);
  }
}

main(); 