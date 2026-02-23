const fs = require('fs');
const path = require('path');

const files = [
    "src/app/terminos/page.tsx",
    "src/app/privacidad/page.tsx",
    "src/app/planes/page.tsx",
    "src/app/nosotros/page.tsx",
    "src/app/loading.tsx",
    "src/app/auth/loading.tsx",
    "src/app/auth/layout.tsx",
    "src/components/layout/dashboard-layout.tsx",
    "src/app/dashboard/products/loading.tsx",
    "src/app/dashboard/products/new/loading.tsx",
    "src/app/dashboard/products/[id]/edit/loading.tsx",
    "src/app/dashboard/layout.tsx",
    "src/app/contacto/page.tsx",
    "src/app/dashboard/loading.tsx"
];

files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/<main/g, '<div').replace(/<\/main>/g, '</div>');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`Not found: ${file}`);
    }
});
