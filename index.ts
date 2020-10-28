import Server from './classes/server';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import guiaRoutes from './routes/guiaRemision';
import manifiestoRoutes from './routes/manifiesto';
import bitacoraRoutes from './routes/bitacora';

const server = new Server();

//El Middleware es una funcion que se ejecuta antes que otras
//Body Parser viene siendo un middleware que procesa los post para nuestro caso 
server.app.use(bodyParser.urlencoded({extended: true})); 
// con el urlencoded voy a recibir peticiones en formato x-www-form-encoded son las que se usa comunmente para enviar inf de angular
server.app.use(bodyParser.json()); // recibir los posteos en formato json

// Configuracion CORS
server.app.use(cors({origin: true, credentials: true}));
// CORS añade funcionalidades nuevas a las peticiones AJAX como las peticiones entre dominios (cross-site), eventos de progreso y envio de datos binarios.



// Rutas de mi app
server.app.use('/api',guiaRoutes);
server.app.use('/api',manifiestoRoutes);
server.app.use('/api',bitacoraRoutes);

// Conectar Base de Datos
// mongodb+srv://DanielMartinez:17185864131498aP@cluster0.7273l.mongodb.net/<dbname>?retryWrites=true&w=majority
mongoose.connect('mongodb+srv://DanielMartinez:17185864131498aP@cluster0.7273l.mongodb.net/Formularios?retryWrites=true&w=majority',
                {useNewUrlParser:true, useCreateIndex:true}, (err)=>{
                    if(err) throw err;
                    console.log('Base de datos CONECTADAA !!!');
                })

// mongoose.connect('mongodb+srv://Ian:2078389epn@cluster0-ru9rg.mongodb.net/mapa?retryWrites=true&w=majority' || 'mongodb://localhost',
//                 {useNewUrlParser: true, useCreateIndex: true},(err)=>{ //trabajamos con los indices
//                     if (err) throw err;
//                     console.log('Base de datos OnLine no se cayo..!!!')
//                 });       
// Levantar express
server.start();