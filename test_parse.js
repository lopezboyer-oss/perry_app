const fs = require('fs');
const Papa = require('papaparse');

const content = fs.readFileSync('CONTACTOS.CSV', 'utf8');

Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          console.log("Error leyendo el archivo CSV. Revisa el formato.", results.errors);
          return;
        }

        // Mapear Odoo columns de forma inteligente para ignorar problemas de codificación UTF-8 (ej. COMPAA)
        let errorThrown = null;
        try {
        const mappedData = results.data.map((row) => {
          const keys = Object.keys(row);
          const getVal = (keywords) => {
            const key = keys.find(k => keywords.some(kw => k.toUpperCase().includes(kw)));
            return key ? row[key] : '';
          };
          
          const name = getVal(['NAME', 'NOMBRE', 'CONTACT', 'CONTACTO']);
          const companyName = getVal(['COMPAN', 'COMPA', 'CLIENTE']); // Atrapa 'COMPAÑIA', 'COMPAA', 'COMPANY', 'COMPAA'
          const position = getVal(['JOB', 'PUESTO', 'CARGO', 'POSITION']);
          const email = getVal(['EMAIL', 'CORREO']);
          const phone = getVal(['PHONE', 'TELEF', 'MOBILE', 'MOVIL']);
          
          return {
            name: String(name).trim(),
            companyName: String(companyName).trim(),
            position: String(position).trim(),
            email: String(email).trim(),
            phone: String(phone).trim(),
            notes: 'Importado de CSV Odoo'
          };
        }).filter(item => item.name.length > 0 && item.companyName.length > 0);
        console.log("MAPPED DATA LENGTH", mappedData.length);
        console.log("FIRST ROW", mappedData[0]);
        } catch (e) {
           console.error("MAPPING ERR", e);
        }
      }
    });
