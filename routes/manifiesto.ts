import { Router, Request, Response } from 'express';
import { Manifiesto } from '../models/manifiesto.model';

const manifiestoRoutes = Router();

manifiestoRoutes.post('/createManif', (req: Request,res: Response,next)=>{
        
    const formularioManif = {
        empresa: req.body.empresa,
        registro: req.body.registro,
        domicilio: req.body.domicilio
    }

    Manifiesto.create(formularioManif).then (formularioDB =>{
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
export default manifiestoRoutes;