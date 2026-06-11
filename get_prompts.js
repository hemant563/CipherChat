const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\heman\\.gemini\\antigravity-ide\\brain\\5ade1ceb-8eb7-4eba-a7e7-d9b5c1ee43da\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const j = JSON.parse(line);
      if (j.type === 'USER_INPUT' || j.source === 'USER_EXPLICIT' || j.source === 'USER') {
        const content = typeof j.content === 'string' ? j.content : JSON.stringify(j.content);
        if (content.trim()) {
          console.log("PROMPT: " + content.trim().replace(/\n/g, " "));
        }
      }
    } catch(e) {}
  }
}

processLineByLine();
