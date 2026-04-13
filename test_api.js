const http = require('http');

const data = JSON.stringify({
  contacts: [
    {
      name: 'ALEXIS CAMPOS',
      companyName: 'TMMBC',
      position: '',
      email: 'angel.campos@toyota.com',
      phone: '+52 664 491 6444',
      notes: 'Importado de CSV Odoo'
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/contactos/import',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
