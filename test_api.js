const http = require('http');

function post(data) {
    const postData = JSON.stringify(data);
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/tasks',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Body: ${responseData}`);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

console.log('--- Test 1: Invalid Task (No Due Date) ---');
post({ title: "Invalid Task" });

setTimeout(() => {
    console.log('\n--- Test 2: Valid Task (With Due Date) ---');
    post({ title: "Valid Task", dueAt: new Date().toISOString() });
}, 1000);
