import { Router, Request, Response } from 'express';
import { GRemision } from '../models/gremision.model';

const guiaRoutes = Router();

guiaRoutes.get('/prueba', (req: Request, res: Response) =>{
        res.json({
            ok:true,
            mensaje: 'Todo funciona bien!!'
        })
});

guiaRoutes.post('/createGR', (req: Request,res: Response,next)=>{
        
    const formularioGR = {
        conductor: req.body.conductor,
        tipoVehiculo:req.body.tipoVehiculo,
        kmIni:req.body.kmIni,
        ci:req.body.ci
    }

    GRemision.create(formularioGR).then (formularioDB =>{
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
export default guiaRoutes;