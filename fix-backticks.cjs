const fs = require('fs');

['src/views/AdminView.ts', 'src/views/ApplicantView.ts', 'src/views/Modals.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove backslash before backtick
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
