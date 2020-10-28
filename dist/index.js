"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./classes/server"));
const mongoose_1 = __importDefault(require("mongoose"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const guiaRemision_1 = __importDefault(require("./routes/guiaRemision"));
const manifiesto_1 = __importDefault(require("./routes/manifiesto"));
const bitacora_1 = __importDefault(require("./routes/bitacora"));
const server = new server_1.default();
//El Middleware es una funcion que se ejecuta antes que otras
//Body Parser viene siendo un middleware que procesa los post para nuestro caso 
server.app.use(body_parser_1.default.urlencoded({ extended: true }));
// con el urlencoded voy a recibir peticiones en formato x-www-form-encoded son las que se usa comunmente para enviar inf de angular
server.app.use(body_parser_1.default.json()); // recibir los posteos en formato json
// Configuracion CORS
server.app.use(cors_1.default({ origin: true, credentials: true }));
// CORS añade funcionalidades nuevas a las peticiones AJAX como las peticiones entre dominios (cross-site), eventos de progreso y envio de datos binarios.
// Rutas de mi app
server.app.use('/api', guiaRemision_1.default);
server.app.use('/api', manifiesto_1.default);
server.app.use('/api', bitacora_1.default);
// Conectar Base de Datos
// mongodb+srv://DanielMartinez:17185864131498aP@cluster0.7273l.mongodb.net/<dbname>?retryWrites=true&w=majority
mongoose_1.default.connect('mongodb+srv://DanielMartinez:17185864131498aP@cluster0.7273l.mongodb.net/Formularios?retryWrites=true&w=majority', { useNewUrlParser: true, useCreateIndex: true }, (err) => {
    if (err)
        throw err;
    console.log('Base de datos CONECTADAA !!!');
});
// mongoose.connect('mongodb+srv://Ian:2078389epn@cluster0-ru9rg.mongodb.net/mapa?retryWrites=true&w=majority' || 'mongodb://localhost',
//                 {useNewUrlParser: true, useCreateIndex: true},(err)=>{ //trabajamos con los indices
//                     if (err) throw err;
//                     console.log('Base de datos OnLine no se cayo..!!!')
//                 });       
// Levantar express
server.start();
