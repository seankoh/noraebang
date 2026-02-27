function parseLRC(rawText) {
  const lineRegex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
  const result = [];

  for (const line of rawText.split('\n')) {
    const match = line.trim().match(lineRegex);
    if (!match) continue;
    const [, mm, ss, ms, text] = match;
    const time = parseInt(mm) * 60
               + parseInt(ss)
               + parseInt(ms) / (ms.length === 3 ? 1000 : 100);
    if (text.trim()) result.push({ time, text: text.trim() });
  }

  return result.sort((a, b) => a.time - b.time);
}
