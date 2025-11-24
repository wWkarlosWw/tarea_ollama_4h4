const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000;

// CONTEXTO ACTUALIZADO PARA SITIO DE NOTICIAS
const CONTEXTO_NOTICIAS = `
Eres un asistente virtual especializado en noticias y periodismo digital.
Nombre del Medio: Informa Hoy
Tipo de Contenido: Portal de noticias nacionales e internacionales
Ubicación: Av. Libertador 456, Cochabamba, Bolivia
Teléfono: +591 4 1234567
Email: contacto@informahoy.com
Horario de Atención: Lunes a Viernes de 8:00 a 18:00, Sábados de 9:00 a 13:00

INFORMACIÓN DE LAS NOTICIAS DISPONIBLES EN LA BASE DE DATOS:
Las noticias se organizan en las siguientes categorías (basado en los datos existentes):
- Tecnología e Innovación
- Ciencia y Medio Ambiente
- Economía y Mercados
- Salud y Medicina
- Cultura y Sociedad
- Política y Gobierno
- Deportes
- Entretenimiento

SERVICIOS DEL MEDIO:
- Noticias actualizadas 24/7
- Análisis y reportajes especializados
- Newsletter diario
- Suscripciones premium
- Publicidad digital
- Reportajes corporativos

RESPONSABILIDADES DEL ASISTENTE:
1. Proporcionar información sobre las noticias publicadas
2. Ayudar a usuarios a encontrar noticias por categorías
3. Informar sobre servicios de suscripción y publicidad
4. Responder preguntas sobre el medio y su funcionamiento
5. Asistir en temas de periodismo y contenido digital

INSTRUCCIONES ESPECÍFICAS:
- Responde únicamente preguntas relacionadas con noticias, periodismo y servicios del medio
- Si la pregunta no es relevante al contexto de noticias, responde amablemente que solo puedes ayudar con temas periodísticos y de actualidad
- Mantén un tono profesional pero accesible
- Promueve la suscripción al newsletter cuando sea apropiado
- Destaca la credibilidad y actualidad de la información
`;

// Middleware para analizar el cuerpo de las peticiones JSON
app.use(bodyParser.json());
// Middleware para habilitar CORS (permite peticiones desde diferentes dominios)
app.use(cors());

// Configuración de la conexión a la base de datos MySQL
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "2004",
  database: "dbventas",
  port: "3306",
};

const dbConnection = mysql.createConnection(dbConfig);

// Conectar a la base de datos
dbConnection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conexión a la base de datos MySQL establecida");
});

// Función para obtener información actualizada de las noticias
const obtenerInformacionNoticias = () => {
  return new Promise((resolve, reject) => {
    const query = "SELECT nombre, descripcion FROM productos WHERE estado = 'A' LIMIT 10";
    dbConnection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

app.post("/ollama-prompt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Obtener información actualizada de las noticias
    let noticiasActuales = "";
    try {
      const noticias = await obtenerInformacionNoticias();
      noticiasActuales = "NOTICIAS ACTUALES DISPONIBLES:\n";
      noticias.forEach((noticia, index) => {
        noticiasActuales += `${index + 1}. ${noticia.nombre}: ${noticia.descripcion}\n`;
      });
    } catch (error) {
      console.error("Error al obtener noticias:", error);
      noticiasActuales = "Información de noticias temporalmente no disponible.\n";
    }

    const contextoCompleto = `${CONTEXTO_NOTICIAS}\n${noticiasActuales}\n\nPregunta del usuario: ${prompt}\n\nRespuesta:`;

    // Llamada a la API de Ollama (stream: true)
    const ollamaResponse = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "gemma3",
        prompt: contextoCompleto,
        stream: true,
      },
      { responseType: "stream" }
    );

    let result = "";
    ollamaResponse.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) result += json.response;
        } catch (e) {
          // Ignorar líneas que no sean JSON válidos
        }
      }
    });

    ollamaResponse.data.on("end", () => {
      res.json({ response: result.trim() });
    });

    ollamaResponse.data.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servicios existentes para contactos y productos (sin cambios)
app.post("/api/registro", (req, res) => {
  const { name, email, message } = req.body;
  console.log("Registro");
  console.log("Datos recibidos en el servidor como JSON:", req.body);

  if (!name || !email) {
    return res
      .status(400)
      .json({ error: "Nombre, email son campos requeridos." });
  }

  const query =
    "INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)";
  dbConnection.query(query, [name, email, message], (error, results) => {
    if (error) {
      console.error("Error al insertar datos en la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al guardar los datos en la base de datos." });
    }

    res.status(201).json({
      message: "Datos guardados correctamente.",
      id: results.insertId,
    });
  });
});

app.post("/api/save", (req, res) => {
  const { nombre, correo, mensaje } = req.body;
  console.log("Registro");
  console.log("Datos recibidos en el servidor como JSON:", req.body);

  if (!nombre || !correo) {
    return res
      .status(400)
      .json({ error: "Nombre, email son campos requeridos." });
  }
  console.log("Datos recibidos:", req.nombre, req.correo, req.mensaje);

  const query =
    "INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)";
  dbConnection.query(query, [nombre, correo, mensaje], (error, results) => {
    if (error) {
      console.error("Error al insertar datos en la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al guardar los datos en la base de datos." });
    }

    res.status(201).json({
      message: "Datos guardados correctamente.",
      id: results.insertId,
    });
  });
});

// Servicio para obtener todas las noticias (productos)
app.get("/api/productos", (req, res) => {
  const query = "SELECT * FROM productos";
  dbConnection.query(query, (error, results) => {
    if (error) {
      console.error("Error al obtener datos de la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener los datos de la base de datos." });
    }

    res.status(200).json(results);
  });
});

// Nuevo servicio para obtener noticias por categoría (basado en el nombre/descripción)
app.get("/api/noticias/categoria/:categoria", (req, res) => {
  const categoria = req.params.categoria;
  const query = "SELECT * FROM productos WHERE (nombre LIKE ? OR descripcion LIKE ?) AND estado = 'A'";
  const likeTerm = `%${categoria}%`;
  
  dbConnection.query(query, [likeTerm, likeTerm], (error, results) => {
    if (error) {
      console.error("Error al obtener noticias por categoría:", error);
      return res.status(500).json({ error: "Error al obtener las noticias." });
    }

    res.status(200).json(results);
  });
});

app.get("/", (req, res) => {
  res.send("¡Hola desde mi backend con Express!");
});

app.get("/servicio", (req, res) => {
  res.send("¡Hola desde mi backend con Express! Servicio");
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor Node.js escuchando en el puerto ${port}`);
});