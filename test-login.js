// Using built-in fetch in Node.js 18+

async function testLogin() {
  try {
    const response = await fetch('http://localhost:8000/api/parents/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: '8956239856',
        password: 'parent123'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
