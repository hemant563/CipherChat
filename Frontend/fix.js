const fs = require('fs');

const src = 'Chat_Dashboard.html';
const dest = 'src/app/pages/chat-dashboard/chat-dashboard.html';

const html = fs.readFileSync('stitch-html/' + src, 'utf8');
let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  let content = bodyMatch[1].trim();

  // Remove Sidebar
  content = content.replace(/(<aside[\s\S]*?<\/aside>)/i, '');
  // Remove flex wrapper
  content = content.replace(/<div class="flex h-screen w-full">/i, '');

  // Split by lines, remove the last </div>
  let lines = content.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('</div>')) {
       lines[i] = lines[i].replace('</div>', '');
       break;
    }
  }
  content = lines.join('\n').trim();
  fs.writeFileSync(dest, content);
}
