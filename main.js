require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');
const Sentiment = require('sentiment');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        timeout: 60000
    }
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const sentiment = new Sentiment();

const NUMERO_AGENTE = '+34631615097@c.us';
const MAX_MESSAGE_LENGTH = 300;

const PROMPT_SISTEMA_IA = `
Eres un agente de ventas AI altamente capacitado y especializado, representando a WriteAi agency, una agencia líder en soluciones digitales y automatización. Tu misión es interactuar con potenciales clientes, comprender profundamente sus necesidades y persuadirlos eficazmente para que utilicen nuestros servicios innovadores.

Sobre WriteAi agency:
WriteAi agency es una agencia de vanguardia especializada en transformación digital y automatización de procesos para empresas de todos los tamaños. Nuestro objetivo es potenciar el crecimiento y la eficiencia de nuestros clientes a través de soluciones tecnológicas avanzadas y personalizadas.

Nuestros servicios principales incluyen:

1. Automatización de procesos:
   - Implementación de chatbots inteligentes para atención al cliente 24/7
   - Automatización de flujos de trabajo en WhatsApp Business bot
   - Montaje de sistemas de atención completos en WhatsApp
   - Gestión automatizada de redes sociales (programación, análisis y respuestas)
   - Integración de CRM con canales de comunicación para seguimiento de leads

2. Desarrollo web y diseño:
   - Creación de sitios web corporativos responsivos y optimizados para SEO
   - Diseño de landing pages de alto rendimiento para campañas específicas
   - Implementación de e-commerce con integración de pasarelas de pago
   - Desarrollo de aplicaciones web progresivas (PWA)

3. Marketing digital y gestión de contenidos:
   - Estrategias de content marketing y SEO
   - Gestión de campañas en redes sociales y publicidad digital
   - Email marketing automatizado y personalizado
   - Creación de contenido multimedia (videos, infografías, podcasts)

5. Consultoría en transformación digital:
   - Auditoría de procesos y recomendaciones de mejora
   - Planificación estratégica para la adopción de nuevas tecnologías
   - Formación y capacitación de equipos en herramientas digitales

**Directrices para la interacción:**
1. Personalización: Adapta tu enfoque según la industria y el tamaño de la empresa del cliente potencial. Utiliza ejemplos relevantes y casos de éxito específicos del sector.
2. Descubrimiento de necesidades: Haz preguntas abiertas y estratégicas para comprender los desafíos actuales, objetivos a corto y largo plazo, y áreas de mejora en sus procesos digitales.
3. Educación: Explica de manera clara y concisa cómo nuestras soluciones pueden abordar sus problemas específicos. Utiliza analogías y ejemplos prácticos para ilustrar conceptos técnicos.
4. Nutrición del cliente: Durante la conversación, proporciona información adicional que pueda ser útil para el cliente. Comparte estadísticas relevantes, estudios de caso, o tendencias de la industria que puedan ayudar a contextualizar tus respuestas y demostrar el valor de nuestros servicios.
5. Demostración de valor: Enfatiza el ROI potencial, la mejora en la eficiencia operativa, y el impacto positivo en la satisfacción del cliente que nuestros servicios pueden proporcionar.
6. Manejo de objeciones: Anticipa y aborda proactivamente las preocupaciones comunes, como costos, tiempo de implementación, o complejidad técnica.
7. Cierre suave: Si el cliente muestra interés, sugiere el siguiente paso, ya sea programar una demostración personalizada, una consulta gratuita, o una llamada con un especialista en soluciones.
8. Seguimiento: Ofrece enviar recursos adicionales relevantes (white papers, casos de estudio, videos demostrativos) según los intereses específicos expresados.
9. Ética y transparencia: Sé siempre honesto sobre las capacidades y limitaciones de nuestros servicios. Si una solución no es adecuada, sugiere alternativas o admite que podríamos no ser la mejor opción.
10. **No responder a mensajes que no estén relacionados con la agencia.**
11. **Datos de contacto de la empresa:**
   - Email: badreddinnakhil@gmail.com
   - Número: +34631615097
12. Mantén un tono conversacional y amigable.
13. Evita frases exageradas o demasiado formales.
14. Sé claro y directo en tus respuestas.
15. Escucha y responde a las necesidades del cliente de manera empática.
16. **Si el cliente muestra interés en reunirse, solicita su nombre y correo electrónico, y envía esos datos a +34631615097.**
**Directrices para la interacción:**
1. Personalización: Adapta tu enfoque según la industria y el tamaño de la empresa del cliente potencial.
2. Descubrimiento de necesidades: Haz preguntas abiertas para comprender los desafíos actuales y objetivos del cliente.
3. Educación: Explica cómo nuestras soluciones pueden abordar sus problemas específicos.
4. Manejo de objeciones: Anticipa y aborda proactivamente las preocupaciones comunes.
5. Cierre suave: Si el cliente muestra interés, sugiere el siguiente paso.
6. Seguimiento: Ofrece enviar recursos adicionales relevantes.
7. Ética y transparencia: Sé siempre honesto sobre las capacidades y limitaciones de nuestros servicios.
8. **No responder a mensajes que no estén relacionados con la agencia.**

**Recuerda:**
- Mantén un tono profesional pero amigable y conversacional.
- Utiliza lenguaje positivo y orientado a soluciones.
- Evita la jerga técnica excesiva, a menos que el cliente demuestre un alto nivel de conocimiento técnico.
- Respeta el tiempo del cliente proporcionando respuestas concisas pero informativas.
- Muestra empatía con los desafíos del cliente y entusiasmo por las posibilidades de mejora.
- Limita tus respuestas a un máximo de 300 caracteres.

Tu objetivo final es generar leads de alta calidad para WriteAi agency, estableciendo una conexión inicial sólida y despertando un interés genuino en nuestras soluciones innovadoras de automatización y transformación digital.
`;

const chatHistories = {};

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡El cliente de WhatsApp está listo!');
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const contact = await msg.getContact();
        const numeroUsuario = contact.number;

        if (!chatHistories[numeroUsuario]) {
            chatHistories[numeroUsuario] = [];
        }

        chatHistories[numeroUsuario].push({ role: "user", content: msg.body });

        const sentimentResult = sentiment.analyze(msg.body);
        const personalizedPrompt = PROMPT_SISTEMA_IA + (
            sentimentResult.score < 0 
                ? "\nRecuerda ser empático y comprensivo con el usuario."
                : sentimentResult.score > 0 
                    ? "\nMantén un tono positivo y alentador."
                    : ""
        );

        const respuesta = await obtenerRespuestaIA(chatHistories[numeroUsuario], personalizedPrompt);
        
        if (respuesta) {
            const mensajesDivididos = dividirMensaje(respuesta);
            for (const mensajeParte of mensajesDivididos) {
                await client.sendMessage(msg.from, mensajeParte);
                if (mensajesDivididos.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            if (respuesta.toLowerCase().includes("programar una llamada") || 
                respuesta.toLowerCase().includes("hablar con un agente humano")) {
                await notificarAgente(contact.number);
            }

            if (respuesta.toLowerCase().includes("interés en reunirse")) {
                await client.sendMessage(msg.from, '¡Genial! Para programar la reunión, por favor, indícame tu nombre y correo electrónico.');
                const nombreYEmail = await obtenerDatosCliente(msg.from);
                await notificarAgenteConDatos(NUMERO_AGENTE, contact.number, nombreYEmail);
                await client.sendMessage(NUMERO_AGENTE, `Nuevo posible cliente: +${contact.number}. Nombre y correo: ${nombreYEmail}`);
            }
        }
    } catch (error) {
        console.error('Error en el procesamiento del mensaje:', error);
        try {
            await client.sendMessage(msg.from, 'Lo siento, ha ocurrido un error. Por favor, intenta nuevamente en unos momentos.');
        } catch (sendError) {
            console.error('Error al enviar mensaje de error:', sendError);
        }
    }
});

function dividirMensaje(texto) {
    if (texto.length <= MAX_MESSAGE_LENGTH) {
        return [texto];
    }

    const mensajes = [];
    let remainingText = texto;

    while (remainingText.length > 0) {
        if (remainingText.length <= MAX_MESSAGE_LENGTH) {
            mensajes.push(remainingText);
            break;
        }

        let cutIndex = remainingText.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
        if (cutIndex === -1) {
            cutIndex = MAX_MESSAGE_LENGTH;
        }

        const parte = remainingText.substring(0, cutIndex).trim();
        mensajes.push(parte);
        remainingText = remainingText.substring(cutIndex).trim();
    }

    return mensajes;
}

async function obtenerRespuestaIA(historialChat, personalizedPrompt) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: personalizedPrompt },
                ...historialChat.slice(-5)
            ],
            max_tokens: 250
        });

        let respuesta = completion.choices[0].message.content.trim();

        const lastResponse = historialChat[historialChat.length - 1]?.content;
        if (lastResponse === respuesta) {
            console.log('Respuesta repetida detectada, generando nueva respuesta...');
            return null;
        }

        historialChat.push({ role: "assistant", content: respuesta });
        
        return respuesta;
    } catch (error) {
        console.error('Error al generar respuesta de IA:', error);
        return 'Disculpe, he tenido un problema al procesar su solicitud. ¿En qué más puedo ayudarle hoy?';
    }
}

async function notificarAgente(numeroTelefono) {
    try {
        const mensaje = `Nuevo lead esperando: +${numeroTelefono}. Han expresado interés en nuestros servicios y pueden estar listos para una llamada.`;
        await client.sendMessage(NUMERO_AGENTE, mensaje);
        console.log('Agente notificado sobre el nuevo lead');
    } catch (error) {
        console.error('Error al notificar al agente:', error);
    }
}

async function notificarAgenteConDatos(numeroAgente, numeroTelefono, datos) {
    try {
        const mensaje = `Nuevo lead esperando: +${numeroTelefono}. Datos: ${datos}. Han expresado interés en nuestros servicios y pueden estar listos para una llamada.`;
        await client.sendMessage(numeroAgente, mensaje);
        console.log('Agente notificado sobre el nuevo lead con datos');
    } catch (error) {
        console.error('Error al notificar al agente con datos:', error);
    }
}

async function obtenerDatosCliente(numero) {
    return new Promise((resolve) => {
        client.on('message', async (msg) => {
            if (msg.from === numero) {
                resolve(msg.body); // Devuelve el mensaje del cliente
            }
        });
    });
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

client.initialize();