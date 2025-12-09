
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { sql } from '@vercel/postgres';

async function isSupervisorOrAdmin(username: string): Promise<boolean> {
    const { rows } = await sql`SELECT is_admin, is_supervisor FROM users WHERE username = ${username}`;
    return rows.length > 0 && (rows[0].is_admin || rows[0].is_supervisor);
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const action = (request.body?.action || request.query?.action) as string;
  const username = (request.body?.username || request.query?.username) as string;

  if (action) {
      if (!username) return response.status(401).json({ error: 'Auth required' });
      
      try {
        const { rows: uRows } = await sql`SELECT id FROM users WHERE username = ${username}`;
        if(uRows.length === 0) return response.status(401).json({error: 'User not found'});
        const userId = uRows[0].id;

        // --- SUPERVISOR READ ACTIONS ---
        if (request.method === 'GET') {
            if (action === 'get_drills') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`SELECT * FROM custom_drills ORDER BY created_at DESC`;
                return response.status(200).json(rows);
            }
            if (action === 'get_assignments_supervisor') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`
                    SELECT da.*, cd.title, u.username 
                    FROM drill_assignments da 
                    JOIN custom_drills cd ON da.drill_id = cd.id 
                    JOIN users u ON da.user_id = u.id 
                    ORDER BY da.id DESC
                `;
                return response.status(200).json(rows);
            }
            if (action === 'get_my_drills') {
                const { rows } = await sql`
                    SELECT da.*, cd.title, cd.scenario, cd.questions 
                    FROM drill_assignments da
                    JOIN custom_drills cd ON da.drill_id = cd.id
                    WHERE da.user_id = ${userId}
                    AND (cd.available_from IS NULL OR cd.available_from <= NOW())
                    AND (cd.available_until IS NULL OR cd.available_until >= NOW())
                    ORDER BY da.status ASC, cd.created_at DESC
                `;
                return response.status(200).json(rows);
            }
            if (action === 'get_users') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`SELECT id, username FROM users WHERE is_admin = FALSE AND is_supervisor = FALSE ORDER BY username ASC`;
                return response.status(200).json(rows);
            }
        }

        // --- SUPERVISOR WRITE ACTIONS ---
        if (request.method === 'POST') {
            if (action === 'create_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { title, scenario, questions, availableFrom, availableUntil } = request.body;
                
                await sql`
                    INSERT INTO custom_drills (title, scenario, questions, created_by, available_from, available_until, is_draft)
                    VALUES (${title}, ${scenario}, ${JSON.stringify(questions)}, ${userId}, ${availableFrom || null}, ${availableUntil || null}, FALSE)
                `;
                return response.status(200).json({ success: true });
            }

            if (action === 'assign_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { drillId, targetUsers } = request.body; 
                
                let userIds = [];
                if (targetUsers === 'ALL') {
                    const { rows } = await sql`SELECT id FROM users WHERE is_admin = FALSE AND is_supervisor = FALSE`;
                    userIds = rows.map(r => r.id);
                } else {
                    userIds = targetUsers;
                }

                for (const uid of userIds) {
                    await sql`
                        INSERT INTO drill_assignments (drill_id, user_id, status, score, max_score)
                        VALUES (${drillId}, ${uid}, 'PENDING', 0, 0)
                        ON CONFLICT (drill_id, user_id) DO NOTHING
                    `;
                }
                
                await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${userId}, ${username}, 'DRILL_ASSIGNED', ${`Assigned drill ${drillId} to ${targetUsers === 'ALL' ? 'ALL' : userIds.length + ' users'}`})`;

                return response.status(200).json({ success: true });
            }

            if (action === 'submit_drill') {
                const { assignmentId, score, maxScore, answers } = request.body;
                const { rows: check } = await sql`SELECT id FROM drill_assignments WHERE id = ${assignmentId} AND user_id = ${userId}`;
                if (check.length === 0) return response.status(403).json({ error: 'Not authorized' });

                await sql`
                    UPDATE drill_assignments 
                    SET status = 'COMPLETED', score = ${score}, max_score = ${maxScore}, completed_at = NOW(), answers = ${JSON.stringify(answers)}
                    WHERE id = ${assignmentId}
                `;
                
                await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${userId}, ${username}, 'DRILL_COMPLETED', ${`Completed assignment ${assignmentId} with score ${score}/${maxScore}`})`;

                return response.status(200).json({ success: true });
            }

            if (action === 'generate_ai_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                
                const prompt = `
                Eres un instructor experto en GMDSS y operaciones de Estaciones Costeras (CCR) de Salvamento Marítimo en España.
                Genera un simulacro de evaluación para un operador.

                **ENFOQUE CLARO Y DIRECTO:**
                Crea un escenario claro y sencillo enfocado en la aplicación correcta del protocolo estándar.
                Evita situaciones extremadamente complejas, múltiples fallos simultáneos o trampas rebuscadas. 
                El objetivo es evaluar si el operador conoce el procedimiento básico y correcto para situaciones como: recepción de alerta DSC, Mayday Relay, o comunicaciones de rutina/seguridad.

                **Contexto del Escenario:**
                Incluye detalles técnicos básicos: canales VHF/MF, frecuencias, MMSI ficticios, nombres de buques, posiciones geográficas.

                **Estructura de Preguntas:**
                Genera 4 preguntas que evalúen la toma de decisiones.
                Usa una mezcla de los siguientes tipos de preguntas:
                1. 'TEST': Pregunta de opción múltiple (A, B, C).
                2. 'ORDER': Ordenar una secuencia de pasos (ej: pasos para cancelar una falsa alerta).
                3. 'TEXT': Pregunta abierta breve (ej: "¿Qué fraseología usarías?").

                **Formato de Salida JSON:**
                {
                  "title": "Título descriptivo del caso",
                  "scenario": "Texto detallado del escenario...",
                  "questions": [
                    {
                      "type": "TEST", // o "ORDER" o "TEXT"
                      "questionText": "El texto de la pregunta",
                      "options": ["Opción 1", "Opción 2", "Opción 3"], // Requerido para TEST y ORDER. En ORDER, la IA debe devolver las opciones DESORDENADAS.
                      "correctAnswer": 0, // Para TEST: índice de la opción correcta. Para ORDER: array de índices en orden correcto [2, 0, 1]. Para TEXT: string con la respuesta esperada o palabras clave.
                      "feedback": "Explicación breve."
                    }
                  ]
                }
                `;
                
                const responseAI = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
                
                return response.status(200).json(JSON.parse(responseAI.text || '{}'));
            }
        }
        return response.status(400).json({ error: 'Invalid action' });
      } catch (e) {
          console.error(e);
          return response.status(500).json({ error: 'Internal Error' });
      }
  }
}
