const fs = require('fs');
const files = {
  'Chat_Dashboard.html': 'src/app/pages/chat-dashboard/chat-dashboard.html',
  'Profile___Settings.html': 'src/app/pages/profile-settings/profile-settings.html',
  'Explore_Communities.html': 'src/app/pages/explore-communities/explore-communities.html',
  'Calls_Dashboard.html': 'src/app/pages/calls-dashboard/calls-dashboard.html',
  'ChatSphere_Landing_Page.html': 'src/app/pages/landing-page/landing-page.html'
};

let sidebarExtracted = false;

for (let [src, dest] of Object.entries(files)) {
  const html = fs.readFileSync('stitch-html/' + src, 'utf8');
  let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<script/i);
  if(!bodyMatch) bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) continue;
  let content = bodyMatch[1].trim();

  if (!sidebarExtracted) {
    const sidebarMatch = content.match(/(<aside[\s\S]*?<\/aside>)/i);
    if (sidebarMatch) {
       let layoutHtml = `<div class="flex h-screen w-full font-body-md text-on-surface bg-background overflow-hidden">\n${sidebarMatch[1]}\n<div class="flex-grow flex flex-col relative h-full bg-surface-white"><router-outlet></router-outlet></div>\n</div>`;
       fs.writeFileSync('src/app/layout/app-layout/app-layout.html', layoutHtml);
       sidebarExtracted = true;
    }
  }

  // Remove the aside
  content = content.replace(/(<aside[\s\S]*?<\/aside>)/i, '');
  // Remove the wrapper div flex h-screen
  content = content.replace(/<div class="flex h-screen w-full">/i, '');
  // Remove the trailing div
  content = content.replace(/<\/div>\s*$/i, ''); 
  
  fs.writeFileSync(dest, content.trim());
  console.log('Processed', src);
}

fs.writeFileSync('src/app/app.component.html', '<app-layout></app-layout>');
