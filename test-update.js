async function testUpdate() {
  try {
    // 1. Login as Eddie Murphey
    const loginRes = await fetch('https://mcb-ghana-hrm-api.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'eddie.murphey@mcb-ghana.com',
        password: 'SecureInit!'
      })
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in successfully. Token:', token.substring(0, 20) + '...');

    // 2. Fetch Eddie Murphey's ID
    const usersRes = await fetch('https://mcb-ghana-hrm-api.onrender.com/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await usersRes.json();
    const eddie = users.find(u => u.email === 'eddie.murphey@mcb-ghana.com');
    if (!eddie) {
        console.log('Could not find Eddie Murphey in employee list.');
        return;
    }
    console.log('Eddie Murphey ID:', eddie.id);

    // 3. Fetch full profile
    const fullProfileRes = await fetch(`https://mcb-ghana-hrm-api.onrender.com/api/employees/${eddie.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const fullProfile = await fullProfileRes.json();
    console.log('Fetched full profile. Role:', fullProfile.role);

    // 4. Try to update profile (just send it back)
    const updatePayload = {
      ...fullProfile,
      password: '',
      contactNumber: '+233240000001' // minor change
    };

    console.log('Attempting update...');
    const updateRes = await fetch(`https://mcb-ghana-hrm-api.onrender.com/api/employees/${eddie.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
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
    console.error('Network Error:', error.message);
  }
}

testUpdate();
