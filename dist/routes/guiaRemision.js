"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gremision_model_1 = require("../models/gremision.model");
const guiaRoutes = express_1.Router();
guiaRoutes.get('/prueba', (req, res) => {
    res.json({
        ok: true,
        mensaje: 'Todo funciona bien!!'
    });
});
guiaRoutes.post('/createGR', (req, res, next) => {
    const formularioGR = {
        conductor: req.body.conductor,
        tipoVehiculo: req.body.tipoVehiculo,
        kmIni: req.body.kmIni,
        ci: req.body.ci
    };
    gremision_model_1.GRemision.create(formularioGR).then(formularioDB => {
        try {
            res.json({
                ok: "true",
                formularioDB
            });
        }
        catch (err) {
            next(err); // genera el error con un response
        }
    });
});
exports.default = guiaRoutes;
