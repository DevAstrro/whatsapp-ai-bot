require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// VERIFY WEBHOOK
app.get('/webhook', (req, res) => {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {

        console.log('Webhook verified');

        return res.status(200).send(challenge);
    }

    res.sendStatus(403);
});

// RECEIVE MESSAGES
app.post('/webhook', async (req, res) => {

    try {

        const body = req.body;

        if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages
        ) {

            const msg =
                body.entry[0].changes[0].value.messages[0];

            const from = msg.from;

            const text =
                msg.text?.body || '';

            console.log('Customer:', text);

            // GROQ AI REQUEST
            const groqResponse = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',

                    messages: [

                        {
                            role: 'system',

                            content: `
You are the official AI customer support assistant for Intact IT Services.

Your job is to professionally help customers with questions regarding the company, services, pricing inquiries, support, and business guidance.

ABOUT THE COMPANY:
Intact IT Services is a professional technology firm that provides digital and business solutions.

SERVICES PROVIDED:
- Web Development
- Software Development
- Mobile App Development
- Digital Marketing
- SEO
- Branding
- Social Media Management
- Business IT Solutions
- Ongoing Technical Support
- Website Maintenance

COMPANY APPROACH:
- Client-focused
- Customized solutions
- Affordable scalable systems
- Modern secure technologies
- Responsive mobile-friendly development

TARGET CLIENTS:
- Startups
- Small businesses
- Medium-sized businesses

YOUR BEHAVIOR:
- Be professional and friendly
- Answer clearly and confidently
- Keep replies concise but useful
- Act like a real customer support executive
- Encourage clients to discuss projects
- If user asks pricing, say pricing depends on project requirements
- If user asks unrelated harmful/offensive questions, politely refuse
- Never say you are an AI language model
- Always represent Intact IT Services professionally

IF SOMEONE ASKS CONTACT:
Say:
"Please contact Intact IT Services directly through the official website or business contact channels for detailed discussions and quotations."

IF SOMEONE ASKS WHAT THE COMPANY DOES:
Explain the company's digital solutions and business services professionally.

`
                        },

                        {
                            role: 'user',
                            content: text
                        }

                    ],

                    temperature: 0.7,
                    max_tokens: 700
                },

                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const reply =
                groqResponse.data.choices[0].message.content;

            console.log('Bot Reply:', reply);

            // SEND WHATSAPP MESSAGE
            await axios.post(
                `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,

                {
                    messaging_product: 'whatsapp',

                    to: from,

                    text: {
                        body: reply
                    }
                },

                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

        }

        res.sendStatus(200);

    } catch (err) {

        console.log(
            'ERROR:',
            err.response?.data || err.message
        );

        res.sendStatus(500);
    }
});

// START SERVER
app.listen(3000, () => {

    console.log('Intact IT Services Bot Running On Port 3000');

});
