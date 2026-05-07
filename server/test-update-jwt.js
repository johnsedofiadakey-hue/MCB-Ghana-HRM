const jwt = require('jsonwebtoken');

// From server/.env
const JWT_SECRET = process.env.JWT_SECRET || 'mcb-ghana-super-secret-key-2026';

const token = jwt.sign(
  {
    id: 'f32c32cf-52f2-4ed7-94d0-55e142340ebc', // Eddie Murphey's ID (we can query it or just grab it)
    role: 'MANAGING DIRECTOR',
    name: 'Eddie Murphey',
    organizationId: 'mcb-ghana-tenant',
    isDemo: false
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function testUpdate() {
  try {
    console.log('Using Token:', token.substring(0, 20) + '...');

    // 2. Fetch all to get Eddie's ID dynamically
    const usersRes = await fetch('https://mcb-ghana-hrm-api.onrender.com/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!usersRes.ok) throw new Error(`Users fetch failed: ${usersRes.status} ${await usersRes.text()}`);
    const users = await usersRes.json();
    const eddie = users.find(u => u.email === 'eddie.murphey@mcb-ghana.com');
    if (!eddie) {
        console.log('Could not find Eddie Murphey in employee list.');
        return;
    }
    console.log('Eddie Murphey ID:', eddie.id);

    // generate correct token now that we have ID
    const realToken = jwt.sign(
      { id: eddie.id, role: 'MANAGING DIRECTOR', name: 'Eddie Murphey', organizationId: 'mcb-ghana-tenant', isDemo: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Fetch full profile
    const fullProfileRes = await fetch(`https://mcb-ghana-hrm-api.onrender.com/api/employees/${eddie.id}`, {
      headers: { Authorization: `Bearer ${realToken}` }
    });
    
    const fullProfile = await fullProfileRes.json();
    console.log('Fetched full profile. Role:', fullProfile.role);

    // 4. Try to update profile
    const updatePayload = {
      ...fullProfile,
      password: '',
      contactNumber: '+233240000002'
    };

    console.log('Attempting update...');
    const updateRes = await fetch(`https://mcb-ghana-hrm-api.onrender.com/api/employees/${eddie.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${realToken}` 
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('Update Failed! Status:', updateRes.status);
        console.error('Error Data:', errText);
    } else {
        const updateData = await updateRes.json();
        console.log('Update Successful! Contact:', updateData.contactNumber);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpdate();
