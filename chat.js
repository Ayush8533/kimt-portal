// =============================================
// routes/chat.js — AI-powered chatbot via Claude
// =============================================
const express = require('express');
const router = express.Router();

// KIMT college context for the AI
const KIMT_SYSTEM_PROMPT = `You are the official KIMT (Krishna Institute of Management and Technology) Assistant for the college website. You answer student and parent queries helpfully and concisely.

Key facts about KIMT:
- Full name: Krishna Institute of Management and Technology (KIMT)
- Established: 2020 under Krishna Welfare Educational Society (KWES)
- Location: Aonla–Sirauli Road, Near Vishanpuri Bagiya Churaha, Sona, Sirauli, Bareilly (UP) - 243303
- About 25 KM from Bareilly on the Aonla–Moradabad–Delhi route
- Phone: +91 9084147587
- Email: kimtiinfo@gmail.com
- Office Hours: Mon–Fri 9 AM–5 PM, Saturday 9 AM–2 PM
- 100+ courses across: Commerce & Management (B.Com, BBA, MBA), Humanities & Social Science (BA, MA, BSW), Science (BSc, MSc), Engineering & Technology (BCA, MCA, B.Tech), ParaMedical Science, Vocational Education, Library & Information Science, Agriculture Science
- Placement: 95% placement support with dedicated placement cell
- Admissions: Online or offline application → document verification → fee payment
- Scholarships available for meritorious students
- Fee installment facility available, no hidden charges
- First college in the region to pioneer Online Education
- Campus: lush green campus, smart classrooms, central library, modern labs, sports facilities, health services, transportation

Response style:
- Be warm, helpful, and professional
- Keep answers concise (2–4 sentences unless more detail is needed)
- When asked about specific fees, say fees vary by course and ask them to call +91 9084147587
- For admission process, encourage them to use the Apply Now form or WhatsApp
- Reply in the same language the user writes in (Hindi or English)
- If someone writes in Hindi/Hinglish, respond in Hindi/Hinglish
- End with a helpful next step when relevant`;

router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long. Please keep it under 500 characters.' });
    }

    // Build conversation history (max last 10 messages for context)
    const recentHistory = history.slice(-10).map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content
    }));

    const messages = [
      ...recentHistory,
      { role: 'user', content: message.trim() }
    ];

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: KIMT_SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(502).json({
        error: 'AI service temporarily unavailable.',
        fallback: 'Please call us at +91 9084147587 or WhatsApp for immediate help.'
      });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response. Please contact us directly at +91 9084147587.';

    res.json({ reply });

  } catch (err) {
    console.error('Chat route error:', err.message);
    res.status(500).json({
      error: 'Chat service error.',
      fallback: 'Please contact us at +91 9084147587 or kimtiinfo@gmail.com'
    });
  }
});

module.exports = router;
