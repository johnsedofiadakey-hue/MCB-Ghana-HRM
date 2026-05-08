const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const token = jwt.sign(
  {
    id: '2f7d6bc8-e294-4b88-bcfe-79fd77214bc7',
    role: 'IT_MANAGER',
    name: 'Edward',
    organizationId: 'mcb-ghana-tenant',
    isDemo: false
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function testUpdate() {
  try {
    const targetId = 'dcd1ea68-df6c-4b0a-9cdf-cd4959cc524e'; // Staff

    const updatePayload = {
        "fullName": "Selasi Doe",
        "email": "selasi.doe@mcb-ghana.com",
        "password": "",
        "role": "STAFF",
        "jobTitle": "Accountant",
        "departmentId": null,
        "subUnitId": "",
        "supervisorId": "",
        "secondarySupervisorId": "",
        "employmentType": "Permanent",
        "gender": "",
        "education": "",
        "contactNumber": "+233240000004",
        "employeeCode": "MCB-FIN-378",
        "joinDate": "",
        "salary": "",
        "currency": "GHS",
        "nationalId": "",
        "address": "",
        "dob": "",
        "bankAccountNumber": "",
        "bankName": "",
        "bankBranch": "",
        "ssnitNumber": "",
        "nationality": "",
        "countryOfOrigin": "",
        "maritalStatus": "",
        "emergencyContactName": "",
        "emergencyContactPhone": "",
        "nextOfKinName": "",
        "nextOfKinRelation": "",
        "nextOfKinContact": "",
        "certifications": [],
        "biometricId": ""
    };

    const updateRes = await fetch(`http://localhost:10000/api/employees/${targetId}`, {
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
        console.log('Update Successful!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpdate();
