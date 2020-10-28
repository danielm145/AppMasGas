import { Router, Request, Response } from 'express';
import { Bitacora } from '../models/bitacora.model';

const bitacoraRoutes = Router();

bitacoraRoutes.post('/createBit', (req: Request,res: Response,next)=>{
        
    const formularioBit = {
        nombre: req.body.nombre,
        fecha: req.body.fecha,
        proyecto: req.body.proyecto
    }

    Bitacora.create(formularioBit).then (formularioDB =>{
        try{
            res.json({ // esta es la respuesta que le voy a mandar al navegador si se logra crear el item radiacion de la BD
                ok:"true",
                formularioDB
             });
        }catch(err){
            next(err); // genera el error con un response
        }
    })

    
})
export default bitacoraRoutes;