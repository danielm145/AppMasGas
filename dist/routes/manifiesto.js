"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const manifiesto_model_1 = require("../models/manifiesto.model");
const manifiestoRoutes = express_1.Router();
manifiestoRoutes.post('/createManif', (req, res, next) => {
    const formularioManif = {
        empresa: req.body.empresa,
        registro: req.body.registro,
        domicilio: req.body.domicilio
    };
    manifiesto_model_1.Manifiesto.create(formularioManif).then(formularioDB => {
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
exports.default = manifiestoRoutes;
