export async function checkAndImproveGrammar(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  try {
    const response = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        language: 'en-US',
      }),
    });

    if (!response.ok) {
      console.error('LanguageTool API error:', response.statusText);
      return text;
    }

    const data = await response.json();
    
    if (!data.matches || data.matches.length === 0) {
      return text;
    }

    // Sort matches in descending order by offset so replacements don't shift subsequent offsets
    const matches = data.matches.sort((a: any, b: any) => b.offset - a.offset);
    
    let correctedText = text;
    
    for (const match of matches) {
      if (match.replacements && match.replacements.length > 0) {
        const replacement = match.replacements[0].value;
        correctedText = 
          correctedText.substring(0, match.offset) + 
          replacement + 
          correctedText.substring(match.offset + match.length);
      }
    }

    return correctedText;
  } catch (error) {
    console.error('Failed to check grammar:', error);
    return text;
  }
}
